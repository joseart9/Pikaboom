"use client";

// Opening-hand overlay (§6.2, Phase 11 G.6): tap cards to mark them for replacement (red ✕), "Confirmar" sends
// `mulligan`, then "Esperando a tu rival…" until both are done. The countdown is the mulligan deadline.
import { useState } from "react";
import type { MatchClient } from "@/game/cards/client/matchClient";
import { mulliganReducer, replaceList } from "@/game/cards/client/mulligan";
import { CATALOG } from "@/game/cards/catalog";
import type { EntityId } from "@/game/cards/engine/types";
import { cardName, t } from "@/game/cards/i18n";
import type { MeView } from "@/game/cards/server/view";
import { CardFace } from "../card/CardFace";
import { TurnTimer } from "./TurnTimer";

export interface MulliganOverlayProps {
  client: MatchClient;
  me: MeView;
  iGoFirst: boolean;
  /** `legal.mulligan`: you may still choose. */
  canMulligan: boolean;
  pending: boolean;
}

export function MulliganOverlay({ client, me, iGoFirst, canMulligan, pending }: MulliganOverlayProps) {
  const hand = me.hand.map((c) => c.iid);
  const [marked, setMarked] = useState<EntityId[]>([]);
  const shown = canMulligan ? replaceList(marked, hand) : [];
  const locked = !canMulligan || pending;

  return (
    <div className="cg-overlay cg-mulligan" data-cg-tap>
      <div className="cg-mulligan-head">
        <h2 className="cg-mulligan-title">{t("match.mulliganTitle")}</h2>
        <TurnTimer client={client} silent />
      </div>
      <p className="cg-mulligan-sub">{iGoFirst ? t("match.youGoFirst") : t("match.foeGoesFirst")}</p>
      <div className="cg-mulligan-cards">
        {me.hand.map((card) => {
          const def = CATALOG[card.defId];
          if (!def) return null;
          const isMarked = shown.includes(card.iid);
          return (
            <button
              key={card.iid}
              type="button"
              data-iid={card.iid}
              data-cg-inspect="hand"
              className={`cg-mulligan-card${isMarked ? " cg-mulligan-card--marked" : ""}`}
              disabled={locked}
              aria-pressed={isMarked}
              aria-label={isMarked ? `${cardName(card.defId)} · ${t("match.mulliganMarked")}` : cardName(card.defId)}
              onClick={() => setMarked((m) => mulliganReducer(m, { t: "toggle", iid: card.iid }, hand))}
            >
              <CardFace def={def} overrides={{ cost: card.cost }} state={isMarked ? "locked" : "normal"} />
              {isMarked && (
                <span className="cg-mulligan-x" aria-hidden>
                  ✕
                </span>
              )}
            </button>
          );
        })}
      </div>
      {canMulligan ? (
        <div className="cg-mulligan-actions">
          <span className="cg-mulligan-hint">{t("match.mulliganHint")}</span>
          <button
            type="button"
            className="cg-button cg-button--primary"
            disabled={pending}
            onClick={() => void client.send({ t: "mulligan", replace: replaceList(marked, hand) })}
          >
            {t("match.confirm")}
          </button>
        </div>
      ) : (
        <p className="cg-mulligan-wait">{t("match.waitingFoe")}</p>
      )}
    </div>
  );
}
