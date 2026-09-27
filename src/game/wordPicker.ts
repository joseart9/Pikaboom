import { assignTiers, type Mix, type Tier } from "./difficulty";
import type { WordEntry } from "./words";

const STORAGE_PREFIX = "pikaboom.charades.seen.v1";
/** Always keep at least this many words "fresh" so a draw never runs dry. */
const MIN_FRESH = 12;

export type DrawnWord = WordEntry & { tier: Tier };

function load(key: string): string[] {
  try {
    const raw = localStorage.getItem(key);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((w) => typeof w === "string") : [];
  } catch {
    return [];
  }
}

function save(key: string, seen: string[]) {
  try {
    localStorage.setItem(key, JSON.stringify(seen));
  } catch {
    /* storage unavailable (private mode) — history stays in memory */
  }
}

function shuffle<T>(arr: T[]) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Where to look when a tier runs out of words. Easy is never used to fill another slot. */
const FALLBACK: Record<Tier, Tier[]> = {
  easy: ["medium", "hard"],
  medium: ["hard", "easy"],
  hard: ["medium"],
};

/**
 * Picks the 4 options for a turn.
 *
 * - Difficulty: each slot is filled from a tier (easy / medium / hard, see difficulty.ts)
 *   according to the requested mix.
 * - "Least-recently-shown": every word shown goes into a persistent history (localStorage,
 *   survives across games). Draws prefer words not in the history; when a tier has none left,
 *   they take that tier's words shown the longest time ago.
 * - Variety: tries to give each option a different category.
 */
export class WordPicker {
  private pool: WordEntry[];
  private tiers: Map<string, Tier>;
  private seen: string[];
  private key: string;

  /** `set` keeps a separate history per word set (e.g. "normal" / "adult"). */
  constructor(pool: WordEntry[], set = "normal") {
    this.key = `${STORAGE_PREFIX}.${set}`;
    const unique = new Map(pool.map((w) => [w.word.toLowerCase(), w]));
    this.pool = [...unique.values()];
    this.tiers = assignTiers(this.pool);
    const valid = new Set(this.pool.map((w) => w.word.toLowerCase()));
    this.seen = load(this.key).filter((w) => valid.has(w));
  }

  get size() {
    return this.pool.length;
  }

  private tierOf(w: WordEntry): Tier {
    return this.tiers.get(w.word.toLowerCase()) ?? "medium";
  }

  draw(mix: Mix, exclude: string[] = []): DrawnWord[] {
    const count = mix.easy + mix.medium + mix.hard;
    const excluded = new Set(exclude.map((w) => w.toLowerCase()));
    const maxSeen = Math.max(0, this.pool.length - Math.max(MIN_FRESH, count + excluded.size));
    if (this.seen.length > maxSeen) this.seen = this.seen.slice(this.seen.length - maxSeen);

    // Candidates per tier: unseen words (shuffled) first, then seen ones oldest-first.
    const seenOrder = new Map(this.seen.map((w, i) => [w, i]));
    const byTier: Record<Tier, WordEntry[]> = { easy: [], medium: [], hard: [] };
    for (const w of this.pool) if (!excluded.has(w.word.toLowerCase())) byTier[this.tierOf(w)].push(w);
    for (const t of Object.keys(byTier) as Tier[]) {
      const list = byTier[t];
      const fresh = shuffle(list.filter((w) => !seenOrder.has(w.word.toLowerCase())));
      const stale = list
        .filter((w) => seenOrder.has(w.word.toLowerCase()))
        .sort((a, b) => seenOrder.get(a.word.toLowerCase())! - seenOrder.get(b.word.toLowerCase())!);
      byTier[t] = [...fresh, ...stale];
    }

    const picked: DrawnWord[] = [];
    const usedWords = new Set<string>();
    const usedCategories = new Set<string>();

    const take = (from: Tier) => {
      const list = byTier[from].filter((w) => !usedWords.has(w.word.toLowerCase()));
      if (!list.length) return false;
      // Prefer a new category among the first few best candidates, to keep freshness first.
      const w = list.slice(0, 6).find((c) => !usedCategories.has(c.category)) ?? list[0];
      usedWords.add(w.word.toLowerCase());
      usedCategories.add(w.category);
      picked.push({ ...w, tier: from });
      return true;
    };

    for (const tier of ["hard", "easy", "medium"] as Tier[]) {
      for (let i = 0; i < mix[tier]; i++) {
        if (!take(tier)) FALLBACK[tier].some((f) => take(f));
      }
    }

    const pickedKeys = picked.map((w) => w.word.toLowerCase());
    this.seen = [...this.seen.filter((w) => !pickedKeys.includes(w)), ...pickedKeys];
    save(this.key, this.seen);
    return shuffle(picked);
  }
}
