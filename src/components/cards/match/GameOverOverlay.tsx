"use client";

// Victory / defeat / draw (Phase 11 G.9) with the reason and "Volver al menú". Also shown for stale-abandoned matches.
// Phase 16: the viewer's Oro reward ("+100 Oro" + the first-win bonus), or why the match paid nothing.
import Link from "next/link";
import type { EndReasonKey, GameOutcome } from "@/game/cards/client/boardModel";
import { rewardSummary } from "@/game/cards/client/rewards";
import type { MatchReward } from "@/game/cards/collection/wallet";
import { t, type MessageKey } from "@/game/cards/i18n";
import { CurrencyBadge } from "../skin";

const TITLE: Record<GameOutcome, MessageKey> = {
  victory: "match.victory",
  defeat: "match.defeat",
  draw: "match.draw",
  abandoned: "match.abandonedTitle",
};

export function GameOverOverlay({ outcome, reason, rewards }: { outcome: GameOutcome; reason: EndReasonKey | null; rewards?: MatchReward | null }) {
  const summary = rewards ? rewardSummary(rewards) : null;
  return (
    <div className={`cg-overlay cg-gameover cg-gameover--${outcome}`} data-cg-tap role="dialog" aria-modal aria-labelledby="cg-gameover-title">
      <h2 id="cg-gameover-title" className="cg-gameover-title">
        {t(TITLE[outcome])}
      </h2>
      {reason && <p className="cg-gameover-reason">{t(`endReason.${reason}`)}</p>}
      {summary && (
        <div className={`cg-gameover-reward${summary.headline ? "" : " cg-gameover-reward--none"}`} role="status">
          {summary.headline && rewards && (
            <span className="cg-gameover-reward-amount" aria-label={summary.headline}>
              <CurrencyBadge amount={rewards.amount} unit={t("economy.gold")} prefix="+" />
            </span>
          )}
          {summary.notes.map((note) => (
            <span key={note} className="cg-gameover-reward-note">
              {note}
            </span>
          ))}
        </div>
      )}
      <Link href="/cards" className="cg-button cg-button--primary" data-haptic="medium">
        {t("match.backToMenu")}
      </Link>
    </div>
  );
}
