// Phase 14 I: collection filters, search and sort.
import { describe, expect, it } from "vitest";
import { CATALOG, COLLECTIBLE_CARDS } from "../catalog";
import type { CardDef } from "../catalog/types";
import { cardName } from "../i18n";
import {
  costBucket,
  discoveredCount,
  EMPTY_FILTER,
  filterCards,
  isActive,
  normalizeSearch,
  parseFilter,
  toggleChip,
  TRIBE_CHIPS,
  type CollectionFilter,
} from "./filter";
import { normalizeInventory } from "./inventory";
import { starterGrantCards } from "./starterGrant";

const inv = normalizeInventory(starterGrantCards().map((e) => ({ cardId: e.cardId, quantity: e.count })));
const f = (patch: Partial<CollectionFilter>): CollectionFilter => ({ ...EMPTY_FILTER, ...patch });
const ids = (defs: CardDef[]) => defs.map((d) => d.id);
const run = (patch: Partial<CollectionFilter>) => filterCards(COLLECTIBLE_CARDS, inv, f(patch));

describe("collection filter", () => {
  it("no filter → every collectible card, sorted by cost then name", () => {
    const all = run({});
    expect(all).toHaveLength(74);
    for (let i = 1; i < all.length; i++) {
      const a = all[i - 1];
      const b = all[i];
      expect(a.cost < b.cost || (a.cost === b.cost && cardName(a.id).localeCompare(cardName(b.id), "es") <= 0)).toBe(true);
    }
    expect(isActive(EMPTY_FILTER)).toBe(false);
  });

  it("rarity (OR within the group)", () => {
    const res = run({ rarities: ["legendary", "unique"] });
    expect(res.length).toBe(6);
    expect(res.every((d) => d.rarity === "legendary" || d.rarity === "unique")).toBe(true);
  });

  it("tribe, including 'Sin tipo' (spells and tribeless mobs)", () => {
    const undead = run({ tribes: ["undead"] });
    expect(undead.length).toBeGreaterThan(0);
    expect(undead.every((d) => d.type === "mob" && d.tribes.includes("undead"))).toBe(true);
    const none = run({ tribes: ["none"] });
    expect(none.every((d) => d.type === "spell" || d.tribes.length === 0)).toBe(true);
    expect(none.some((d) => d.type === "spell")).toBe(true);
    // Every card is in exactly the tribe chips it has, so selecting all chips returns everything.
    expect(run({ tribes: [...TRIBE_CHIPS] })).toHaveLength(74);
  });

  it("cost with the 7+ bucket", () => {
    expect(costBucket(0)).toBe(0);
    expect(costBucket(7)).toBe(7);
    expect(costBucket(10)).toBe(7);
    const big = run({ costs: [7] });
    expect(big.length).toBeGreaterThan(0);
    expect(big.every((d) => d.cost >= 7)).toBe(true);
    expect(ids(big)).toContain("morvath");
    const cheap = run({ costs: [1, 2] });
    expect(cheap.every((d) => d.cost === 1 || d.cost === 2)).toBe(true);
  });

  it("owned / missing", () => {
    const owned = run({ ownership: "owned" });
    const missing = run({ ownership: "missing" });
    expect(owned).toHaveLength(31);
    expect(missing).toHaveLength(43); // 10 MVP pack-only + 13 Phase 18 + 20 Phase 19 cards
    expect(ids(missing)).toContain("ignis");
    expect(ids(owned)).toContain("necromancer");
    expect(discoveredCount(COLLECTIBLE_CARDS, inv)).toBe(31);
  });

  it("search: 'nigro' finds Nigromante; 'golem' finds Gólem de Piedra; 'jabali' finds Jabalí del Bosque", () => {
    expect(cardName("necromancer")).toBe("Nigromante");
    expect(ids(run({ query: "nigro" }))).toContain("necromancer");
    expect(ids(run({ query: "golem" }))).toContain("stone-golem");
    expect(ids(run({ query: "jabali" }))).toEqual(["forest-boar"]);
    expect(ids(run({ query: "  JABALÍ   del " }))).toEqual(["forest-boar"]);
  });

  it("search also matches rules text, every word anywhere", () => {
    const taunt = run({ query: "provocar" });
    expect(ids(taunt)).toContain("stone-golem");
    expect(run({ query: "zzzz-no-card" })).toEqual([]);
  });

  it("all filters combine (AND across groups)", () => {
    const res = run({ rarities: ["basic"], tribes: ["human"], costs: [2], ownership: "owned", query: "escudo" });
    expect(ids(res)).toEqual(["shield-bearer"]);
    expect(run({ rarities: ["basic"], ownership: "missing" })).toEqual([]);
    expect(isActive(f({ query: "  " }))).toBe(false);
    expect(isActive(f({ costs: [3] }))).toBe(true);
  });

  it("normalizeSearch strips accents and case", () => {
    expect(normalizeSearch("Gólem de PIEDRA")).toBe("golem de piedra");
    expect(normalizeSearch("Ñandú  ")).toBe("nandu");
  });

  it("toggleChip keeps the canonical order", () => {
    expect(toggleChip([3, 1], 2, [0, 1, 2, 3])).toEqual([1, 2, 3]);
    expect(toggleChip([1, 2], 1, [0, 1, 2])).toEqual([2]);
  });

  it("parseFilter drops unknown values from storage", () => {
    expect(parseFilter(null)).toEqual(EMPTY_FILTER);
    expect(parseFilter({ rarities: ["rare", "bogus"], tribes: ["none", 3], costs: [7, 8, "1"], ownership: "x", query: 5 })).toEqual(
      f({ rarities: ["rare"], tribes: ["none"], costs: [7] }),
    );
    expect(parseFilter({ ownership: "missing", query: "a".repeat(100) }).query).toHaveLength(60);
  });

  it("the catalog still has the cards these tests name", () => {
    for (const id of ["necromancer", "stone-golem", "forest-boar", "shield-bearer", "morvath", "ignis"]) expect(CATALOG[id]).toBeDefined();
  });
});
