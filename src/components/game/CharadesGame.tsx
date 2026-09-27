"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  isMuted,
  playBonus,
  playClick,
  playExplosion,
  playFanfare,
  playLifeLost,
  playPick,
  playWhoosh,
  setMuted,
  unlockAudio,
  vibrate,
} from "@/game/audio";
import { loadWords } from "@/game/loadWords";
import { useBomb } from "@/game/useBomb";
import { WordPicker } from "@/game/wordPicker";
import { LOCAL_WORDS, type WordEntry } from "@/game/words";
import { Bomb } from "./Bomb";
import { BonusPop, type Bonus } from "./BonusPop";
import { Explosion } from "./Explosion";

// ───────────────────────── config ─────────────────────────

const TEAM_COLORS = ["#ff4d6d", "#3a86ff", "#06d6a0", "#ffbe0b", "#b15eff", "#fb5607", "#00bbf9", "#f15bb5"];
const TEAM_EMOJI = ["🦊", "🐙", "🦖", "🐝", "🦄", "🐯", "🐬", "🐸"];
const BONUS_POOL = [1, 5, 10, 20];
const WORD_OPTIONS = 4;
const SETTINGS_KEY = "pikaboom.charades.settings.v1";

type Team = { id: number; name: string; color: string; emoji: string; lives: number; guessed: number; explosions: number };

type Settings = { teamNames: string[]; minSeconds: number; maxSeconds: number; lives: number };

const DEFAULT_SETTINGS: Settings = { teamNames: ["Team 1", "Team 2"], minSeconds: 120, maxSeconds: 220, lives: 3 };

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
    name: name.trim() || `Team ${i + 1}`,
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
    <span className={`inline-flex gap-0.5 ${size}`} aria-label={`${lives} of ${max} lives`}>
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

function TeamStrip({ teams, current, maxLives }: { teams: Team[]; current: number; maxLives: number }) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none]">
      {teams.map((t, i) => (
        <div
          key={t.id}
          className={`flex shrink-0 items-center gap-2 rounded-2xl border-2 px-3 py-1.5 transition ${
            i === current ? "scale-100 bg-white/20" : "scale-95 bg-white/5 opacity-70"
          } ${t.lives === 0 ? "opacity-30 line-through" : ""}`}
          style={{ borderColor: i === current ? t.color : "transparent" }}
        >
          <span className="text-lg">{t.emoji}</span>
          <div className="leading-tight">
            <div className="max-w-24 truncate text-xs font-black">{t.name}</div>
            <Hearts lives={t.lives} max={maxLives} size="text-[10px]" />
          </div>
        </div>
      ))}
    </div>
  );
}

function Stepper({ label, value, onChange, min, max, step = 1, suffix = "" }: { label: string; value: number; onChange: (v: number) => void; min: number; max: number; step?: number; suffix?: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="font-extrabold text-white/80">{label}</span>
      <div className="flex items-center gap-2">
        <button className="h-9 w-9 rounded-xl bg-white/15 text-xl font-black active:scale-90" onClick={() => onChange(Math.max(min, value - step))}>
          −
        </button>
        <span className="w-16 text-center font-display text-xl">
          {value}
          {suffix}
        </span>
        <button className="h-9 w-9 rounded-xl bg-white/15 text-xl font-black active:scale-90" onClick={() => onChange(Math.min(max, value + step))}>
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
  const [wordSource, setWordSource] = useState<"supabase" | "local" | "loading">("loading");
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
    picker.current = new WordPicker(LOCAL_WORDS);
    loadWords().then(({ words, source }) => {
      picker.current = new WordPicker(words);
      setWordSource(source);
      setWordCount(picker.current.size);
    });
  }, []);

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
    setCurrent(0);
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

  const changeWord = () => {
    playWhoosh();
    drawOptions(options.map((o) => o.word));
  };

  const nextTeam = () => {
    if (!chosen) return;
    const seconds = BONUS_POOL[randInt(0, BONUS_POOL.length - 1)];
    bomb.addTime(seconds);
    playBonus(seconds);
    vibrate(40);
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
        <Link href="/" aria-label="Home" className="grid h-11 w-11 place-items-center rounded-2xl bg-white/10 text-xl">
          ←
        </Link>
      ) : (
        <IconButton onClick={quitToSetup} label="Quit game">
          ✕
        </IconButton>
      )}
      <div className="font-display text-2xl tracking-wide">
        CHARADES{phase !== "setup" && <span className="ml-2 text-base text-white/60">Round {round}</span>}
      </div>
      <div className="flex gap-2">
        {phase === "playing" && (
          <IconButton onClick={togglePause} label={paused ? "Resume" : "Pause"}>
            {paused ? "▶" : "❚❚"}
          </IconButton>
        )}
        <IconButton onClick={toggleMute} label={muted ? "Unmute" : "Mute"}>
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
      <div className="flex flex-1 flex-col gap-4 overflow-y-auto pb-4">
        <div className="flex items-center gap-4 pt-2">
          <Bomb size={96} className="pb-wobble shrink-0" />
          <p className="font-bold leading-snug text-white/85">
            Act out the word — <b className="text-[#ffe066]">no talking!</b> When your teammate guesses it, hit <b>Next team</b> and pass the phone. Don&apos;t be holding it when the bomb goes off!
          </p>
        </div>

        <div className="pb-card flex flex-col gap-3 p-4">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-2xl">Teams</h2>
            <span className="text-sm font-bold text-white/60">2 players each</span>
          </div>
          {names.map((name, i) => (
            <div key={i} className="flex items-center gap-2">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl text-2xl" style={{ background: TEAM_COLORS[i % TEAM_COLORS.length] }}>
                {TEAM_EMOJI[i % TEAM_EMOJI.length]}
              </span>
              <input
                value={name}
                maxLength={18}
                onChange={(e) => setNames(names.map((n, j) => (j === i ? e.target.value : n)))}
                className="h-11 min-w-0 flex-1 rounded-xl border-2 border-white/15 bg-white/10 px-3 font-extrabold text-white outline-none placeholder:text-white/40 focus:border-white/50"
                placeholder={`Team ${i + 1}`}
              />
              {names.length > 2 && (
                <button aria-label={`Remove ${name}`} onClick={() => setNames(names.filter((_, j) => j !== i))} className="h-11 w-11 shrink-0 rounded-xl bg-white/10 text-lg active:scale-90">
                  🗑
                </button>
              )}
            </div>
          ))}
          {names.length < 8 && (
            <button onClick={() => setNames([...names, `Team ${names.length + 1}`])} className="h-11 rounded-xl border-2 border-dashed border-white/30 font-extrabold text-white/80 active:scale-95">
              + Add team
            </button>
          )}
        </div>

        <div className="pb-card flex flex-col gap-3 p-4">
          <h2 className="font-display text-2xl">Bomb</h2>
          <Stepper label="Fuse min" value={settings.minSeconds} min={20} max={600} step={10} suffix="s" onChange={(v) => setSettings((s) => ({ ...s, minSeconds: v, maxSeconds: Math.max(v, s.maxSeconds) }))} />
          <Stepper label="Fuse max" value={settings.maxSeconds} min={20} max={600} step={10} suffix="s" onChange={(v) => setSettings((s) => ({ ...s, maxSeconds: v, minSeconds: Math.min(v, s.minSeconds) }))} />
          <Stepper label="Lives per team" value={settings.lives} min={1} max={5} onChange={(v) => setSettings((s) => ({ ...s, lives: v }))} />
          <p className="text-sm font-bold text-white/50">
            The fuse is a secret random time in this range. Every correct guess adds +1, +5, +10 or +20 seconds.
          </p>
        </div>

        <p className="text-center text-xs font-bold text-white/40">
          {wordSource === "loading" ? "Loading words…" : wordSource === "supabase" ? `${wordCount} words from the cloud ☁️` : `${wordCount} offline words`}
        </p>

        <button onClick={startGame} className="pb-btn mt-auto h-16 w-full text-3xl" style={{ ["--btn" as string]: "#06d6a0" }}>
          PLAY!
        </button>
      </div>
    );
  }

  if (phase === "ready" && team) {
    screen = (
      <div className="flex flex-1 flex-col items-center justify-between gap-4 pb-4 text-center">
        <TeamStrip teams={teams} current={current} maxLives={maxLives} />
        <div className="pb-pop-in flex flex-col items-center gap-3" key={`ready-${round}`}>
          <span className="text-lg font-black uppercase tracking-widest text-white/60">Pass the phone to</span>
          <div className="grid h-28 w-28 place-items-center rounded-[2rem] text-6xl shadow-2xl" style={{ background: team.color }}>
            {team.emoji}
          </div>
          <h2 className="font-display text-5xl" style={{ color: team.color }}>
            {team.name}
          </h2>
          <Hearts lives={team.lives} max={maxLives} size="text-3xl" />
          <p className="max-w-xs font-bold text-white/70">One of you acts, the other guesses. The bomb starts ticking as soon as you press start!</p>
        </div>
        <Bomb size={130} className="pb-float" lit={false} />
        <button onClick={startRound} className="pb-btn h-16 w-full text-3xl" style={{ ["--btn" as string]: team.color }}>
          💣 START ROUND
        </button>
      </div>
    );
  }

  if ((phase === "playing" || phase === "exploding") && team) {
    const shownTeam = phase === "exploding" && lastExploded !== null ? teams[lastExploded] : team;
    screen = (
      <div className={`flex flex-1 flex-col gap-3 pb-4 ${phase === "exploding" ? "pb-shake" : ""}`}>
        <TeamStrip teams={teams} current={current} maxLives={maxLives} />

        {/* Whose turn — big and in the team's color */}
        <div className="relative overflow-hidden rounded-3xl px-4 py-3 shadow-xl" style={{ background: shownTeam.color }}>
          <div className="flex items-center gap-3">
            <span className="text-5xl drop-shadow">{shownTeam.emoji}</span>
            <div className="min-w-0 flex-1">
              <div className="text-xs font-black uppercase tracking-widest text-[#1d0842]/70">Now playing</div>
              <div className="truncate font-display text-4xl leading-none text-[#1d0842]">{shownTeam.name}</div>
            </div>
            <Hearts lives={shownTeam.lives} max={maxLives} size="text-lg" />
          </div>
        </div>

        {/* Word area — fixed flex region so switching views never shifts the buttons */}
        <div className="relative flex min-h-0 flex-1 flex-col">
          {paused ? (
            <div className="pb-card flex flex-1 flex-col items-center justify-center gap-4 text-center">
              <span className="text-6xl">⏸️</span>
              <p className="font-display text-4xl">Paused</p>
              <p className="font-bold text-white/60">The bomb is frozen… for now.</p>
              <button onClick={togglePause} className="pb-btn h-14 px-8 text-2xl">
                RESUME
              </button>
            </div>
          ) : chosen ? (
            <div key={chosen.word} className="pb-pop-in pb-card flex flex-1 flex-col items-center justify-center gap-2 px-4 text-center">
              <span className="rounded-full bg-white/15 px-3 py-1 text-sm font-black uppercase tracking-widest text-white/70">{chosen.category}</span>
              <span className="font-display text-6xl leading-tight break-words sm:text-7xl" style={{ color: "#ffe066", textShadow: "0 5px 0 #1d0842" }}>
                {chosen.word}
              </span>
              <span className="mt-2 font-extrabold text-white/70">🤫 Act it out — no talking!</span>
              <Bomb size={70} className="pb-throb mt-3" />
            </div>
          ) : (
            <div className="flex flex-1 flex-col gap-3">
              <p className="text-center font-display text-2xl text-white/90">Pick a word to act</p>
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
          <button onClick={changeWord} disabled={paused || phase !== "playing"} className="pb-btn h-16 whitespace-nowrap px-2 text-lg" style={{ ["--btn" as string]: "#b9a6ff" }}>
            🔄 {chosen ? "Change word" : "New words"}
          </button>
          <button onClick={nextTeam} disabled={!chosen || paused || phase !== "playing"} className="pb-btn h-16 text-2xl" style={{ ["--btn" as string]: "#06d6a0" }}>
            ✅ Next team
          </button>
        </div>
      </div>
    );
  }

  if (phase === "roundOver" && lastExploded !== null) {
    const victim = teams[lastExploded];
    const out = victim.lives === 0;
    screen = (
      <div className="flex flex-1 flex-col items-center justify-between gap-4 pb-4 text-center">
        <div className="pb-pop-in flex flex-col items-center gap-3 pt-6">
          <span className="text-7xl">💥</span>
          <h2 className="font-display text-5xl" style={{ color: victim.color }}>
            {victim.name}
          </h2>
          <p className="font-display text-3xl">{out ? "is OUT of the game!" : "got blown up!"}</p>
          <Hearts lives={victim.lives} max={maxLives} size="text-4xl" breakIndex={victim.lives} />
          <p className="font-bold text-white/70">
            {out ? "No lives left. Better luck next time!" : `${victim.lives} ${victim.lives === 1 ? "life" : "lives"} left`}
          </p>
        </div>
        <Standings teams={teams} maxLives={maxLives} />
        <button onClick={nextRound} className="pb-btn h-16 w-full text-3xl">
          NEXT ROUND ➜
        </button>
      </div>
    );
  }

  if (phase === "gameOver") {
    const winner = teams.find((t) => t.lives > 0) ?? teams[0];
    screen = (
      <div className="flex flex-1 flex-col items-center justify-between gap-4 pb-4 text-center">
        <div className="pb-pop-in flex flex-col items-center gap-2 pt-4">
          <span className="pb-float text-8xl">🏆</span>
          <p className="text-lg font-black uppercase tracking-widest text-white/60">Winner</p>
          <h2 className="font-display text-6xl" style={{ color: winner.color }}>
            {winner.emoji} {winner.name}
          </h2>
          <p className="font-bold text-white/70">Survived {round} {round === 1 ? "round" : "rounds"} of ticking terror!</p>
        </div>
        <Standings teams={teams} maxLives={maxLives} />
        <div className="grid w-full gap-3">
          <button onClick={startGame} className="pb-btn h-16 w-full text-3xl" style={{ ["--btn" as string]: "#06d6a0" }}>
            PLAY AGAIN
          </button>
          <button onClick={quitToSetup} className="pb-btn h-14 w-full text-xl" style={{ ["--btn" as string]: "#b9a6ff" }}>
            Change teams
          </button>
        </div>
      </div>
    );
  }

  return (
    <main className="pb-bg flex h-dvh w-full flex-col overflow-hidden">
      <div className="mx-auto flex h-full w-full max-w-md flex-col gap-3 px-4 pt-[max(env(safe-area-inset-top),12px)] pb-[env(safe-area-inset-bottom)]">
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
        <span className="font-black uppercase tracking-wider text-white/50">Team</span>
        <span className="font-black uppercase tracking-wider text-white/50">Lives</span>
        <span className="text-center font-black text-white/50" title="Words guessed">✅</span>
        <span className="text-center font-black text-white/50" title="Explosions">💥</span>
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
