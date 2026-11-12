// The two code-defined starter decks (§20.3). Everyone can play them in the MVP; Phase 15 grants them as saved decks.
import type { DeckEntry } from "../decks/validate";
import type { MessageKey } from "../i18n";

export type StarterDeckId = "starter-undead" | "starter-beast";

export interface StarterDeck {
  nameKey: MessageKey;
  entries: readonly DeckEntry[];
}

export const STARTER_DECKS: Readonly<Record<StarterDeckId, StarterDeck>> = {
  // "Legión de Huesos" — 30 cards
  "starter-undead": {
    nameKey: "starterDecks.undead",
    entries: [
      { cardId: "squire", count: 2 }, { cardId: "arcane-spark", count: 2 },
      { cardId: "restless-skeleton", count: 2 }, { cardId: "vampire-bat", count: 2 },
      { cardId: "shield-bearer", count: 2 }, { cardId: "drain-life", count: 2 },
      { cardId: "apprentice-mage", count: 2 }, { cardId: "grave-digger", count: 2 },
      { cardId: "bone-wall", count: 2 }, { cardId: "iron-guard", count: 2 },
      { cardId: "hungry-ghoul", count: 2 }, { cardId: "bone-storm", count: 2 },
      { cardId: "stone-golem", count: 2 }, { cardId: "necromancer", count: 2 },
      { cardId: "soul-harvest", count: 1 }, { cardId: "morvath", count: 1 },
    ],
  },
  // "Furia Salvaje" — 30 cards
  "starter-beast": {
    nameKey: "starterDecks.beast",
    entries: [
      { cardId: "wolf-pup", count: 2 }, { cardId: "savage-strike", count: 2 },
      { cardId: "healing-touch", count: 2 }, { cardId: "forest-boar", count: 2 },
      { cardId: "shield-bearer", count: 2 }, { cardId: "alpha-wolf", count: 2 },
      { cardId: "pack-call", count: 2 }, { cardId: "thornback-tortoise", count: 2 },
      { cardId: "wild-roar", count: 2 }, { cardId: "berserker-bear", count: 2 },
      { cardId: "charging-rhino", count: 2 }, { cardId: "twin-claw-panther", count: 2 },
      { cardId: "line-breaker", count: 2 }, { cardId: "swamp-ent", count: 2 },
      { cardId: "flame-lance", count: 1 }, { cardId: "ursaria", count: 1 },
    ],
  },
};

export const STARTER_DECK_IDS = Object.keys(STARTER_DECKS) as StarterDeckId[];
