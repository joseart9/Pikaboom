import type { Rarity } from "@/game/cards/catalog/types";

export interface RarityGemProps {
  rarity: Rarity;
  size: string;
  title?: string;
}

/** Small rarity-colored gem. */
export function RarityGem({ rarity, size, title }: RarityGemProps) {
  return (
    <svg viewBox="0 0 10 10" style={{ width: size, height: size, display: "block" }} aria-label={title}>
      {title && <title>{title}</title>}
      <path d="M5 0.5 L9.5 5 L5 9.5 L0.5 5 Z" fill={`var(--cg-rarity-${rarity})`} stroke="#1d0842" strokeWidth={1} />
    </svg>
  );
}
