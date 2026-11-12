// The process-wide MatchService used by the route handlers (Phase 9). Postgres in production; an in-memory store in
// local dev when no DB credentials are configured (like src/game/battleship/rooms.ts), with a warning.
import "server-only";
import { db } from "@/lib/db";
import { MatchService, randomLobbyCode, randomMatchSeed } from "./matchService";
import { MemoryMatchStore } from "./memoryStore";
import { PgMatchStore } from "./pgStore";

/** True when matches (and profiles) live in Postgres. */
export const hasMatchDb = !!(process.env.SUPABASE_DB_URL || process.env.SUPABASE_DB_PASSWORD) || process.env.NODE_ENV === "production";

const globalForCards = globalThis as unknown as { cardsMatchService?: MatchService };

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
    });
  }
  return globalForCards.cardsMatchService;
}
