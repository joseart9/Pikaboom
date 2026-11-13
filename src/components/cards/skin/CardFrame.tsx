import type { ReactNode } from "react";
import type { CardType, Rarity } from "@/game/cards/catalog/types";
import { skinLayer } from "./assets";

export type CardFrameState = "normal" | "playable" | "locked" | "selected";

export interface CardFrameProps {
  type: CardType;
  rarity: Rarity;
  state: CardFrameState;
  children: ReactNode;
}

const GLOW: Record<CardFrameState, string> = {
  normal: "0 3px 8px var(--cg-shadow)",
  playable: "0 0 0 3px var(--cg-valid), 0 0 14px 2px var(--cg-valid)",
  locked: "0 3px 8px var(--cg-shadow)",
  selected: "0 0 0 3px var(--cg-selected), 0 0 22px 6px var(--cg-selected)",
};

// Inner trim per rarity (UI_VISUAL_SYSTEM.md §3, never colour alone): an ink line for most, a gold trim for
// Legendaria, a vivid double rim for Única — on top of the rarity-coloured border.
const TRIM: Partial<Record<Rarity, string>> = {
  legendary: "inset 0 0 0 0.5cqh #1d0842, inset 0 0 0 1.3cqh #f2c14e, inset 0 0 0 1.8cqh #1d0842",
  unique: "inset 0 0 0 0.5cqh #1d0842, inset 0 0 0 1.1cqh #ff006e, inset 0 0 0 1.6cqh #1d0842, inset 0 0 0 2.2cqh #ff7ab8",
};
const TRIM_DEFAULT = "inset 0 0 0 0.5cqh #1d0842";

/** Card body: the frame-mob / frame-spell skin, rarity-coloured rim plus rarity trim, state glow. */
export function CardFrame({ type, rarity, state, children }: CardFrameProps) {
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        borderRadius: "7cqh",
        background:
          skinLayer(type === "spell" ? "frame-spell" : "frame-mob") ??
          `linear-gradient(170deg, ${type === "spell" ? "var(--cg-card-spell)" : "var(--cg-card)"} 0%, #160c30 100%)`,
        border: `max(2px, 1.8cqh) solid var(--cg-rarity-${rarity})`,
        boxShadow: `${TRIM[rarity] ?? TRIM_DEFAULT}, ${GLOW[state]}`,
        filter: state === "locked" ? "saturate(0.55) brightness(0.8)" : undefined,
        transition: "box-shadow var(--cg-dur-fast), filter var(--cg-dur-fast)",
      }}
    >
      {children}
    </div>
  );
}
