"use client";

import { useCallback, useEffect, useRef, useState, type CSSProperties, type PointerEvent } from "react";
import { CATALOG } from "@/game/cards/catalog";
import type { EntityId, LegalActions } from "@/game/cards/engine/types";
import type { HandCardView } from "@/game/cards/server/view";
import { CardFace } from "../card/CardFace";
import { HandCard } from "./HandCard";

export interface HandProps {
  cards: HandCardView[];
  legal: LegalActions | null;
  selected: EntityId | null;
  pending: EntityId | null;
  /** The card currently out of the hand (dragged / parked / ghost). */
  away: EntityId | null;
  /** Desktop hover preview allowed right now (off while dragging or aiming). */
  previewEnabled: boolean;
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

/** Delay before the desktop hover preview appears (§17.7). */
export const HOVER_PREVIEW_MS = 300;

function finePointer(): boolean {
  return typeof window !== "undefined" && window.matchMedia("(hover: hover) and (pointer: fine)").matches;
}

export function Hand({ cards, legal, selected, pending, away, previewEnabled, onTap }: HandProps) {
  const overlap = handOverlap(cards.length);
  const [preview, setPreview] = useState<{ iid: EntityId; x: number; top: number } | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clear = useCallback(() => {
    if (timer.current !== null) clearTimeout(timer.current);
    timer.current = null;
  }, []);
  useEffect(() => clear, [clear]);

  // Enter → start the timer; leave / press → hide. Mouse only (touch uses long-press inspect).
  const onHover = useCallback(
    (card: HandCardView, el: HTMLElement | null, e: PointerEvent<HTMLButtonElement>) => {
      clear();
      if (!el || e.pointerType !== "mouse" || !finePointer()) {
        setPreview(null);
        return;
      }
      timer.current = setTimeout(() => {
        timer.current = null;
        if (!el.isConnected) return;
        const r = el.getBoundingClientRect();
        setPreview({ iid: card.iid, x: r.left + r.width / 2, top: r.top });
      }, HOVER_PREVIEW_MS);
    },
    [clear],
  );

  const previewCard = preview && previewEnabled && preview.iid !== away ? cards.find((c) => c.iid === preview.iid) : undefined;
  const previewDef = previewCard ? CATALOG[previewCard.defId] : undefined;

  return (
    <div className="cg-hand" data-cg-anchor="my-hand">
      {cards.map((c, i) => (
        <HandCard
          key={c.iid}
          card={c}
          playable={!!legal?.play[c.iid]}
          selected={selected === c.iid}
          pending={pending === c.iid}
          away={away === c.iid}
          fan={handFan(i, cards.length)}
          overlap={overlap}
          onTap={onTap}
          onHover={onHover}
        />
      ))}
      {preview && previewCard && previewDef && (
        <div className="cg-hand-preview" style={{ "--cg-preview-x": `${preview.x}px`, "--cg-preview-top": `${preview.top}px` } as CSSProperties} aria-hidden>
          <CardFace def={previewDef} overrides={{ cost: previewCard.cost }} state={legal?.play[previewCard.iid] ? "playable" : "normal"} />
        </div>
      )}
    </div>
  );
}
