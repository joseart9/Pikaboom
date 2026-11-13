// Phase 17 I: pack rolls — per-slot rarity distribution over 100 000 seeded packs, the guaranteed slot, pool
// eligibility (no Básica, no tokens), the downgrade rule and the weighted pick.
import { describe, expect, it } from "vitest";
import { CATALOG } from "../catalog";
import type { CardDef, CardId, Rarity } from "../catalog/types";
import { ECONOMY } from "../config/economy";
import { rngInt, seedToRng, type RngHolder } from "../engine/rng";
import { PACK_RARITIES, pickWeighted, poolFor, rollPack, type PackRarity, type RandInt } from "./packs";

function seeded(seed = "0123456789abcdef0123456789abcdef"): RandInt {
  const holder: RngHolder = { rng: seedToRng(seed) };
  return (n) => rngInt(holder, n);
}

const cfg = ECONOMY.packs.arcane;
const PACKS = 100_000;

function expectedShare(weights: Partial<Record<PackRarity, number>>, r: PackRarity): number {
  const total = PACK_RARITIES.reduce((s, k) => s + (weights[k] ?? 0), 0);
  return (weights[r] ?? 0) / total;
}

describe("rollPack distribution (100 000 seeded packs)", () => {
  const rand = seeded();
  const counts: Record<PackRarity, number>[] = Array.from({ length: cfg.size }, () => ({ common: 0, rare: 0, magic: 0, legendary: 0, unique: 0 }));
  const seen = new Set<CardId>();
  for (let p = 0; p < PACKS; p++) {
    const cards = rollPack("arcane", rand);
    expect(cards).toHaveLength(cfg.size);
    cards.forEach((id, slot) => {
      seen.add(id);
      counts[slot][CATALOG[id].rarity as PackRarity]++;
    });
  }
  const observed = counts.map((c) => Object.fromEntries(PACK_RARITIES.map((r) => [r, Math.round((c[r] / PACKS) * 10000) / 100])));
  // Handoff (STATUS M): the observed percentages per slot.
  console.info("[packs] observed % per slot:", JSON.stringify(observed));

  for (let slot = 0; slot < cfg.size - 1; slot++) {
    it(`slot ${slot + 1}: every rarity within ±0.5 pp of config`, () => {
      for (const r of PACK_RARITIES) expect(Math.abs(counts[slot][r] / PACKS - expectedShare(cfg.weights, r))).toBeLessThanOrEqual(0.005);
    });
  }

  it(`slot ${cfg.size} (guaranteed): every rarity within ±1 pp of config, never Normal`, () => {
    const last = counts[cfg.size - 1];
    expect(last.common).toBe(0);
    for (const r of PACK_RARITIES) expect(Math.abs(last[r] / PACKS - expectedShare(cfg.guaranteed, r))).toBeLessThanOrEqual(0.01);
  });

  it("no Básica and no non-collectible card ever; every eligible card shows up", () => {
    for (const id of seen) {
      expect(CATALOG[id].collectible).toBe(true);
      expect(CATALOG[id].rarity).not.toBe("basic");
    }
    const eligible = Object.values(CATALOG).filter((d) => d.collectible && d.rarity !== "basic");
    expect(seen.size).toBe(eligible.length);
  });
});

describe("rollPack", () => {
  it("is deterministic for the same rand sequence", () => {
    expect(rollPack("arcane", seeded("ffffffffffffffffffffffffffffffff"))).toEqual(rollPack("arcane", seeded("ffffffffffffffffffffffffffffffff")));
  });

  it("each card of a rarity is equally likely (uniform within the pool)", () => {
    const rand = seeded("00000000000000000000000000000abc");
    const pool = poolFor("rare");
    const hits = new Map<CardId, number>();
    const N = 60_000;
    for (let i = 0; i < N; i++) {
      const id = pool[rand(pool.length)];
      hits.set(id, (hits.get(id) ?? 0) + 1);
    }
    for (const id of pool) expect(Math.abs((hits.get(id) ?? 0) / N - 1 / pool.length)).toBeLessThan(0.01);
  });
});

function fakeCatalog(rarities: Rarity[], extra: CardDef[] = []): Record<CardId, CardDef> {
  const base = CATALOG.squire;
  const out: Record<CardId, CardDef> = {};
  rarities.forEach((rarity, i) => {
    const id = `fake-${rarity}-${i}`;
    out[id] = { ...base, id, rarity, collectible: true } as CardDef;
  });
  for (const d of extra) out[d.id] = d;
  return out;
}

describe("poolFor / downgrade (§16.2)", () => {
  it("real catalog: every pack rarity has its own pool, sorted by id, collectible only", () => {
    for (const r of PACK_RARITIES) {
      const pool = poolFor(r);
      expect(pool.length).toBeGreaterThan(0);
      expect([...pool]).toEqual([...pool].sort());
      for (const id of pool) expect(CATALOG[id]).toMatchObject({ rarity: r, collectible: true });
    }
  });

  it("a catalog without uniques or legendaries downgrades to the next lower rarity that has cards", () => {
    const cat = fakeCatalog(["common", "rare", "magic"]);
    expect(poolFor("unique", cat)).toEqual(["fake-magic-2"]);
    expect(poolFor("legendary", cat)).toEqual(["fake-magic-2"]);
    const noRare = fakeCatalog(["common", "legendary"]);
    expect(poolFor("rare", noRare)).toEqual(["fake-common-0"]);
    expect(poolFor("magic", noRare)).toEqual(["fake-common-0"]);
    expect(poolFor("unique", noRare)).toEqual(["fake-legendary-1"]);
  });

  it("tokens and Básica never enter a pool", () => {
    const token = { ...CATALOG.squire, id: "fake-token", rarity: "unique", collectible: false } as CardDef;
    const cat = fakeCatalog(["basic", "common"], [token]);
    expect(poolFor("unique", cat)).toEqual(["fake-common-1"]);
    expect(poolFor("common", cat)).toEqual(["fake-common-1"]);
  });

  it("throws when nothing at or below the rarity exists", () => {
    expect(() => poolFor("rare", fakeCatalog(["basic", "legendary"]))).toThrow(/no pack-eligible/);
  });

  it("a whole pack from a catalog lacking uniques/legendaries still has 5 eligible cards, last slot never Normal", () => {
    const cat = fakeCatalog(["common", "rare", "magic"]);
    const rand = seeded();
    for (let i = 0; i < 2000; i++) {
      const cards = rollPack("arcane", rand, cat);
      expect(cards).toHaveLength(5);
      expect(cat[cards[4]].rarity).not.toBe("common");
    }
  });
});

describe("pickWeighted", () => {
  it("walks rarities in fixed order: roll 0 → first weighted rarity, total-1 → last", () => {
    const w = { unique: 1, common: 2, rare: 3 }; // key order must not matter
    expect(pickWeighted(w, () => 0)).toBe("common");
    expect(pickWeighted(w, () => 1)).toBe("common");
    expect(pickWeighted(w, () => 2)).toBe("rare");
    expect(pickWeighted(w, () => 4)).toBe("rare");
    expect(pickWeighted(w, () => 5)).toBe("unique");
  });

  it("asks rand for exactly the total weight", () => {
    let asked = 0;
    pickWeighted(cfg.weights, (n) => ((asked = n), 0));
    expect(asked).toBe(10000);
    pickWeighted(cfg.guaranteed, (n) => ((asked = n), 0));
    expect(asked).toBe(10000);
  });

  it("rejects empty weights and an out-of-range rand", () => {
    expect(() => pickWeighted({}, () => 0)).toThrow();
    expect(() => pickWeighted({ rare: 0 }, () => 0)).toThrow();
    expect(() => pickWeighted({ rare: 2 }, () => 2)).toThrow(/out-of-range/);
  });
});
