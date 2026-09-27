import { createClient } from "@/lib/client";
import { LOCAL_WORDS, type WordEntry } from "./words";

/** Loads the word bank from Supabase, falling back to the bundled list if offline/unavailable. */
export async function loadWords(): Promise<{ words: WordEntry[]; source: "supabase" | "local" }> {
  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("charades_words")
      .select("word, category")
      .eq("active", true)
      .limit(5000)
      .abortSignal(AbortSignal.timeout(5000));
    if (error) throw error;
    if (data && data.length >= 20) return { words: data, source: "supabase" };
  } catch (e) {
    console.warn("Using local word list:", e);
  }
  return { words: LOCAL_WORDS, source: "local" };
}
