import { MAX_PURCHASE_BODY_BYTES } from "@/game/cards/collection/shop";
import { getShopService } from "@/game/cards/server/instance";
import { parsePurchaseInput } from "@/game/cards/server/shop";
import { errorResponse, json, readJson, requirePlayer } from "../../_shared";

export const dynamic = "force-dynamic";

/**
 * Buy one pack (Phase 17, §16.4). Body: `{ packType, idempotencyKey }` — the key is 32 hex chars generated once per
 * tap and reused by retries; the same key never buys twice. The cards are rolled here, never sent by the client.
 * → `{ openingId, cards, balance, replayed }` · 400 `bad_request` / `invalid_pack` · 409 `insufficient_funds`
 */
export async function POST(request: Request) {
  try {
    const player = await requirePlayer();
    const input = parsePurchaseInput(await readJson(request, MAX_PURCHASE_BODY_BYTES));
    return json(await getShopService().purchasePack(player.id, input.packType, input.idempotencyKey));
  } catch (e) {
    return errorResponse(e, "POST /store/purchase");
  }
}
