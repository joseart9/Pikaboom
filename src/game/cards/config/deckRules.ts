// Deck format rules (§9.8, ADR-19).
import type { Rarity } from "../catalog/types";

export interface DeckFormat {
  id: "standard";
  /** 30 for standard: required to play. */
  exactSize: number | null;
  /** Max cards in a saved deck. */
  maxSize: number;
  copyLimits: Record<Rarity, number>;
  /** Max distinct Única cards per deck. */
  maxUniqueCards: number;
}

export const DECK_FORMATS: Record<DeckFormat["id"], DeckFormat> = {
  standard: {
    id: "standard",
    exactSize: 30,
    maxSize: 30,
    copyLimits: { basic: 2, common: 2, rare: 2, magic: 2, legendary: 1, unique: 1 },
    maxUniqueCards: 1,
  },
};

export const MAX_SAVED_DECKS = 10;
