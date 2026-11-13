// A deck's cover (Phase 15 D): its first legendary/unique card's art, otherwise the glyph of its main tribe. Used by
// the deck list (UI-07: a wide illustrated banner, the deck's identity) and the lobby picker (round medallion).
import { deckCover } from "@/game/cards/decks/saved";
import type { DeckEntry } from "@/game/cards/decks/validate";
import { CardArt } from "../skin";

export function DeckCover({ entries, variant = "round" }: { entries: readonly DeckEntry[]; variant?: "round" | "banner" }) {
  const { art, tribe } = deckCover(entries);
  return (
    <span className={variant === "banner" ? "cg-deck-banner" : "cg-deck-art"} aria-hidden>
      <CardArt art={art} tribe={tribe} lazy={variant === "banner"} />
    </span>
  );
}
