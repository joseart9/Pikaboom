import { getMatchService } from "@/game/cards/server/instance";
import { errorResponse, HttpError, json, readJson, requirePlayer } from "../../_shared";

export const dynamic = "force-dynamic";

/** Join a lobby by code (or get your existing seat). Body: `{ code }`. → `{ view }`; 409 `already_in_match` carries `matchId`. */
export async function POST(request: Request) {
  try {
    const player = await requirePlayer();
    const body = await readJson(request);
    const code = (body as { code?: unknown } | null)?.code;
    if (typeof code !== "string" || code.length > 32) throw new HttpError(400, "bad_request");
    const view = await getMatchService().joinByCode(player.id, player.name, code);
    return json({ view });
  } catch (e) {
    return errorResponse(e, "POST /matches/join");
  }
}
