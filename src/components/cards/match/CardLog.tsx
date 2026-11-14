"use client";

// Card log on the left edge of the battlefield (mirrors my mana bar on the right): every card played and every unit
// slain, oldest at the top, newest at the bottom. It scrolls on its own and follows new entries unless the player
// has scrolled up to read older ones. Tapping an entry opens the card's inspect sheet. Styles: `.cg-cardlog*`.
import { useLayoutEffect, useRef } from "react";
import { CATALOG } from "@/game/cards/catalog";
import type { CardId } from "@/game/cards/catalog/types";
import type { CardLogEntry } from "@/game/cards/client/cardLog";
import { useMatchSelector, type MatchClient } from "@/game/cards/client/matchClient";
import type { Seat } from "@/game/cards/engine/types";
import { cardName, t } from "@/game/cards/i18n";
import { CardArt, GameIcon } from "../skin";

/** Within this many px of the bottom counts as "following" the newest entries. */
const STICK_PX = 24;

function entryLabel(e: CardLogEntry, mine: boolean): string {
  const name = cardName(e.defId);
  if (e.kind === "played") return mine ? t("match.logPlayedMine", { name }) : t("match.logPlayedFoe", { name });
  return mine ? t("match.logSlainMine", { name }) : t("match.logSlainFoe", { name });
}

export function CardLog({ client, mySeat, onInspect }: { client: MatchClient; mySeat: Seat; onInspect: (defId: CardId) => void }) {
  const log = useMatchSelector(client, (s) => s.cardLog);
  const listRef = useRef<HTMLOListElement | null>(null);
  const stick = useRef(true);

  // Follow the newest entry (also on first paint) unless the player scrolled up.
  useLayoutEffect(() => {
    const el = listRef.current;
    if (el && stick.current) el.scrollTop = el.scrollHeight;
  }, [log]);

  const onScroll = () => {
    const el = listRef.current;
    if (el) stick.current = el.scrollHeight - el.scrollTop - el.clientHeight <= STICK_PX;
  };

  return (
    <nav className="cg-cardlog" aria-label={t("match.cardLog")} data-cg-tap>
      <span className="cg-cardlog-head" title={t("match.cardLog")} aria-hidden>
        <GameIcon name="hand" size="1em" />
      </span>
      <ol ref={listRef} className="cg-cardlog-list" onScroll={onScroll}>
        {log.length === 0 && (
          <li className="cg-cardlog-empty" title={t("match.cardLogEmpty")}>
            <span className="cg-sr-only">{t("match.cardLogEmpty")}</span>
          </li>
        )}
        {log.map((e, i) => {
          const def = CATALOG[e.defId];
          const mine = e.seat === mySeat;
          const label = entryLabel(e, mine);
          const newTurn = e.turn > 0 && (i === 0 || log[i - 1].turn !== e.turn);
          return (
            <li key={e.seq} className="cg-cardlog-row">
              {newTurn && (
                <span className="cg-cardlog-turn" title={t("match.logTurn", { n: e.turn })}>
                  {e.turn}
                </span>
              )}
              <button
                type="button"
                className={`cg-cardlog-item cg-cardlog-item--${mine ? "mine" : "foe"} cg-cardlog-item--${e.kind}`}
                title={label}
                aria-label={label}
                onClick={(ev) => {
                  ev.stopPropagation();
                  if (def) onInspect(e.defId);
                }}
              >
                <span className="cg-cardlog-art" aria-hidden>
                  <CardArt art={def?.art ?? e.defId} tribe={def?.type === "mob" ? def.tribes[0] : undefined} spell={def?.type === "spell"} />
                </span>
                <span className="cg-cardlog-badge" aria-hidden>
                  <GameIcon name={e.kind === "slain" ? "skull" : "hand"} size="1em" />
                </span>
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
