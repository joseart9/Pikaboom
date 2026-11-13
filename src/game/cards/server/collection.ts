// Card ownership and wallet on the server (Phase 14, §15.1–§15.2). `PgCollectionStore` runs on Postgres through
// any `Queryable` (`pg.Pool`, PGlite in tests); `MemoryCollectionStore` is the local-dev fallback without DB
// credentials (like the in-memory match store). Both have the same semantics.
import "server-only";
import type { CardId } from "../catalog/types";
import { ECONOMY } from "../config/economy";
import { normalizeInventory, type Inventory } from "../collection/inventory";
import { starterGrantCards } from "../collection/starterGrant";
import type { CurrencyTransaction, TransactionKind } from "../collection/wallet";
import { starterDeckPayload } from "../decks/saved";
import type { Queryable } from "./pgStore";

export interface Wallet {
  balance: number;
}

export interface CollectionStore {
  /**
   * Grants the starter cards + `ECONOMY.startingBalance` once per user, then the two starter decks once per user
   * (Phase 15; separate guard, so older accounts get them too). True only for the call that granted the cards.
   */
  ensureStarterGrant(userId: string): Promise<boolean>;
  /** Owned quantities: catalog ids only, every Básica ×2 (see `normalizeInventory`). */
  getInventory(userId: string): Promise<Inventory>;
  /** Balance (0 when the user has no wallet yet). */
  getWallet(userId: string): Promise<Wallet>;
  /** The newest `limit` ledger rows, newest first (Phase 16). */
  getTransactions(userId: string, limit: number): Promise<CurrencyTransaction[]>;
}

export class PgCollectionStore implements CollectionStore {
  constructor(
    private readonly db: Queryable,
    private readonly startingBalance: number = ECONOMY.startingBalance,
  ) {}

  async ensureStarterGrant(userId: string): Promise<boolean> {
    const { rows } = await this.db.query(`select public.cards_grant_starter($1::uuid, $2::jsonb, $3::integer) as granted`, [
      userId,
      JSON.stringify(starterGrantCards()),
      this.startingBalance,
    ]);
    const granted = (rows[0] as { granted: boolean } | undefined)?.granted === true;
    await this.db.query(`select public.cards_grant_starter_decks($1::uuid, $2::jsonb)`, [userId, JSON.stringify(starterDeckPayload())]);
    return granted;
  }

  async getInventory(userId: string): Promise<Inventory> {
    const { rows } = await this.db.query(`select card_id, quantity from public.cards_inventory where user_id = $1::uuid`, [userId]);
    return normalizeInventory((rows as { card_id: string; quantity: number }[]).map((r) => ({ cardId: r.card_id, quantity: Number(r.quantity) })));
  }

  async getWallet(userId: string): Promise<Wallet> {
    const { rows } = await this.db.query(`select balance from public.cards_wallets where user_id = $1::uuid`, [userId]);
    const row = rows[0] as { balance: number } | undefined;
    return { balance: row ? Number(row.balance) : 0 };
  }

  async getTransactions(userId: string, limit: number): Promise<CurrencyTransaction[]> {
    const { rows } = await this.db.query(
      `select id, amount, balance_after, kind, created_at from public.cards_currency_transactions
        where user_id = $1::uuid order by created_at desc, id desc limit $2::integer`,
      [userId, Math.max(0, Math.floor(limit))],
    );
    return (rows as { id: number | string; amount: number; balance_after: number; kind: TransactionKind; created_at: Date | string }[]).map((r) => ({
      id: Number(r.id),
      amount: Number(r.amount),
      balanceAfter: Number(r.balance_after),
      kind: r.kind,
      createdAt: (r.created_at instanceof Date ? r.created_at : new Date(r.created_at)).toISOString(),
    }));
  }
}

/** Dev-only stand-in (lost on restart). */
export class MemoryCollectionStore implements CollectionStore {
  private readonly users = new Map<string, { balance: number; cards: Map<CardId, number>; ledger: CurrencyTransaction[] }>();
  private nextTxId = 0;

  constructor(
    private readonly startingBalance: number = ECONOMY.startingBalance,
    /** The dev deck store that receives the starter decks (Phase 15); omitted in collection-only tests. */
    private readonly decks?: { grantStarterDecks(userId: string): Promise<boolean> },
  ) {}

  async ensureStarterGrant(userId: string): Promise<boolean> {
    await this.decks?.grantStarterDecks(userId);
    if (this.users.has(userId)) return false;
    const cards = new Map<CardId, number>();
    for (const { cardId, count } of starterGrantCards()) cards.set(cardId, count);
    const ledger: CurrencyTransaction[] = [];
    if (this.startingBalance > 0) {
      ledger.push({ id: ++this.nextTxId, amount: this.startingBalance, balanceAfter: this.startingBalance, kind: "starter_grant", createdAt: new Date().toISOString() });
    }
    this.users.set(userId, { balance: this.startingBalance, cards, ledger });
    return true;
  }

  async getInventory(userId: string): Promise<Inventory> {
    const cards = this.users.get(userId)?.cards ?? new Map<CardId, number>();
    return normalizeInventory([...cards].map(([cardId, quantity]) => ({ cardId, quantity })));
  }

  async getWallet(userId: string): Promise<Wallet> {
    return { balance: this.users.get(userId)?.balance ?? 0 };
  }

  /**
   * Dev mirror of `cards_purchase_pack`'s writes (Phase 17, used by `MemoryShopStore`): debit `price` if the balance
   * covers it, add a `pack_purchase` ledger row and one copy per card. Returns the new balance, or null (nothing
   * changed) when the user has no wallet or not enough Oro.
   */
  debitForPack(userId: string, price: number, cards: readonly CardId[]): number | null {
    const user = this.users.get(userId);
    if (!user || user.balance < price) return null;
    user.balance -= price;
    user.ledger.push({ id: ++this.nextTxId, amount: -price, balanceAfter: user.balance, kind: "pack_purchase", createdAt: new Date().toISOString() });
    for (const id of cards) user.cards.set(id, (user.cards.get(id) ?? 0) + 1);
    return user.balance;
  }

  async getTransactions(userId: string, limit: number): Promise<CurrencyTransaction[]> {
    const ledger = this.users.get(userId)?.ledger ?? [];
    return [...ledger]
      .reverse()
      .slice(0, Math.max(0, Math.floor(limit)))
      .map((tx) => ({ ...tx }));
  }
}
