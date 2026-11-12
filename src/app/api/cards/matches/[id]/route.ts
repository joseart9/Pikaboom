import { getMatchService } from "@/game/cards/server/instance";
import { errorResponse, intParam, json, matchIdFrom, requirePlayer } from "../../_shared";

export const dynamic = "force-dynamic";

/**
 * Poll a match. `?v=<version>` → `{ same: true, version, foeOnline, serverNow }` when nothing changed;
 * otherwise `{ view }` with the events after `?since=<seq>`. Applies due timeouts (§13.6). 403 if not a player.
 */
export async function GET(request: Request, ctx: RouteContext<"/api/cards/matches/[id]">) {
  try {
    const player = await requirePlayer();
    const matchId = matchIdFrom((await ctx.params).id);
    const url = new URL(request.url);
    const result = await getMatchService().readMatch(matchId, player.id, { knownVersion: intParam(url, "v"), since: intParam(url, "since") });
    return json(result);
  } catch (e) {
    return errorResponse(e, "GET /matches/[id]");
  }
}
