// Owned-card quantities as the client sees them (§15.1, Phase 14). Pure; shared by server and client.
import { BASIC_CARDS, CATALOG, hasDef } from "../catalog";
import type { CardDef, CardId } from "../catalog/types";
import { DECK_FORMATS } from "../config/deckRules";

/** Owned quantity per collectible card id (cards with 0 copies may be absent). */
export type Inventory = Record<CardId, number>;

/** `GET /api/cards/collection` response body (Phase 14). The deck editor (Phase 15) reads the same shape. */
export interface CollectionResponse {
  inventory: Inventory;
  wallet: { balance: number };
}

/**
 * Stored rows → inventory: unknown or non-collectible ids are dropped (a card removed from the catalog), quantities
 * are clamped to integers ≥ 0, and every collectible Básica is reported as owned ×2 even without a row.
 */
export function normalizeInventory(
  rows: Iterable<{ cardId: string; quantity: number }>,
  catalog: Readonly<Record<CardId, CardDef>> = CATALOG,
): Inventory {
  const inventory: Inventory = {};
  for (const { cardId, quantity } of rows) {
    if (!hasDef(cardId, catalog) || !catalog[cardId].collectible) continue;
    const q = Number.isFinite(quantity) ? Math.max(0, Math.floor(quantity)) : 0;
    if (q > 0) inventory[cardId] = q;
  }
  const basics = catalog === CATALOG ? BASIC_CARDS : Object.values(catalog).filter((d) => d.collectible && d.rarity === "basic");
  for (const def of basics) inventory[def.id] = DECK_FORMATS.standard.copyLimits.basic;
  return inventory;
}

/** Copies owned of `id` (0 when absent). */
export function ownedCount(inventory: Readonly<Inventory>, id: CardId): number {
  return Object.prototype.hasOwnProperty.call(inventory, id) ? inventory[id] : 0;
}
