"use client";

import { useEffect, useMemo, useState } from "react";
import { playClick, playError, playPick } from "@/game/audio";
import {
  type Action,
  isFinal,
  ITEM_INFO,
  type ItemId,
  ITEMS,
  shipCells,
  type View,
  weaponArea,
  type Weapon,
} from "@/game/battleship/logic";
import { Board, type CellFx } from "./Board";

export type Tab = "enemy" | "own";
type Tool = "shot" | ItemId;

const ENEMY_TOOLS: Tool[] = ["shot", "cross", "air", "torpedo", "sonar"];

function toolLabel(tool: Tool) {
  if (tool === "shot") return { emoji: "💥", name: "Disparo" };
  return ITEM_INFO[tool];
}

function actionText(tool: Tool) {
  switch (tool) {
    case "sonar":
      return "📡 ESCANEAR";
    case "repair":
      return "🔧 REPARAR";
    case "shield":
      return "🛡️ PROTEGER";
    case "mine":
      return "💣 PONER MINA";
    case "double":
      return "🎯 ACTIVAR DOBLE";
    default:
      return "🚀 ¡FUEGO!";
  }
}

function hint(tool: Tool) {
  switch (tool) {
    case "repair":
      return "Toca una casilla dañada 🔥 de tu flota";
    case "shield":
      return "Toca el barco que quieres proteger";
    case "mine":
      return "Toca agua libre de tu mapa";
    case "double":
      return "Dispara dos veces este turno";
    case "sonar":
      return "Elige el centro del área a escanear";
    case "torpedo":
      return "Elige la fila: el torpedo sale por la izquierda";
    default:
      return "Elige una casilla del mapa enemigo";
  }
}

export function Battle({
  view,
  act,
  busy,
  tab,
  setTab,
  enemyFx,
  ownFx,
  shakeEnemy,
  shakeOwn,
  foeOnline,
  onError,
}: {
  view: View;
  act: (a: Action) => Promise<string | null>;
  busy: boolean;
  tab: Tab;
  setTab: (t: Tab) => void;
  enemyFx: CellFx[];
  ownFx: CellFx[];
  shakeEnemy: number;
  shakeOwn: number;
  foeOnline: boolean;
  onError: (msg: string) => void;
}) {
  const [tool, setTool] = useState<Tool>("shot");
  const [target, setTarget] = useState<number | null>(null);
  const [storeOpen, setStoreOpen] = useState(false);
  const myTurn = view.turn === view.seat;
  const arcade = view.mode === "arcade";
  const me = view.me;
  const foe = view.foe!;

  // Fresh aim every turn; fall back to the plain shot when an item runs out.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reset aim when the turn changes
    setTarget(null);
  }, [view.turn]);
  useEffect(() => {
    if (tool !== "shot" && !me.inv[tool]) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- item used up
      setTool("shot");
    }
  }, [me.inv, tool]);

  const enemyTool = ENEMY_TOOLS.includes(tool);

  const preview = useMemo(() => {
    if (target === null) return [];
    if (tool === "shield") {
      const ship = me.ships.find((s) => shipCells(s).includes(target));
      return ship ? shipCells(ship) : [];
    }
    if (tool === "shot" || tool === "repair" || tool === "mine") return [];
    if (tool === "cross" || tool === "air" || tool === "torpedo" || tool === "sonar") return weaponArea(tool as Weapon | "sonar", target);
    return [];
  }, [target, tool, me.ships]);

  const pickTool = (t: Tool) => {
    playPick();
    setTool(t);
    setTarget(null);
    if (t === "double") return;
    setTab(ENEMY_TOOLS.includes(t) ? "enemy" : "own");
  };

  const fire = async (cell: number | null) => {
    if (!myTurn || busy) return;
    let action: Action | null = null;
    if (tool === "double") action = { t: "double" };
    else if (cell === null) return;
    else if (tool === "shot" || tool === "cross" || tool === "air" || tool === "torpedo") action = { t: "fire", weapon: tool, cell };
    else if (tool === "sonar") action = { t: "sonar", cell };
    else if (tool === "repair") action = { t: "repair", cell };
    else if (tool === "mine") action = { t: "mine", cell };
    else if (tool === "shield") {
      const ship = me.ships.find((s) => shipCells(s).includes(cell));
      if (!ship) return onError("Toca uno de tus barcos.");
      action = { t: "shield", ship: ship.type };
    }
    if (!action) return;
    const err = await act(action);
    if (err) {
      playError();
      onError(err);
    } else {
      setTarget(null);
      if (tool !== "shot" && (me.inv[tool] ?? 0) <= 1) setTool("shot");
    }
  };

  const onEnemyCell = (cell: number) => {
    if (!myTurn) {
      playError();
      return onError(`Es el turno de ${foe.name}.`);
    }
    if (!enemyTool) return;
    if (tool === "shot" && isFinal(foe.received[cell])) {
      playError();
      return onError("Ya disparaste ahí.");
    }
    if (cell === target) return void fire(cell); // second tap on the same cell = fire
    playPick();
    setTarget(cell);
  };

  const onOwnCell = (cell: number) => {
    if (!myTurn || enemyTool || tool === "double") return;
    if (cell === target) return void fire(cell);
    playPick();
    setTarget(cell);
  };

  const shipsLeft = me.ships.filter((s) => !s.sunk).length;
  const tools: Tool[] = ["shot", ...ITEMS.filter((i) => (me.inv[i.id] ?? 0) > 0).map((i) => i.id)];
  const needsTarget = tool !== "double";

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2">
      {/* scoreline */}
      <div className="grid shrink-0 grid-cols-2 gap-2">
        {[
          { name: `${me.name} (tú)`, left: shipsLeft, coins: me.coins, active: myTurn, color: "#00bbf9", online: true },
          { name: foe.name, left: foe.shipsLeft, coins: foe.coins, active: !myTurn, color: "#ff4d6d", online: foeOnline },
        ].map((p, i) => (
          <div
            key={i}
            className={`flex min-w-0 items-center gap-2 rounded-2xl border-2 px-2 py-1.5 transition ${p.active ? "bg-white/15" : "bg-white/5 opacity-70"}`}
            style={{ borderColor: p.active ? p.color : "transparent" }}
          >
            <span className="relative text-2xl">
              {i === 0 ? "⚓" : "🏴‍☠️"}
              {i === 1 && <span className={`absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full border-2 border-[#2b0a57] ${p.online ? "bg-[#06d6a0]" : "bg-[#ff4d6d]"}`} />}
            </span>
            <div className="min-w-0 flex-1 leading-tight">
              <div className="truncate text-xs font-black">{p.name}</div>
              <div className="flex items-center gap-2 text-[11px] font-extrabold text-white/70">
                <span>🚢 {p.left}/5</span>
                {arcade && <span className="text-[#ffe066]">🪙 {p.coins}</span>}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* turn banner */}
      <div
        key={`${view.turn}-${myTurn}`}
        className="pb-pop-in shrink-0 rounded-2xl px-3 py-2 text-center font-display text-xl leading-tight"
        style={{ background: myTurn && foeOnline ? "#06d6a0" : "rgb(255 255 255 / .1)", color: myTurn && foeOnline ? "#1d0842" : "#fff" }}
      >
        {!foeOnline ? (
          <span className="text-base text-[#ffe066]">📵 {foe.name} se desconectó… la partida sigue guardada, esperando a que vuelva.</span>
        ) : myTurn ? (
          <>
            🎯 ¡Tu turno!{view.shotsLeft > 1 && <span className="text-base"> · {view.shotsLeft} disparos</span>}
            <span className="block font-sans text-xs font-black opacity-70">{hint(tool)}</span>
          </>
        ) : (
          <>
            ⏳ {foe.name} está apuntando…
            <span className="block font-sans text-xs font-black text-white/60">Mira tu flota y cruza los dedos 🤞</span>
          </>
        )}
      </div>

      {/* board tabs */}
      <div className="grid shrink-0 grid-cols-2 gap-1 rounded-2xl bg-white/10 p-1">
        {(
          [
            ["enemy", `🏴‍☠️ Mar enemigo`],
            ["own", `⚓ Mi flota`],
          ] as const
        ).map(([t, label]) => (
          <button
            key={t}
            role="tab"
            aria-selected={tab === t}
            onClick={() => {
              playClick();
              setTab(t);
            }}
            className={`rounded-xl py-1.5 text-sm font-black transition ${tab === t ? (t === "enemy" ? "bg-[#ff4d6d] text-[#1d0842]" : "bg-[#00bbf9] text-[#1d0842]") : "text-white/70"}`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* the board */}
      <div className="min-h-0 flex-1" style={{ containerType: "size" }}>
        <div className="mx-auto" style={{ width: "min(100cqw, 100cqh)" }}>
          {tab === "enemy" ? (
            <Board
              key="enemy"
              enemy
              ships={foe.ships}
              marks={foe.received}
              sonar={me.sonar}
              preview={enemyTool ? preview : []}
              selected={enemyTool ? target : null}
              fx={enemyFx}
              shake={shakeEnemy > 0}
              onCell={onEnemyCell}
              disabled={busy}
            />
          ) : (
            <Board
              key="own"
              ships={me.ships}
              marks={me.received}
              mines={me.mines}
              preview={!enemyTool ? preview : []}
              selected={!enemyTool && tool !== "double" ? target : null}
              fx={ownFx}
              shake={shakeOwn > 0}
              onCell={onOwnCell}
              disabled={busy}
            />
          )}
        </div>
      </div>

      {/* arcade arsenal */}
      {arcade && (
        <div className="flex shrink-0 items-stretch gap-2">
          <button
            onClick={() => {
              playClick();
              setStoreOpen(true);
            }}
            className="pb-btn shrink-0 flex-col gap-0 px-3 py-1 text-base leading-none"
            style={{ ["--btn" as string]: "#ffe066" }}
          >
            <span className="text-xl">🛒</span>
            <span className="text-xs">🪙 {me.coins}</span>
          </button>
          <div className="pb-scroll flex min-w-0 flex-1 gap-1.5 overflow-x-auto py-1">
            {tools.map((t) => {
              const info = toolLabel(t);
              const count = t === "shot" ? "∞" : `×${me.inv[t]}`;
              return (
                <button
                  key={t}
                  onClick={() => pickTool(t)}
                  className={`flex shrink-0 flex-col items-center justify-center rounded-xl border-2 px-2 py-1 text-[10px] font-black leading-tight transition active:scale-95 ${
                    tool === t ? "border-[#ffe066] bg-[#ffe066]/25" : "border-white/15 bg-white/10"
                  }`}
                >
                  <span className="text-lg leading-none">{info.emoji}</span>
                  <span className="max-w-16 truncate">{info.name}</span>
                  <span className="text-white/60">{count}</span>
                </button>
              );
            })}
            {tools.length === 1 && <span className="self-center px-1 text-[11px] font-bold text-white/50">Gana monedas acertando y compra armas en la tienda →</span>}
          </div>
        </div>
      )}

      <button
        onClick={() => void fire(target)}
        disabled={!myTurn || busy || (needsTarget && target === null)}
        data-haptic="heavy"
        className="pb-btn h-16 w-full shrink-0 text-3xl"
        style={{ ["--btn" as string]: myTurn ? "#ff4d6d" : "#b9a6ff" }}
      >
        {busy ? "⏳ Enviando…" : myTurn ? actionText(tool) : "Esperando…"}
      </button>

      {storeOpen && <Store view={view} act={act} onClose={() => setStoreOpen(false)} onError={onError} />}
    </div>
  );
}

function Store({ view, act, onClose, onError }: { view: View; act: (a: Action) => Promise<string | null>; onClose: () => void; onError: (m: string) => void }) {
  const [buying, setBuying] = useState<ItemId | null>(null);
  const coins = view.me.coins;
  const buy = async (id: ItemId) => {
    setBuying(id);
    const err = await act({ t: "buy", item: id });
    setBuying(null);
    if (err) {
      playError();
      onError(err);
    }
  };
  return (
    <div className="fixed inset-0 z-30 flex flex-col justify-end bg-[#1a0636]/70" onClick={onClose}>
      <div
        className="bs-sheet mx-auto flex max-h-[85dvh] w-full max-w-md flex-col gap-2 rounded-t-[2rem] border-2 border-b-0 border-white/20 bg-[#2b0a57] px-4 pt-4 pb-[max(env(safe-area-inset-bottom),16px)] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 className="font-display text-3xl">🛒 Tienda</h2>
          <span key={coins} className="pb-pop-in rounded-full bg-[#ffe066] px-3 py-1 font-display text-xl text-[#1d0842]">
            🪙 {coins}
          </span>
        </div>
        <p className="text-xs font-bold text-white/60">Comprar no gasta tu turno. Las armas de ataque usan tu disparo; las tácticas, no.</p>
        <div className="pb-scroll -mx-1 flex min-h-0 flex-col gap-2 px-1 pb-1">
          {ITEMS.map((it, i) => {
            const owned = view.me.inv[it.id] ?? 0;
            const afford = coins >= it.price;
            return (
              <div key={it.id} className="pb-pop-in pb-card flex items-center gap-3 p-2.5" style={{ animationDelay: `${i * 35}ms` }}>
                <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-white/10 text-3xl">{it.emoji}</span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="font-display text-lg leading-none">{it.name}</span>
                    {owned > 0 && <span className="rounded-full bg-[#06d6a0] px-1.5 text-[10px] font-black text-[#1d0842]">×{owned}</span>}
                  </div>
                  <p className="text-[11px] font-bold leading-snug text-white/65">{it.desc}</p>
                </div>
                <button
                  onClick={() => void buy(it.id)}
                  disabled={!afford || buying !== null}
                  className="pb-btn h-11 shrink-0 px-3 text-base"
                  style={{ ["--btn" as string]: afford ? "#ffe066" : "#8d86a6" }}
                >
                  {buying === it.id ? "…" : `🪙${it.price}`}
                </button>
              </div>
            );
          })}
        </div>
        <button onClick={onClose} className="pb-btn h-14 w-full shrink-0 text-xl" style={{ ["--btn" as string]: "#b9a6ff" }}>
          Cerrar
        </button>
      </div>
    </div>
  );
}
