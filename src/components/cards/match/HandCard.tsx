import { memo, type CSSProperties } from "react";
import { CATALOG } from "@/game/cards/catalog";
import { cardName } from "@/game/cards/i18n";
import type { HandCardView } from "@/game/cards/server/view";
import { CardFace } from "../card/CardFace";

export interface HandCardProps {
  card: HandCardView;
  playable: boolean;
  selected: boolean;
  pending: boolean;
  /** Fan rotation in degrees and overlap fraction (§17.3). */
  fan: number;
  overlap: number;
  onTap: (card: HandCardView) => void;
}

export const HandCard = memo(function HandCard({ card, playable, selected, pending, fan, overlap, onTap }: HandCardProps) {
  const def = CATALOG[card.defId];
  if (!def) return null;
  const classes = ["cg-hand-card"];
  if (selected) classes.push("cg-hand-card--selected");
  if (pending) classes.push("cg-hand-card--pending");
  const style = { "--cg-fan": `${fan}deg`, "--cg-overlap": overlap } as CSSProperties;
  return (
    <button
      type="button"
      data-cg-tap
      data-iid={card.iid}
      className={classes.join(" ")}
      style={style}
      aria-pressed={selected}
      aria-label={cardName(card.defId)}
      onClick={() => onTap(card)}
    >
      <CardFace def={def} overrides={{ cost: card.cost }} state={selected ? "selected" : playable ? "playable" : "locked"} />
    </button>
  );
});
