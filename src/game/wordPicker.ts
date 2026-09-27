import type { WordEntry } from "./words";

const STORAGE_KEY = "pikaboom.charades.seen.v1";
/** Always keep at least this many words "fresh" so a draw never runs dry. */
const MIN_FRESH = 12;

function load(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((w) => typeof w === "string") : [];
  } catch {
    return [];
  }
}

function save(seen: string[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(seen));
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

/**
 * "Least-recently-shown" picker.
 *
 * Every word that is shown is appended to a persistent history (localStorage, so it
 * survives across games). A draw only takes words that are NOT in the history. When the
 * pool of unseen words gets too small, the oldest entries are forgotten first, so the
 * words that come back are always the ones shown the longest time ago.
 * Within a draw it also tries to give each option a different category for variety.
 */
export class WordPicker {
  private pool: WordEntry[];
  private seen: string[];

  constructor(pool: WordEntry[]) {
    const unique = new Map(pool.map((w) => [w.word.toLowerCase(), w]));
    this.pool = [...unique.values()];
    const valid = new Set(this.pool.map((w) => w.word.toLowerCase()));
    this.seen = load().filter((w) => valid.has(w));
  }

  get size() {
    return this.pool.length;
  }

  draw(count: number, exclude: string[] = []): WordEntry[] {
    const excluded = new Set(exclude.map((w) => w.toLowerCase()));
    const maxSeen = Math.max(0, this.pool.length - Math.max(MIN_FRESH, count + excluded.size));
    if (this.seen.length > maxSeen) this.seen = this.seen.slice(this.seen.length - maxSeen);

    const seenSet = new Set(this.seen);
    const fresh = shuffle(this.pool.filter((w) => !seenSet.has(w.word.toLowerCase()) && !excluded.has(w.word.toLowerCase())));

    const picked: WordEntry[] = [];
    const usedCategories = new Set<string>();
    for (const w of fresh) {
      if (picked.length === count) break;
      if (!usedCategories.has(w.category)) {
        picked.push(w);
        usedCategories.add(w.category);
      }
    }
    for (const w of fresh) {
      if (picked.length === count) break;
      if (!picked.includes(w)) picked.push(w);
    }

    this.seen.push(...picked.map((w) => w.word.toLowerCase()));
    save(this.seen);
    return picked;
  }
}
