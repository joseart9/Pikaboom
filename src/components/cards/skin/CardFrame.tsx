import type { ReactNode } from "react";
import type { CardType, Rarity } from "@/game/cards/catalog/types";

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

/** Card body: rounded rectangle tinted by type, rarity-colored rim, state glow. */
export function CardFrame({ type, rarity, state, children }: CardFrameProps) {
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        borderRadius: "7cqh",
        background: `linear-gradient(170deg, ${type === "spell" ? "var(--cg-card-spell)" : "var(--cg-card)"} 0%, #160c30 100%)`,
        border: `max(2px, 1.8cqh) solid var(--cg-rarity-${rarity})`,
        boxShadow: GLOW[state],
        filter: state === "locked" ? "saturate(0.55) brightness(0.8)" : undefined,
        transition: "box-shadow var(--cg-dur-fast), filter var(--cg-dur-fast)",
      }}
    >
      {children}
    </div>
  );
}
