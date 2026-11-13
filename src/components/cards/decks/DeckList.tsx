"use client";

// Deck list (/cards/decks, §15.4, Phase 15 G.4): your saved decks with their card count ("30/30", or a warning with
// the first problem), "Nuevo mazo" (disabled at the 10-deck limit) and delete with confirmation.
// Data: GET /api/cards/decks (which also performs the one-time starter grant, so new accounts see 2 decks).
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { deleteDeck, listDecks, type ApiResult } from "@/game/cards/client/api";
import type { ToastMessage } from "@/game/cards/client/matchClient";
import { DECK_FORMATS } from "@/game/cards/config/deckRules";
import { deckProblemText, type DeckListResponse, type SavedDeck } from "@/game/cards/decks/saved";
import { t } from "@/game/cards/i18n";
import { ToastView } from "../match/Toasts";
import { ConfirmDialog } from "./ConfirmDialog";
import { DeckCover } from "./DeckCover";

type Load = { status: "loading" } | { status: "error"; message: string } | { status: "ready"; data: DeckListResponse };

export interface DeckListProps {
  /** Data source (tests / previews can inject one). */
  load?: () => Promise<ApiResult<DeckListResponse>>;
  remove?: (id: string) => Promise<ApiResult<{ deleted: true }>>;
}

export function DeckList({ load = listDecks, remove = deleteDeck }: DeckListProps) {
  const [state, setState] = useState<Load>({ status: "loading" });
  const [attempt, setAttempt] = useState(0);
  const [confirm, setConfirm] = useState<SavedDeck | null>(null);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<ToastMessage | null>(null);
  const toastSeq = useRef(0);

  const notify = (text: string, tone?: "info") => {
    toastSeq.current += 1;
    setToast({ id: toastSeq.current, text, tone });
  };

  useEffect(() => {
    let alive = true;
    void load().then((r) => {
      if (!alive) return;
      if (r.ok) setState({ status: "ready", data: { decks: r.decks, max: r.max } });
      else setState({ status: "error", message: r.error || t("decks.loadFailed") });
    });
    return () => {
      alive = false;
    };
  }, [load, attempt]);

  const doDelete = async (deck: SavedDeck) => {
    setBusy(true);
    const r = await remove(deck.id);
    setBusy(false);
    setConfirm(null);
    // 404: already gone (e.g. a retried request whose first attempt succeeded) — same outcome for the player.
    if (r.ok || r.status === 404) {
      setState((s) => (s.status === "ready" ? { status: "ready", data: { ...s.data, decks: s.data.decks.filter((d) => d.id !== deck.id) } } : s));
      notify(t("decks.deleted"), "info");
    } else notify(r.error || t("decks.loadFailed"));
  };

  const data = state.status === "ready" ? state.data : null;
  const atLimit = !!data && data.decks.length >= data.max;
  const size = DECK_FORMATS.standard.exactSize ?? DECK_FORMATS.standard.maxSize;

  return (
    <main className="cg-collection cg-decks">
      <header className="cg-collection-header">
        <Link href="/cards" className="cg-button">
          {t("match.backToMenu")}
        </Link>
        <h1 className="cg-collection-title">{t("decks.title")}</h1>
        {data && (
          <div className="cg-collection-stats">
            <span className="cg-chip">{t("decks.countOf", { n: data.decks.length, max: data.max })}</span>
            {atLimit ? (
              <span className="cg-button cg-button--primary" aria-disabled title={t("decks.limit", { max: data.max })} data-disabled>
                {t("decks.newDeck")}
              </span>
            ) : (
              <Link href="/cards/decks/nuevo" className="cg-button cg-button--primary" data-haptic="light">
                {t("decks.newDeck")}
              </Link>
            )}
          </div>
        )}
      </header>

      {state.status === "loading" && <div className="cg-center-message">{t("decks.loading")}</div>}
      {state.status === "error" && (
        <div className="cg-center-message">
          <p>{state.message}</p>
          <button
            type="button"
            className="cg-button cg-button--primary"
            onClick={() => {
              setState({ status: "loading" });
              setAttempt((n) => n + 1);
            }}
          >
            {t("decks.retry")}
          </button>
        </div>
      )}

      {data && (
        <section className="cg-decks-body">
          {atLimit && <p className="cg-decks-limit">{t("decks.limit", { max: data.max })}</p>}
          {data.decks.length === 0 ? (
            <p className="cg-collection-empty">{t("decks.empty")}</p>
          ) : (
            <ul className="cg-decks-grid">
              {data.decks.map((deck) => {
                const ok = deck.problems.length === 0;
                return (
                  <li key={deck.id} className={`cg-deck-row${ok ? "" : " cg-deck-row--warn"}`}>
                    <Link href={`/cards/decks/${deck.id}`} className="cg-deck-tile cg-deck-link">
                      <DeckCover entries={deck.entries} />
                      <span className="cg-deck-info">
                        <span className="cg-deck-name">{deck.name}</span>
                        <span className="cg-deck-count">
                          {!ok && (
                            <span className="cg-deck-warn" aria-hidden>
                              ⚠
                            </span>
                          )}
                          {t("decks.cards", { n: deck.cardCount, total: size })}
                          {ok ? ` · ${t("decks.playable")}` : deck.cardCount < size ? ` · ${t("decks.incomplete")}` : ""}
                        </span>
                        {!ok && <span className="cg-deck-cards">{deckProblemText(deck.problems[0])}</span>}
                      </span>
                    </Link>
                    <button type="button" className="cg-button cg-deck-delete" aria-label={`${t("decks.delete")} · ${deck.name}`} onClick={() => setConfirm(deck)}>
                      ✕
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      )}

      {confirm && (
        <ConfirmDialog
          title={t("decks.confirmDelete", { name: confirm.name })}
          help={t("decks.confirmDeleteHelp")}
          confirmLabel={t("decks.delete")}
          cancelLabel={t("decks.cancel")}
          danger
          busy={busy}
          onConfirm={() => void doDelete(confirm)}
          onCancel={() => !busy && setConfirm(null)}
        />
      )}
      <ToastView message={toast} />
    </main>
  );
}
