"use client";

import { memo } from "react";
import { CELLS, type Mark, rc, SHIP_INFO, type Ship, type ShipType, SIZE } from "@/game/battleship/logic";

export type CellFx = { id: number; cell: number; kind: "splash" | "boom" | "shield" | "mine" | "treasure" | "repair" | "sonar" };

type ShipLike = Pick<Ship, "type" | "r" | "c" | "dir"> & Partial<Pick<Ship, "hits" | "sunk" | "shield">>;

type Props = {
  ships: ShipLike[];
  marks: Record<string, Mark>;
  enemy?: boolean;
  sonar?: Record<string, 0 | 1>;
  mines?: number[];
  /** Cells to preview (weapon area / ship ghost). */
  preview?: number[];
  previewOk?: boolean;
  selected?: number | null;
  selectedShip?: ShipType | null;
  fx?: CellFx[];
  onCell?: (cell: number) => void;
  disabled?: boolean;
  shake?: boolean;
};

const pct = (n: number) => `${(n * 100) / SIZE}%`;

function ShipShape({ ship, selected, enemy }: { ship: ShipLike; selected: boolean; enemy: boolean }) {
  const size = SHIP_INFO[ship.type].size;
  const h = ship.dir === "h";
  const sunk = !!ship.sunk;
  const body = sunk
    ? "linear-gradient(135deg, #5a1d1d, #2a0b0b)"
    : enemy
      ? "linear-gradient(135deg, #b9b3c9, #6d6584)"
      : "linear-gradient(135deg, #c9d3dd, #74879a 55%, #4f6274)";
  return (
    <div
      className={`pointer-events-none absolute transition-all duration-300 ${selected ? "z-[3]" : "z-[1]"}`}
      style={{ left: pct(ship.c), top: pct(ship.r), width: pct(h ? size : 1), height: pct(h ? 1 : size), padding: "1.2%" }}
    >
      <div
        className={`relative h-full w-full ${ship.shield && !sunk ? "bs-shield" : ""} ${selected ? "ring-4 ring-[#ffe066]" : ""}`}
        style={{
          background: body,
          borderRadius: h ? "45% 999px 999px 45% / 50% 999px 999px 50%" : "50% 50% 45% 45% / 999px 999px 45% 45%",
          boxShadow: sunk ? "inset 0 0 0 2px #ff4d4d55" : "inset 0 -3px 0 rgb(0 0 0 / .25), 0 3px 6px rgb(0 0 0 / .35)",
          opacity: sunk ? 0.9 : 1,
        }}
      >
        {/* deck line + portholes */}
        <div
          className="absolute rounded-full"
          style={{
            inset: h ? "38% 18% 38% 14%" : "14% 38% 18% 38%",
            background: sunk ? "#00000055" : "rgb(255 255 255 / .35)",
          }}
        />
        {sunk && <span className="absolute inset-0 grid place-items-center text-[min(4.5vw,22px)]">☠️</span>}
      </div>
    </div>
  );
}

function MarkIcon({ mark, own }: { mark: Mark; own: boolean }) {
  switch (mark) {
    case "miss":
      return <span className="bs-mark-in block h-[28%] w-[28%] rounded-full bg-white/80 shadow" />;
    case "hit":
      return <span className="bs-mark-in bs-flicker text-[min(5vw,24px)] leading-none">🔥</span>;
    case "repaired":
      return <span className="bs-mark-in text-[min(3.6vw,16px)] leading-none opacity-80">🔧</span>;
    case "blocked":
      return <span className="bs-mark-in text-[min(4vw,18px)] leading-none">🛡️</span>;
    case "mine":
      return <span className="bs-mark-in text-[min(4.5vw,20px)] leading-none">💥</span>;
    case "treasure":
      return <span className="bs-mark-in text-[min(4.5vw,20px)] leading-none">{own ? "💸" : "💰"}</span>;
  }
}

function Fx({ fx }: { fx: CellFx }) {
  const [r, c] = rc(fx.cell);
  const center = { left: `${(c + 0.5) * 10}%`, top: `${(r + 0.5) * 10}%` };
  const impact = fx.kind === "splash" ? "#bfe9ff" : fx.kind === "boom" ? "#ff8800" : fx.kind === "sonar" ? "#ffe066" : "#7df9ff";
  const missile = fx.kind === "splash" || fx.kind === "boom" || fx.kind === "mine" || fx.kind === "treasure";
  return (
    <div className="pointer-events-none absolute inset-0 z-[5]">
      {missile && (
        <span className="bs-missile absolute text-[min(6vw,28px)] leading-none" style={center}>
          💣
        </span>
      )}
      <span className="bs-ring absolute h-[10%] w-[10%] rounded-full border-solid" style={{ ...center, borderColor: impact }} />
      {(fx.kind === "boom" || fx.kind === "mine") && (
        <span
          className="bs-burst absolute h-[16%] w-[16%] rounded-full"
          style={{ ...center, background: "radial-gradient(circle, #fff 0%, #ffe066 30%, #ff8800 55%, #ff006e 70%, transparent 72%)" }}
        />
      )}
      {fx.kind === "splash" &&
        [0, 1, 2, 3, 4, 5].map((k) => {
          const a = (k / 6) * Math.PI * 2;
          return (
            <span
              key={k}
              className="bs-drop absolute h-[2.4%] w-[2.4%] rounded-full bg-[#d8f3ff]"
              style={{ ...center, ["--dx" as string]: `${Math.cos(a) * 28}px`, ["--dy" as string]: `${Math.sin(a) * 28 - 10}px` }}
            />
          );
        })}
    </div>
  );
}

export const Board = memo(function Board({
  ships,
  marks,
  enemy = false,
  sonar,
  mines,
  preview,
  previewOk = true,
  selected,
  selectedShip,
  fx,
  onCell,
  disabled,
  shake,
}: Props) {
  const previewSet = new Set(preview ?? []);
  const mineSet = new Set(mines ?? []);
  return (
    <div
      className={`relative aspect-square w-full overflow-hidden rounded-2xl border-4 shadow-2xl ${enemy ? "bs-water-enemy border-[#ff4d6d]/70" : "bs-water border-[#00bbf9]/70"} ${shake ? "bs-hitshake" : ""}`}
    >
      {/* grid lines */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage: "linear-gradient(rgb(255 255 255 / .16) 1px, transparent 1px), linear-gradient(90deg, rgb(255 255 255 / .16) 1px, transparent 1px)",
          backgroundSize: `${100 / SIZE}% ${100 / SIZE}%`,
        }}
      />
      {ships.map((s) => (
        <ShipShape key={s.type} ship={s} selected={selectedShip === s.type} enemy={enemy} />
      ))}
      <div className="absolute inset-0 z-[2] grid" style={{ gridTemplateColumns: `repeat(${SIZE}, 1fr)`, gridTemplateRows: `repeat(${SIZE}, 1fr)` }}>
        {Array.from({ length: CELLS }, (_, i) => {
          const mark = marks[i];
          const intel = sonar?.[i];
          const inPreview = previewSet.has(i);
          return (
            <button
              key={i}
              type="button"
              disabled={disabled || !onCell}
              onClick={() => onCell?.(i)}
              aria-label={`Casilla ${String.fromCharCode(65 + rc(i)[0])}${rc(i)[1] + 1}${mark ? `: ${mark}` : ""}`}
              className="relative grid place-items-center outline-none disabled:cursor-default"
              style={{
                background: inPreview
                  ? previewOk
                    ? "rgb(255 224 102 / .45)"
                    : "rgb(255 46 77 / .5)"
                  : mark === "hit"
                    ? "rgb(255 60 60 / .28)"
                    : undefined,
              }}
            >
              {intel === 1 && !mark && <span className="bs-target absolute inset-[18%] rounded-md border-2 border-dashed border-[#ffe066]" />}
              {intel === 0 && !mark && <span className="absolute h-[14%] w-[14%] rounded-full bg-[#ffe066]/40" />}
              {mineSet.has(i) && !mark && <span className="text-[min(4vw,18px)] leading-none">💣</span>}
              {mark && <MarkIcon mark={mark} own={!enemy} />}
              {selected === i && (
                <span className="bs-target pointer-events-none absolute inset-[6%] grid place-items-center rounded-lg border-[3px] border-[#ffe066] text-[min(4.5vw,20px)] shadow-[0_0_12px_#ffe066]">
                  🎯
                </span>
              )}
            </button>
          );
        })}
      </div>
      {fx?.map((f) => <Fx key={f.id} fx={f} />)}
    </div>
  );
});
