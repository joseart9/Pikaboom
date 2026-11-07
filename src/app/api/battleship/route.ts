import { createRoom } from "@/game/battleship/rooms";
import { errorResponse, json, playerFrom } from "./shared";

export const dynamic = "force-dynamic";

/** Create a room. Body: { name, mode: "classic" | "arcade", extraTurn }. Header: x-player. */
export async function POST(request: Request) {
  try {
    const player = playerFrom(request);
    const body = (await request.json().catch(() => ({}))) as { name?: string; mode?: string; extraTurn?: boolean };
    const view = await createRoom(player, body.name ?? "", body.mode === "arcade" ? "arcade" : "classic", !!body.extraTurn);
    return json({ view });
  } catch (e) {
    return errorResponse(e);
  }
}
