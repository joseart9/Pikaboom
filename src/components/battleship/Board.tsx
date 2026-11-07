"use client";

import { memo, useRef } from "react";
import { area, type Mark, rc, SHIP_INFO, type Ship, shipCells, type ShipType } from "@/game/battleship/logic";
import { AbilityIcon } from "./icons";
import { ShipSprite } from "./ships";
import { MissileFlight, Reticle } from "./weapons";

export type CellFx = { id: number; cell: number; kind: "splash" | "boom" | "shield" | "intercept" | "mine" | "repair" | "sonar" | "place" };

type ShipLike = Pick<Ship, "type" | "r" | "c" | "dir"> & Partial<Pick<Ship, "hits" | "sunk">>;

type Props = {
  /** Board side (10 classic, 14 arcade). */
  n: number;
  ships: ShipLike[];
  marks: Record<string, Mark>;
  enemy?: boolean;
  /** Sonar intel to draw: ours on the enemy sea, or the rival's on our own fleet. */
  sonar?: Record<string, 0 | 1>;
  mines?: number[];
  decoys?: number[];
  /** Our decoys the rival "hit" (they think it was a ship). */
  decoyHits?: number[];
  /** Centres of our active 3×3 shields. */
  shields?: number[];
  /** Cells to preview (weapon area / ship ghost). */
  preview?: number[];
  previewOk?: boolean;
  selected?: number | null;
  selectedShip?: ShipType | null;
  /** Ship currently being dragged: drawn raised above the others. */
  dragShip?: ShipType | null;
  fx?: CellFx[];
  /** Cells whose result must stay hidden until the incoming missile lands. */
  hidden?: number[];
  onCell?: (cell: number) => void;
  disabled?: boolean;
  shake?: boolean;
};

/** Icon size relative to one cell (the board is a size container), so it scales with the grid and with zoom. */
const icon = (k: number) => ({ fontSize: `calc(var(--cell) * ${k})`, lineHeight: 1 });

function ShipShape({ ship, n, selected, lifted, enemy }: { ship: ShipLike; n: number; selected: boolean; lifted: boolean; enemy: boolean }) {
  const pct = (v: number) => `${(v * 100) / n}%`;
  const size = SHIP_INFO[ship.type].size;
  const h = ship.dir === "h";
  const sunk = !!ship.sunk;
  const filters = [
    sunk ? "grayscale(1) sepia(1) hue-rotate(-40deg) saturate(2.5) brightness(.5)" : enemy ? "sepia(.35) hue-rotate(215deg) saturate(1.3)" : "",
    lifted
      ? "drop-shadow(0 0 2px #ffe066) drop-shadow(0 10px 8px rgb(0 0 0 / .5))"
      : selected
        ? "drop-shadow(0 0 2px #ffe066) drop-shadow(0 0 6px #ffe066)"
        : "drop-shadow(0 3px 3px rgb(0 0 0 / .45))",
  ].join(" ");
  return (
    <div
      className={`pointer-events-none absolute transition-all ${lifted ? "z-[4] scale-[1.06] duration-100" : selected ? "z-[3] duration-300" : "z-[1] duration-300"}`}
      style={{ left: pct(ship.c), top: pct(ship.r), width: pct(h ? size : 1), height: pct(h ? 1 : size), filter: filters }}
    >
      <ShipSprite type={ship.type} size={size} vertical={!h} />
    </div>
  );
}

function MarkIcon({ mark, decoy }: { mark: Mark; decoy: boolean }) {
  switch (mark) {
    case "miss":
      return <span className="bs-mark-in block h-[28%] w-[28%] rounded-full bg-white/80 shadow" />;
    case "hit":
      return decoy ? (
        <span className="bs-mark-in block h-[78%] w-[78%]">
          <AbilityIcon id="decoy" className="h-full w-full" />
        </span>
      ) : (
        <span className="bs-mark-in bs-flicker" style={icon(0.75)}>
          🔥
        </span>
      );
    case "repaired":
      return null; // stays red, but no flame: the ship was fixed
    case "mine":
      return (
        <span className="bs-mark-in" style={icon(0.65)}>
          💥
        </span>
      );
    default:
      return null;
  }
}

const MISSILE_KINDS = new Set<CellFx["kind"]>(["splash", "boom", "mine", "shield", "intercept"]);
const IMPACT_COLOR: Partial<Record<CellFx["kind"], string>> = {
  splash: "#bfe9ff",
  boom: "#ff8800",
  sonar: "#ffe066",
  intercept: "#ffffff",
  place: "#06d6a0",
};

function Fx({ fx, n, enemy }: { fx: CellFx; n: number; enemy: boolean }) {
  const probe = useRef<HTMLSpanElement>(null);
  const [r, c] = rc(fx.cell, n);
  const center = { left: `${((c + 0.5) * 100) / n}%`, top: `${((r + 0.5) * 100) / n}%` };
  const cellBox = { width: `${100 / n}%`, height: `${100 / n}%` };
  const ring = { width: `${140 / n}%`, height: `${140 / n}%` };
  const missile = MISSILE_KINDS.has(fx.kind);
  return (
    <div className="pointer-events-none absolute inset-0 z-[5]">
      {missile && (
        <>
          <span ref={probe} className="absolute h-0 w-0" style={center} />
          {/* on the enemy sea it's our shot (from the FUEGO button); on ours it's theirs (from the sky) */}
          <MissileFlight target={probe} n={n} fromLauncher={enemy} />
        </>
      )}
      {fx.kind === "sonar" ? (
        <span className="bs-scan absolute rounded-sm" style={{ ...center, ...cellBox }} />
      ) : (
        <span className="bs-ring absolute rounded-full border-solid" style={{ ...center, ...ring, borderColor: IMPACT_COLOR[fx.kind] ?? "#7df9ff" }} />
      )}
      {(fx.kind === "boom" || fx.kind === "mine") && (
        <span
          className="bs-burst absolute rounded-full"
          style={{ ...center, width: `${220 / n}%`, height: `${220 / n}%`, background: "radial-gradient(circle, #fff 0%, #ffe066 30%, #ff8800 55%, #ff006e 70%, transparent 72%)" }}
        />
      )}
      {fx.kind === "intercept" && (
        <span
          className="bs-burst absolute rounded-full"
          style={{ ...center, width: `${260 / n}%`, height: `${260 / n}%`, background: "radial-gradient(circle, #fff 0%, #bde0ff 35%, #7df9ff 55%, transparent 70%)" }}
        />
      )}
      {fx.kind === "splash" &&
        [0, 1, 2, 3, 4, 5].map((k) => {
          const a = (k / 6) * Math.PI * 2;
          return (
            <span
              key={k}
              className="bs-drop absolute rounded-full bg-[#d8f3ff]"
              style={{ ...center, width: `${24 / n}%`, height: `${24 / n}%`, ["--dx" as string]: `${Math.cos(a) * 28}px`, ["--dy" as string]: `${Math.sin(a) * 28 - 10}px` }}
            />
          );
        })}
    </div>
  );
}

export const Board = memo(function Board({
  n,
  ships,
  marks,
  enemy = false,
  sonar,
  mines,
  decoys,
  decoyHits,
  shields,
  preview,
  previewOk = true,
  selected,
  selectedShip,
  dragShip,
  fx,
  hidden,
  onCell,
  disabled,
  shake,
}: Props) {
  const pct = (v: number) => `${(v * 100) / n}%`;
  const previewSet = new Set(preview ?? []);
  const mineSet = new Set(mines ?? []);
  const decoySet = new Set(decoys ?? []);
  const decoyHitSet = new Set(decoyHits ?? []);
  // Results a missile hasn't landed on yet stay secret (mark, tint and a freshly sunk ship).
  const pending = new Set(hidden ?? []);
  const shown = pending.size
    ? ships.flatMap((s) => (s.sunk && shipCells(s, n).some((c) => pending.has(c)) ? (enemy ? [] : [{ ...s, sunk: false }]) : [s]))
    : ships;
  return (
    <div
      data-board
      className={`relative aspect-square w-full overflow-hidden rounded-2xl border-4 shadow-2xl ${enemy ? "bs-water-enemy border-[#ff4d6d]/70" : "bs-water border-[#00bbf9]/70"} ${shake ? "bs-hitshake" : ""}`}
      style={{ containerType: "inline-size", ["--cell" as string]: `calc(100cqw / ${n})` }}
    >
      {/* moving sea surface: slow swell + two ripple layers drifting apart */}
      <div className="bs-swell pointer-events-none" />
      <div className="bs-ripples pointer-events-none" />
      <div className="bs-ripples-2 pointer-events-none" />
      {/* grid lines */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage: "linear-gradient(rgb(255 255 255 / .16) 1px, transparent 1px), linear-gradient(90deg, rgb(255 255 255 / .16) 1px, transparent 1px)",
          backgroundSize: `${100 / n}% ${100 / n}%`,
        }}
      />
      {shown.map((s) => (
        <ShipShape key={s.type} ship={s} n={n} selected={selectedShip === s.type} lifted={dragShip === s.type} enemy={enemy} />
      ))}
      {/* our 3×3 shields */}
      {shields?.map((ctr) => {
        const cells = area("shield", ctr, n).map((c) => rc(c, n));
        const r0 = Math.min(...cells.map(([r]) => r));
        const c0 = Math.min(...cells.map(([, c]) => c));
        const r1 = Math.max(...cells.map(([r]) => r));
        const c1 = Math.max(...cells.map(([, c]) => c));
        return (
          <div
            key={ctr}
            className="bs-shield-zone pointer-events-none absolute z-[2] rounded-lg border-2 border-[#7df9ff]"
            style={{ left: pct(c0), top: pct(r0), width: pct(c1 - c0 + 1), height: pct(r1 - r0 + 1) }}
          >
            <span className="absolute right-0.5 top-0.5 block" style={{ width: "calc(var(--cell) * .55)", height: "calc(var(--cell) * .55)" }}>
              <AbilityIcon id="shield" className="h-full w-full" />
            </span>
          </div>
        );
      })}
      <div className="absolute inset-0 z-[2] grid" style={{ gridTemplateColumns: `repeat(${n}, 1fr)`, gridTemplateRows: `repeat(${n}, 1fr)` }}>
        {Array.from({ length: n * n }, (_, i) => {
          const mark = pending.has(i) ? undefined : marks[i];
          const intel = sonar?.[i];
          const inPreview = previewSet.has(i);
          const [r, c] = rc(i, n);
          return (
            <button
              key={i}
              type="button"
              disabled={disabled || !onCell}
              onClick={() => onCell?.(i)}
              aria-label={`Casilla ${String.fromCharCode(65 + r)}${c + 1}${mark ? `: ${mark}` : ""}`}
              className="relative grid place-items-center outline-none disabled:cursor-default"
              style={{
                background: inPreview
                  ? previewOk
                    ? "rgb(255 224 102 / .45)"
                    : "rgb(255 46 77 / .5)"
                  : mark === "hit"
                    ? "rgb(255 60 60 / .3)"
                    : mark === "repaired"
                      ? "rgb(255 60 60 / .22)"
                      : undefined,
              }}
            >
              {intel === 1 && !mark && <span className="bs-target absolute inset-[14%] rounded-md border-2 border-dashed border-[#ffe066] bg-[#ffe066]/15" />}
              {intel === 0 && !mark && <span className="absolute h-[16%] w-[16%] rounded-full bg-[#ffe066]/50" />}
              {mineSet.has(i) && !mark && (
                <span className="block h-[72%] w-[72%]">
                  <AbilityIcon id="mine" className="h-full w-full" />
                </span>
              )}
              {decoySet.has(i) && !mark && (
                <span className="block h-[78%] w-[78%] opacity-90">
                  <AbilityIcon id="decoy" className="h-full w-full" />
                </span>
              )}
              {mark && <MarkIcon mark={mark} decoy={decoyHitSet.has(i)} />}
              {selected === i && (
                <span className="bs-target pointer-events-none absolute -inset-[12%] z-[1]">
                  <Reticle />
                </span>
              )}
            </button>
          );
        })}
      </div>
      {/* sunk ships: the skull sits above the flames so it's always readable */}
      {shown
        .filter((s) => s.sunk)
        .map((s) => {
          const size = SHIP_INFO[s.type].size;
          const h = s.dir === "h";
          return (
            <span
              key={`skull-${s.type}`}
              className="bs-mark-in pointer-events-none absolute z-[4] grid place-items-center rounded-full border-2 border-[#ff4d6d] bg-[#1d0842]/85 shadow-[0_0_10px_rgb(0_0_0/.6)]"
              style={{
                left: pct(s.c + (h ? size : 1) / 2),
                top: pct(s.r + (h ? 1 : size) / 2),
                width: "calc(var(--cell) * 1.05)",
                height: "calc(var(--cell) * 1.05)",
                transform: "translate(-50%, -50%)",
                ...icon(0.68),
              }}
            >
              ☠️
            </span>
          );
        })}
      {fx?.map((f) => <Fx key={f.id} fx={f} n={n} enemy={enemy} />)}
    </div>
  );
});
