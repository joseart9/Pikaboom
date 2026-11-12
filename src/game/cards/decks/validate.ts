// Deck validation (§15.3), shared by client (deck editor) and server (save / match start). Pure.
import { CATALOG } from "../catalog";
import type { CardDef, CardId } from "../catalog/types";
import type { DeckFormat } from "../config/deckRules";

export interface DeckEntry {
  cardId: CardId;
  count: number;
}

export type DeckProblem =
  | { code: "invalid_entry"; cardId: CardId } // count not an integer in 1..30
  | { code: "unknown_card"; cardId: CardId }
  | { code: "not_collectible"; cardId: CardId }
  | { code: "too_many_copies"; cardId: CardId; max: number }
  | { code: "too_many_uniques"; max: number }
  | { code: "not_owned"; cardId: CardId; owned: number; needed: number }
  | { code: "too_many_cards"; max: number }
  | { code: "wrong_size"; required: number; actual: number };

export type DeckProblemCode = DeckProblem["code"];

const MAX_ENTRY_COUNT = 30;

function isValidCount(count: unknown): count is number {
  return typeof count === "number" && Number.isInteger(count) && count >= 1 && count <= MAX_ENTRY_COUNT;
}

function has<T>(record: Readonly<Record<string, T>>, key: string): boolean {
  return Object.prototype.hasOwnProperty.call(record, key);
}

/**
 * Merges entries for the same card (first-seen order), dropping invalid ones.
 * Returns the merged list plus the ids of entries whose count was invalid.
 */
function mergeEntries(entries: readonly DeckEntry[]): { merged: DeckEntry[]; invalid: CardId[] } {
  const merged = new Map<CardId, number>();
  const invalid: CardId[] = [];
  for (const e of entries) {
    if (typeof e?.cardId !== "string" || !isValidCount(e.count)) {
      invalid.push(typeof e?.cardId === "string" ? e.cardId : String(e?.cardId));
      continue;
    }
    merged.set(e.cardId, (merged.get(e.cardId) ?? 0) + e.count);
  }
  return { merged: [...merged].map(([cardId, count]) => ({ cardId, count })), invalid };
}

/**
 * Problems with a deck, in a stable order (entry problems in deck order, then deck-wide problems).
 * - `save` mode: everything except `wrong_size` (saved decks may be incomplete, max `format.maxSize`).
 * - `play` mode: also requires exactly `format.exactSize` cards.
 * - `owned = null` skips ownership checks (starter decks in the MVP). Otherwise the inventory is the only truth.
 */
export function validateDeck(
  entries: readonly DeckEntry[],
  format: DeckFormat,
  owned: Readonly<Record<CardId, number>> | null,
  mode: "save" | "play",
  catalog: Readonly<Record<CardId, CardDef>> = CATALOG,
): DeckProblem[] {
  const problems: DeckProblem[] = [];
  const { merged, invalid } = mergeEntries(entries);
  for (const cardId of invalid) problems.push({ code: "invalid_entry", cardId });

  let total = 0;
  let uniques = 0;
  for (const { cardId, count } of merged) {
    total += count;
    if (!has(catalog, cardId)) {
      problems.push({ code: "unknown_card", cardId });
      continue;
    }
    const def = catalog[cardId];
    if (!def.collectible) {
      problems.push({ code: "not_collectible", cardId });
      continue;
    }
    const max = format.copyLimits[def.rarity];
    if (count > max) problems.push({ code: "too_many_copies", cardId, max });
    if (def.rarity === "unique") uniques++;
    if (owned !== null) {
      const have = has(owned, cardId) && Number.isInteger(owned[cardId]) ? Math.max(0, owned[cardId]) : 0;
      if (have < count) problems.push({ code: "not_owned", cardId, owned: have, needed: count });
    }
  }

  if (uniques > format.maxUniqueCards) problems.push({ code: "too_many_uniques", max: format.maxUniqueCards });
  if (total > format.maxSize) problems.push({ code: "too_many_cards", max: format.maxSize });
  if (mode === "play" && format.exactSize !== null && total !== format.exactSize) {
    problems.push({ code: "wrong_size", required: format.exactSize, actual: total });
  }
  return problems;
}

/** One card id per copy, in entry order (e.g. to build a match deck). Invalid entries are skipped. */
export function expandDeck(entries: readonly DeckEntry[]): CardId[] {
  const ids: CardId[] = [];
  for (const { cardId, count } of mergeEntries(entries).merged) {
    for (let i = 0; i < count; i++) ids.push(cardId);
  }
  return ids;
}

/** Total number of cards (valid entries only). */
export function countCards(entries: readonly DeckEntry[]): number {
  return mergeEntries(entries).merged.reduce((n, e) => n + e.count, 0);
}
