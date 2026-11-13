"use client";

// Collection screen (/cards/collection, §15.1, Phase 14): every collectible card, owned ones with a quantity badge
// and missing ones locked; combinable filters + accent-insensitive search; tap a card → CardInspect.
// Data: GET /api/cards/collection (which also performs the one-time starter grant).
import { useCallback, useEffect, useMemo, useState } from "react";
import { COLLECTIBLE_CARDS } from "@/game/cards/catalog";
import type { CardDef } from "@/game/cards/catalog/types";
import { discoveredCount, EMPTY_FILTER, filterCards, parseFilter, type CollectionFilter } from "@/game/cards/collection/filter";
import { ownedCount, type CollectionResponse } from "@/game/cards/collection/inventory";
import { getCollection, type ApiResult } from "@/game/cards/client/api";
import { cardName, t } from "@/game/cards/i18n";
import { CardFace } from "../card/CardFace";
import { CardInspect } from "../card/CardInspect";
import { ScreenHeader } from "../screen/ScreenHeader";
import { StateMessage } from "../screen/StateMessage";
import { CurrencyBadge, GameIcon } from "../skin";
import { Filters } from "./Filters";

/** sessionStorage key for the filter state (§15.1: kept while the tab lives). */
export const COLLECTION_FILTER_KEY = "pikaboom.cards.collectionFilter";

function readStoredFilter(): CollectionFilter {
  try {
    const raw = sessionStorage.getItem(COLLECTION_FILTER_KEY);
    return raw ? parseFilter(JSON.parse(raw)) : EMPTY_FILTER;
  } catch {
    return EMPTY_FILTER;
  }
}

function storeFilter(f: CollectionFilter): void {
  try {
    sessionStorage.setItem(COLLECTION_FILTER_KEY, JSON.stringify(f));
  } catch {
    // Private mode / storage blocked: filters just are not remembered.
  }
}

type Load = { status: "loading" } | { status: "error"; message: string } | { status: "ready"; data: CollectionResponse };

export interface CollectionScreenProps {
  /** Data source (tests / previews can inject one). */
  load?: () => Promise<ApiResult<CollectionResponse>>;
}

export function CollectionScreen({ load = getCollection }: CollectionScreenProps) {
  const [state, setState] = useState<Load>({ status: "loading" });
  const [filter, setFilter] = useState<CollectionFilter>(EMPTY_FILTER);
  const [inspect, setInspect] = useState<CardDef | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let alive = true;
    void load().then((r) => {
      if (!alive) return;
      if (r.ok) {
        setFilter(readStoredFilter());
        setState({ status: "ready", data: { inventory: r.inventory, wallet: r.wallet } });
      } else setState({ status: "error", message: r.error || t("collection.loadFailed") });
    });
    return () => {
      alive = false;
    };
  }, [load, attempt]);

  useEffect(() => {
    if (!inspect) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setInspect(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [inspect]);

  const updateFilter = useCallback((next: CollectionFilter) => {
    setFilter(next);
    storeFilter(next);
  }, []);

  const inventory = state.status === "ready" ? state.data.inventory : null;
  const cards = useMemo(() => (inventory ? filterCards(COLLECTIBLE_CARDS, inventory, filter) : []), [inventory, filter]);
  const discovered = inventory ? discoveredCount(COLLECTIBLE_CARDS, inventory) : 0;
  const total = COLLECTIBLE_CARDS.length;

  return (
    <main className="cg-collection">
      <ScreenHeader title={t("collection.title")} icon="collection" back={{ href: "/cards" }}>
        {state.status === "ready" && (
          <div className="cg-collection-stats">
            <span className="cg-chip">{t("collection.discovered", { n: discovered, total })}</span>
            <span className="cg-resource cg-resource--optional">
              <CurrencyBadge amount={state.data.wallet.balance} unit={t("economy.gold")} label={t("economy.balance", { amount: state.data.wallet.balance })} />
            </span>
          </div>
        )}
      </ScreenHeader>

      {state.status === "loading" && <StateMessage kind="loading" text={t("collection.loading")} fill />}
      {state.status === "error" && (
        <StateMessage
          kind="error"
          text={state.message}
          fill
          action={
            <button
              type="button"
              className="cg-button cg-button--primary"
              onClick={() => {
                setState({ status: "loading" });
                setAttempt((n) => n + 1);
              }}
            >
              {t("collection.retry")}
            </button>
          }
        />
      )}

      {state.status === "ready" && inventory && (
        <div className="cg-collection-body">
          <Filters filter={filter} onChange={updateFilter} shown={cards.length} total={total} />
          <section className="cg-collection-grid-wrap" aria-label={t("collection.title")}>
            {cards.length === 0 ? (
              <StateMessage
                kind="empty"
                icon="search"
                text={t("collection.empty")}
                action={
                  <button type="button" className="cg-button" onClick={() => updateFilter(EMPTY_FILTER)}>
                    {t("collection.clear")}
                  </button>
                }
              />
            ) : (
              <ul className="cg-collection-grid">
                {cards.map((def) => {
                  const n = ownedCount(inventory, def.id);
                  const locked = n === 0;
                  return (
                    <li key={def.id}>
                      <button
                        type="button"
                        className={`cg-coll-tile${locked ? " cg-coll-tile--locked" : ""}`}
                        aria-label={`${cardName(def.id)} · ${locked ? t("collection.locked") : t("collection.quantity", { n })}`}
                        onClick={() => setInspect(def)}
                      >
                        <span className="cg-coll-card">
                          <CardFace def={def} locked={locked} lazyArt />
                        </span>
                        {locked ? (
                          <span className="cg-coll-lock" aria-hidden>
                            <GameIcon name="lock" />
                          </span>
                        ) : (
                          <span className="cg-coll-qty">{t("collection.quantity", { n })}</span>
                        )}
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        </div>
      )}

      {inspect && (
        <CardInspect
          def={inspect}
          note={inventory && ownedCount(inventory, inspect.id) === 0 ? t("collection.lockedHint") : undefined}
          onClose={() => setInspect(null)}
        />
      )}
    </main>
  );
}
