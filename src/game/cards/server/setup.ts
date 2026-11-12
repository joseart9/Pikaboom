// Turning two deck choices into a MatchSetup (§13.7 step 5, §11). Pure: the seed is passed in.
import { CATALOG } from "../catalog";
import { STARTER_DECKS } from "../catalog/starterDecks";
import type { CardDef, CardId } from "../catalog/types";
import { DECK_FORMATS, type DeckFormat } from "../config/deckRules";
import { STANDARD_RULES, type RulesConfig } from "../config/rules";
import { expandDeck, validateDeck } from "../decks/validate";
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
  // Phase 15 adds saved-deck loading and the owner's inventory here.
}

/**
 * The 30 card ids for a deck choice, validated against the current catalog (§11 "Server validation").
 * Starter decks need no ownership (MVP). Saved decks are `deck_unavailable` until Phase 15.
 */
export async function resolveDeckChoice(choice: DeckChoice, userId: string, deps: DeckChoiceDeps = {}): Promise<CardId[]> {
  void userId; // used by saved decks (Phase 15)
  if (choice.kind !== "starter" || !Object.prototype.hasOwnProperty.call(STARTER_DECKS, choice.id)) {
    throw new ServiceError(409, "deck_unavailable");
  }
  const entries = STARTER_DECKS[choice.id].entries;
  if (validateDeck(entries, deps.format ?? DECK_FORMATS.standard, null, "play").length > 0) {
    throw new ServiceError(409, "deck_unavailable");
  }
  return expandDeck(entries);
}
