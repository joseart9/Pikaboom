import { describe, expect, it } from "vitest";
import { rngInt, rngNext, rngPick, rngShuffle, seedToRng, type RngHolder } from "./rng";

const SEED_A = "0123456789abcdef0123456789abcdef";
const SEED_B = "fedcba9876543210fedcba9876543210";

const holder = (seed: string): RngHolder => ({ rng: seedToRng(seed) });
const outputs = (s: RngHolder, n: number) => Array.from({ length: n }, () => rngNext(s));

describe("seedToRng", () => {
  it("rejects empty, non-hex and wrong-length seeds", () => {
    expect(() => seedToRng("")).toThrow("invalid seed");
    expect(() => seedToRng("z".repeat(32))).toThrow("invalid seed");
    expect(() => seedToRng("abc")).toThrow("invalid seed");
    expect(() => seedToRng("0".repeat(33))).toThrow("invalid seed");
  });

  it("returns four uint32 words and accepts upper-case hex", () => {
    const rng = seedToRng(SEED_A.toUpperCase());
    expect(rng).toHaveLength(4);
    for (const w of rng) expect(w >>> 0 === w || (w | 0) === w).toBe(true);
    expect(rng).toEqual(seedToRng(SEED_A));
  });

  it("handles the all-zero seed without degenerating", () => {
    const s = holder("0".repeat(32));
    const out = outputs(s, 100);
    expect(new Set(out).size).toBeGreaterThan(90);
  });
});

describe("rngNext", () => {
  it("same seed ⇒ identical first 1000 outputs", () => {
    expect(outputs(holder(SEED_A), 1000)).toEqual(outputs(holder(SEED_A), 1000));
  });

  it("different seeds ⇒ different sequences", () => {
    expect(outputs(holder(SEED_A), 50)).not.toEqual(outputs(holder(SEED_B), 50));
  });

  it("returns uint32 values and mutates the state", () => {
    const s = holder(SEED_A);
    const before = [...s.rng];
    const v = rngNext(s);
    expect(Number.isInteger(v) && v >= 0 && v < 2 ** 32).toBe(true);
    expect(s.rng).not.toEqual(before);
  });
});

describe("rngInt", () => {
  it("is roughly uniform: 60 000 d6 rolls give each face 9 000–11 000", () => {
    const s = holder(SEED_A);
    const counts = [0, 0, 0, 0, 0, 0];
    for (let i = 0; i < 60_000; i++) counts[rngInt(s, 6)]++;
    for (const c of counts) {
      expect(c).toBeGreaterThanOrEqual(9_000);
      expect(c).toBeLessThanOrEqual(11_000);
    }
  });

  it("rejects n < 1 and non-integers", () => {
    const s = holder(SEED_A);
    expect(() => rngInt(s, 0)).toThrow();
    expect(() => rngInt(s, -3)).toThrow();
    expect(() => rngInt(s, 2.5)).toThrow();
    expect(rngInt(s, 1)).toBe(0);
  });
});

describe("rngShuffle", () => {
  it("produces a permutation, deterministic for a seed", () => {
    const base = Array.from({ length: 30 }, (_, i) => i);
    const a = [...base];
    const b = [...base];
    rngShuffle(holder(SEED_A), a);
    rngShuffle(holder(SEED_A), b);
    expect(a).toEqual(b);
    expect([...a].sort((x, y) => x - y)).toEqual(base);
    expect(a).not.toEqual(base);
  });

  it("handles empty and single-element arrays", () => {
    const s = holder(SEED_A);
    const empty: number[] = [];
    rngShuffle(s, empty);
    expect(empty).toEqual([]);
    const one = [7];
    rngShuffle(s, one);
    expect(one).toEqual([7]);
  });
});

describe("rngPick", () => {
  const items = ["a", "b", "c", "d", "e", "f", "g", "h"] as const;

  it("returns distinct items and does not mutate the input", () => {
    const s = holder(SEED_A);
    const picked = rngPick(s, items, 5);
    expect(picked).toHaveLength(5);
    expect(new Set(picked).size).toBe(5);
    for (const p of picked) expect(items).toContain(p);
    expect(items).toEqual(["a", "b", "c", "d", "e", "f", "g", "h"]);
  });

  it("count ≥ length ⇒ all items, shuffled", () => {
    const picked = rngPick(holder(SEED_A), items, 99);
    expect([...picked].sort()).toEqual([...items]);
  });

  it("count ≤ 0 ⇒ []", () => {
    const s = holder(SEED_A);
    const before = [...s.rng];
    expect(rngPick(s, items, 0)).toEqual([]);
    expect(rngPick(s, items, -2)).toEqual([]);
    expect(s.rng).toEqual(before);
  });

  it("is deterministic for a seed", () => {
    expect(rngPick(holder(SEED_B), items, 3)).toEqual(rngPick(holder(SEED_B), items, 3));
  });
});
