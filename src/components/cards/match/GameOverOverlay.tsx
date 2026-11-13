"use client";

// Victory / defeat / draw (Phase 11 G.9) with the reason and "Volver al menú". Also shown for stale-abandoned matches.
// Phase 16: the viewer's Oro reward ("+100 Oro" + the first-win bonus), or why the match paid nothing.
// Phase 20: the victory/defeat sequence — the title slams in; victory rains confetti, defeat cracks the title.
// CSS-only (transform/opacity); reduced motion shows the static end state.
import Link from "next/link";
import type { CSSProperties } from "react";
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

/** 28 confetti pieces: horizontal position (%), delay (ms), fall duration (ms), drift (px), spin (turns). Fixed table. */
const CONFETTI = Array.from({ length: 28 }, (_, i) => ({
  x: (i * 37) % 100,
  delay: (i * 113) % 900,
  dur: 1700 + ((i * 271) % 1100),
  drift: ((i * 53) % 120) - 60,
  spin: 1 + (i % 3),
}));

export function GameOverOverlay({ outcome, reason, rewards }: { outcome: GameOutcome; reason: EndReasonKey | null; rewards?: MatchReward | null }) {
  const summary = rewards ? rewardSummary(rewards) : null;
  return (
    <div className={`cg-overlay cg-gameover cg-gameover--${outcome}`} data-cg-tap role="dialog" aria-modal aria-labelledby="cg-gameover-title">
      {outcome === "victory" && (
        <div className="cg-gameover-confetti" aria-hidden>
          {CONFETTI.map((c, i) => (
            <span
              key={i}
              style={{ "--x": `${c.x}%`, "--delay": `${c.delay}ms`, "--dur": `${c.dur}ms`, "--drift": `${c.drift}px`, "--spin": `${c.spin}turn` } as CSSProperties}
            />
          ))}
        </div>
      )}
      <div className="cg-gameover-title-wrap">
        <h2 id="cg-gameover-title" className="cg-gameover-title">
          {t(TITLE[outcome])}
        </h2>
        {outcome === "defeat" && (
          <svg className="cg-gameover-crack" viewBox="0 0 200 60" preserveAspectRatio="none" aria-hidden>
            <path d="M92 0 L100 18 L88 27 L104 40 L96 60 M100 18 L124 22 L138 12 M88 27 L64 31 L52 44 M104 40 L130 47 L146 58" />
          </svg>
        )}
      </div>
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
