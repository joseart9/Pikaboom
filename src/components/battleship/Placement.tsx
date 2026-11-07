"use client";

import { useState } from "react";
import { playClick, playError, playPick, playWhoosh } from "@/game/audio";
import {
  type Action,
  fitsBoard,
  FLEET,
  type Placement as P,
  randomFleet,
  rc,
  SHIP_INFO,
  shipCells,
  SIZE,
  type ShipType,
  type View,
} from "@/game/battleship/logic";
import { Board } from "./Board";
import { Radar } from "./bits";

function overlaps(fleet: P[], p: P) {
  const taken = new Set(fleet.filter((f) => f.type !== p.type).flatMap(shipCells));
  return shipCells(p).some((c) => taken.has(c));
}

/** Try to put `p` on the board, nudging it back inside the edges if needed. */
function settle(fleet: P[], p: P): P | null {
  const size = SHIP_INFO[p.type].size;
  const fixed = { ...p, r: p.dir === "v" ? Math.min(p.r, SIZE - size) : p.r, c: p.dir === "h" ? Math.min(p.c, SIZE - size) : p.c };
  return fitsBoard(fixed) && !overlaps(fleet, fixed) ? fixed : null;
}

export function Placement({ view, act, busy, onError }: { view: View; act: (a: Action) => Promise<unknown>; busy: boolean; onError: (msg: string) => void }) {
  const [fleet, setFleet] = useState<P[]>(() =>
    view.me.ships.length === FLEET.length ? view.me.ships.map(({ type, r, c, dir }) => ({ type, r, c, dir })) : randomFleet(),
  );
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
    const next = settle(fleet, { ...cur, dir: cur.dir === "h" ? "v" : "h" });
    if (!next) return fail("No hay espacio para girarlo ahí.");
    playWhoosh();
    replace(next);
  };

  const onCell = (cell: number) => {
    const [r, c] = rc(cell);
    const here = fleet.find((f) => shipCells(f).includes(cell));
    if (here && here.type === selected) return rotate(here.type);
    if (here) {
      playPick();
      setSelected(here.type);
      return;
    }
    if (!selected) return fail("Toca un barco para moverlo.");
    const cur = fleet.find((f) => f.type === selected)!;
    const next = settle(fleet, { ...cur, r, c }) ?? settle(fleet, { ...cur, r, c, dir: cur.dir === "h" ? "v" : "h" });
    if (!next) return fail("Ahí no cabe. Prueba en otro lugar.");
    playClick();
    replace(next);
  };

  const shuffle = () => {
    playWhoosh();
    setFleet(randomFleet());
    setSelected(null);
  };

  const shipsForBoard = fleet.map((p) => ({ ...p, hits: [], sunk: false, shield: false }));

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2">
      <div className="flex shrink-0 items-center justify-between gap-2">
        <div>
          <h2 className="whitespace-nowrap font-display text-2xl leading-none">Acomoda tu flota</h2>
          <p className="text-xs font-bold text-white/60">{ready ? "¡Listo! Esperando al rival…" : "Toca un barco y luego dónde ponerlo. Tócalo otra vez para girarlo."}</p>
        </div>
        <span
          className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-black ${foe?.ready ? "bg-[#06d6a0]/25 text-[#7dffd6]" : "bg-white/10 text-white/70"}`}
        >
          {foe ? (foe.ready ? `✅ ${foe.name} listo` : `⏳ ${foe.name} acomodando`) : "⏳ Sin rival"}
        </span>
      </div>

      <div className="relative min-h-0 flex-1" style={{ containerType: "size" }}>
        <div className="mx-auto" style={{ width: "min(100cqw, 100cqh)" }}>
          <div key={nope} className={nope ? "bs-nope" : ""}>
            <Board ships={shipsForBoard} marks={{}} selectedShip={ready ? null : selected} onCell={ready || busy ? undefined : onCell} />
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
