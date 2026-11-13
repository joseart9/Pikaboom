import { memo, type CSSProperties, type PointerEvent } from "react";
import { CATALOG } from "@/game/cards/catalog";
import { cardName } from "@/game/cards/i18n";
import type { HandCardView } from "@/game/cards/server/view";
import { CardFace } from "../card/CardFace";

export interface HandCardProps {
  card: HandCardView;
  playable: boolean;
  selected: boolean;
  pending: boolean;
  /** Out of the hand right now (dragged, parked, placed as a ghost): keeps its slot but is invisible. */
  away: boolean;
  /** Fan rotation in degrees and overlap fraction (§17.3). */
  fan: number;
  overlap: number;
  onTap: (card: HandCardView) => void;
  onHover?: (card: HandCardView, el: HTMLElement | null, e: PointerEvent<HTMLButtonElement>) => void;
}

export const HandCard = memo(function HandCard({ card, playable, selected, pending, away, fan, overlap, onTap, onHover }: HandCardProps) {
  const def = CATALOG[card.defId];
  if (!def) return null;
  const classes = ["cg-hand-card"];
  if (selected) classes.push("cg-hand-card--selected");
  if (pending) classes.push("cg-hand-card--pending");
  if (away) classes.push("cg-hand-card--away");
  const style = { "--cg-fan": `${fan}deg`, "--cg-overlap": overlap } as CSSProperties;
  return (
    <button
      type="button"
      data-cg-tap
      data-cg-drag="hand"
      data-cg-inspect="hand"
      data-iid={card.iid}
      data-entity-id={card.iid}
      className={classes.join(" ")}
      style={style}
      aria-pressed={selected}
      aria-label={cardName(card.defId)}
      onClick={() => onTap(card)}
      onPointerEnter={onHover ? (e) => onHover(card, e.currentTarget, e) : undefined}
      onPointerLeave={onHover ? (e) => onHover(card, null, e) : undefined}
      onPointerDown={onHover ? (e) => onHover(card, null, e) : undefined}
    >
      <CardFace def={def} overrides={{ cost: card.cost }} state={selected ? "selected" : playable ? "playable" : "locked"} />
    </button>
  );
});
