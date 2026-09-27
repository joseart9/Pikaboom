import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

/** Active words for the game. `?adult=1` returns the +18 set instead of the normal one. */
export async function GET(request: Request) {
  const adult = new URL(request.url).searchParams.get("adult") === "1";
  try {
    const { rows } = await db().query<{ word: string; category: string }>(
      "select word, category from public.charades_words where active and adult = $1 order by id",
      [adult],
    );
    return Response.json({ words: rows });
  } catch (e) {
    console.error(e);
    return Response.json({ error: "Database unavailable" }, { status: 503 });
  }
}
