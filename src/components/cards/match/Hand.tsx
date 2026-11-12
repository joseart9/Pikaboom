import type { EntityId, LegalActions } from "@/game/cards/engine/types";
import type { HandCardView } from "@/game/cards/server/view";
import { HandCard } from "./HandCard";

export interface HandProps {
  cards: HandCardView[];
  legal: LegalActions | null;
  selected: EntityId | null;
  pending: EntityId | null;
  onTap: (card: HandCardView) => void;
}

/** Overlap grows with the hand size so 10 cards still fit (§17.3). */
export function handOverlap(n: number): number {
  return Math.min(0.55, 0.12 + Math.max(0, n - 4) * 0.07);
}

/** ±2.5° per card from the centre. */
export function handFan(i: number, n: number): number {
  return (i - (n - 1) / 2) * 2.5;
}

export function Hand({ cards, legal, selected, pending, onTap }: HandProps) {
  const overlap = handOverlap(cards.length);
  return (
    <div className="cg-hand">
      {cards.map((c, i) => (
        <HandCard
          key={c.iid}
          card={c}
          playable={!!legal?.play[c.iid]}
          selected={selected === c.iid}
          pending={pending === c.iid}
          fan={handFan(i, cards.length)}
          overlap={overlap}
          onTap={onTap}
        />
      ))}
    </div>
  );
}
