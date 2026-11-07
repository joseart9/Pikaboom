"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  isMuted,
  playBonus,
  playClick,
  playCoin,
  playError,
  playExplosion,
  playFanfare,
  playHit,
  playLaunch,
  playLifeLost,
  playPick,
  playPowerUp,
  playSonar,
  playSplash,
  setMuted,
  unlockAudio,
  vibrate,
} from "@/game/audio";
import { type Action, type GameEvent, ITEM_INFO, type Mark, type Mode, SHIP_INFO, type View } from "@/game/battleship/logic";
import { useRoom } from "@/game/battleship/useRoom";
import { keepAwake } from "@/game/wakeLock";
import { Explosion } from "../game/Explosion";
import { Battle, type Tab } from "./Battle";
import { Board, type CellFx } from "./Board";
import { ConnBadge, Pop, type PopMsg, QrCode, Radar, Toast } from "./bits";
import { Placement } from "./Placement";

const IMPACT_MS = 450; // matches .bs-missile
const FX_MS = 1500;

const markFx = (m: Mark): CellFx["kind"] =>
  m === "hit" ? "boom" : m === "blocked" ? "shield" : m === "mine" ? "mine" : m === "treasure" ? "treasure" : "splash";

export function inviteUrl(code: string) {
  return `${window.location.origin}/battleship?sala=${code}`;
}

export function TopBar({ onBack, back = "✕", right, sub }: { onBack: () => void; back?: string; right?: React.ReactNode; sub?: string }) {
  const [muted, setMutedState] = useState(false);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- read module state after mount
    setMutedState(isMuted());
  }, []);
  return (
    <div className="flex shrink-0 items-center justify-between gap-2">
      <button onClick={onBack} aria-label="Salir" className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-white/10 text-xl transition active:scale-90">
        {back}
      </button>
      <div className="min-w-0 flex-1 text-center leading-none">
        <div className="whitespace-nowrap font-display text-[1.4rem] tracking-wide">BATALLA NAVAL</div>
        {sub && <div className="mt-0.5 truncate text-[10px] font-black uppercase tracking-widest text-white/50">{sub}</div>}
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {right}
        <button
          onClick={() => {
            unlockAudio();
            setMuted(!muted);
            setMutedState(!muted);
          }}
          aria-label={muted ? "Activar sonido" : "Silenciar"}
          className="grid h-11 w-11 place-items-center rounded-2xl bg-white/10 text-xl transition active:scale-90"
        >
          {muted ? "🔇" : "🔊"}
        </button>
      </div>
    </div>
  );
}

export function Room({ initial, onLeave }: { initial: View; onLeave: (fatal?: string) => void }) {
  const { view, status, foeOnline, fatal, act } = useRoom(initial);
  const seat = view.seat;
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [pop, setPop] = useState<PopMsg | null>(null);
  const [boom, setBoom] = useState<{ id: number; text: string } | null>(null);
  const [tab, setTab] = useState<Tab>(initial.turn === initial.seat ? "enemy" : "own");
  const [enemyFx, setEnemyFx] = useState<CellFx[]>([]);
  const [ownFx, setOwnFx] = useState<CellFx[]>([]);
  const [shakeEnemy, setShakeEnemy] = useState(0);
  const [shakeOwn, setShakeOwn] = useState(0);
  // Which round's results are on screen (the board stays up a moment so the last blast can play).
  const [overRound, setOverRound] = useState<number | null>(initial.phase === "over" ? initial.round : null);
  const showOver = overRound === view.round;

  const fxId = useRef(0);
  const toastTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const later = useCallback((ms: number, fn: () => void) => {
    timers.current.push(setTimeout(fn, ms));
  }, []);
  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  const showToast = useCallback((text: string) => {
    setToast(text);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 2600);
  }, []);
  const popUp = useCallback((p: Omit<PopMsg, "id">) => setPop({ ...p, id: ++fxId.current }), []);
  const clearPop = useCallback(() => setPop(null), []);

  useEffect(() => {
    keepAwake(true);
    return () => keepAwake(false);
  }, []);

  useEffect(() => {
    if (fatal) onLeave(fatal);
  }, [fatal, onLeave]);

  const doAct = useCallback(
    async (a: Action) => {
      unlockAudio();
      setBusy(true);
      const err = await act(a);
      setBusy(false);
      return err;
    },
    [act],
  );

  const actWithToast = useCallback(
    async (a: Action) => {
      const err = await doAct(a);
      if (err) {
        playError();
        showToast(err);
      }
      return err;
    },
    [doAct, showToast],
  );

  // ── turn events → animations + sounds ──
  const addFx = useCallback(
    (board: "enemy" | "own", cells: number[], kind: CellFx["kind"] | ((c: number) => CellFx["kind"])) => {
      const items = cells.map((cell) => ({ id: ++fxId.current, cell, kind: typeof kind === "function" ? kind(cell) : kind }));
      const set = board === "enemy" ? setEnemyFx : setOwnFx;
      set((f) => [...f, ...items]);
      later(FX_MS, () => set((f) => f.filter((x) => !items.includes(x))));
    },
    [later],
  );

  const playEvent = useCallback(
    (e: GameEvent, foeName: string) => {
      const mine = e.by === seat;
      const board = mine ? "enemy" : "own";
      switch (e.kind) {
        case "fire": {
          const results = e.results ?? [];
          if (!mine) setTab("own");
          playLaunch();
          const marks = new Map(results);
          addFx(board, results.map(([c]) => c), (c) => markFx(marks.get(c)!));
          later(IMPACT_MS, () => {
            const hit = results.some(([, m]) => m === "hit");
            if (e.sunk?.length) {
              playExplosion();
              vibrate([200, 60, 300]);
              setBoom({ id: ++fxId.current, text: "¡HUNDIDO!" });
              later(1900, () => setBoom(null));
              later(1950, () =>
                popUp({
                  text: mine ? "¡LO HUNDISTE!" : "¡NOOO!",
                  sub: `${mine ? "" : "Perdiste tu "}${e.sunk!.map((s) => SHIP_INFO[s].name).join(" y ")}${mine && (e.coins ?? 0) > 0 ? ` · +${e.coins} 🪙` : ""}`,
                  color: mine ? "#ffe066" : "#ff4d6d",
                  small: true,
                }),
              );
            } else if (results.some(([, m]) => m === "mine")) {
              playExplosion();
              vibrate([150, 50, 150]);
              popUp({ text: "¡MINA!", sub: mine ? "¡Te explotó una mina!" : "¡Tu mina le explotó!", color: "#ff8800" });
            } else if (hit) {
              playHit();
              vibrate(mine ? 60 : [80, 40, 120]);
            } else if (results.some(([, m]) => m === "blocked")) {
              playPowerUp();
              popUp({ text: "🛡️ ¡BLOQUEADO!", color: "#7df9ff", small: true });
            } else {
              playSplash();
            }
            if (hit) (mine ? setShakeEnemy : setShakeOwn)(Date.now());
            later(500, () => (mine ? setShakeEnemy : setShakeOwn)(0));
            if (results.some(([, m]) => m === "treasure")) {
              playCoin();
              if (mine) popUp({ text: "💰 ¡TESORO!", sub: "+40 monedas", color: "#ffe066", small: true });
            }
            if (e.backfire) {
              addFx(mine ? "own" : "enemy", [e.backfire.cell], "boom");
            }
            if (mine && (e.coins ?? 0) > 0 && !e.sunk?.length && !results.some(([, m]) => m === "treasure" || m === "mine")) {
              later(250, () => {
                playCoin();
                popUp({ text: `+${e.coins} 🪙`, color: "#ffe066", small: true });
              });
            }
          });
          break;
        }
        case "sonar":
          playSonar();
          addFx(board, (e.sonar ?? []).map(([c]) => c), "sonar");
          if (!mine) showToast(`📡 ${foeName} escaneó tu zona con el sonar`);
          break;
        case "repair":
          if (mine) {
            playPowerUp();
            if (e.target !== undefined) addFx("own", [e.target], "repair");
          } else showToast(`🔧 ${foeName} reparó uno de sus barcos`);
          break;
        case "shield":
          if (mine) playPowerUp();
          else showToast(`🛡️ ${foeName} activó un escudo`);
          break;
        case "mine":
          if (mine) playPowerUp();
          else showToast(`💣 ${foeName} escondió una mina… ¡cuidado!`);
          break;
        case "double":
          playBonus(10);
          popUp({ text: "🎯 ¡DOBLE!", sub: mine ? "Dispara dos veces" : `${foeName} dispara dos veces`, color: "#ff8fa3", small: true });
          break;
        case "buy":
          if (mine) playCoin();
          else showToast(`🛒 ${foeName} compró ${ITEM_INFO[e.item!]?.emoji ?? "algo"} en la tienda`);
          break;
        case "start":
          playBonus(20);
          popUp({ text: "¡A LA BATALLA!", sub: e.by === seat ? "Empiezas tú" : `Empieza ${foeName}`, color: "#06d6a0" });
          break;
        case "join":
          if (!mine) {
            playPick();
            showToast(`⚓ ${foeName} entró a la sala`);
          }
          break;
      }
    },
    [seat, addFx, later, popUp, showToast],
  );

  const lastSeq = useRef(initial.seq);
  const viewRef = useRef(view);
  useEffect(() => {
    viewRef.current = view;
    const fresh = view.events.filter((e) => e.seq > lastSeq.current);
    if (!fresh.length) return;
    lastSeq.current = view.seq;
    let delay = 0;
    // After being away (phone locked, offline) only replay the latest moves; older ones are already on the board.
    for (const e of fresh.slice(-2)) {
      later(delay, () => playEvent(e, viewRef.current.foe?.name ?? "Tu rival"));
      delay += e.kind === "fire" ? 1100 : 350;
    }
  }, [view, later, playEvent]);

  // Turn changes: show the right board and cheer when it's your go.
  const prev = useRef({ turn: initial.turn, phase: initial.phase });
  useEffect(() => {
    const was = prev.current;
    prev.current = { turn: view.turn, phase: view.phase };
    if (view.phase === "over" && was.phase !== "over") {
      const won = view.winner === seat;
      later(2400, () => {
        if (won) playFanfare();
        else playLifeLost();
        setOverRound(view.round);
      });
      return;
    }
    if (view.phase !== "battle") return;
    const started = was.phase !== "battle";
    if (!started && was.turn === view.turn) return;
    const lastSunk = !!viewRef.current.events.at(-1)?.sunk?.length; // let the sinking blast finish first
    later(started ? 1900 : lastSunk ? 3800 : 1300, () => {
      if (viewRef.current.turn !== view.turn) return;
      if (view.turn === seat) {
        setTab("enemy");
        playPick();
        vibrate(40);
        popUp({ text: "¡TU TURNO!", color: "#06d6a0" });
      } else {
        setTab("own");
      }
    });
  }, [view.turn, view.phase, view.winner, view.round, seat, later, popUp]);

  // ── screens ──
  let screen: React.ReactNode;
  if (view.phase === "lobby") screen = <Lobby view={view} act={actWithToast} busy={busy} onToast={showToast} />;
  else if (view.phase === "placing") screen = <Placement view={view} act={actWithToast} busy={busy} onError={showToast} />;
  else if (view.phase === "battle" || (view.phase === "over" && !showOver))
    screen = (
      <Battle
        view={view}
        act={doAct}
        busy={busy || view.phase === "over"}
        tab={tab}
        setTab={setTab}
        enemyFx={enemyFx}
        ownFx={ownFx}
        shakeEnemy={shakeEnemy}
        shakeOwn={shakeOwn}
        foeOnline={foeOnline || status !== "online"}
        onError={showToast}
      />
    );
  else screen = <GameOver view={view} act={actWithToast} busy={busy} onLeave={() => onLeave()} />;

  const modeLabel = view.mode === "arcade" ? "🕹️ Arcade" : "🎯 Clásico";
  return (
    <main className="pb-bg flex pb-screen w-full flex-col overflow-hidden">
      <div className="pb-safe mx-auto flex h-full w-full max-w-md flex-col gap-2">
        <TopBar onBack={() => onLeave()} sub={`Sala ${view.code} · ${modeLabel}`} right={<ConnBadge status={status} />} />
        {status !== "online" && (
          <div className="pb-pop-in shrink-0 rounded-xl bg-[#ffbe0b]/20 px-3 py-1.5 text-center text-xs font-extrabold text-[#ffe066]">
            📡 Sin conexión, reconectando… Tu partida está guardada, no se pierde nada.
          </div>
        )}
        {screen}
      </div>
      <Pop pop={pop} onDone={clearPop} />
      {boom && <Explosion key={boom.id} text={boom.text} />}
      <Toast text={toast} />
    </main>
  );
}

// ───────────────────────── lobby ─────────────────────────

export function ModePicker({ mode, extraTurn, onChange, disabled }: { mode: Mode; extraTurn: boolean; onChange: (m: Mode, extra: boolean) => void; disabled?: boolean }) {
  return (
    <div className="flex flex-col gap-2">
      <div className="grid grid-cols-2 gap-2">
        {(
          [
            ["classic", "🎯", "Clásico", "Las reglas de siempre"],
            ["arcade", "🕹️", "Arcade", "Monedas, tienda y armas"],
          ] as const
        ).map(([m, emoji, title, blurb]) => (
          <button
            key={m}
            disabled={disabled}
            onClick={() => onChange(m, extraTurn)}
            className={`flex flex-col items-start rounded-2xl border-2 p-2.5 text-left transition active:scale-95 ${
              mode === m ? "border-[#ffe066] bg-[#ffe066]/20" : "border-white/15 bg-white/5"
            }`}
          >
            <span className="text-3xl">{emoji}</span>
            <span className="font-display text-xl leading-none">{title}</span>
            <span className="text-[11px] font-bold text-white/60">{blurb}</span>
          </button>
        ))}
      </div>
      <button
        role="switch"
        aria-checked={extraTurn}
        disabled={disabled}
        onClick={() => onChange(mode, !extraTurn)}
        className="flex items-center gap-3 rounded-2xl bg-white/5 px-3 py-2 text-left"
      >
        <span className="min-w-0 flex-1 text-sm font-extrabold">
          Repite turno si aciertas
          <span className="block text-[11px] font-bold text-white/50">Si le das a un barco, vuelves a disparar</span>
        </span>
        <span className={`relative h-7 w-12 shrink-0 rounded-full transition ${extraTurn ? "bg-[#06d6a0]" : "bg-white/20"}`}>
          <span className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-all ${extraTurn ? "left-6" : "left-1"}`} />
        </span>
      </button>
    </div>
  );
}


function Lobby({ view, act, busy, onToast }: { view: View; act: (a: Action) => Promise<unknown>; busy: boolean; onToast: (m: string) => void }) {
  const [url, setUrl] = useState("");
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- needs window.location
    setUrl(inviteUrl(view.code));
  }, [view.code]);

  const share = async () => {
    playClick();
    const text = `¡Únete a mi Batalla Naval en Pikaboom! Código: ${view.code}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: "Batalla Naval · Pikaboom", text, url });
        return;
      }
    } catch {
      return; // cancelled
    }
    try {
      await navigator.clipboard.writeText(url);
      onToast("🔗 Enlace copiado");
    } catch {
      onToast(`Código: ${view.code}`);
    }
  };

  return (
    <div className="pb-scroll flex min-h-0 flex-1 flex-col items-center gap-3 text-center">
      <div className="pb-pop-in flex flex-col items-center gap-1">
        <span className="text-sm font-black uppercase tracking-widest text-white/60">Código de la sala</span>
        <div className="flex gap-2">
          {view.code.split("").map((ch, i) => (
            <span
              key={i}
              className="pb-pop-in grid h-16 w-14 place-items-center rounded-2xl bg-[#ffe066] font-display text-5xl text-[#1d0842] shadow-[0_6px_0_#b89a1f]"
              style={{ animationDelay: `${i * 70}ms` }}
            >
              {ch}
            </span>
          ))}
        </div>
      </div>
      <div className="flex items-center gap-4">
        {url && <QrCode text={url} size={136} />}
        <div className="flex flex-col items-center gap-2">
          <Radar size={88} />
          <p className="max-w-[9rem] font-display text-lg leading-tight">Esperando a tu rival…</p>
        </div>
      </div>
      <p className="max-w-xs text-xs font-bold text-white/65">
        En el otro teléfono abre Pikaboom → Batalla Naval → <b>Unirme</b> y escribe el código, o escanea el QR con la cámara.
      </p>
      <button onClick={share} className="pb-btn h-14 w-full shrink-0 text-xl" style={{ ["--btn" as string]: "#00bbf9" }}>
        📤 Compartir invitación
      </button>
      <div className="pb-card w-full p-3 text-left">
        <h3 className="mb-2 font-display text-xl">Modo de juego</h3>
        <ModePicker mode={view.mode} extraTurn={view.extraTurn} disabled={busy} onChange={(mode, extraTurn) => void act({ t: "setMode", mode, extraTurn })} />
      </div>
    </div>
  );
}

// ───────────────────────── game over ─────────────────────────

function GameOver({ view, act, busy, onLeave }: { view: View; act: (a: Action) => Promise<unknown>; busy: boolean; onLeave: () => void }) {
  const won = view.winner === view.seat;
  const foe = view.foe!;
  const me = view.me;
  const rows: [string, string | number, string | number][] = [
    ["Disparos", me.stats.shots, foe.stats.shots],
    ["Aciertos", me.stats.hits, foe.stats.hits],
    ["Precisión", `${me.stats.shots ? Math.round((me.stats.hits / Math.max(1, me.stats.shots)) * 100) : 0}%`, `${foe.stats.shots ? Math.round((foe.stats.hits / Math.max(1, foe.stats.shots)) * 100) : 0}%`],
    ["Barcos hundidos", me.stats.sunk, foe.stats.sunk],
  ];
  if (view.mode === "arcade") rows.push(["Monedas ganadas", me.stats.earned, foe.stats.earned]);

  return (
    <div className="flex min-h-0 flex-1 flex-col items-center gap-2 text-center">
      <div className="pb-pop-in flex shrink-0 flex-col items-center">
        <span className="pb-float text-7xl">{won ? "🏆" : "🌊"}</span>
        <h2 className="font-display text-5xl leading-none" style={{ color: won ? "#ffe066" : "#ff8fa3" }}>
          {won ? "¡VICTORIA!" : "DERROTA"}
        </h2>
        <p className="font-bold text-white/70">{won ? `Hundiste toda la flota de ${foe.name}` : `${foe.name} hundió tu flota`}</p>
        <p className="mt-1 rounded-full bg-white/10 px-3 py-0.5 font-display text-lg">
          Marcador: {me.wins} – {foe.wins}
        </p>
      </div>

      <div className="flex min-h-0 w-full flex-1 gap-3">
        <div className="min-h-0 flex-1" style={{ containerType: "size" }}>
          <div className="mx-auto" style={{ width: "min(100cqw, 100cqh)" }}>
            <Board enemy ships={foe.ships} marks={foe.received} />
          </div>
        </div>
      </div>
      <p className="-mt-1 text-[11px] font-black uppercase tracking-widest text-white/50">Así estaba la flota de {foe.name}</p>

      <div className="pb-card w-full shrink-0 p-2.5">
        <div className="grid grid-cols-[1fr_auto_auto] gap-x-4 gap-y-1 text-left text-sm">
          <span />
          <span className="truncate text-center text-xs font-black text-[#7dd3ff]">Tú</span>
          <span className="max-w-20 truncate text-center text-xs font-black text-[#ff8fa3]">{foe.name}</span>
          {rows.map(([label, a, b]) => (
            <div key={label} className="contents">
              <span className="font-extrabold text-white/70">{label}</span>
              <span className="text-center font-display text-lg">{a}</span>
              <span className="text-center font-display text-lg">{b}</span>
            </div>
          ))}
        </div>
      </div>

      {view.seat === 0 && !me.rematch && (
        <div className="flex w-full shrink-0 items-center gap-1.5 rounded-2xl bg-white/5 p-1.5 text-xs font-black">
          <span className="px-1 text-white/60">Revancha en:</span>
          {(
            [
              ["classic", "🎯 Clásico"],
              ["arcade", "🕹️ Arcade"],
            ] as const
          ).map(([m, label]) => (
            <button
              key={m}
              disabled={busy}
              onClick={() => void act({ t: "setMode", mode: m, extraTurn: view.extraTurn })}
              className={`flex-1 rounded-xl py-1.5 transition ${view.mode === m ? "bg-[#ffe066] text-[#1d0842]" : "bg-white/10"}`}
            >
              {label}
            </button>
          ))}
        </div>
      )}

      <div className="grid w-full shrink-0 grid-cols-[1fr_2fr] gap-2">
        <button onClick={onLeave} className="pb-btn h-16 text-xl" style={{ ["--btn" as string]: "#b9a6ff" }}>
          Salir
        </button>
        <button
          onClick={() => void act({ t: "rematch" })}
          disabled={busy || me.rematch}
          data-haptic="heavy"
          className="pb-btn relative h-16 text-2xl"
          style={{ ["--btn" as string]: "#06d6a0" }}
        >
          {me.rematch ? `Esperando a ${foe.name}…` : "⚔️ REVANCHA"}
          {foe.rematch && !me.rematch && (
            <span className="pb-pop-in absolute -top-3 right-2 rounded-full bg-[#ff4d6d] px-2 py-0.5 font-sans text-[10px] font-black text-white">¡{foe.name} quiere!</span>
          )}
        </button>
      </div>
    </div>
  );
}
