// Automatic word difficulty, learned from play.
//
// Every time a word is offered (one of the 4 options) it is "shown"; when it is the chosen word
// and the team presses "Siguiente equipo" it is "guessed". A word's score is its guess rate
// (guessed / shown), smoothed toward the average of the whole set so words with little data sit
// in the middle instead of jumping to the extremes:
//
//   score = (guessed + K * average) / (shown + K)
//
// Tiers are *relative*: the top 30% of scores are easy, the bottom 30% hard, the rest medium.
// No fixed thresholds, so it keeps working whether the counts are 5 or 50,000.
// With no data at all (a fresh game) every score is equal and tiers are simply random.

export type Tier = "easy" | "medium" | "hard";
export type Mix = Record<Tier, number>;
export type RatedWord = { word: string; shown?: number; guessed?: number };

/** How many "virtual" showings of the average each word starts with. */
const K = 8;
/** Before the set has this many total showings, assume the baseline: 1 in 4 options gets picked. */
const MIN_SHOWN_FOR_AVERAGE = 50;
const BASELINE_RATE = 0.25;
const EASY_SHARE = 0.3;
const HARD_SHARE = 0.3;

export function averageRate(words: RatedWord[]) {
  let shown = 0;
  let guessed = 0;
  for (const w of words) {
    shown += w.shown ?? 0;
    guessed += w.guessed ?? 0;
  }
  return shown >= MIN_SHOWN_FOR_AVERAGE ? guessed / shown : BASELINE_RATE;
}

export function score(w: RatedWord, average: number) {
  return ((w.guessed ?? 0) + K * average) / ((w.shown ?? 0) + K);
}

/**
 * Tier for every word (keyed by lowercase word). Ties — e.g. everything at 0 — are broken by
 * `tieBreak` (random by default, so a fresh game still mixes words up).
 */
export function assignTiers<T extends RatedWord>(words: T[], tieBreak: (w: T) => number = () => Math.random()) {
  const average = averageRate(words);
  const ranked = words
    .map((w) => ({ w, s: score(w, average), t: tieBreak(w) }))
    .sort((a, b) => b.s - a.s || a.t - b.t);
  const n = ranked.length;
  const easyEnd = Math.round(n * EASY_SHARE);
  const hardStart = n - Math.round(n * HARD_SHARE);
  const tiers = new Map<string, Tier>();
  ranked.forEach(({ w }, i) => tiers.set(w.word.toLowerCase(), i < easyEnd ? "easy" : i >= hardStart ? "hard" : "medium"));
  return tiers;
}

/**
 * Which difficulties a team gets, based on its lives. Never more than 1 easy.
 *   full lives  → 0 easy, 2 medium, 2 hard
 *   in between  → 1 easy, 2 medium, 1 hard
 *   last life   → 1 easy, 3 medium, 0 hard
 */
export function mixForLives(lives: number, maxLives: number): Mix {
  if (maxLives > 1 && lives >= maxLives) return { easy: 0, medium: 2, hard: 2 };
  if (maxLives > 1 && lives <= 1) return { easy: 1, medium: 3, hard: 0 };
  return { easy: 1, medium: 2, hard: 1 };
}
