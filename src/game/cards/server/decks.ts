// Saved decks on the server (Phase 15, §15.2–§15.5). `DeckStore` is persistence only (Postgres through any
// `Queryable`, or memory for local dev without DB credentials); `DeckService` adds the rules: name/entry
// normalization, `save`-mode validation against the owner's inventory, the 10-deck limit, and the `play`-mode check
// the lobby uses (`choiceDeps`).
import "server-only";
import { randomUUID } from "node:crypto";
import { DECK_FORMATS, MAX_SAVED_DECKS, type DeckFormat } from "../config/deckRules";
import { deckProblemText, normalizeDeckName, normalizeEntries, starterDeckPayload, type DeckInput, type SavedDeck } from "../decks/saved";
import { countCards, validateDeck, type DeckEntry } from "../decks/validate";
import type { CollectionStore } from "./collection";
import { ServiceError } from "./errors";
import type { Queryable } from "./pgStore";
import type { DeckChoiceDeps } from "./setup";

export interface DeckRow {
  id: string;
  name: string;
  entries: DeckEntry[];
  cardCount: number;
  createdAt: Date;
  updatedAt: Date;
}

/** What a create/update writes (already normalized and validated by `DeckService`). */
export interface DeckWrite {
  name: string;
  entries: DeckEntry[];
  cardCount: number;
}

/**
 * Contract (memory and Postgres behave the same; `testing/deckSuite.ts` runs on both):
 * - `listDecks` returns the user's decks oldest first (ties: name, then id).
 * - `getDeck` / `updateDeck` / `deleteDeck` only see the user's own decks (another user's id → null/false).
 * - `createDeck` throws `ServiceError(409, "deck_limit")` when the user already has `max` decks, also under concurrency.
 * - `grantStarterDecks` saves the starter decks once per user (true only for the call that saved them).
 */
export interface DeckStore {
  listDecks(userId: string): Promise<DeckRow[]>;
  getDeck(userId: string, id: string): Promise<DeckRow | null>;
  createDeck(userId: string, deck: DeckWrite, max: number): Promise<DeckRow>;
  updateDeck(userId: string, id: string, deck: DeckWrite): Promise<DeckRow | null>;
  deleteDeck(userId: string, id: string): Promise<boolean>;
  grantStarterDecks(userId: string): Promise<boolean>;
}

function sortDecks(rows: DeckRow[]): DeckRow[] {
  return rows.sort(
    (a, b) => a.createdAt.getTime() - b.createdAt.getTime() || a.name.localeCompare(b.name, "es") || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0),
  );
}

interface PgDeckRow {
  id: string;
  name: string;
  entries: unknown;
  card_count: number;
  created_at: Date | string;
  updated_at: Date | string;
}

const DECK_COLUMNS = `id, name, entries, card_count, created_at, updated_at`;

function fromPg(r: PgDeckRow): DeckRow {
  const raw = typeof r.entries === "string" ? (JSON.parse(r.entries) as unknown) : r.entries;
  const entries = Array.isArray(raw)
    ? raw.filter((e): e is DeckEntry => !!e && typeof e.cardId === "string" && typeof e.count === "number").map((e) => ({ cardId: e.cardId, count: e.count }))
    : [];
  return { id: r.id, name: r.name, entries, cardCount: Number(r.card_count), createdAt: new Date(r.created_at), updatedAt: new Date(r.updated_at) };
}

export class PgDeckStore implements DeckStore {
  constructor(private readonly db: Queryable) {}

  async listDecks(userId: string): Promise<DeckRow[]> {
    const { rows } = await this.db.query(`select ${DECK_COLUMNS} from public.cards_decks where user_id = $1::uuid`, [userId]);
    return sortDecks((rows as PgDeckRow[]).map(fromPg));
  }

  async getDeck(userId: string, id: string): Promise<DeckRow | null> {
    const { rows } = await this.db.query(`select ${DECK_COLUMNS} from public.cards_decks where id = $1::uuid and user_id = $2::uuid`, [id, userId]);
    return rows[0] ? fromPg(rows[0] as PgDeckRow) : null;
  }

  async createDeck(userId: string, deck: DeckWrite, max: number): Promise<DeckRow> {
    let id: string;
    try {
      const { rows } = await this.db.query(`select public.cards_create_deck($1::uuid, $2::text, $3::jsonb, $4::integer, $5::integer) as id`, [
        userId,
        deck.name,
        JSON.stringify(deck.entries),
        deck.cardCount,
        max,
      ]);
      id = (rows[0] as { id: string }).id;
    } catch (e) {
      if (e instanceof Error && /\bdeck_limit\b/.test(e.message)) throw new ServiceError(409, "deck_limit");
      throw e;
    }
    const row = await this.getDeck(userId, id);
    if (!row) throw new Error(`deck ${id} vanished after insert`);
    return row;
  }

  async updateDeck(userId: string, id: string, deck: DeckWrite): Promise<DeckRow | null> {
    const { rows } = await this.db.query(
      `update public.cards_decks set name = $3::text, entries = $4::jsonb, card_count = $5::integer, updated_at = now()
        where id = $1::uuid and user_id = $2::uuid returning ${DECK_COLUMNS}`,
      [id, userId, deck.name, JSON.stringify(deck.entries), deck.cardCount],
    );
    return rows[0] ? fromPg(rows[0] as PgDeckRow) : null;
  }

  async deleteDeck(userId: string, id: string): Promise<boolean> {
    const { rows } = await this.db.query(`delete from public.cards_decks where id = $1::uuid and user_id = $2::uuid returning id`, [id, userId]);
    return rows.length > 0;
  }

  async grantStarterDecks(userId: string): Promise<boolean> {
    const { rows } = await this.db.query(`select public.cards_grant_starter_decks($1::uuid, $2::jsonb) as granted`, [userId, JSON.stringify(starterDeckPayload())]);
    return (rows[0] as { granted: boolean } | undefined)?.granted === true;
  }
}

/** Dev-only stand-in (lost on restart). */
export class MemoryDeckStore implements DeckStore {
  private readonly decks = new Map<string, DeckRow & { userId: string }>();
  private readonly granted = new Set<string>();
  private tick = 0;

  /** Strictly increasing timestamps so "oldest first" is well defined even within one millisecond. */
  private now(): Date {
    this.tick = Math.max(this.tick + 1, Date.now());
    return new Date(this.tick);
  }

  private copy(row: DeckRow): DeckRow {
    return { id: row.id, name: row.name, entries: structuredClone(row.entries), cardCount: row.cardCount, createdAt: new Date(row.createdAt), updatedAt: new Date(row.updatedAt) };
  }

  async listDecks(userId: string): Promise<DeckRow[]> {
    return sortDecks([...this.decks.values()].filter((d) => d.userId === userId).map((d) => this.copy(d)));
  }

  async getDeck(userId: string, id: string): Promise<DeckRow | null> {
    const d = this.decks.get(id);
    return d && d.userId === userId ? this.copy(d) : null;
  }

  private insert(userId: string, deck: DeckWrite, now: Date = this.now()): DeckRow {
    const row = { userId, id: randomUUID(), name: deck.name, entries: structuredClone(deck.entries), cardCount: deck.cardCount, createdAt: now, updatedAt: now };
    this.decks.set(row.id, row);
    return this.copy(row);
  }

  async createDeck(userId: string, deck: DeckWrite, max: number): Promise<DeckRow> {
    // Synchronous count + insert: concurrent calls cannot interleave (single-threaded).
    if ([...this.decks.values()].filter((d) => d.userId === userId).length >= max) throw new ServiceError(409, "deck_limit");
    return this.insert(userId, deck);
  }

  async updateDeck(userId: string, id: string, deck: DeckWrite): Promise<DeckRow | null> {
    const d = this.decks.get(id);
    if (!d || d.userId !== userId) return null;
    Object.assign(d, { name: deck.name, entries: structuredClone(deck.entries), cardCount: deck.cardCount, updatedAt: this.now() });
    return this.copy(d);
  }

  async deleteDeck(userId: string, id: string): Promise<boolean> {
    const d = this.decks.get(id);
    if (!d || d.userId !== userId) return false;
    return this.decks.delete(id);
  }

  async grantStarterDecks(userId: string): Promise<boolean> {
    if (this.granted.has(userId)) return false;
    this.granted.add(userId);
    const now = this.now(); // one statement in Postgres: both decks share `created_at` (ties sort by name)
    for (const deck of starterDeckPayload()) this.insert(userId, deck, now);
    return true;
  }
}

export interface DeckServiceDeps {
  decks: DeckStore;
  collection: CollectionStore;
  max?: number;
  format?: DeckFormat;
}

/** The deck rules between the HTTP routes / lobby and a `DeckStore`. */
export class DeckService {
  private readonly decks: DeckStore;
  private readonly collection: CollectionStore;
  readonly max: number;
  private readonly format: DeckFormat;

  constructor(deps: DeckServiceDeps) {
    this.decks = deps.decks;
    this.collection = deps.collection;
    this.max = deps.max ?? MAX_SAVED_DECKS;
    this.format = deps.format ?? DECK_FORMATS.standard;
  }

  private toSaved(row: DeckRow, owned: Readonly<Record<string, number>>): SavedDeck {
    return {
      id: row.id,
      name: row.name,
      format: "standard",
      entries: structuredClone(row.entries),
      cardCount: row.cardCount,
      problems: validateDeck(row.entries, this.format, owned, "play"),
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  /** Normalized name/entries, or a 400 with the first problem's Spanish text (+ every problem in `problems`). */
  private prepare(input: DeckInput, owned: Readonly<Record<string, number>>): DeckWrite {
    const name = normalizeDeckName(input.name);
    if (name === null) throw new ServiceError(400, "invalid_name");
    const problems = validateDeck(input.entries, this.format, owned, "save");
    if (problems.length > 0) throw new ServiceError(400, "invalid_deck", deckProblemText(problems[0]), { problems });
    const entries = normalizeEntries(input.entries);
    return { name, entries, cardCount: countCards(entries) };
  }

  async listDecks(userId: string): Promise<SavedDeck[]> {
    const [rows, owned] = await Promise.all([this.decks.listDecks(userId), this.collection.getInventory(userId)]);
    return rows.map((r) => this.toSaved(r, owned));
  }

  async getDeck(userId: string, id: string): Promise<SavedDeck> {
    const [row, owned] = await Promise.all([this.decks.getDeck(userId, id), this.collection.getInventory(userId)]);
    if (!row) throw new ServiceError(404, "deck_not_found");
    return this.toSaved(row, owned);
  }

  async createDeck(userId: string, input: DeckInput): Promise<SavedDeck> {
    const owned = await this.collection.getInventory(userId);
    const row = await this.decks.createDeck(userId, this.prepare(input, owned), this.max);
    return this.toSaved(row, owned);
  }

  async updateDeck(userId: string, id: string, input: DeckInput): Promise<SavedDeck> {
    const owned = await this.collection.getInventory(userId);
    const row = await this.decks.updateDeck(userId, id, this.prepare(input, owned));
    if (!row) throw new ServiceError(404, "deck_not_found");
    return this.toSaved(row, owned);
  }

  async deleteDeck(userId: string, id: string): Promise<void> {
    if (!(await this.decks.deleteDeck(userId, id))) throw new ServiceError(404, "deck_not_found");
  }

  /** What `resolveDeckChoice` needs to snapshot a saved deck (§15.5): the entries and the owner's inventory. */
  choiceDeps(): DeckChoiceDeps {
    return {
      format: this.format,
      loadDeck: async (userId, deckId) => (await this.decks.getDeck(userId, deckId))?.entries ?? null,
      inventory: (userId) => this.collection.getInventory(userId),
    };
  }
}
