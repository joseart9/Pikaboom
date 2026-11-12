// Helpers to create real matches (createMatch) from the starter decks, for engine tests.
import { CATALOG } from "../catalog";
import type { CardId } from "../catalog/types";
import { STARTER_DECKS } from "../catalog/starterDecks";
import { STANDARD_RULES } from "../config/rules";
import { expandDeck } from "../decks/validate";
import { defsClosure } from "../engine/defs";
import { ENGINE_VERSION } from "../engine/index";
import { createMatch } from "../engine/setup";
import type { MatchSetup, MatchState } from "../engine/types";
import { TEST_SEED } from "./fixtures";

export const UNDEAD_DECK: CardId[] = expandDeck(STARTER_DECKS["starter-undead"].entries);
export const BEAST_DECK: CardId[] = expandDeck(STARTER_DECKS["starter-beast"].entries);

export function makeSetup(seed = TEST_SEED, decks: [CardId[], CardId[]] = [UNDEAD_DECK, BEAST_DECK]): MatchSetup {
  const bonus = STANDARD_RULES.hand.secondPlayerBonusCard;
  return {
    engineVersion: ENGINE_VERSION,
    seed,
    rules: STANDARD_RULES,
    defs: defsClosure([...decks[0], ...decks[1], ...(bonus ? [bonus] : [])], CATALOG),
    players: [
      { userId: "u0", name: "Ana", deck: decks[0] },
      { userId: "u1", name: "Beto", deck: decks[1] },
    ],
  };
}

export function newMatch(seed = TEST_SEED, decks?: [CardId[], CardId[]]): MatchState {
  return createMatch(makeSetup(seed, decks));
}
