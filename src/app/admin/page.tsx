import type { Metadata } from "next";
import { assignTiers } from "@/game/difficulty";
import { db } from "@/lib/db";
import { isAdmin } from "./auth";
import { LoginForm } from "./LoginForm";
import { WordsAdmin, type AdminWord } from "./WordsAdmin";

/** Below this many showings the admin shows "Sin datos" instead of a tier. */
const MIN_SHOWN_TO_RATE = 5;

export const metadata: Metadata = { title: "Admin · Pikaboom", robots: { index: false } };

export default async function AdminPage() {
  if (!(await isAdmin())) return <LoginForm />;

  let words: AdminWord[] = [];
  let error: string | null = null;
  try {
    const { rows } = await db().query<Omit<AdminWord, "tier">>(
      `select id::int as id, word, category, active, adult,
              shown_count as shown, guessed_count as guessed, failed_count as failed
       from public.charades_words order by category, word`,
    );
    // Same rating the game uses, per set, among active words. Stable tie-break for display.
    const tiers = new Map<number, AdminWord["tier"]>();
    for (const adult of [false, true]) {
      const set = rows.filter((w) => w.adult === adult && w.active);
      const t = assignTiers(set, (w) => w.id);
      for (const w of set) tiers.set(w.id, w.shown < MIN_SHOWN_TO_RATE ? null : (t.get(w.word.toLowerCase()) ?? null));
    }
    words = rows.map((w) => ({ ...w, tier: tiers.get(w.id) ?? null }));
  } catch (e) {
    console.error(e);
    error = "No se pudieron cargar las palabras. Revisa SUPABASE_DB_PASSWORD / SUPABASE_DB_URL.";
  }

  return <WordsAdmin words={words} loadError={error} />;
}
