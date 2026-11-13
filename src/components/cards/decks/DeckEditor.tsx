"use client";

// Deck editor (/cards/decks/[id], §15.4, Phase 15 G.5). Left 2/3: your collection (owned cards; "Mostrar faltantes"
// shows the rest greyed and not addable) with search, cost chips and the full filter panel. Right 1/3: name, card
// count, mana curve, the deck's rows (tap = remove one), problems, Guardar / Eliminar. Tap a collection card = add one
// (blocked with the reason: copy limit, Única, ownership, 30 cards). Unsaved changes are guarded on exit
// (`beforeunload` + an in-app confirm). The server re-validates everything on save.
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { COLLECTIBLE_CARDS } from "@/game/cards/catalog";
import type { CardDef } from "@/game/cards/catalog/types";
import { COST_BUCKETS, EMPTY_FILTER, filterCards, MAX_COST_BUCKET, toggleChip, type CollectionFilter } from "@/game/cards/collection/filter";
import { ownedCount, type CollectionResponse, type Inventory } from "@/game/cards/collection/inventory";
import { createDeck, deleteDeck, getCollection, getDeck, updateDeck, type ApiResult } from "@/game/cards/client/api";
import type { ToastMessage } from "@/game/cards/client/matchClient";
import { DECK_FORMATS } from "@/game/cards/config/deckRules";
import { addCard, addProblem, countOf, deckRows, manaCurve, removeCard, sameEntries } from "@/game/cards/decks/editor";
import { DECK_NAME_MAX, deckProblemText, normalizeDeckName, type SavedDeck } from "@/game/cards/decks/saved";
import { countCards, validateDeck, type DeckEntry } from "@/game/cards/decks/validate";
import { cardName, t } from "@/game/cards/i18n";
import { CardFace } from "../card/CardFace";
import { CardInspect } from "../card/CardInspect";
import { Filters } from "../collection/Filters";
import { ToastView } from "../match/Toasts";
import { ConfirmDialog } from "./ConfirmDialog";
import { ManaCurve } from "./ManaCurve";
import { ScreenHeader } from "../screen/ScreenHeader";
import { StateMessage } from "../screen/StateMessage";
import { GameIcon } from "../skin";

const FORMAT = DECK_FORMATS.standard;
const SIZE = FORMAT.exactSize ?? FORMAT.maxSize;
const EDITOR_FILTER: CollectionFilter = { ...EMPTY_FILTER, ownership: "owned" };

type Load = { status: "loading" } | { status: "error"; message: string } | { status: "ready"; inventory: Inventory };

export interface DeckEditorProps {
  /** null = a new deck ("/cards/decks/nuevo"). */
  deckId: string | null;
  /** Data sources (tests / previews can inject them). */
  loadCollection?: () => Promise<ApiResult<CollectionResponse>>;
  loadDeck?: (id: string) => Promise<ApiResult<{ deck: SavedDeck }>>;
}

export function DeckEditor({ deckId, loadCollection = getCollection, loadDeck = getDeck }: DeckEditorProps) {
  const router = useRouter();
  const [load, setLoad] = useState<Load>({ status: "loading" });
  const [attempt, setAttempt] = useState(0);
  const [id, setId] = useState<string | null>(deckId);
  const [name, setName] = useState(t("decks.defaultName"));
  const [entries, setEntries] = useState<DeckEntry[]>([]);
  const [saved, setSaved] = useState<{ name: string; entries: DeckEntry[] } | null>(null);
  const [filter, setFilter] = useState<CollectionFilter>(EDITOR_FILTER);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [inspect, setInspect] = useState<CardDef | null>(null);
  const [saving, setSaving] = useState(false);
  const [dialog, setDialog] = useState<null | "leave" | "delete">(null);
  const [toast, setToast] = useState<ToastMessage | null>(null);
  const toastSeq = useRef(0);

  const notify = useCallback((text: string, tone?: "info") => {
    toastSeq.current += 1;
    setToast({ id: toastSeq.current, text, tone });
  }, []);

  useEffect(() => {
    let alive = true;
    void Promise.all([loadCollection(), deckId ? loadDeck(deckId) : Promise.resolve(null)]).then(([coll, deck]) => {
      if (!alive) return;
      if (!coll.ok) return setLoad({ status: "error", message: coll.error || t("collection.loadFailed") });
      if (deck && !deck.ok) return setLoad({ status: "error", message: deck.error || t("decks.loadFailed") });
      if (deck) {
        setName(deck.deck.name);
        setEntries(deck.deck.entries);
        setSaved({ name: deck.deck.name, entries: deck.deck.entries });
      }
      setLoad({ status: "ready", inventory: coll.inventory });
    });
    return () => {
      alive = false;
    };
  }, [deckId, loadCollection, loadDeck, attempt]);

  const dirty = saved ? saved.name !== name || !sameEntries(saved.entries, entries) : entries.length > 0 || name !== t("decks.defaultName");

  // Leaving the page (reload, close tab, typed URL) with unsaved changes → the browser's own prompt.
  useEffect(() => {
    if (!dirty) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [dirty]);

  useEffect(() => {
    if (!inspect && !filtersOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      setInspect(null);
      setFiltersOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [inspect, filtersOpen]);

  const inventory = load.status === "ready" ? load.inventory : null;
  const pool = useMemo(() => (inventory ? filterCards(COLLECTIBLE_CARDS, inventory, filter) : []), [inventory, filter]);
  const rows = useMemo(() => deckRows(entries), [entries]);
  const curve = useMemo(() => manaCurve(entries), [entries]);
  const total = countCards(entries);
  const problems = useMemo(() => (inventory ? validateDeck(entries, FORMAT, inventory, "play") : []), [entries, inventory]);

  const add = (def: CardDef) => {
    if (!inventory) return;
    if (ownedCount(inventory, def.id) === 0) return notify(t("decks.notOwnedHint"));
    const problem = addProblem(entries, def.id, inventory, FORMAT);
    if (problem) return notify(deckProblemText(problem));
    setEntries((e) => addCard(e, def.id));
  };

  const back = () => {
    if (dirty) setDialog("leave");
    else router.push("/cards/decks");
  };

  const save = async () => {
    const clean = normalizeDeckName(name);
    if (clean === null) return notify(t("matchErrors.invalid_name"));
    setSaving(true);
    const input = { name: clean, entries };
    const r = id ? await updateDeck(id, input) : await createDeck(input);
    setSaving(false);
    if (!r.ok) return notify(r.error || t("decks.loadFailed"));
    setName(r.deck.name);
    setEntries(r.deck.entries);
    setSaved({ name: r.deck.name, entries: r.deck.entries });
    if (!id) {
      setId(r.deck.id);
      // Stay on this screen (no remount, the toast survives) but give it the deck's real address.
      window.history.replaceState(null, "", `/cards/decks/${r.deck.id}`);
    }
    notify(t("decks.saved"), "info");
  };

  const remove = async () => {
    if (!id) return;
    setSaving(true);
    const r = await deleteDeck(id);
    setSaving(false);
    setDialog(null);
    if (r.ok || r.status === 404) {
      setSaved({ name, entries }); // nothing left to guard
      router.push("/cards/decks");
    } else notify(r.error || t("decks.loadFailed"));
  };

  const showMissing = filter.ownership !== "owned";

  return (
    <main className="cg-collection cg-editor">
      <ScreenHeader title={id ? t("decks.editTitle") : t("decks.newTitle")} icon="decks" back={{ onClick: back, label: t("decks.back") }}>
        {inventory && (
          // Unsaved cue: shape + label, not colour only (dashed amber chip vs solid check chip).
          <span className={`cg-chip ${dirty ? "cg-chip--warn cg-chip--dirty" : "cg-chip--ok"}`} role="status">
            <GameIcon name={dirty ? "warning" : "check"} />
            {dirty ? t("decks.unsaved") : t("decks.upToDate")}
          </span>
        )}
      </ScreenHeader>

      {load.status === "loading" && <StateMessage kind="loading" text={t("decks.loading")} fill />}
      {load.status === "error" && (
        <StateMessage
          kind="error"
          text={load.message}
          fill
          action={
            <button
              type="button"
              className="cg-button cg-button--primary"
              onClick={() => {
                setLoad({ status: "loading" });
                setAttempt((n) => n + 1);
              }}
            >
              {t("decks.retry")}
            </button>
          }
        />
      )}

      {inventory && (
        <div className="cg-editor-body">
          <section className="cg-editor-pool" aria-label={t("collection.title")}>
            <div className="cg-editor-toolbar">
              <span className="cg-search-field">
                <GameIcon name="search" className="cg-search-icon" />
                <input
                  type="search"
                  className="cg-filter-search"
                  value={filter.query}
                  maxLength={60}
                  placeholder={t("collection.search")}
                  aria-label={t("collection.searchLabel")}
                  autoComplete="off"
                  spellCheck={false}
                  onChange={(e) => setFilter({ ...filter, query: e.target.value })}
                />
              </span>
              <div className="cg-filter-group cg-filter-group--cost" role="group" aria-label={t("collection.cost")}>
                {COST_BUCKETS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    className={`cg-filter-chip${filter.costs.includes(c) ? " cg-filter-chip--on" : ""}`}
                    aria-pressed={filter.costs.includes(c)}
                    onClick={() => setFilter({ ...filter, costs: toggleChip(filter.costs, c, COST_BUCKETS) })}
                  >
                    {c === MAX_COST_BUCKET ? t("collection.costPlus", { n: c }) : c}
                  </button>
                ))}
              </div>
              <button
                type="button"
                className={`cg-filter-chip${showMissing ? " cg-filter-chip--on" : ""}`}
                aria-pressed={showMissing}
                onClick={() => setFilter({ ...filter, ownership: showMissing ? "owned" : "all" })}
              >
                {t("decks.showMissing")}
              </button>
              <button type="button" className="cg-filter-chip" aria-expanded={filtersOpen} onClick={() => setFiltersOpen(true)}>
                {t("decks.moreFilters")}
              </button>
            </div>
            <div className="cg-collection-grid-wrap">
              {pool.length === 0 ? (
                <StateMessage kind="empty" icon="search" text={t("collection.empty")} />
              ) : (
                <ul className="cg-collection-grid cg-editor-grid">
                  {pool.map((def) => {
                    const own = ownedCount(inventory, def.id);
                    const inDeck = countOf(entries, def.id);
                    const locked = own === 0;
                    const full = !locked && addProblem(entries, def.id, inventory, FORMAT) !== null;
                    return (
                      <li key={def.id} className="cg-editor-cell">
                        <button
                          type="button"
                          className={`cg-coll-tile${locked ? " cg-coll-tile--locked" : ""}${full ? " cg-coll-tile--full" : ""}`}
                          aria-label={t("decks.addCard", { name: cardName(def.id) })}
                          aria-disabled={locked || full}
                          onClick={() => add(def)}
                          onContextMenu={(e) => {
                            e.preventDefault();
                            setInspect(def);
                          }}
                        >
                          <span className="cg-coll-card">
                            <CardFace def={def} locked={locked} lazyArt />
                          </span>
                          {inDeck > 0 && <span className="cg-coll-qty">{t("decks.inDeck", { n: inDeck })}</span>}
                        </button>
                        <button type="button" className="cg-editor-inspect" aria-label={`${t("decks.inspect")} · ${cardName(def.id)}`} onClick={() => setInspect(def)}>
                          <GameIcon name="info" />
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </section>

          <aside className="cg-editor-deck" aria-label={t("decks.title")}>
            <input
              className="cg-filter-search cg-editor-name"
              value={name}
              maxLength={DECK_NAME_MAX}
              aria-label={t("decks.name")}
              placeholder={t("decks.name")}
              autoComplete="off"
              onChange={(e) => setName(e.target.value)}
            />
            <div className="cg-editor-summary">
              <span className={`cg-chip${total === SIZE ? " cg-chip--ok" : " cg-chip--warn"}`}>{t("decks.cards", { n: total, total: SIZE })}</span>
              <ManaCurve curve={curve} />
            </div>
            <ul className="cg-editor-rows" aria-label={t("decks.deckCards")}>
              {rows.length === 0 && <li className="cg-editor-empty">{t("decks.emptyDeck")}</li>}
              {/* Each row: cost gem · name (opens the card) · ×n · − / + quantity controls. */}
              {rows.map(({ def, count }) => {
                const name = cardName(def.id);
                const canAdd = addProblem(entries, def.id, inventory, FORMAT) === null;
                return (
                  <li key={def.id} className={`cg-editor-row cg-editor-row--${def.rarity}`}>
                    <button type="button" className="cg-editor-row-main" aria-label={`${t("decks.inspect")} · ${name}`} onClick={() => setInspect(def)}>
                      <span className="cg-editor-row-cost">{def.cost}</span>
                      <span className="cg-editor-row-name">{name}</span>
                      <span className="cg-editor-row-count">{t("decks.inDeck", { n: count })}</span>
                    </button>
                    <button type="button" className="cg-editor-qty" aria-label={t("decks.removeCard", { name })} onClick={() => setEntries((e) => removeCard(e, def.id))}>
                      <GameIcon name="minus" />
                    </button>
                    <button type="button" className="cg-editor-qty" aria-label={t("decks.addOne", { name })} aria-disabled={!canAdd} onClick={() => add(def)}>
                      <GameIcon name="plus" />
                    </button>
                  </li>
                );
              })}
            </ul>
            {problems.length > 0 ? (
              <ul className="cg-editor-problems" aria-label={t("decks.problems")}>
                {problems.slice(0, 3).map((p, i) => (
                  <li key={i}>
                    <GameIcon name="warning" className="cg-mark cg-mark--warn" /> {deckProblemText(p)}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="cg-editor-ok">
                <GameIcon name="check" className="cg-mark cg-mark--ok" /> {t("decks.playable")}
              </p>
            )}
            <div className="cg-editor-actions">
              {id && (
                <button type="button" className="cg-button cg-button--danger" disabled={saving} onClick={() => setDialog("delete")}>
                  {t("decks.delete")}
                </button>
              )}
              <button type="button" className="cg-button cg-button--primary" disabled={saving || (!dirty && !!id)} onClick={() => void save()}>
                {saving ? t("decks.saving") : t("decks.save")}
              </button>
            </div>
          </aside>
        </div>
      )}

      {filtersOpen && (
        <div className="cg-editor-filters" onClick={(e) => e.target === e.currentTarget && setFiltersOpen(false)}>
          <div className="cg-editor-filters-panel">
            <Filters filter={filter} onChange={setFilter} shown={pool.length} total={COLLECTIBLE_CARDS.length} />
            <button type="button" className="cg-button cg-button--primary" onClick={() => setFiltersOpen(false)}>
              {t("decks.closeFilters")}
            </button>
          </div>
        </div>
      )}

      {inspect && (
        <CardInspect
          def={inspect}
          note={inventory && ownedCount(inventory, inspect.id) === 0 ? t("collection.lockedHint") : undefined}
          onClose={() => setInspect(null)}
        />
      )}

      {dialog === "leave" && (
        <ConfirmDialog
          title={t("decks.unsavedTitle")}
          help={t("decks.unsavedHelp")}
          confirmLabel={t("decks.discard")}
          cancelLabel={t("decks.keepEditing")}
          danger
          onConfirm={() => {
            setDialog(null);
            setSaved({ name, entries });
            router.push("/cards/decks");
          }}
          onCancel={() => setDialog(null)}
        />
      )}
      {dialog === "delete" && (
        <ConfirmDialog
          title={t("decks.confirmDelete", { name: saved?.name ?? name })}
          help={t("decks.confirmDeleteHelp")}
          confirmLabel={t("decks.delete")}
          cancelLabel={t("decks.cancel")}
          danger
          busy={saving}
          onConfirm={() => void remove()}
          onCancel={() => !saving && setDialog(null)}
        />
      )}
      <ToastView message={toast} />
    </main>
  );
}
