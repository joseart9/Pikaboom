"use client";

// Starter-deck picker (Phase 11 G.3): name, tribe, three highlight cards. Selecting sends `lobby.selectDeck`
// (the server validates the choice and clears "ready").
import type { CardId, Tribe } from "@/game/cards/catalog/types";
import { STARTER_DECK_IDS, STARTER_DECKS, type StarterDeckId } from "@/game/cards/catalog/starterDecks";
import { cardName, t } from "@/game/cards/i18n";
import type { DeckChoice } from "@/game/cards/server/commands";
import { CardArt } from "../skin";

/** Presentation only: which tribe glyph and cards represent each starter deck. */
const DECK_LOOK: Record<StarterDeckId, { tribe: Tribe; highlights: readonly CardId[] }> = {
  "starter-undead": { tribe: "undead", highlights: ["necromancer", "morvath", "bone-wall"] },
  "starter-beast": { tribe: "beast", highlights: ["ursaria", "alpha-wolf", "charging-rhino"] },
};

export interface DeckPickerProps {
  selected: DeckChoice | null;
  disabled: boolean;
  onSelect: (id: StarterDeckId) => void;
}

export function DeckPicker({ selected, disabled, onSelect }: DeckPickerProps) {
  return (
    <div className="cg-deck-picker" role="radiogroup" aria-label={t("lobby.chooseDeck")}>
      {STARTER_DECK_IDS.map((id) => {
        const look = DECK_LOOK[id];
        const isSelected = selected?.kind === "starter" && selected.id === id;
        return (
          <button
            key={id}
            type="button"
            role="radio"
            aria-checked={isSelected}
            className={`cg-deck-tile${isSelected ? " cg-deck-tile--selected" : ""}`}
            disabled={disabled}
            onClick={() => !isSelected && onSelect(id)}
          >
            <span className="cg-deck-art">
              <CardArt art={id} tribe={look.tribe} />
            </span>
            <span className="cg-deck-info">
              <span className="cg-deck-name">{t(STARTER_DECKS[id].nameKey)}</span>
              <span className="cg-deck-tribe">{t(`tribe.${look.tribe}`)}</span>
              <span className="cg-deck-cards">{t("lobby.highlights", { cards: look.highlights.map(cardName).join(" · ") })}</span>
            </span>
            {isSelected && (
              <span className="cg-deck-check" aria-hidden>
                ✓
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
