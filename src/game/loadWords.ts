import { LOCAL_WORDS, type WordEntry } from "./words";

export type WordSource = "db" | "local";

/**
 * Loads the word bank from the database (via /api/words). The normal set falls back to the
 * bundled list if the server is unreachable; the +18 set only exists in the database.
 */
export async function loadWords(adult: boolean): Promise<{ words: WordEntry[]; source: WordSource }> {
  try {
    const res = await fetch(`/api/words?adult=${adult ? 1 : 0}`, { cache: "no-store", signal: AbortSignal.timeout(6000) });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const { words } = (await res.json()) as { words: WordEntry[] };
    if (adult || words.length >= 20) return { words, source: "db" };
  } catch (e) {
    console.warn("No se pudieron cargar las palabras:", e);
  }
  return { words: adult ? [] : LOCAL_WORDS, source: "local" };
}
