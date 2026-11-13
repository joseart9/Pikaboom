// Pack contents (Phase 17, §16.2–§16.3). Rolled on the server only (T11): the client sends a pack type and an
// idempotency key, never cards. `rand` is injected so tests can use a seeded generator; production passes
// `crypto.randomInt` (see `shop.ts`). Pure apart from that: no DB, no clock.
import "server-only";
import { CATALOG } from "../catalog";
import type { CardDef, CardId, Rarity } from "../catalog/types";
import { ECONOMY, type PackType } from "../config/economy";

/** Rarities that can come out of a pack, lowest first. Básica never does (always owned). */
export const PACK_RARITIES = ["common", "rare", "magic", "legendary", "unique"] as const satisfies readonly Rarity[];
export type PackRarity = (typeof PACK_RARITIES)[number];

/** Per-rarity weights (any positive integers; absent or 0 = never). */
export type RarityWeights = Partial<Record<PackRarity, number>>;

/** Uniform integer in [0, n). */
export type RandInt = (n: number) => number;

type Catalog = Readonly<Record<CardId, CardDef>>;

/**
 * Picks a rarity with probability weight / total. Rarities are walked in the fixed `PACK_RARITIES` order (never the
 * object's key order), so the same `rand` outputs always give the same rarity.
 */
export function pickWeighted(weights: RarityWeights, rand: RandInt): PackRarity {
  let total = 0;
  for (const r of PACK_RARITIES) total += Math.max(0, Math.floor(weights[r] ?? 0));
  if (total <= 0) throw new Error("pack weights must have a positive total");
  let roll = rand(total);
  for (const r of PACK_RARITIES) {
    const w = Math.max(0, Math.floor(weights[r] ?? 0));
    if (roll < w) return r;
    roll -= w;
  }
  throw new Error(`rand(${total}) returned an out-of-range value`);
}

const pools = new WeakMap<Catalog, Map<PackRarity, CardId[]>>();

function cardsOf(rarity: PackRarity, catalog: Catalog): CardId[] {
  let byRarity = pools.get(catalog);
  if (!byRarity) {
    byRarity = new Map();
    pools.set(catalog, byRarity);
  }
  let ids = byRarity.get(rarity);
  if (!ids) {
    // Sorted by id: the pool order (and so a seeded roll) does not depend on how the catalog object was built.
    ids = Object.values(catalog)
      .filter((d) => d.collectible && d.rarity === rarity)
      .map((d) => d.id)
      .sort();
    byRarity.set(rarity, ids);
  }
  return ids;
}

/**
 * The collectible cards of `rarity`, each equally likely. When the catalog has none of that rarity, the next lower
 * rarity that has cards is used (unique → legendary → magic → rare → common, §16.2). Throws if none has any.
 */
export function poolFor(rarity: PackRarity, catalog: Catalog = CATALOG): readonly CardId[] {
  for (let i = PACK_RARITIES.indexOf(rarity); i >= 0; i--) {
    const ids = cardsOf(PACK_RARITIES[i], catalog);
    if (ids.length > 0) return ids;
  }
  throw new Error(`no pack-eligible cards at or below rarity ${rarity}`);
}

/** Rolls one pack (§16.3): slots 1..size-1 use `weights`, the last slot `guaranteed`. Duplicates are allowed. */
export function rollPack(type: PackType, rand: RandInt, catalog: Catalog = CATALOG): CardId[] {
  const cfg = ECONOMY.packs[type];
  const cards: CardId[] = [];
  for (let slot = 0; slot < cfg.size; slot++) {
    const weights: RarityWeights = slot === cfg.size - 1 ? cfg.guaranteed : cfg.weights;
    const pool = poolFor(pickWeighted(weights, rand), catalog);
    cards.push(pool[rand(pool.length)]);
  }
  return cards;
}
