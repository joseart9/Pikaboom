// Phase 17: pure store helpers shared by client and server — offers/odds from config, "¡Nueva!" marking, the
// client-side inventory update after a purchase, and the pack-type guard.
import { describe, expect, it } from "vitest";
import { ECONOMY } from "../config/economy";
import { addCards, isPackType, markNewCards, OFFER_RARITIES, packOffers, PURCHASE_KEY_RE } from "./shop";

describe("packOffers", () => {
  it("one offer per configured pack, prices/sizes from config, odds as percentages summing to 100", () => {
    const offers = packOffers();
    expect(offers.map((o) => o.type)).toEqual(Object.keys(ECONOMY.packs));
    const [arcane] = offers;
    expect(arcane).toMatchObject({ type: "arcane", price: 100, size: 5 });
    expect(arcane.odds.slot).toEqual({ common: 69, rare: 23, magic: 5.5, legendary: 2.2, unique: 0.3 });
    expect(arcane.odds.guaranteed).toEqual({ rare: 82, magic: 13, legendary: 4.2, unique: 0.8 });
    for (const odds of [arcane.odds.slot, arcane.odds.guaranteed]) {
      expect(OFFER_RARITIES.reduce((s, r) => s + (odds[r] ?? 0), 0)).toBeCloseTo(100, 5);
    }
  });
});

describe("markNewCards", () => {
  it("new = owned 0 before the purchase; only the first copy of a new card in the pack is marked", () => {
    const before = { scholar: 1, ignis: 0 };
    expect(markNewCards(["ignis", "scholar", "ignis", "morvath", "squire"], before)).toEqual([true, false, false, true, true]);
  });

  it("nothing is new when everything was owned", () => {
    expect(markNewCards(["scholar", "scholar"], { scholar: 2 })).toEqual([false, false]);
  });
});

describe("addCards", () => {
  it("adds one copy per card (duplicates counted) without mutating the input", () => {
    const inv = { scholar: 1 };
    expect(addCards(inv, ["scholar", "ignis", "ignis"])).toEqual({ scholar: 2, ignis: 2 });
    expect(inv).toEqual({ scholar: 1 });
  });
});

describe("guards", () => {
  it("isPackType only accepts own config keys", () => {
    expect(isPackType("arcane")).toBe(true);
    for (const v of ["x", "toString", "__proto__", "constructor", "", null, 1, {}]) expect(isPackType(v)).toBe(false);
  });

  it("purchase key: exactly 32 lowercase hex chars", () => {
    expect(PURCHASE_KEY_RE.test("0123456789abcdef0123456789abcdef")).toBe(true);
    expect(PURCHASE_KEY_RE.test("0123456789ABCDEF0123456789abcdef")).toBe(false);
    expect(PURCHASE_KEY_RE.test("0123456789abcdef0123456789abcde")).toBe(false);
  });
});
