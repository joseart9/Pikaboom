import type { Metadata } from "next";
import { db } from "@/lib/db";
import { isAdmin } from "./auth";
import { LoginForm } from "./LoginForm";
import { WordsAdmin, type AdminWord } from "./WordsAdmin";

export const metadata: Metadata = { title: "Admin · Pikaboom", robots: { index: false } };

export default async function AdminPage() {
  if (!(await isAdmin())) return <LoginForm />;

  let words: AdminWord[] = [];
  let error: string | null = null;
  try {
    const { rows } = await db().query<AdminWord>(
      "select id::int as id, word, category, active from public.charades_words order by category, word",
    );
    words = rows;
  } catch (e) {
    console.error(e);
    error = "Could not load words from the database. Check SUPABASE_DB_PASSWORD / SUPABASE_DB_URL.";
  }

  return <WordsAdmin words={words} loadError={error} />;
}
