import type { Action } from "@/game/battleship/logic";
import { actOnRoom, normalizeCode, readRoom, RoomError } from "@/game/battleship/rooms";
import { errorResponse, json, playerFrom } from "../shared";

export const dynamic = "force-dynamic";

/**
 * Poll a room. `?v=<version>` returns `{ same: true }` when nothing changed (tiny response),
 * plus whether the opponent is online.
 */
export async function GET(request: Request, ctx: RouteContext<"/api/battleship/[code]">) {
  try {
    const player = playerFrom(request);
    const code = normalizeCode((await ctx.params).code);
    const known = Number(new URL(request.url).searchParams.get("v") ?? -1);
    const view = await readRoom(code, player);
    if (view.version === known) return json({ same: true, version: view.version, foeOnline: view.foe?.online ?? false });
    return json({ view });
  } catch (e) {
    return errorResponse(e);
  }
}

/** Do something in a room. Body: { id: <unique action id>, action }. Retrying with the same id is safe. */
export async function POST(request: Request, ctx: RouteContext<"/api/battleship/[code]">) {
  try {
    const player = playerFrom(request);
    const code = normalizeCode((await ctx.params).code);
    const body = (await request.json().catch(() => null)) as { id?: string; action?: Action } | null;
    if (!body?.action || typeof body.action.t !== "string" || typeof body.id !== "string" || body.id.length > 64) {
      throw new RoomError("Petición inválida.", 400);
    }
    const view = await actOnRoom(code, player, body.id, body.action);
    return json({ view });
  } catch (e) {
    return errorResponse(e);
  }
}
