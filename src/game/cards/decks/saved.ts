// Saved decks (§15.2–§15.5, Phase 15): the API shapes, request parsing and normalization shared by the server
// (deck routes, lobby) and the client (deck list/editor, lobby picker). Pure: no `server-only`, no I/O.
import { CATALOG, compareCards, hasDef } from "../catalog";
import { STARTER_DECKS, STARTER_DECK_IDS } from "../catalog/starterDecks";
import type { CardId, Tribe } from "../catalog/types";
import { cardName, t } from "../i18n";
import { RequestError } from "../server/commands";
import { countCards, type DeckEntry, type DeckProblem } from "./validate";

export const DECK_NAME_MAX = 30;
/** Max entries in a request body (41 collectible cards today; generous room for growth, still bounded). */
export const MAX_REQUEST_ENTRIES = 120;
const MAX_CARD_ID_LENGTH = 64;
/** Max request body for deck create/update. */
export const MAX_DECK_BODY_BYTES = 8192;

/** A saved deck as the API returns it. `problems` are the `play`-mode problems against the owner's inventory now. */
export interface SavedDeck {
  id: string;
  name: string;
  format: "standard";
  entries: DeckEntry[];
  cardCount: number;
  problems: DeckProblem[];
  updatedAt: string; // ISO
}

/** `GET /api/cards/decks` */
export interface DeckListResponse {
  decks: SavedDeck[];
  max: number;
}

/** Body of `POST /api/cards/decks` and `PUT /api/cards/decks/[id]`. */
export interface DeckInput {
  name: string;
  entries: DeckEntry[];
}

function isPlainObject(v: unknown): v is Record<string, unknown> {
  if (v === null || typeof v !== "object" || Array.isArray(v)) return false;
  const proto = Object.getPrototypeOf(v);
  return proto === Object.prototype || proto === null;
}

function onlyKeys(o: Record<string, unknown>, keys: readonly string[], where: string): void {
  for (const k of keys) if (!Object.prototype.hasOwnProperty.call(o, k)) throw new RequestError(`${where}: missing ${k}`);
  for (const k of Object.keys(o)) if (!keys.includes(k)) throw new RequestError(`${where}: unexpected ${k}`);
}

/**
 * Strict shape check of a deck body: `{ name: string, entries: { cardId: string, count: number }[] }`, nothing else.
 * Returns a fresh object. Counts are *not* range-checked here: `validateDeck` reports them as `invalid_entry`.
 */
export function parseDeckInput(body: unknown): DeckInput {
  if (!isPlainObject(body)) throw new RequestError("body must be an object");
  onlyKeys(body, ["name", "entries"], "deck");
  if (typeof body.name !== "string" || body.name.length > 200) throw new RequestError("invalid name");
  if (!Array.isArray(body.entries) || body.entries.length > MAX_REQUEST_ENTRIES) throw new RequestError("invalid entries");
  const entries = body.entries.map((e): DeckEntry => {
    if (!isPlainObject(e)) throw new RequestError("invalid entry");
    onlyKeys(e, ["cardId", "count"], "entry");
    if (typeof e.cardId !== "string" || e.cardId.length === 0 || e.cardId.length > MAX_CARD_ID_LENGTH) throw new RequestError("invalid cardId");
    if (typeof e.count !== "number" || !Number.isFinite(e.count)) throw new RequestError("invalid count");
    return { cardId: e.cardId, count: e.count };
  });
  return { name: body.name, entries };
}

/** Trims and collapses inner whitespace; null when the result is not 1–30 characters. */
export function normalizeDeckName(raw: string): string | null {
  const name = raw.replace(/\s+/g, " ").trim();
  return name.length >= 1 && name.length <= DECK_NAME_MAX ? name : null;
}

/** Merges duplicate card ids and sorts by card id (the stored form). Entries with an invalid count are dropped. */
export function normalizeEntries(entries: readonly DeckEntry[]): DeckEntry[] {
  const counts = new Map<CardId, number>();
  for (const { cardId, count } of entries) {
    if (!Number.isInteger(count) || count < 1) continue;
    counts.set(cardId, (counts.get(cardId) ?? 0) + count);
  }
  return [...counts].sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)).map(([cardId, count]) => ({ cardId, count }));
}

/** The starter decks as saved decks (§15.2): Spanish names, normalized entries, card counts. */
export function starterDeckPayload(): { name: string; entries: DeckEntry[]; cardCount: number }[] {
  return STARTER_DECK_IDS.map((id) => {
    const entries = normalizeEntries(STARTER_DECKS[id].entries);
    return { name: t(STARTER_DECKS[id].nameKey), entries, cardCount: countCards(entries) };
  });
}

/** Spanish text for a deck problem (§15.3, `es.deckErrors`). */
export function deckProblemText(p: DeckProblem): string {
  const name = "cardId" in p ? (hasDef(p.cardId) ? cardName(p.cardId) : p.cardId) : "";
  switch (p.code) {
    case "invalid_entry":
    case "unknown_card":
    case "not_collectible":
      return t(`deckErrors.${p.code}`, { name });
    case "too_many_copies":
      return t("deckErrors.too_many_copies", { name, max: p.max });
    case "too_many_uniques":
      return t("deckErrors.too_many_uniques", { max: p.max });
    case "not_owned":
      return t("deckErrors.not_owned", { name, owned: p.owned, needed: p.needed });
    case "too_many_cards":
      return t("deckErrors.too_many_cards", { max: p.max });
    case "wrong_size":
      return t("deckErrors.wrong_size", { required: p.required, actual: p.actual });
  }
}

/**
 * What represents a deck in lists (Phase 15 D: no art covers): the art of its first legendary/unique card (cost
 * order), otherwise the glyph of its most common tribe.
 */
export function deckCover(entries: readonly DeckEntry[]): { art: string; tribe: Tribe | undefined } {
  const defs = entries.filter((e) => hasDef(e.cardId)).map((e) => ({ def: CATALOG[e.cardId], count: e.count }));
  const tribes = new Map<Tribe, number>();
  for (const { def, count } of defs) {
    if (def.type === "mob") for (const tr of def.tribes) tribes.set(tr, (tribes.get(tr) ?? 0) + count);
  }
  const tribe = [...tribes].sort((a, b) => b[1] - a[1])[0]?.[0];
  const star = defs
    .map((d) => d.def)
    .sort(compareCards)
    .find((d) => d.rarity === "legendary" || d.rarity === "unique");
  if (star) return { art: star.art, tribe: star.type === "mob" ? (star.tribes[0] ?? tribe) : tribe };
  return { art: `deck-${tribe ?? "none"}`, tribe };
}
