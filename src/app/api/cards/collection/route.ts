import type { CollectionResponse } from "@/game/cards/collection/inventory";
import { getCollectionStore } from "@/game/cards/server/instance";
import { errorResponse, json, requirePlayer } from "../_shared";

export const dynamic = "force-dynamic";

/**
 * Your collection and wallet (Phase 14, §15.1). Grants the starter cards and balance on the first call (idempotent).
 * → `{ inventory: Record<cardId, quantity>, wallet: { balance } }`
 */
export async function GET() {
  try {
    // requirePlayer also creates the profiles row the wallet/inventory reference.
    const player = await requirePlayer();
    const store = getCollectionStore();
    await store.ensureStarterGrant(player.id);
    const [inventory, wallet] = await Promise.all([store.getInventory(player.id), store.getWallet(player.id)]);
    const body: CollectionResponse = { inventory, wallet: { balance: wallet.balance } };
    return json(body);
  } catch (e) {
    return errorResponse(e, "GET /collection");
  }
}
