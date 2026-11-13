import { MAX_DECK_BODY_BYTES, parseDeckInput } from "@/game/cards/decks/saved";
import { getDeckService } from "@/game/cards/server/instance";
import { deckIdFrom, errorResponse, json, readJson, requirePlayer } from "../../_shared";

export const dynamic = "force-dynamic";

type Ctx = RouteContext<"/api/cards/decks/[id]">;

/** One of your decks (Phase 15). → `{ deck }` · 404 `deck_not_found` (also for another player's deck). */
export async function GET(_request: Request, ctx: Ctx) {
  try {
    const player = await requirePlayer();
    const deck = await getDeckService().getDeck(player.id, deckIdFrom((await ctx.params).id));
    return json({ deck });
  } catch (e) {
    return errorResponse(e, "GET /decks/[id]");
  }
}

/** Replace a deck's name and cards. Body as `POST /decks`. → `{ deck }` · 400 · 404 `deck_not_found`. */
export async function PUT(request: Request, ctx: Ctx) {
  try {
    const player = await requirePlayer();
    const id = deckIdFrom((await ctx.params).id);
    const input = parseDeckInput(await readJson(request, MAX_DECK_BODY_BYTES));
    const deck = await getDeckService().updateDeck(player.id, id, input);
    return json({ deck });
  } catch (e) {
    return errorResponse(e, "PUT /decks/[id]");
  }
}

/** Delete a deck. → `{ deleted: true }` · 404 `deck_not_found`. A match already started with it is unaffected. */
export async function DELETE(_request: Request, ctx: Ctx) {
  try {
    const player = await requirePlayer();
    await getDeckService().deleteDeck(player.id, deckIdFrom((await ctx.params).id));
    return json({ deleted: true });
  } catch (e) {
    return errorResponse(e, "DELETE /decks/[id]");
  }
}
