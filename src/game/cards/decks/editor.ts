// Deck-editor model (§15.4, Phase 15): add/remove one copy, rows sorted for display, mana curve, and the reason a
// card cannot be added. Pure; the editor component holds the entries in React state.
import { CATALOG, compareCards, hasDef } from "../catalog";
import type { CardDef, CardId } from "../catalog/types";
import { costBucket, MAX_COST_BUCKET } from "../collection/filter";
import type { Inventory } from "../collection/inventory";
import { DECK_FORMATS, type DeckFormat } from "../config/deckRules";
import { normalizeEntries } from "./saved";
import { validateDeck, type DeckEntry, type DeckProblem } from "./validate";

/** Copies of `cardId` in the deck. */
export function countOf(entries: readonly DeckEntry[], cardId: CardId): number {
  return entries.reduce((n, e) => (e.cardId === cardId ? n + e.count : n), 0);
}

export function addCard(entries: readonly DeckEntry[], cardId: CardId): DeckEntry[] {
  return normalizeEntries([...entries, { cardId, count: 1 }]);
}

export function removeCard(entries: readonly DeckEntry[], cardId: CardId): DeckEntry[] {
  return normalizeEntries(entries.map((e) => (e.cardId === cardId ? { ...e, count: e.count - 1 } : e)));
}

/**
 * Why one more copy of `cardId` would make the deck unsavable (copy limit, Única limit, ownership, 30 cards), or null
 * when it can be added. Only problems the addition *creates* count, so an already-broken deck can still be edited.
 */
export function addProblem(
  entries: readonly DeckEntry[],
  cardId: CardId,
  owned: Readonly<Inventory>,
  format: DeckFormat = DECK_FORMATS.standard,
): DeckProblem | null {
  const before = new Set(validateDeck(entries, format, owned, "save").map(problemKey));
  const after = validateDeck(addCard(entries, cardId), format, owned, "save");
  return after.find((p) => !before.has(problemKey(p))) ?? null;
}

/** Problems compare by code + card (an ownership problem's counts change with every copy). */
const problemKey = (p: DeckProblem): string => `${p.code}:${"cardId" in p ? p.cardId : ""}`;

export interface DeckRow {
  def: CardDef;
  count: number;
}

/** Known cards of the deck sorted like the collection (cost, then Spanish name). Unknown ids are left out. */
export function deckRows(entries: readonly DeckEntry[]): DeckRow[] {
  return entries
    .filter((e) => hasDef(e.cardId))
    .map((e) => ({ def: CATALOG[e.cardId], count: e.count }))
    .sort((a, b) => compareCards(a.def, b.def));
}

/** Card count per cost bucket 0…7+ (index = bucket). */
export function manaCurve(entries: readonly DeckEntry[]): number[] {
  const curve = new Array<number>(MAX_COST_BUCKET + 1).fill(0);
  for (const { def, count } of deckRows(entries)) curve[costBucket(def.cost)] += count;
  return curve;
}

/** True when two entry lists hold the same cards (order-insensitive). */
export function sameEntries(a: readonly DeckEntry[], b: readonly DeckEntry[]): boolean {
  return JSON.stringify(normalizeEntries(a)) === JSON.stringify(normalizeEntries(b));
}
