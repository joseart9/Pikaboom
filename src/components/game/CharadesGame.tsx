"use client";

import { Hourglass } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  isMuted,
  playBonus,
  playClick,
  playExplosion,
  playFanfare,
  playLifeLost,
  playNothing,
  playPenalty,
  playPick,
  playWhoosh,
  setMuted,
  unlockAudio,
  vibrate,
} from "@/game/audio";
import { useAdultMode } from "@/game/adultMode";
import { loadWords, type WordSource } from "@/game/loadWords";
import { useBomb } from "@/game/useBomb";
import { WordPicker } from "@/game/wordPicker";
import { LOCAL_WORDS, type WordEntry } from "@/game/words";
import { Bomb } from "./Bomb";
import { BonusPop, type Bonus } from "./BonusPop";
import { Explosion } from "./Explosion";

// ───────────────────────── config ─────────────────────────

const TEAM_COLORS = ["#ff4d6d", "#3a86ff", "#06d6a0", "#ffbe0b", "#b15eff", "#fb5607", "#00bbf9", "#f15bb5"];
const TEAM_EMOJI = ["🦊", "🐙", "🦖", "🐝", "🦄", "🐯", "🐬", "🐸"];
/** Seconds added on "Next team" — 0 means no bonus this time. */
const BONUS_POOL = [0, 1, 5, 10, 20];
/** Seconds removed when asking for new words. */
const PENALTY_POOL = [5, 10, 15];
const WORD_OPTIONS = 4;
const SETTINGS_KEY = "pikaboom.charades.settings.v1";

type Team = { id: number; name: string; color: string; emoji: string; lives: number; guessed: number; explosions: number };

type Settings = { teamNames: string[]; minSeconds: number; maxSeconds: number; lives: number };

const DEFAULT_SETTINGS: Settings = { teamNames: ["Equipo 1", "Equipo 2"], minSeconds: 120, maxSeconds: 220, lives: 3 };

type Phase = "setup" | "ready" | "playing" | "exploding" | "roundOver" | "gameOver";

const randInt = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;

function loadSettings(): Settings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (raw) return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch {
    /* ignore */
  }
  return DEFAULT_SETTINGS;
}

function makeTeams(s: Settings): Team[] {
  return s.teamNames.map((name, i) => ({
    id: i,
    name: name.trim() || `Equipo ${i + 1}`,
    color: TEAM_COLORS[i % TEAM_COLORS.length],
    emoji: TEAM_EMOJI[i % TEAM_EMOJI.length],
    lives: s.lives,
    guessed: 0,
    explosions: 0,
  }));
}

function nextAlive(teams: Team[], from: number) {
  for (let step = 1; step <= teams.length; step++) {
    const idx = (from + step) % teams.length;
    if (teams[idx].lives > 0) return idx;
  }
  return from;
}

// ───────────────────────── small UI pieces ─────────────────────────

function Hearts({ lives, max, size = "text-xl", breakIndex }: { lives: number; max: number; size?: string; breakIndex?: number }) {
  return (
    <span className={`inline-flex gap-0.5 ${size}`} aria-label={`${lives} de ${max} vidas`}>
      {Array.from({ length: max }).map((_, i) => (
        <span
          key={i}
          className={i === breakIndex ? "pb-heart-break" : i < lives ? "" : "opacity-25 grayscale"}
        >
          ❤️
        </span>
      ))}
    </span>
  );
}

function IconButton({ onClick, label, children }: { onClick: () => void; label: string; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      className="grid h-11 w-11 place-items-center rounded-2xl bg-white/10 text-xl transition active:scale-90"
    >
      {children}
    </button>
  );
}

/** All teams at a glance. Wraps into rows (never scrolls): up to 4 per row. */
function TeamStrip({ teams, current, maxLives }: { teams: Team[]; current: number; maxLives: number }) {
  const cols = Math.min(teams.length, 4);
  return (
    <div className="grid shrink-0 gap-1.5" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
      {teams.map((t, i) => (
        <div
          key={t.id}
          className={`flex min-w-0 items-center gap-1.5 rounded-xl border-2 px-1.5 py-1 transition ${
            i === current ? "bg-white/20" : "bg-white/5 opacity-70"
          } ${t.lives === 0 ? "opacity-30 line-through" : ""}`}
          style={{ borderColor: i === current ? t.color : "transparent" }}
        >
          <span className="shrink-0 text-base">{t.emoji}</span>
          <div className="min-w-0 leading-tight">
            <div className="truncate text-[11px] font-black">{t.name}</div>
            <Hearts lives={t.lives} max={maxLives} size="text-[9px]" />
          </div>
        </div>
      ))}
    </div>
  );
}

function Stepper({ label, value, onChange, min, max, step = 1, suffix = "" }: { label: string; value: number; onChange: (v: number) => void; min: number; max: number; step?: number; suffix?: string }) {
  return (
    <div className="flex min-w-0 flex-col items-center gap-1 rounded-2xl bg-white/5 py-1.5">
      <span className="text-xs font-black uppercase tracking-wider text-white/60">{label}</span>
      <div className="flex items-center gap-0.5">
        <button aria-label={`${label} menos`} className="h-8 w-8 shrink-0 rounded-lg bg-white/15 text-lg font-black active:scale-90" onClick={() => onChange(Math.max(min, value - step))}>
          −
        </button>
        <span className="w-10 text-center font-display text-base">
          {value}
          {suffix}
        </span>
        <button aria-label={`${label} más`} className="h-8 w-8 shrink-0 rounded-lg bg-white/15 text-lg font-black active:scale-90" onClick={() => onChange(Math.min(max, value + step))}>
          +
        </button>
      </div>
    </div>
  );
}

// ───────────────────────── main game ─────────────────────────

export function CharadesGame() {
  const [phase, setPhase] = useState<Phase>("setup");
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [teams, setTeams] = useState<Team[]>([]);
  const [current, setCurrent] = useState(0);
  const [options, setOptions] = useState<WordEntry[]>([]);
  const [chosen, setChosen] = useState<WordEntry | null>(null);
  const [bonus, setBonus] = useState<Bonus | null>(null);
  const [paused, setPaused] = useState(false);
  const [muted, setMutedState] = useState(false);
  const [round, setRound] = useState(1);
  const [lastExploded, setLastExploded] = useState<number | null>(null);
  const [wordSource, setWordSource] = useState<WordSource | "loading">("loading");
  const [adultShortage, setAdultShortage] = useState(false);
  const adult = useAdultMode();
  const [wordCount, setWordCount] = useState(0);

  const picker = useRef<WordPicker | null>(null);
  const bonusId = useRef(0);
  const phaseRef = useRef(phase);
  const currentRef = useRef(current);
  useEffect(() => {
    phaseRef.current = phase;
    currentRef.current = current;
  }, [phase, current]);

  // Load persisted settings + word bank on mount.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- hydrate from localStorage after mount
    setSettings(loadSettings());
    setMutedState(isMuted());
  }, []);

  // Load the word bank for the current mode (normal / +18).
  useEffect(() => {
    let cancelled = false;
    picker.current ??= new WordPicker(LOCAL_WORDS);
    loadWords(adult).then(async ({ words, source }) => {
      let set = adult ? "adult" : "normal";
      let shortage = false;
      if (adult && words.length < WORD_OPTIONS) {
        // Not enough +18 words yet — play with the normal set instead.
        shortage = true;
        set = "normal";
        ({ words, source } = await loadWords(false));
      }
      if (cancelled) return;
      picker.current = new WordPicker(words, set);
      setWordSource(source);
      setAdultShortage(shortage);
      setWordCount(picker.current.size);
    });
    return () => {
      cancelled = true;
    };
  }, [adult]);

  useEffect(() => {
    if (settings === DEFAULT_SETTINGS) return; // not hydrated yet
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    } catch {
      /* ignore */
    }
  }, [settings]);

  const drawOptions = useCallback((exclude: string[] = []) => {
    setOptions(picker.current?.draw(WORD_OPTIONS, exclude) ?? []);
    setChosen(null);
  }, []);

  // ── explosion ──
  const handleExplode = useCallback(() => {
    const victim = currentRef.current;
    playExplosion();
    vibrate([300, 80, 400]);
    setLastExploded(victim);
    setPhase("exploding");
    setTeams((ts) => ts.map((t, i) => (i === victim ? { ...t, lives: Math.max(0, t.lives - 1), explosions: t.explosions + 1 } : t)));
  }, []);

  const bomb = useBomb(handleExplode);

  // After the blast animation, show round results (or game over).
  useEffect(() => {
    if (phase !== "exploding") return;
    const t = setTimeout(() => {
      const alive = teams.filter((tm) => tm.lives > 0);
      if (alive.length <= 1) {
        playFanfare();
        setPhase("gameOver");
      } else {
        playLifeLost();
        setPhase("roundOver");
      }
    }, 2600);
    return () => clearTimeout(t);
  }, [phase, teams]);

  // Auto-pause if the app goes to the background.
  useEffect(() => {
    const onHide = () => {
      if (document.hidden && phaseRef.current === "playing") {
        bomb.pause();
        setPaused(true);
      }
    };
    document.addEventListener("visibilitychange", onHide);
    return () => document.removeEventListener("visibilitychange", onHide);
  }, [bomb]);

  // ── actions ──
  const startGame = () => {
    unlockAudio();
    playClick();
    setTeams(makeTeams(settings));
    setCurrent(randInt(0, settings.teamNames.length - 1));
    setRound(1);
    setLastExploded(null);
    setPhase("ready");
  };

  const startRound = () => {
    unlockAudio();
    playClick();
    drawOptions();
    setPaused(false);
    setPhase("playing");
    const lo = Math.min(settings.minSeconds, settings.maxSeconds);
    const hi = Math.max(settings.minSeconds, settings.maxSeconds);
    bomb.start(randInt(lo, hi));
  };

  const pickWord = (w: WordEntry) => {
    playPick();
    setChosen(w);
  };

  /** Back to the same 4 options. */
  const changeWord = () => {
    playWhoosh();
    setChosen(null);
  };

  /** Fresh 4 options — costs time. */
  const newWords = () => {
    const seconds = PENALTY_POOL[randInt(0, PENALTY_POOL.length - 1)];
    bomb.addTime(-seconds);
    playWhoosh();
    playPenalty(seconds);
    setBonus({ id: ++bonusId.current, seconds: -seconds });
    drawOptions(options.map((o) => o.word));
  };

  const nextTeam = () => {
    if (!chosen) return;
    const seconds = BONUS_POOL[randInt(0, BONUS_POOL.length - 1)];
    bomb.addTime(seconds);
    if (seconds > 0) playBonus(seconds);
    else playNothing();
    setBonus({ id: ++bonusId.current, seconds });
    setTeams((ts) => ts.map((t, i) => (i === current ? { ...t, guessed: t.guessed + 1 } : t)));
    setCurrent((c) => nextAlive(teams, c));
    drawOptions();
  };

  const nextRound = () => {
    playClick();
    setRound((r) => r + 1);
    setCurrent((c) => nextAlive(teams, c));
    setPhase("ready");
  };

  const togglePause = () => {
    playClick();
    if (paused) {
      bomb.resume();
      setPaused(false);
    } else {
      bomb.pause();
      setPaused(true);
    }
  };

  const quitToSetup = () => {
    bomb.stop();
    setPaused(false);
    setPhase("setup");
  };

  const toggleMute = () => {
    unlockAudio();
    setMuted(!muted);
    setMutedState(!muted);
  };

  const clearBonus = useCallback(() => setBonus(null), []);

  const team = teams[current];
  const maxLives = settings.lives;

  // ───────────────────────── screens ─────────────────────────

  const topBar = (
    <div className="flex items-center justify-between">
      {phase === "setup" ? (
        <Link href="/" aria-label="Inicio" className="grid h-11 w-11 place-items-center rounded-2xl bg-white/10 text-xl">
          ←
        </Link>
      ) : (
        <IconButton onClick={quitToSetup} label="Salir del juego">
          ✕
        </IconButton>
      )}
      <div className="font-display text-2xl tracking-wide">
        CHARADAS{phase !== "setup" && <span className="ml-2 text-base text-white/60">Ronda {round}</span>}
      </div>
      <div className="flex gap-2">
        {phase === "playing" && (
          <IconButton onClick={togglePause} label={paused ? "Reanudar" : "Pausa"}>
            {paused ? "▶" : "❚❚"}
          </IconButton>
        )}
        <IconButton onClick={toggleMute} label={muted ? "Activar sonido" : "Silenciar"}>
          {muted ? "🔇" : "🔊"}
        </IconButton>
      </div>
    </div>
  );

  let screen: React.ReactNode = null;

  if (phase === "setup") {
    const names = settings.teamNames;
    const setNames = (teamNames: string[]) => setSettings((s) => ({ ...s, teamNames }));
    screen = (
      <div className="flex min-h-0 flex-1 flex-col gap-2">
        <div className="flex shrink-0 items-center gap-3">
          <Bomb size={52} className="pb-wobble shrink-0" />
          <p className="text-[13px] font-bold leading-snug text-white/85">
            Actúa la palabra <b className="text-[#ffe066]">¡sin hablar!</b> Cuando tu compañero la adivine, presiona <b>Siguiente equipo</b> y pasa el teléfono. ¡Que no te explote en las manos!
          </p>
        </div>

        <div className="pb-card flex shrink-0 flex-col gap-2 p-3">
          <div className="flex items-baseline justify-between">
            <h2 className="font-display text-2xl">Equipos</h2>
            <span className="text-xs font-bold text-white/60">2 jugadores cada uno</span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {names.map((name, i) => (
              <div key={i} className="flex h-9 min-w-0 items-center gap-1.5 rounded-xl border-2 border-white/15 bg-white/10 pl-1 pr-1 focus-within:border-white/50">
                <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg text-base" style={{ background: TEAM_COLORS[i % TEAM_COLORS.length] }}>
                  {TEAM_EMOJI[i % TEAM_EMOJI.length]}
                </span>
                <input
                  value={name}
                  maxLength={18}
                  enterKeyHint="done"
                  onChange={(e) => setNames(names.map((n, j) => (j === i ? e.target.value : n)))}
                  className="h-full min-w-0 flex-1 bg-transparent font-extrabold text-white outline-none placeholder:text-white/40"
                  placeholder={`Equipo ${i + 1}`}
                />
                {names.length > 2 && (
                  <button aria-label={`Quitar ${name}`} onClick={() => setNames(names.filter((_, j) => j !== i))} className="grid h-7 w-7 shrink-0 place-items-center rounded-lg text-sm text-white/60 active:scale-90">
                    ✕
                  </button>
                )}
              </div>
            ))}
            {names.length < 8 && (
              <button onClick={() => setNames([...names, `Equipo ${names.length + 1}`])} className="h-9 rounded-xl border-2 border-dashed border-white/30 text-sm font-extrabold text-white/80 active:scale-95">
                + Agregar equipo
              </button>
            )}
          </div>
        </div>

        <div className="pb-card flex shrink-0 flex-col gap-2 p-3">
          <h2 className="font-display text-2xl">Bomba</h2>
          <div className="grid grid-cols-3 gap-2">
            <Stepper label="Mecha mín." value={settings.minSeconds} min={20} max={600} step={10} suffix="s" onChange={(v) => setSettings((s) => ({ ...s, minSeconds: v, maxSeconds: Math.max(v, s.maxSeconds) }))} />
            <Stepper label="Mecha máx." value={settings.maxSeconds} min={20} max={600} step={10} suffix="s" onChange={(v) => setSettings((s) => ({ ...s, maxSeconds: v, minSeconds: Math.min(v, s.minSeconds) }))} />
            <Stepper label="Vidas" value={settings.lives} min={1} max={5} onChange={(v) => setSettings((s) => ({ ...s, lives: v }))} />
          </div>
          <p className="text-[11px] font-bold leading-snug text-white/50">
            La mecha dura un tiempo secreto dentro del rango. Cada acierto suma +0, +1, +5, +10 o +20 s. Pedir nuevas palabras resta 5, 10 o 15 s.
          </p>
        </div>

        <div className="mt-auto flex shrink-0 flex-col gap-2">
          {adultShortage ? (
            <p className="rounded-xl bg-[#ff4d6d]/20 px-3 py-1.5 text-center text-xs font-extrabold text-[#ffb3c0]">
              🫦 Aún no hay suficientes palabras +18: se usarán las normales. Agrégalas en /admin.
            </p>
          ) : (
            <p className="text-center text-xs font-bold text-white/40">
              {wordSource === "loading" ? "Cargando palabras…" : wordSource === "db" ? `${wordCount} palabras${adult ? " +18 🫦" : ""} de la nube ☁️` : `${wordCount} palabras sin conexión`}
            </p>
          )}
          <button onClick={startGame} data-haptic="medium" className="pb-btn h-16 w-full text-3xl" style={{ ["--btn" as string]: "#06d6a0" }}>
            ¡JUGAR!
          </button>
        </div>
      </div>
    );
  }

  if (phase === "ready" && team) {
    screen = (
      <div className="flex min-h-0 flex-1 flex-col items-center justify-between gap-3 text-center">
        <TeamStrip teams={teams} current={current} maxLives={maxLives} />
        <div className="pb-pop-in flex flex-col items-center gap-3" key={`ready-${round}`}>
          <span className="text-lg font-black uppercase tracking-widest text-white/60">Pasa el teléfono a</span>
          <div className="grid h-28 w-28 place-items-center rounded-[2rem] text-6xl shadow-2xl" style={{ background: team.color }}>
            {team.emoji}
          </div>
          <h2 className="font-display text-5xl" style={{ color: team.color }}>
            {team.name}
          </h2>
          <Hearts lives={team.lives} max={maxLives} size="text-3xl" />
          <p className="max-w-xs font-bold text-white/70">Uno actúa y el otro adivina. ¡La bomba empieza a sonar en cuanto presionen empezar!</p>
        </div>
        <Bomb size={130} className="pb-float" lit={false} />
        <button onClick={startRound} data-haptic="heavy" className="pb-btn h-16 w-full text-3xl" style={{ ["--btn" as string]: team.color }}>
          💣 EMPEZAR RONDA
        </button>
      </div>
    );
  }

  if ((phase === "playing" || phase === "exploding") && team) {
    const shownTeam = phase === "exploding" && lastExploded !== null ? teams[lastExploded] : team;
    screen = (
      <div className={`flex min-h-0 flex-1 flex-col gap-3 ${phase === "exploding" ? "pb-shake" : ""}`}>
        <TeamStrip teams={teams} current={current} maxLives={maxLives} />

        {/* Whose turn — big and in the team's color */}
        <div className="relative overflow-hidden rounded-3xl px-4 py-3 shadow-xl" style={{ background: shownTeam.color }}>
          <div className="flex items-center gap-3">
            <span className="text-5xl drop-shadow">{shownTeam.emoji}</span>
            <div className="min-w-0 flex-1">
              <div className="text-xs font-black uppercase tracking-widest text-[#1d0842]/70">Es el turno de</div>
              <div className={`truncate font-display leading-none text-[#1d0842] ${shownTeam.name.length > 11 ? "text-3xl" : "text-4xl"}`}>{shownTeam.name}</div>
            </div>
            <Hearts lives={shownTeam.lives} max={maxLives} size="text-lg" />
          </div>
        </div>

        {/* Word area — fixed flex region so switching views never shifts the buttons */}
        <div className="relative flex min-h-0 flex-1 flex-col">
          {paused ? (
            <div className="pb-card flex flex-1 flex-col items-center justify-center gap-4 text-center">
              <span className="text-6xl">⏸️</span>
              <p className="font-display text-4xl">En pausa</p>
              <p className="font-bold text-white/60">La bomba está congelada… por ahora.</p>
              <button onClick={togglePause} className="pb-btn h-14 px-8 text-2xl">
                REANUDAR
              </button>
            </div>
          ) : chosen ? (
            <div key={chosen.word} className="pb-pop-in pb-card flex flex-1 flex-col items-center justify-center gap-2 px-4 text-center">
              <span className="rounded-full bg-white/15 px-3 py-1 text-sm font-black uppercase tracking-widest text-white/70">{chosen.category}</span>
              <span className="font-display text-6xl leading-tight break-words sm:text-7xl" style={{ color: "#ffe066", textShadow: "0 5px 0 #1d0842" }}>
                {chosen.word}
              </span>
              <span className="mt-2 font-extrabold text-white/70">🤫 ¡Actúala sin hablar!</span>
              <Bomb size={70} className="pb-throb mt-3" />
            </div>
          ) : (
            <div className="flex flex-1 flex-col gap-3">
              <p className="text-center font-display text-2xl text-white/90">Elige una palabra para actuar</p>
              <div className="grid flex-1 grid-cols-2 gap-3">
                {options.map((w, i) => (
                  <button
                    key={w.word}
                    onClick={() => pickWord(w)}
                    className="pb-pop-in pb-card flex flex-col items-center justify-center gap-1 p-2 text-center transition active:scale-95"
                    style={{ animationDelay: `${i * 50}ms` }}
                  >
                    <span className="text-[10px] font-black uppercase tracking-widest text-white/50">{w.category}</span>
                    <span className="font-display text-2xl leading-tight break-words sm:text-3xl">{w.word}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3">
          {chosen ? (
            <button onClick={changeWord} disabled={paused || phase !== "playing"} className="pb-btn h-16 px-2 text-lg leading-tight" style={{ ["--btn" as string]: "#b9a6ff" }}>
              Cambiar palabra
            </button>
          ) : (
            <button
              onClick={newWords}
              data-haptic="heavy"
              disabled={paused || phase !== "playing"}
              className="pb-btn h-16 px-2 text-lg leading-tight"
              style={{ ["--btn" as string]: "#ff8fa3" }}
              aria-label="Nuevas palabras (resta tiempo)"
            >
              <span>Nuevas palabras</span>
              <span className="inline-flex shrink-0 items-center font-display text-[#c1121f]">
                −<Hourglass className="size-5" strokeWidth={3} aria-hidden />
              </span>
            </button>
          )}
          <button onClick={nextTeam} data-haptic="medium" disabled={!chosen || paused || phase !== "playing"} className="pb-btn h-16 px-2 text-xl leading-tight" style={{ ["--btn" as string]: "#06d6a0" }}>
            Siguiente equipo
          </button>
        </div>
      </div>
    );
  }

  if (phase === "roundOver" && lastExploded !== null) {
    const victim = teams[lastExploded];
    const out = victim.lives === 0;
    screen = (
      <div className="flex min-h-0 flex-1 flex-col items-center justify-between gap-3 text-center">
        <div className="pb-pop-in flex flex-col items-center gap-2 pt-2">
          <span className="text-6xl">💥</span>
          <h2 className="font-display text-5xl" style={{ color: victim.color }}>
            {victim.name}
          </h2>
          <p className="font-display text-2xl">{out ? "¡queda FUERA del juego!" : "¡explotó!"}</p>
          <Hearts lives={victim.lives} max={maxLives} size="text-4xl" breakIndex={victim.lives} />
          <p className="font-bold text-white/70">
            {out ? "Sin vidas. ¡Suerte para la próxima!" : `${victim.lives === 1 ? "Queda 1 vida" : `Quedan ${victim.lives} vidas`}`}
          </p>
        </div>
        <Standings teams={teams} maxLives={maxLives} />
        <button onClick={nextRound} data-haptic="medium" className="pb-btn h-16 w-full text-3xl">
          SIGUIENTE RONDA ➜
        </button>
      </div>
    );
  }

  if (phase === "gameOver") {
    const winner = teams.find((t) => t.lives > 0) ?? teams[0];
    screen = (
      <div className="flex min-h-0 flex-1 flex-col items-center justify-between gap-3 text-center">
        <div className="pb-pop-in flex flex-col items-center gap-1 pt-2">
          <span className="pb-float text-7xl">🏆</span>
          <p className="text-lg font-black uppercase tracking-widest text-white/60">Ganador</p>
          <h2 className="max-w-full break-words font-display text-5xl" style={{ color: winner.color }}>
            {winner.emoji} {winner.name}
          </h2>
          <p className="font-bold text-white/70">¡Sobrevivió {round} {round === 1 ? "ronda" : "rondas"} de puro suspenso!</p>
        </div>
        <Standings teams={teams} maxLives={maxLives} />
        <div className="grid w-full shrink-0 gap-3">
          <button onClick={startGame} className="pb-btn h-16 w-full text-3xl" style={{ ["--btn" as string]: "#06d6a0" }}>
            JUGAR DE NUEVO
          </button>
          <button onClick={quitToSetup} className="pb-btn h-14 w-full text-xl" style={{ ["--btn" as string]: "#b9a6ff" }}>
            Cambiar equipos
          </button>
        </div>
      </div>
    );
  }

  return (
    <main className="pb-bg flex pb-screen w-full flex-col overflow-hidden">
      <div className="pb-safe mx-auto flex h-full w-full max-w-md flex-col gap-3">
        {topBar}
        {screen}
      </div>
      <BonusPop bonus={bonus} onDone={clearBonus} />
      {phase === "exploding" && <Explosion />}
    </main>
  );
}

function Standings({ teams, maxLives }: { teams: Team[]; maxLives: number }) {
  const sorted = [...teams].sort((a, b) => b.lives - a.lives || b.guessed - a.guessed);
  return (
    <div className="pb-card w-full overflow-hidden p-3">
      <div className="grid grid-cols-[1fr_auto_auto_auto] items-center gap-x-3 gap-y-2 text-left text-sm">
        <span className="font-black uppercase tracking-wider text-white/50">Equipo</span>
        <span className="font-black uppercase tracking-wider text-white/50">Vidas</span>
        <span className="text-center font-black text-white/50" title="Palabras adivinadas">✅</span>
        <span className="text-center font-black text-white/50" title="Explosiones">💥</span>
        {sorted.map((t) => (
          <div key={t.id} className={`contents ${t.lives === 0 ? "[&>*]:opacity-40" : ""}`}>
            <span className="flex min-w-0 items-center gap-2 font-extrabold">
              <span className="h-3 w-3 shrink-0 rounded-full" style={{ background: t.color }} />
              <span className="truncate">
                {t.emoji} {t.name}
              </span>
            </span>
            <Hearts lives={t.lives} max={maxLives} size="text-xs" />
            <span className="text-center font-display text-lg">{t.guessed}</span>
            <span className="text-center font-display text-lg">{t.explosions}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
