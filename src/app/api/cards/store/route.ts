import { getShopService } from "@/game/cards/server/instance";
import { errorResponse, json, requirePlayer } from "../_shared";

export const dynamic = "force-dynamic";

/**
 * The card store (Phase 17, §13.2): packs on sale (price and odds from `ECONOMY.packs`), your Oro balance and your
 * last 10 pack openings, newest first. Grants the starter cards and balance on the first call (idempotent).
 * → `{ packs: PackOffer[], balance, openings: { id, packType, cards, createdAt }[] }`
 */
export async function GET() {
  try {
    const player = await requirePlayer(); // also creates the profiles row the wallet references
    return json(await getShopService().getStore(player.id));
  } catch (e) {
    return errorResponse(e, "GET /store");
  }
}
