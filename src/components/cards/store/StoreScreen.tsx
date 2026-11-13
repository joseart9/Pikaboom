"use client";

// Store (/cards/store, §16, Phase 17): the packs on sale with price, contents and odds, "Comprar" (disabled when the
// balance is short), the last 10 openings, and the pack-opening overlay. Data: GET /api/cards/store (offers, balance,
// history) and GET /api/cards/collection (owned quantities, to badge "¡Nueva!" cards) — both also perform the
// one-time starter grant.
// Purchases: the idempotency key is generated when "Comprar" is tapped and kept until the outcome is final (success
// or a 4xx); after a network failure the next tap retries with the SAME key, so it can never buy twice (§16.4).
import { useCallback, useEffect, useRef, useState } from "react";
import { CATALOG, hasDef } from "@/game/cards/catalog";
import type { CardId } from "@/game/cards/catalog/types";
import { getCollection, getStore, newCommandId, purchasePack, type ApiResult } from "@/game/cards/client/api";
import { playCardSound } from "@/game/cards/client/sounds";
import type { Inventory } from "@/game/cards/collection/inventory";
import {
  addCards,
  isPackType,
  markNewCards,
  OFFER_RARITIES,
  type PackOffer,
  type PackOpeningSummary,
  RECENT_OPENINGS_LIMIT,
  type PurchaseResponse,
  type StoreResponse,
} from "@/game/cards/collection/shop";
import type { PackType } from "@/game/cards/config/economy";
import { cardName, t } from "@/game/cards/i18n";
import { ScreenHeader } from "../screen/ScreenHeader";
import { StateMessage } from "../screen/StateMessage";
import { CurrencyBadge, GameIcon, RarityGem } from "../skin";
import { PackArt } from "../skin/PackArt";
import { PackOpening } from "./PackOpening";

const DATE = new Intl.DateTimeFormat("es", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

type Ready = { balance: number; packs: PackOffer[]; openings: PackOpeningSummary[]; inventory: Inventory };
type Load = { status: "loading" } | { status: "error"; message: string } | { status: "ready"; data: Ready };

interface Opening {
  id: string;
  packType: PackType;
  cards: CardId[];
  isNew: boolean[];
  replayed: boolean;
}

export interface StoreScreenProps {
  /** Data sources (tests / previews can inject them). */
  loadStore?: () => Promise<ApiResult<StoreResponse>>;
  loadCollection?: typeof getCollection;
  buy?: (packType: string, idempotencyKey: string) => Promise<ApiResult<PurchaseResponse>>;
}

const packName = (type: string) => (isPackType(type) ? t(`store.packs.${type}`) : type);

export function StoreScreen({ loadStore = getStore, loadCollection = getCollection, buy = purchasePack }: StoreScreenProps) {
  const [state, setState] = useState<Load>({ status: "loading" });
  const [attempt, setAttempt] = useState(0);
  const [buying, setBuying] = useState<PackType | null>(null);
  const [purchaseError, setPurchaseError] = useState<string | null>(null);
  const [opening, setOpening] = useState<Opening | null>(null);
  /** The key of the purchase whose outcome is not final yet (reused by the next tap). */
  const pending = useRef<{ packType: PackType; key: string } | null>(null);
  const busy = useRef(false);

  useEffect(() => {
    let alive = true;
    void Promise.all([loadStore(), loadCollection()]).then(([s, c]) => {
      if (!alive) return;
      if (s.ok && c.ok) setState({ status: "ready", data: { balance: s.balance, packs: s.packs, openings: s.openings, inventory: c.inventory } });
      else setState({ status: "error", message: (!s.ok ? s.error : !c.ok ? c.error : "") || t("store.loadFailed") });
    });
    return () => {
      alive = false;
    };
  }, [loadStore, loadCollection, attempt]);

  const data = state.status === "ready" ? state.data : null;

  const purchase = useCallback(
    async (packType: PackType) => {
      if (busy.current || !data) return; // double tap: one request (and the key would be the same anyway)
      busy.current = true;
      const before = data.inventory; // owned before buying: decides the "¡Nueva!" badges
      if (pending.current?.packType !== packType) pending.current = { packType, key: newCommandId() };
      const { key } = pending.current;
      setBuying(packType);
      setPurchaseError(null);
      const r = await buy(packType, key);
      busy.current = false;
      setBuying(null);
      if (r.ok) {
        pending.current = null;
        playCardSound("coin");
        setOpening({ id: r.openingId, packType, cards: r.cards, isNew: markNewCards(r.cards, before), replayed: r.replayed });
        const summary: PackOpeningSummary = { id: r.openingId, packType, cards: r.cards, createdAt: new Date().toISOString() };
        setState((prev) =>
          prev.status !== "ready"
            ? prev
            : {
                status: "ready",
                data: {
                  ...prev.data,
                  balance: r.balance,
                  inventory: addCards(prev.data.inventory, r.cards),
                  openings: [summary, ...prev.data.openings.filter((o) => o.id !== r.openingId)].slice(0, RECENT_OPENINGS_LIMIT),
                },
              },
        );
        return;
      }
      playCardSound("error");
      if (r.status >= 400 && r.status < 500) {
        pending.current = null; // final answer: the next tap is a new purchase
        setPurchaseError(r.error || t("store.purchaseFailed"));
        if (r.code === "insufficient_funds") setAttempt((n) => n + 1); // refresh the balance shown
      } else setPurchaseError(t("store.purchaseFailed")); // network / 5xx: keep the key for the retry
    },
    [buy, data],
  );

  const closeOpening = useCallback(() => setOpening(null), []);

  const openingOffer = opening && data ? data.packs.find((p) => p.type === opening.packType) : undefined;

  return (
    <main className="cg-collection cg-store">
      <ScreenHeader title={t("store.title")} icon="store" back={{ href: "/cards" }}>
        {data && (
          <span className="cg-resource">
            <CurrencyBadge amount={data.balance} unit={t("economy.gold")} label={t("economy.balance", { amount: data.balance })} />
          </span>
        )}
      </ScreenHeader>

      {state.status === "loading" && <StateMessage kind="loading" text={t("store.loading")} fill />}
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
              {t("store.retry")}
            </button>
          }
        />
      )}

      {data && (
        <div className="cg-store-body">
          <section className="cg-store-offers" aria-label={t("store.offers")}>
            {data.packs.map((offer) => {
              const short = Math.max(0, offer.price - data.balance);
              const name = packName(offer.type);
              const isBuying = buying === offer.type;
              return (
                <article key={offer.type} className="cg-store-offer">
                  <div className={`cg-store-pack${isBuying ? " cg-store-pack--buying" : ""}`}>
                    <PackArt variant={offer.type} />
                  </div>
                  <div className="cg-store-offer-info">
                    <h2 className="cg-store-offer-title">{name}</h2>
                    <p className="cg-store-offer-text">{t("store.packContents", { size: offer.size })}</p>
                    <p className="cg-store-price">
                      <span className="cg-store-price-label">{t("store.price")}</span>
                      <CurrencyBadge amount={offer.price} unit={t("economy.gold")} />
                    </p>
                    <button
                      type="button"
                      className={`cg-button cg-button--primary cg-store-buy${isBuying ? " cg-button--loading" : ""}`}
                      disabled={short > 0 || buying !== null}
                      onClick={() => void purchase(offer.type)}
                      aria-label={t("store.buyLabel", { name, price: offer.price })}
                      aria-busy={isBuying}
                      data-haptic="medium"
                    >
                      <GameIcon name={isBuying ? "hourglass" : short > 0 ? "lock" : "store"} size="1em" />
                      {isBuying ? t("store.buying") : t("store.buy")}
                    </button>
                    {short > 0 && (
                      <p className="cg-store-offer-hint">
                        <GameIcon name="coin" className="cg-mark" /> {t("store.missing", { n: short })}
                      </p>
                    )}
                    {purchaseError && (
                      <p className="cg-store-offer-error" role="alert">
                        <GameIcon name="warning" className="cg-mark" /> {purchaseError}
                      </p>
                    )}
                  </div>
                  {/* Real odds, always visible (UI-07): the same numbers the server rolls with. */}
                  <section className="cg-store-odds" aria-labelledby={`cg-odds-${offer.type}`}>
                    <h3 id={`cg-odds-${offer.type}`} className="cg-section-title cg-section-title--sm">
                      <GameIcon name="sparkle" />
                      {t("store.odds")}
                    </h3>
                      <table>
                        <thead>
                          <tr>
                            <th />
                            <th>{t("store.oddsSlot", { n: offer.size - 1 })}</th>
                            <th>{t("store.oddsLast", { n: offer.size })}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {OFFER_RARITIES.map((r) => (
                            <tr key={r} data-rarity={r}>
                              <th>
                                <RarityGem rarity={r} size="0.9em" />
                                {t(`rarity.${r}`)}
                              </th>
                              <td>{t("store.oddsValue", { pct: (offer.odds.slot[r] ?? 0).toLocaleString("es") })}</td>
                              <td>{t("store.oddsValue", { pct: (offer.odds.guaranteed[r] ?? 0).toLocaleString("es") })}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                  </section>
                </article>
              );
            })}
          </section>

          <section className="cg-store-history" aria-labelledby="cg-store-history-title">
            <h2 id="cg-store-history-title" className="cg-section-title">
              <GameIcon name="hourglass" />
              {t("store.history")}
            </h2>
            {data.openings.length === 0 ? (
              <StateMessage kind="empty" icon="store" text={t("store.historyEmpty")} />
            ) : (
              <ul className="cg-store-history-list">
                {data.openings.map((o) => (
                  <li key={o.id} className="cg-store-history-row">
                    <span className="cg-store-history-head">
                      {packName(o.packType)}
                      <small>{DATE.format(new Date(o.createdAt))}</small>
                    </span>
                    <span className="cg-store-history-cards">
                      {o.cards.map((id, i) => (
                        <span key={i} className="cg-store-card" data-rarity={hasDef(id) ? CATALOG[id].rarity : undefined}>
                          {hasDef(id) && <RarityGem rarity={CATALOG[id].rarity} size="0.8em" />}
                          {cardName(id)}
                        </span>
                      ))}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      )}

      {opening && data && (
        <PackOpening
          key={opening.id}
          packName={packName(opening.packType)}
          packType={opening.packType}
          cards={opening.cards}
          isNew={opening.isNew}
          replayed={opening.replayed}
          anotherPrice={openingOffer && data.balance >= openingOffer.price ? openingOffer.price : null}
          onOpenAnother={() => {
            const type = opening.packType;
            setOpening(null);
            void purchase(type);
          }}
          onClose={closeOpening}
        />
      )}
    </main>
  );
}
