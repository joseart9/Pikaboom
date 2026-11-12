import { getMatchService } from "@/game/cards/server/instance";
import { errorResponse, json, readJson, requirePlayer } from "../_shared";

export const dynamic = "force-dynamic";

/** Create a lobby (you are the host) — or get back your open lobby/match. Body: `{}`. → `{ view }` */
export async function POST(request: Request) {
  try {
    const player = await requirePlayer();
    await readJson(request);
    const view = await getMatchService().createLobby(player.id, player.name);
    return json({ view });
  } catch (e) {
    return errorResponse(e, "POST /matches");
  }
}
