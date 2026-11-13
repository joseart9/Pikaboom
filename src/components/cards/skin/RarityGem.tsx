import type { Rarity } from "@/game/cards/catalog/types";

export interface RarityGemProps {
  rarity: Rarity;
  size: string;
  title?: string;
}

// One silhouette per rarity (UI_VISUAL_SYSTEM.md §3: rarity is never colour alone), 10×10 box, growing in weight:
// Básica round stud · Normal diamond · Rara faceted diamond · Mágica hexagon · Legendaria 4-point star · Única
// asymmetric 6-point crest.
const SHAPES: Record<Rarity, { d: string; facet?: string }> = {
  basic: { d: "M5 2.2A2.8 2.8 0 1 1 4.99 2.2Z" },
  common: { d: "M5 1 9 5 5 9 1 5Z" },
  rare: { d: "M5 0.5 9.5 5 5 9.5 0.5 5Z", facet: "M5 0.5 5 5 0.5 5Z" },
  magic: { d: "M5 0.4 9 2.7V7.3L5 9.6 1 7.3V2.7Z", facet: "M5 0.4 5 5 1 7.3V2.7Z" },
  legendary: { d: "M5 0 6.4 3.6 10 5 6.4 6.4 5 10 3.6 6.4 0 5 3.6 3.6Z", facet: "M5 0 5 5 0 5 3.6 3.6Z" },
  unique: { d: "M5 0 6.2 3.2 9.6 2.4 7.4 5.2 9.2 8.6 5.6 7.4 4 10 3.4 6.8 0.4 6 2.8 4 1.6 0.8 4.4 2.6Z", facet: "M5 0 4.4 2.6 1.6 0.8 2.8 4 0.4 6 5 5Z" },
};

/** Small rarity gem: shape and colour both encode the rarity. */
export function RarityGem({ rarity, size, title }: RarityGemProps) {
  const s = SHAPES[rarity];
  return (
    <svg
      viewBox="-1 -1 12 12"
      style={{ width: size, height: size, display: "block" }}
      role={title ? "img" : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
      data-rarity={rarity}
    >
      {title && <title>{title}</title>}
      <path d={s.d} fill={`var(--cg-rarity-${rarity})`} stroke="#1d0842" strokeWidth={1.2} strokeLinejoin="round" />
      {s.facet && <path d={s.facet} fill="#ffffff" opacity={0.45} />}
    </svg>
  );
}
