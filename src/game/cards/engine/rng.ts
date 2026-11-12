// Deterministic PRNG for the engine (ADR-04). sfc32 with a 128-bit state stored inside the match state,
// so the same state + command always produces the same result. Never use Math.random in engine code.

export type RngState = [number, number, number, number];

/** Holder of an RNG state. The functions below mutate `s.rng` in place. */
export interface RngHolder {
  rng: RngState;
}

const WARM_UP_OUTPUTS = 12;
const ZERO_SEED_FALLBACK: RngState = [0x9e3779b9, 0, 0, 1];

/** 32 hex chars → 4 uint32 words, warmed up. Throws `Error("invalid seed")` on bad input. */
export function seedToRng(seedHex: string): RngState {
  if (typeof seedHex !== "string" || !/^[0-9a-fA-F]{32}$/.test(seedHex)) {
    throw new Error("invalid seed");
  }
  let rng: RngState = [0, 1, 2, 3].map((i) => parseInt(seedHex.slice(i * 8, i * 8 + 8), 16) >>> 0) as RngState;
  if (rng.every((w) => w === 0)) rng = [...ZERO_SEED_FALLBACK];
  const holder: RngHolder = { rng };
  for (let i = 0; i < WARM_UP_OUTPUTS; i++) rngNext(holder);
  return holder.rng;
}

/** Next uint32 (sfc32). Mutates `s.rng`. */
export function rngNext(s: RngHolder): number {
  let [a, b, c, d] = s.rng;
  const t = (((a + b) | 0) + d) | 0;
  d = (d + 1) | 0;
  a = b ^ (b >>> 9);
  b = (c + (c << 3)) | 0;
  c = (c << 21) | (c >>> 11);
  c = (c + t) | 0;
  s.rng = [a, b, c, d];
  return t >>> 0;
}

/** Uniform integer in 0..n-1. `n` must be an integer ≥ 1. */
export function rngInt(s: RngHolder, n: number): number {
  if (!Number.isInteger(n) || n < 1) throw new Error("invalid range");
  return Math.floor((rngNext(s) / 2 ** 32) * n);
}

/** In-place Fisher–Yates shuffle (i from end to 1, j = rngInt(i + 1)). */
export function rngShuffle<T>(s: RngHolder, arr: T[]): void {
  for (let i = arr.length - 1; i >= 1; i--) {
    const j = rngInt(s, i + 1);
    const tmp = arr[i];
    arr[i] = arr[j];
    arr[j] = tmp;
  }
}

/**
 * Picks `count` distinct elements (by position), in picking order.
 * `count >= arr.length` returns all elements shuffled; `count <= 0` returns [].
 */
export function rngPick<T>(s: RngHolder, arr: readonly T[], count: number): T[] {
  const n = Math.min(Math.floor(count), arr.length);
  if (!(n > 0)) return [];
  const pool = arr.slice();
  const picked: T[] = [];
  for (let k = 0; k < n; k++) {
    const j = rngInt(s, pool.length);
    picked.push(pool[j]);
    pool.splice(j, 1);
  }
  return picked;
}
