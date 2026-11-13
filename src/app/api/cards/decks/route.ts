import { MAX_DECK_BODY_BYTES, parseDeckInput, type DeckListResponse } from "@/game/cards/decks/saved";
import { getCollectionStore, getDeckService } from "@/game/cards/server/instance";
import { errorResponse, json, readJson, requirePlayer } from "../_shared";

export const dynamic = "force-dynamic";

/**
 * Your saved decks (Phase 15, §15.2–§15.4), oldest first, each with its `play`-mode problems against your inventory.
 * The first call also performs the one-time starter grant (cards, Oro and the two starter decks).
 * → `{ decks: SavedDeck[], max: 10 }`
 */
export async function GET() {
  try {
    const player = await requirePlayer(); // also creates the profiles row the decks reference
    await getCollectionStore().ensureStarterGrant(player.id);
    const service = getDeckService();
    const body: DeckListResponse = { decks: await service.listDecks(player.id), max: service.max };
    return json(body);
  } catch (e) {
    return errorResponse(e, "GET /decks");
  }
}

/**
 * Create a deck. Body: `{ name, entries: { cardId, count }[] }` (≤ 8 KB). The deck may be incomplete (0–30 cards)
 * but must respect copy limits, Única and ownership (`save` mode).
 * → `{ deck }` · 400 `invalid_name` / `invalid_deck` (+ `problems`) · 409 `deck_limit`
 */
export async function POST(request: Request) {
  try {
    const player = await requirePlayer();
    const input = parseDeckInput(await readJson(request, MAX_DECK_BODY_BYTES));
    await getCollectionStore().ensureStarterGrant(player.id);
    const deck = await getDeckService().createDeck(player.id, input);
    return json({ deck });
  } catch (e) {
    return errorResponse(e, "POST /decks");
  }
}
