"use client";

// "¡Tu turno!" / "Turno rival" flash on every turn change (Phase 11 G.7). Pure CSS animation keyed by the turn
// number; the turn the screen opened on (refresh, resume) is not announced.
import { useState } from "react";
import type { Phase } from "@/game/cards/engine/types";
import { t } from "@/game/cards/i18n";

export function TurnBanner({ turn, mine, phase }: { turn: number; mine: boolean; phase: Phase }) {
  const [openedOn] = useState(turn);
  if (phase !== "playing" || turn === openedOn) return null;
  return (
    <div className="cg-turn-banner-wrap" aria-live="polite">
      <div key={turn} className={`cg-turn-banner cg-turn-banner--${mine ? "mine" : "foe"}`}>
        {mine ? t("match.yourTurn") : t("match.foeTurn")}
      </div>
    </div>
  );
}
