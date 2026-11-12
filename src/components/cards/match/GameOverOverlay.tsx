"use client";

// Victory / defeat / draw (Phase 11 G.9) with the reason and "Volver al menú". Also shown for stale-abandoned matches.
import Link from "next/link";
import type { EndReasonKey, GameOutcome } from "@/game/cards/client/boardModel";
import { t, type MessageKey } from "@/game/cards/i18n";

const TITLE: Record<GameOutcome, MessageKey> = {
  victory: "match.victory",
  defeat: "match.defeat",
  draw: "match.draw",
  abandoned: "match.abandonedTitle",
};

export function GameOverOverlay({ outcome, reason }: { outcome: GameOutcome; reason: EndReasonKey | null }) {
  return (
    <div className={`cg-overlay cg-gameover cg-gameover--${outcome}`} data-cg-tap role="dialog" aria-modal aria-labelledby="cg-gameover-title">
      <h2 id="cg-gameover-title" className="cg-gameover-title">
        {t(TITLE[outcome])}
      </h2>
      {reason && <p className="cg-gameover-reason">{t(`endReason.${reason}`)}</p>}
      <Link href="/cards" className="cg-button cg-button--primary" data-haptic="medium">
        {t("match.backToMenu")}
      </Link>
    </div>
  );
}
