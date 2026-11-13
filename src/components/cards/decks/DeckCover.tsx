// A deck's round cover (Phase 15 D: no art covers yet): its first legendary/unique card's art, otherwise the glyph of
// its main tribe. Used by the deck list and the lobby picker.
import { deckCover } from "@/game/cards/decks/saved";
import type { DeckEntry } from "@/game/cards/decks/validate";
import { CardArt } from "../skin";

export function DeckCover({ entries }: { entries: readonly DeckEntry[] }) {
  const { art, tribe } = deckCover(entries);
  return (
    <span className="cg-deck-art">
      <CardArt art={art} tribe={tribe} />
    </span>
  );
}
