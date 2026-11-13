// The process-wide MatchService used by the route handlers (Phase 9). Postgres in production; an in-memory store in
// local dev when no DB credentials are configured (like src/game/battleship/rooms.ts), with a warning.
import "server-only";
import { db } from "@/lib/db";
import { MemoryCollectionStore, PgCollectionStore, type CollectionStore } from "./collection";
import { DeckService, MemoryDeckStore, PgDeckStore, type DeckStore } from "./decks";
import { MatchService, randomLobbyCode, randomMatchSeed } from "./matchService";
import { MemoryMatchStore } from "./memoryStore";
import { PgMatchStore } from "./pgStore";
import { NO_REWARDS, PgRewards } from "./rewards";
import { MemoryShopStore, PgShopStore, ShopService } from "./shop";

/** True when matches (and profiles) live in Postgres. */
export const hasMatchDb = !!(process.env.SUPABASE_DB_URL || process.env.SUPABASE_DB_PASSWORD) || process.env.NODE_ENV === "production";

const globalForCards = globalThis as unknown as {
  cardsMatchService?: MatchService;
  cardsCollectionStore?: CollectionStore;
  cardsDeckStore?: DeckStore;
  cardsDeckService?: DeckService;
  cardsShopService?: ShopService;
};

export function getMatchService(): MatchService {
  if (!globalForCards.cardsMatchService) {
    let store;
    if (hasMatchDb) store = new PgMatchStore(db());
    else {
      console.warn("[cards] No DB credentials: using an in-memory match store (dev only).");
      store = new MemoryMatchStore();
    }
    globalForCards.cardsMatchService = new MatchService({
      store,
      now: () => new Date(),
      randomSeed: randomMatchSeed,
      randomCode: randomLobbyCode,
      decks: getDeckService().choiceDeps(),
      // Phase 16: rewards need the SQL function, so the dev memory store never grants any.
      rewards: hasMatchDb ? new PgRewards(db()) : NO_REWARDS,
    });
  }
  return globalForCards.cardsMatchService;
}

/** Card ownership + wallet (Phase 14): Postgres when `hasMatchDb`, otherwise an in-memory store (dev only). */
export function getCollectionStore(): CollectionStore {
  if (!globalForCards.cardsCollectionStore) {
    if (hasMatchDb) globalForCards.cardsCollectionStore = new PgCollectionStore(db());
    else {
      console.warn("[cards] No DB credentials: using an in-memory collection store (dev only).");
      globalForCards.cardsCollectionStore = new MemoryCollectionStore(undefined, getDeckStore());
    }
  }
  return globalForCards.cardsCollectionStore;
}

/** Saved decks (Phase 15): Postgres when `hasMatchDb`, otherwise an in-memory store (dev only). */
function getDeckStore(): DeckStore {
  if (!globalForCards.cardsDeckStore) {
    if (hasMatchDb) globalForCards.cardsDeckStore = new PgDeckStore(db());
    else {
      console.warn("[cards] No DB credentials: using an in-memory deck store (dev only).");
      globalForCards.cardsDeckStore = new MemoryDeckStore();
    }
  }
  return globalForCards.cardsDeckStore;
}

/** Deck CRUD + validation, and the saved-deck loader the match service uses at selection and start (§15.5). */
export function getDeckService(): DeckService {
  globalForCards.cardsDeckService ??= new DeckService({ decks: getDeckStore(), collection: getCollectionStore() });
  return globalForCards.cardsDeckService;
}

/** The card store (Phase 17): `cards_purchase_pack` when `hasMatchDb`, otherwise the dev memory wallet/inventory. */
export function getShopService(): ShopService {
  if (!globalForCards.cardsShopService) {
    const collection = getCollectionStore();
    const store = collection instanceof MemoryCollectionStore ? new MemoryShopStore(collection) : new PgShopStore(db());
    globalForCards.cardsShopService = new ShopService({ store, collection });
  }
  return globalForCards.cardsShopService;
}
