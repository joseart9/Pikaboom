import { getMatchService } from "@/game/cards/server/instance";
import { errorResponse, json, requirePlayer } from "../../_shared";

export const dynamic = "force-dynamic";

/** Your lobby/active match, if any. → `{ matchId: string | null }` */
export async function GET() {
  try {
    const player = await requirePlayer();
    return json({ matchId: await getMatchService().currentMatchFor(player.id) });
  } catch (e) {
    return errorResponse(e, "GET /matches/current");
  }
}
