// Helpers to create real matches (createMatch) from the starter decks, for engine tests.
import { CATALOG, COLLECTIBLE_CARDS } from "../catalog";
import { DECK_FORMATS } from "../config/deckRules";
import { rngInt, seedToRng } from "../engine/rng";
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

/** Phase 18 G.12: every status card twice (26) + two Esqueletos Inquietos and two Lobos Alfa (stun/silence targets). */
export const TEST_STATUS_DECK: CardId[] = expandDeck([
  { cardId: "ember-imp", count: 2 }, { cardId: "ice-shard", count: 2 }, { cardId: "frozen-gale", count: 2 },
  { cardId: "flame-wyrm", count: 2 }, { cardId: "blood-hound", count: 2 }, { cardId: "curse-weaver", count: 2 },
  { cardId: "blessing-of-light", count: 2 }, { cardId: "purify", count: 2 }, { cardId: "silence-monk", count: 2 },
  { cardId: "shatter-armor", count: 2 }, { cardId: "disarming-strike", count: 2 }, { cardId: "stone-sleep", count: 2 },
  { cardId: "aegis-ward", count: 2 }, { cardId: "restless-skeleton", count: 2 }, { cardId: "alpha-wolf", count: 2 },
]);

/**
 * Phase 19 I: a valid random 30-card deck built from the WHOLE collectible catalog (standard copy limits, at most
 * one Única), deterministic for a given `n`. Used by the fuzz and leak tests.
 */
export function randomCatalogDeck(n: number): CardId[] {
  const format = DECK_FORMATS.standard;
  const rng = { rng: seedToRng(n.toString(16).padStart(32, "0")) };
  const counts = new Map<CardId, number>();
  let uniques = 0;
  let size = 0;
  while (size < (format.exactSize ?? 30)) {
    const def = COLLECTIBLE_CARDS[rngInt(rng, COLLECTIBLE_CARDS.length)];
    const have = counts.get(def.id) ?? 0;
    if (have >= format.copyLimits[def.rarity]) continue;
    if (def.rarity === "unique" && have === 0) {
      if (uniques >= format.maxUniqueCards) continue;
      uniques += 1;
    }
    counts.set(def.id, have + 1);
    size += 1;
  }
  return expandDeck([...counts].map(([cardId, count]) => ({ cardId, count })));
}

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
