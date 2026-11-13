import { parseCommandRequest } from "@/game/cards/server/commands";
import { getMatchService } from "@/game/cards/server/instance";
import { errorResponse, intParam, json, matchIdFrom, readJson, requirePlayer } from "../../../_shared";

export const dynamic = "force-dynamic";

/**
 * Submit a command. Body: `CommandRequest` (`{ commandId, command }`, ≤ 4 KB). The seat comes from the session,
 * never the body (T1). Retrying with the same `commandId` is safe (T5). `?since=<seq>` limits the returned events.
 * → `{ view }` or `{ error, code }` (400 malformed, 403 not a player, 404, 409 illegal, 413, 415, 503 busy).
 */
export async function POST(request: Request, ctx: RouteContext<"/api/cards/matches/[id]/commands">) {
  let matchId: string | undefined;
  try {
    const player = await requirePlayer();
    matchId = matchIdFrom((await ctx.params).id);
    const commandRequest = parseCommandRequest(await readJson(request));
    const since = intParam(new URL(request.url), "since");
    const view = await getMatchService().submitCommand(matchId, player.id, commandRequest, { since });
    return json({ view });
  } catch (e) {
    return errorResponse(e, "POST /matches/[id]/commands", matchId);
  }
}
