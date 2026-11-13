"use client";

// Saved-deck picker (Phase 15 G.6; replaced Phase 11's starter-deck tiles): your saved decks with cover, name and
// card count. Decks that cannot be played (incomplete, unowned cards…) are disabled and show their first problem.
// Selecting sends `lobby.selectDeck { kind: "saved", id }`; the server validates it again then and at match start.
import Link from "next/link";
import { useEffect, useState } from "react";
import { listDecks, type ApiResult } from "@/game/cards/client/api";
import { deckProblemText, type DeckListResponse, type SavedDeck } from "@/game/cards/decks/saved";
import { t } from "@/game/cards/i18n";
import type { DeckChoice } from "@/game/cards/server/commands";
import { DeckCover } from "../decks/DeckCover";
import { GameIcon } from "../skin";

export interface DeckPickerProps {
  selected: DeckChoice | null;
  disabled: boolean;
  onSelect: (deckId: string) => void;
  /** Data source (tests / previews can inject one). Remount the picker (React `key`) to reload. */
  load?: () => Promise<ApiResult<DeckListResponse>>;
}

type Load = { status: "loading" } | { status: "error"; message: string } | { status: "ready"; decks: SavedDeck[] };

export function DeckPicker({ selected, disabled, onSelect, load = listDecks }: DeckPickerProps) {
  const [state, setState] = useState<Load>({ status: "loading" });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let alive = true;
    void load().then((r) => {
      if (!alive) return;
      if (r.ok) setState({ status: "ready", decks: r.decks });
      else setState({ status: "error", message: r.error || t("lobby.decksFailed") });
    });
    return () => {
      alive = false;
    };
  }, [load, attempt]);

  if (state.status === "loading") return <p className="cg-lobby-help">{t("lobby.decksLoading")}</p>;
  if (state.status === "error") {
    return (
      <div className="cg-lobby-row">
        <span className="cg-lobby-help">{state.message}</span>
        <button
          type="button"
          className="cg-button"
          onClick={() => {
            setState({ status: "loading" });
            setAttempt((n) => n + 1);
          }}
        >
          {t("decks.retry")}
        </button>
      </div>
    );
  }

  return (
    <div className="cg-deck-picker-wrap">
      {state.decks.length === 0 ? (
        <p className="cg-lobby-help">{t("lobby.noDecks")}</p>
      ) : (
        <div className="cg-deck-picker" role="radiogroup" aria-label={t("lobby.chooseDeck")}>
          {state.decks.map((deck) => {
            const isSelected = selected?.kind === "saved" && selected.id === deck.id;
            const problem = deck.problems[0];
            return (
              <button
                key={deck.id}
                type="button"
                role="radio"
                aria-checked={isSelected}
                className={`cg-deck-tile${isSelected ? " cg-deck-tile--selected" : ""}${problem ? " cg-deck-tile--invalid" : ""}`}
                disabled={disabled || !!problem}
                onClick={() => !isSelected && onSelect(deck.id)}
              >
                <DeckCover entries={deck.entries} />
                <span className="cg-deck-info">
                  <span className="cg-deck-name">{deck.name}</span>
                  <span className="cg-deck-tribe">{t("lobby.deckCards", { n: deck.cardCount })}</span>
                  {problem && <span className="cg-deck-cards cg-deck-problem">{deckProblemText(problem)}</span>}
                </span>
                {isSelected && (
                  <span className="cg-deck-check" aria-hidden>
                    <GameIcon name="check" size="16px" />
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}
      <Link href="/cards/decks" className="cg-lobby-edit-decks">
        {t("lobby.editDecks")}
      </Link>
    </div>
  );
}
