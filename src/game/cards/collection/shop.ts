// Store & pack shapes as the client sees them (Phase 17, §13.2, §16). Pure; shared by server and client.
// Pack contents are never computed here: the server rolls them (`server/packs.ts`).
import type { CardId } from "../catalog/types";
import { ECONOMY, type PackType } from "../config/economy";
import { ownedCount, type Inventory } from "./inventory";

/** Rarities a pack can contain, lowest first (mirrors `server/packs.ts` `PACK_RARITIES`). */
export const OFFER_RARITIES = ["common", "rare", "magic", "legendary", "unique"] as const;
export type OfferRarity = (typeof OFFER_RARITIES)[number];

/** A pack on sale. `odds` are percentages per rarity (absent = 0) for a normal slot and for the last, guaranteed slot. */
export interface PackOffer {
  type: PackType;
  price: number;
  size: number;
  odds: { slot: Partial<Record<OfferRarity, number>>; guaranteed: Partial<Record<OfferRarity, number>> };
}

/** One past purchase (purchase history, newest first). */
export interface PackOpeningSummary {
  id: string;
  packType: string;
  cards: CardId[];
  createdAt: string; // ISO
}

/** `GET /api/cards/store` response body. */
export interface StoreResponse {
  packs: PackOffer[];
  balance: number;
  openings: PackOpeningSummary[];
}

/** `POST /api/cards/store/purchase` request body. */
export interface PurchaseInput {
  packType: PackType;
  idempotencyKey: string;
}

/** `POST /api/cards/store/purchase` response body. `replayed` = this key had already bought a pack: same cards, no new debit. */
export interface PurchaseResponse {
  openingId: string;
  cards: CardId[];
  balance: number;
  replayed: boolean;
}

/** How many past openings `GET /api/cards/store` returns. */
export const RECENT_OPENINGS_LIMIT = 10;
/** A purchase body is two short strings. */
export const MAX_PURCHASE_BODY_BYTES = 1024;
/** Purchase idempotency key: 32 lowercase hex chars, generated once per tap on "Comprar" and reused by retries. */
export const PURCHASE_KEY_RE = /^[a-f0-9]{32}$/;

export function isPackType(v: unknown): v is PackType {
  return typeof v === "string" && Object.prototype.hasOwnProperty.call(ECONOMY.packs, v);
}

function percentages(weights: Partial<Record<OfferRarity, number>>): Partial<Record<OfferRarity, number>> {
  const total = OFFER_RARITIES.reduce((s, r) => s + (weights[r] ?? 0), 0);
  const out: Partial<Record<OfferRarity, number>> = {};
  if (total <= 0) return out;
  for (const r of OFFER_RARITIES) {
    const w = weights[r] ?? 0;
    if (w > 0) out[r] = Math.round((w / total) * 1000) / 10; // one decimal
  }
  return out;
}

/** Every pack in `ECONOMY.packs`, as offered by the store (prices and odds come only from config). */
export function packOffers(packs: typeof ECONOMY.packs = ECONOMY.packs): PackOffer[] {
  return (Object.keys(packs) as PackType[]).map((type) => {
    const cfg = packs[type];
    return { type, price: cfg.price, size: cfg.size, odds: { slot: percentages(cfg.weights), guaranteed: percentages(cfg.guaranteed) } };
  });
}

/**
 * Which cards of an opened pack get the "¡Nueva!" badge: the first copy of a card the player owned 0 of before the
 * purchase (a second copy of the same new card in the same pack is not new).
 */
export function markNewCards(cards: readonly CardId[], before: Readonly<Inventory>): boolean[] {
  const seen = new Set<CardId>();
  return cards.map((id) => {
    const isNew = ownedCount(before, id) === 0 && !seen.has(id);
    seen.add(id);
    return isNew;
  });
}

/** `inventory` plus one copy per card (the client's view after a purchase, without refetching). */
export function addCards(inventory: Readonly<Inventory>, cards: readonly CardId[]): Inventory {
  const next: Inventory = { ...inventory };
  for (const id of cards) next[id] = ownedCount(next, id) + 1;
  return next;
}
