"use client";

import { type PointerEvent, useRef, useState } from "react";
import { playClick, playError, playPick, playWhoosh } from "@/game/audio";
import {
  type Action,
  ABILITY_INFO,
  fitsBoard,
  fleetProblem,
  FLEET,
  idx,
  type Placement as P,
  randomFleet,
  rc,
  SHIP_INFO,
  SHIP_ABILITIES,
  shipCells,
  type ShipType,
  type View,
} from "@/game/battleship/logic";
import { Board } from "./Board";
import { Radar } from "./bits";

function overlaps(fleet: P[], p: P, n: number) {
  const taken = new Set(fleet.filter((f) => f.type !== p.type).flatMap((f) => shipCells(f, n)));
  return shipCells(p, n).some((c) => taken.has(c));
}

/** Try to put `p` on the board, nudging it back inside the edges if needed. */
function settle(fleet: P[], p: P, n: number): P | null {
  const size = SHIP_INFO[p.type].size;
  const fixed = { ...p, r: p.dir === "v" ? Math.min(p.r, n - size) : p.r, c: p.dir === "h" ? Math.min(p.c, n - size) : p.c };
  return fitsBoard(fixed, n) && !overlaps(fleet, fixed, n) ? fixed : null;
}

const clamp = (n: number, max: number) => Math.max(0, Math.min(max, n));
/** Finger travel (px) before a press on a ship becomes a drag instead of a tap. */
const DRAG_SLOP = 8;

type Drag = { type: ShipType; offset: number; x: number; y: number; id: number; moved: boolean };
type Ghost = { p: P; ok: boolean };

export function Placement({ view, act, busy, onError }: { view: View; act: (a: Action) => Promise<unknown>; busy: boolean; onError: (msg: string) => void }) {
  const n = view.size;
  const arcade = view.mode === "arcade";
  const [fleet, setFleet] = useState<P[]>(() => {
    const saved = view.me.ships.map(({ type, r, c, dir }) => ({ type, r, c, dir }));
    return fleetProblem(saved, n) ? randomFleet(n) : saved;
  });
  const [selected, setSelected] = useState<ShipType | null>(null);
  const [nope, setNope] = useState(0);
  const ready = view.me.ready;
  const foe = view.foe;

  const fail = (msg: string) => {
    playError();
    setNope((n) => n + 1);
    onError(msg);
  };

  const replace = (p: P) => setFleet((f) => f.map((x) => (x.type === p.type ? p : x)));

  const rotate = (type: ShipType) => {
    const cur = fleet.find((f) => f.type === type)!;
    const next = settle(fleet, { ...cur, dir: cur.dir === "h" ? "v" : "h" }, n);
    if (!next) return fail("No hay espacio para girarlo ahí.");
    playWhoosh();
    replace(next);
  };

  // ── drag & drop ──
  const areaRef = useRef<HTMLDivElement>(null);
  const drag = useRef<Drag | null>(null);
  const ghostRef = useRef<Ghost | null>(null);
  const [ghost, setGhostState] = useState<Ghost | null>(null);
  const suppressClickUntil = useRef(0);
  const canEdit = !ready && !busy;

  const setGhost = (g: Ghost | null) => {
    ghostRef.current = g;
    setGhostState(g);
  };

  /** Row/col under a screen point (unclamped), measured inside the board's border. */
  const pointToCell = (x: number, y: number) => {
    const el = areaRef.current?.querySelector<HTMLElement>("[data-board]");
    if (!el) return null;
    const box = el.getBoundingClientRect();
    return [
      Math.floor(((y - box.top - el.clientTop) / el.clientHeight) * n),
      Math.floor(((x - box.left - el.clientLeft) / el.clientWidth) * n),
    ] as const;
  };

  const onPointerDown = (e: PointerEvent) => {
    if (!canEdit || (e.pointerType === "mouse" && e.button !== 0)) return;
    const at = pointToCell(e.clientX, e.clientY);
    if (!at || at[0] < 0 || at[1] < 0 || at[0] >= n || at[1] >= n) return;
    const cell = idx(at[0], at[1], n);
    const ship = fleet.find((f) => shipCells(f, n).includes(cell));
    if (!ship) return;
    drag.current = {
      type: ship.type,
      offset: ship.dir === "h" ? at[1] - ship.c : at[0] - ship.r,
      x: e.clientX,
      y: e.clientY,
      id: e.pointerId,
      moved: false,
    };
  };

  const onPointerMove = (e: PointerEvent) => {
    const d = drag.current;
    if (!d || e.pointerId !== d.id) return;
    if (!d.moved) {
      if (Math.hypot(e.clientX - d.x, e.clientY - d.y) < DRAG_SLOP) return;
      d.moved = true;
      try {
        areaRef.current?.setPointerCapture(e.pointerId); // keep receiving moves if the finger leaves the board
      } catch {
        /* pointer already gone */
      }
      playPick();
      setSelected(d.type);
    }
    const at = pointToCell(e.clientX, e.clientY);
    const ship = fleet.find((f) => f.type === d.type);
    if (!at || !ship) return;
    const size = SHIP_INFO[ship.type].size;
    const p: P = {
      ...ship,
      r: clamp(ship.dir === "v" ? at[0] - d.offset : at[0], n - (ship.dir === "v" ? size : 1)),
      c: clamp(ship.dir === "h" ? at[1] - d.offset : at[1], n - (ship.dir === "h" ? size : 1)),
    };
    const g = ghostRef.current;
    if (g && g.p.r === p.r && g.p.c === p.c) return;
    setGhost({ p, ok: !overlaps(fleet, p, n) });
  };

  const endDrag = (e: PointerEvent, cancelled: boolean) => {
    const d = drag.current;
    if (!d || e.pointerId !== d.id) return;
    drag.current = null;
    if (!d.moved) return;
    // The browser still fires a click after a drag; don't let it count as a tap.
    suppressClickUntil.current = performance.now() + 400;
    const g = ghostRef.current;
    setGhost(null);
    if (cancelled || !g) return;
    if (!g.ok) return fail("Ahí no cabe. Prueba en otro lugar.");
    const cur = fleet.find((f) => f.type === g.p.type)!;
    if (cur.r === g.p.r && cur.c === g.p.c) return;
    playClick();
    replace(g.p);
  };

  const onCell = (cell: number) => {
    if (performance.now() < suppressClickUntil.current) return;
    const [r, c] = rc(cell, n);
    const here = fleet.find((f) => shipCells(f, n).includes(cell));
    if (here && here.type === selected) return rotate(here.type);
    if (here) {
      playPick();
      setSelected(here.type);
      return;
    }
    if (!selected) return fail("Toca un barco para moverlo.");
    const cur = fleet.find((f) => f.type === selected)!;
    const next = settle(fleet, { ...cur, r, c }, n) ?? settle(fleet, { ...cur, r, c, dir: cur.dir === "h" ? "v" : "h" }, n);
    if (!next) return fail("Ahí no cabe. Prueba en otro lugar.");
    playClick();
    replace(next);
  };

  const shuffle = () => {
    playWhoosh();
    setFleet(randomFleet(n));
    setSelected(null);
  };

  const shipsForBoard = fleet.map((p) => ({ ...(ghost?.p.type === p.type ? ghost.p : p), hits: [], sunk: false }));

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2">
      <div className="flex shrink-0 items-center justify-between gap-2">
        <div>
          <h2 className="whitespace-nowrap font-display text-2xl leading-none">Acomoda tu flota</h2>
          <p className="text-xs font-bold text-white/60">
            {ready ? "¡Listo! Esperando al rival…" : "Arrastra los barcos para moverlos. Toca uno dos veces para girarlo."}
          </p>
        </div>
        <span
          className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-black ${foe?.ready ? "bg-[#06d6a0]/25 text-[#7dffd6]" : "bg-white/10 text-white/70"}`}
        >
          {foe ? (foe.ready ? `✅ ${foe.name} listo` : `⏳ ${foe.name} acomodando`) : "⏳ Sin rival"}
        </span>
      </div>

      <div className="relative min-h-0 flex-1" style={{ containerType: "size" }}>
        <div
          ref={areaRef}
          className="mx-auto select-none"
          style={{ width: "min(100cqw, 100cqh)", touchAction: canEdit ? "none" : undefined, WebkitTouchCallout: "none" }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={(e) => endDrag(e, false)}
          onPointerCancel={(e) => endDrag(e, true)}
        >
          <div key={nope} className={nope ? "bs-nope" : ""}>
            <Board
              n={n}
              ships={shipsForBoard}
              marks={{}}
              selectedShip={ready ? null : selected}
              dragShip={ghost?.p.type ?? null}
              preview={ghost ? shipCells(ghost.p, n) : undefined}
              previewOk={ghost?.ok ?? true}
              onCell={canEdit ? onCell : undefined}
            />
          </div>
        </div>
        {ready && (
          <div className="pb-pop-in absolute inset-0 grid place-items-center">
            <div className="pb-card flex flex-col items-center gap-2 bg-[#1d0842]/80 px-6 py-4 text-center">
              <Radar size={84} />
              <p className="font-display text-2xl">Esperando a {foe?.name ?? "tu rival"}…</p>
              <p className="text-xs font-bold text-white/60">La batalla empieza cuando los dos estén listos.</p>
            </div>
          </div>
        )}
      </div>

      {/* fleet legend */}
      <div className="flex shrink-0 flex-wrap justify-center gap-1.5">
        {FLEET.map((s) => (
          <button
            key={s.type}
            disabled={ready}
            onClick={() => {
              playPick();
              setSelected(s.type);
            }}
            className={`flex items-center gap-1 rounded-full px-2 py-1 text-[11px] font-black transition ${selected === s.type && !ready ? "bg-[#ffe066] text-[#1d0842]" : "bg-white/10"}`}
          >
            <span className="flex gap-[2px]">
              {Array.from({ length: s.size }).map((_, i) => (
                <span key={i} className={`h-2 w-2 rounded-sm ${selected === s.type && !ready ? "bg-[#1d0842]" : "bg-white/70"}`} />
              ))}
            </span>
            {s.name}
            {arcade && <span className="tracking-tighter">{SHIP_ABILITIES[s.type].map((a) => ABILITY_INFO[a].emoji).join("")}</span>}
          </button>
        ))}
      </div>

      {ready ? (
        <button onClick={() => act({ t: "unready" })} disabled={busy} className="pb-btn h-14 w-full shrink-0 text-xl" style={{ ["--btn" as string]: "#b9a6ff" }}>
          ✏️ Editar mi flota
        </button>
      ) : (
        <div className="grid shrink-0 grid-cols-[1fr_1fr_1.4fr] gap-2">
          <button onClick={shuffle} disabled={busy} className="pb-btn h-14 text-lg" style={{ ["--btn" as string]: "#b9a6ff" }}>
            🎲 Azar
          </button>
          <button onClick={() => selected && rotate(selected)} disabled={busy || !selected} className="pb-btn h-14 text-lg" style={{ ["--btn" as string]: "#00bbf9" }}>
            ↻ Girar
          </button>
          <button
            onClick={() => {
              setSelected(null);
              void act({ t: "place", fleet });
            }}
            disabled={busy}
            data-haptic="heavy"
            className="pb-btn h-14 text-2xl"
            style={{ ["--btn" as string]: "#06d6a0" }}
          >
            ¡LISTO!
          </button>
        </div>
      )}
    </div>
  );
}
