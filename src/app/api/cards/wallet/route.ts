import { WALLET_TRANSACTIONS_LIMIT, type WalletResponse } from "@/game/cards/collection/wallet";
import { getCollectionStore } from "@/game/cards/server/instance";
import { errorResponse, json, requirePlayer } from "../_shared";

export const dynamic = "force-dynamic";

/**
 * Your Oro balance and latest ledger rows (Phase 16). Grants the starter cards and balance on the first call
 * (idempotent), like `GET /api/cards/collection`.
 * → `{ balance, transactions: [{ id, amount, balanceAfter, kind, createdAt }] }` (newest first, at most 20)
 */
export async function GET() {
  try {
    // requirePlayer also creates the profiles row the wallet references.
    const player = await requirePlayer();
    const store = getCollectionStore();
    await store.ensureStarterGrant(player.id);
    const [wallet, transactions] = await Promise.all([store.getWallet(player.id), store.getTransactions(player.id, WALLET_TRANSACTIONS_LIMIT)]);
    const body: WalletResponse = { balance: wallet.balance, transactions };
    return json(body);
  } catch (e) {
    return errorResponse(e, "GET /wallet");
  }
}
