// Turning two deck choices into a MatchSetup (§13.7 step 5, §11). Pure: the seed is passed in.
import { CATALOG } from "../catalog";
import type { CardDef, CardId } from "../catalog/types";
import { DECK_FORMATS, type DeckFormat } from "../config/deckRules";
import { STANDARD_RULES, type RulesConfig } from "../config/rules";
import { deckProblemText } from "../decks/saved";
import { expandDeck, validateDeck, type DeckEntry } from "../decks/validate";
import { defsClosure } from "../engine/defs";
import { ENGINE_VERSION } from "../engine/index";
import type { MatchSetup } from "../engine/types";
import type { DeckChoice } from "./commands";
import { ServiceError } from "./errors";

/**
 * Snapshot for a new match: current rules, the transitive def closure of both decks plus the second player's
 * bonus card (ADR-11), seat 0 = host.
 */
export function buildSetup(
  deckLists: [CardId[], CardId[]],
  names: [string, string],
  userIds: [string, string],
  seed: string,
  opts: { rules?: RulesConfig; catalog?: Readonly<Record<CardId, CardDef>> } = {},
): MatchSetup {
  const rules = structuredClone(opts.rules ?? STANDARD_RULES);
  const bonus = rules.hand.secondPlayerBonusCard;
  const ids = [...deckLists[0], ...deckLists[1], ...(bonus !== null ? [bonus] : [])];
  return {
    engineVersion: ENGINE_VERSION,
    seed,
    rules,
    defs: defsClosure(ids, opts.catalog ?? CATALOG),
    players: [
      { userId: userIds[0], name: names[0], deck: [...deckLists[0]] },
      { userId: userIds[1], name: names[1], deck: [...deckLists[1]] },
    ],
  };
}

export interface DeckChoiceDeps {
  /** Deck format to validate against (default: standard). */
  format?: DeckFormat;
  /** The user's saved deck entries, or null when the user has no deck with that id (Phase 15). */
  loadDeck?: (userId: string, deckId: string) => Promise<readonly DeckEntry[] | null>;
  /** The user's owned quantities (Phase 14 inventory). */
  inventory?: (userId: string) => Promise<Readonly<Record<CardId, number>>>;
}

/**
 * The 30 card ids for a deck choice (§15.5): the saved deck is reloaded with the owner's inventory and validated in
 * `play` mode against the current catalog (§11 "Server validation"). Code-defined starter decks are no longer
 * playable from the lobby (Phase 15: they are granted as saved decks) → `deck_unavailable`, like a missing deck.
 * An invalid deck is `deck_invalid` with the first problem as the message and every problem in `details.problems`.
 */
export async function resolveDeckChoice(choice: DeckChoice, userId: string, deps: DeckChoiceDeps = {}): Promise<CardId[]> {
  if (choice.kind !== "saved" || !deps.loadDeck || !deps.inventory) throw new ServiceError(409, "deck_unavailable");
  const entries = await deps.loadDeck(userId, choice.id);
  if (!entries) throw new ServiceError(409, "deck_unavailable");
  const problems = validateDeck(entries, deps.format ?? DECK_FORMATS.standard, await deps.inventory(userId), "play");
  if (problems.length > 0) throw new ServiceError(409, "deck_invalid", deckProblemText(problems[0]), { problems });
  return expandDeck(entries);
}
