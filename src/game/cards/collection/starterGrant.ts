// The starter card grant (§15.2, Phase 14). Pure: the server sends this list to `cards_grant_starter`.
import { BASIC_CARDS, CATALOG, compareCards } from "../catalog";
import type { CardId } from "../catalog/types";
import { STARTER_DECKS, STARTER_DECK_IDS } from "../catalog/starterDecks";
import { DECK_FORMATS } from "../config/deckRules";
import type { DeckEntry } from "../decks/validate";

/**
 * Every collectible Básica ×2 (the copy limit), plus each non-basic card of the starter decks with the highest
 * count it has in any one of them — so both starter decks are fully owned. Sorted like the collection.
 */
export function starterGrantCards(): DeckEntry[] {
  const counts = new Map<CardId, number>();
  for (const def of BASIC_CARDS) counts.set(def.id, DECK_FORMATS.standard.copyLimits.basic);
  for (const id of STARTER_DECK_IDS) {
    for (const { cardId, count } of STARTER_DECKS[id].entries) {
      if (CATALOG[cardId]?.rarity === "basic") continue;
      counts.set(cardId, Math.max(counts.get(cardId) ?? 0, count));
    }
  }
  return [...counts]
    .sort(([a], [b]) => compareCards(CATALOG[a], CATALOG[b]))
    .map(([cardId, count]) => ({ cardId, count }));
}
