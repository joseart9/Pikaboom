"use client";

// The floating dragged card (§17.4, §17.7). React renders it once when the drag starts (and again only when its
// zone/validity changes); its position is written to `style.transform` by the drag controller's frame listener.
import { useCallback } from "react";
import { CATALOG } from "@/game/cards/catalog";
import { isReducedMotion } from "@/game/cards/client/animation/motion";
import type { DragController } from "@/game/cards/client/drag";
import type { HandCardView } from "@/game/cards/server/view";
import { CardFace } from "../card/CardFace";

export interface DragLayerProps {
  controller: DragController;
  /** The card following the pointer, or null. */
  dragging: { card: HandCardView; valid: boolean; overBoard: boolean } | null;
  /** A dropped spell parked at its release point while it waits for a target or for the server (a "ghost"). */
  parked: { card: HandCardView; x: number; y: number } | null;
}

/**
 * Slides a hand card back into its slot from `from` (a release point), 240 ms (§17.7 cancel/rollback). Uses the
 * independent `translate` property so the card's own fan transform is untouched.
 */
export function animateBackToHand(el: HTMLElement, from: { x: number; y: number }): void {
  if (typeof el.animate !== "function") return;
  const r = el.getBoundingClientRect();
  const dx = from.x - (r.left + r.width / 2);
  const dy = from.y - (r.top + r.height / 2);
  const reduced = isReducedMotion();
  el.animate([{ translate: `${dx}px ${dy}px`, opacity: 0.85 }, { translate: "0px 0px", opacity: 1 }], {
    duration: reduced ? 80 : 240,
    easing: "cubic-bezier(0.2, 0.9, 0.3, 1)",
  });
}

/** The pointer sits a little below the card's centre so a finger does not hide it. */
const GRAB_Y = 0.62;

function FloatingCard({ controller, card, valid, overBoard }: { controller: DragController; card: HandCardView; valid: boolean; overBoard: boolean }) {
  const ref = useCallback(
    (el: HTMLDivElement | null) => {
      if (!el) return;
      const w = el.offsetWidth;
      const h = el.offsetHeight;
      const place = (x: number, y: number) => {
        el.style.transform = `translate3d(${x - w / 2}px, ${y - h * GRAB_Y}px, 0)`;
      };
      const p = controller.pointer();
      place(p.x, p.y);
      return controller.addFrameListener(place);
    },
    [controller],
  );
  const def = CATALOG[card.defId];
  if (!def) return null;
  const classes = ["cg-drag-card"];
  if (!valid) classes.push("cg-drag-card--invalid");
  if (overBoard) classes.push("cg-drag-card--board");
  return (
    <div ref={ref} className={classes.join(" ")} aria-hidden>
      <div className="cg-drag-card-inner">
        <CardFace def={def} overrides={{ cost: card.cost }} state={valid ? "playable" : "locked"} />
      </div>
    </div>
  );
}

export function DragLayer({ controller, dragging, parked }: DragLayerProps) {
  const parkedDef = parked ? CATALOG[parked.card.defId] : undefined;
  return (
    <>
      {dragging && <FloatingCard controller={controller} card={dragging.card} valid={dragging.valid} overBoard={dragging.overBoard} />}
      {parked && parkedDef && (
        <div className="cg-drag-card cg-drag-card--parked" data-cg-parked style={{ left: parked.x, top: parked.y }} aria-hidden>
          <div className="cg-drag-card-inner">
            <CardFace def={parkedDef} overrides={{ cost: parked.card.cost }} />
          </div>
        </div>
      )}
    </>
  );
}
