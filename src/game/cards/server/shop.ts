// The card store (Phase 17, §16.3–§16.5). Named "shop" so it does not clash with the match `store.ts`.
// `ShopStore` is persistence only: `PgShopStore` calls `cards_purchase_pack` (one atomic, idempotent statement), and
// `MemoryShopStore` is the local-dev fallback without DB credentials. `ShopService` validates the request, rolls the
// pack with `node:crypto` (T11: the client only ever sends a pack type and an idempotency key) and reads the history.
import "server-only";
import { randomInt } from "node:crypto";
import type { CardId } from "../catalog/types";
import { ECONOMY, type PackType } from "../config/economy";
import {
  isPackType,
  packOffers,
  PURCHASE_KEY_RE,
  RECENT_OPENINGS_LIMIT,
  type PackOpeningSummary,
  type PurchaseInput,
  type PurchaseResponse,
  type StoreResponse,
} from "../collection/shop";
import type { CollectionStore, MemoryCollectionStore } from "./collection";
import { ServiceError } from "./errors";
import { rollPack, type RandInt } from "./packs";
import type { Queryable } from "./pgStore";

/**
 * Contract (memory and Postgres behave the same; `testing/shopSuite.ts` runs on both):
 * - `purchasePack` debits `price`, records the opening and a `pack_purchase` ledger row, and adds one copy per card,
 *   all or nothing. Not enough Oro (or no wallet) → `ServiceError(409, "insufficient_funds")`, nothing written.
 * - The same `(userId, key)` again — sequentially or concurrently — returns the first opening's id and cards with
 *   `replayed: true` and the current balance; it never debits twice, whatever `cards` the retry passes.
 * - `listOpenings` returns the user's openings newest first.
 */
export interface ShopStore {
  purchasePack(userId: string, packType: PackType, price: number, cards: readonly CardId[], key: string): Promise<PurchaseResponse>;
  listOpenings(userId: string, limit: number): Promise<PackOpeningSummary[]>;
}

/** Validates a purchase body: `{ packType, idempotencyKey }`. Unknown pack → 400 `invalid_pack`; anything else malformed → 400 `bad_request`. */
export function parsePurchaseInput(body: unknown): PurchaseInput {
  if (!body || typeof body !== "object" || Array.isArray(body)) throw new ServiceError(400, "bad_request");
  const { packType, idempotencyKey } = body as Record<string, unknown>;
  if (typeof idempotencyKey !== "string" || !PURCHASE_KEY_RE.test(idempotencyKey)) throw new ServiceError(400, "bad_request");
  if (!isPackType(packType)) throw new ServiceError(400, "invalid_pack");
  return { packType, idempotencyKey };
}

function isUniqueViolation(e: unknown): boolean {
  return typeof e === "object" && e !== null && (e as { code?: unknown }).code === "23505";
}

function toIso(v: Date | string): string {
  return (v instanceof Date ? v : new Date(v)).toISOString();
}

export class PgShopStore implements ShopStore {
  constructor(private readonly db: Queryable) {}

  async purchasePack(userId: string, packType: PackType, price: number, cards: readonly CardId[], key: string): Promise<PurchaseResponse> {
    try {
      const { rows } = await this.db.query(`select public.cards_purchase_pack($1::uuid, $2::text, $3::integer, $4::text[], $5::text) as result`, [
        userId,
        packType,
        price,
        [...cards],
        key,
      ]);
      return parseResult((rows[0] as { result: unknown }).result);
    } catch (e) {
      if (e instanceof Error && /\binsufficient_funds\b/.test(e.message)) throw new ServiceError(409, "insufficient_funds");
      // A concurrent call with the same key committed first (§16.4 step 4): this call rolled back; answer with its opening.
      if (isUniqueViolation(e)) {
        const replay = await this.replay(userId, key);
        if (replay) return replay;
      }
      throw e;
    }
  }

  private async replay(userId: string, key: string): Promise<PurchaseResponse | null> {
    const { rows } = await this.db.query(
      `select o.id, o.cards, w.balance from public.cards_pack_openings o
         left join public.cards_wallets w on w.user_id = o.user_id
        where o.user_id = $1::uuid and o.idempotency_key = $2::text`,
      [userId, key],
    );
    const row = rows[0] as { id: string; cards: string[]; balance: number | null } | undefined;
    return row ? { openingId: row.id, cards: [...row.cards], balance: Number(row.balance ?? 0), replayed: true } : null;
  }

  async listOpenings(userId: string, limit: number): Promise<PackOpeningSummary[]> {
    const { rows } = await this.db.query(
      `select id, pack_type, cards, created_at from public.cards_pack_openings
        where user_id = $1::uuid order by created_at desc, id desc limit $2::integer`,
      [userId, Math.max(0, Math.floor(limit))],
    );
    return (rows as { id: string; pack_type: string; cards: string[]; created_at: Date | string }[]).map((r) => ({
      id: r.id,
      packType: r.pack_type,
      cards: [...r.cards],
      createdAt: toIso(r.created_at),
    }));
  }
}

function parseResult(raw: unknown): PurchaseResponse {
  const r = (typeof raw === "string" ? JSON.parse(raw) : raw) as { openingId: string; cards: string[]; balance: number; replayed: boolean };
  return { openingId: r.openingId, cards: [...r.cards], balance: Number(r.balance), replayed: r.replayed === true };
}

/** Dev-only stand-in (lost on restart): writes through the dev collection store's wallet and inventory. */
export class MemoryShopStore implements ShopStore {
  private readonly openings = new Map<string, (PackOpeningSummary & { key: string })[]>(); // newest last
  private tick = 0;
  private nextId = 0;

  constructor(private readonly collection: MemoryCollectionStore) {}

  async purchasePack(userId: string, packType: PackType, price: number, cards: readonly CardId[], key: string): Promise<PurchaseResponse> {
    const mine = this.openings.get(userId) ?? [];
    const existing = mine.find((o) => o.key === key);
    if (existing) return { openingId: existing.id, cards: [...existing.cards], balance: (await this.collection.getWallet(userId)).balance, replayed: true };
    if (price <= 0 || cards.length === 0) throw new Error("invalid_pack");
    const balance = this.collection.debitForPack(userId, price, cards);
    if (balance === null) throw new ServiceError(409, "insufficient_funds");
    this.tick = Math.max(this.tick + 1, Date.now());
    const id = `00000000-0000-4000-8000-${String(++this.nextId).padStart(12, "0")}`;
    mine.push({ id, key, packType, cards: [...cards], createdAt: new Date(this.tick).toISOString() });
    this.openings.set(userId, mine);
    return { openingId: id, cards: [...cards], balance, replayed: false };
  }

  async listOpenings(userId: string, limit: number): Promise<PackOpeningSummary[]> {
    return [...(this.openings.get(userId) ?? [])]
      .reverse()
      .slice(0, Math.max(0, Math.floor(limit)))
      .map(({ id, packType, cards, createdAt }) => ({ id, packType, cards: [...cards], createdAt }));
  }
}

export interface ShopServiceDeps {
  store: ShopStore;
  collection: CollectionStore;
  /** Uniform integer in [0, n). Production: `crypto.randomInt`. */
  rand?: RandInt;
}

export class ShopService {
  private readonly rand: RandInt;

  constructor(private readonly deps: ShopServiceDeps) {
    this.rand = deps.rand ?? ((n) => randomInt(n));
  }

  /** Offers, balance and the last `RECENT_OPENINGS_LIMIT` openings. Performs the one-time starter grant first. */
  async getStore(userId: string): Promise<StoreResponse> {
    await this.deps.collection.ensureStarterGrant(userId);
    const [wallet, openings] = await Promise.all([this.deps.collection.getWallet(userId), this.deps.store.listOpenings(userId, RECENT_OPENINGS_LIMIT)]);
    return { packs: packOffers(), balance: wallet.balance, openings };
  }

  /** Buys one pack (§16.4): validate → starter grant → roll server-side → one atomic, idempotent SQL call. */
  async purchasePack(userId: string, packType: unknown, idempotencyKey: unknown): Promise<PurchaseResponse> {
    const input = parsePurchaseInput({ packType, idempotencyKey });
    await this.deps.collection.ensureStarterGrant(userId);
    const cards = rollPack(input.packType, this.rand);
    return this.deps.store.purchasePack(userId, input.packType, ECONOMY.packs[input.packType].price, cards, input.idempotencyKey);
  }
}
