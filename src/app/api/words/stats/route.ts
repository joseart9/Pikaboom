import { db } from "@/lib/db";

const KINDS = new Set(["shown", "guessed", "failed"]);
const MAX_EVENTS = 200;

/** Receives batched play events: { events: [[wordId, "shown" | "guessed" | "failed"], ...] } */
export async function POST(request: Request) {
  let events: unknown;
  try {
    ({ events } = await request.json());
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }
  if (!Array.isArray(events) || events.length === 0 || events.length > MAX_EVENTS) {
    return Response.json({ error: "Invalid events" }, { status: 400 });
  }
  const ids: number[] = [];
  const kinds: string[] = [];
  for (const e of events) {
    if (!Array.isArray(e) || !Number.isSafeInteger(e[0]) || e[0] <= 0 || !KINDS.has(e[1])) {
      return Response.json({ error: "Invalid event" }, { status: 400 });
    }
    ids.push(e[0]);
    kinds.push(e[1]);
  }
  try {
    const { rows } = await db().query<{ updated: number }>(
      "select public.charades_record_events($1::bigint[], $2::text[]) as updated",
      [ids, kinds],
    );
    return Response.json({ updated: rows[0]?.updated ?? 0 });
  } catch (e) {
    console.error(e);
    return Response.json({ error: "Database unavailable" }, { status: 503 });
  }
}
