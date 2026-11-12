// The persistence contract of the match service (§13.4). Phase 8 ships an in-memory implementation
// (`memoryStore.ts`); Phase 9 implements the same contract in SQL (`pgStore.ts`). Pure types: no `server-only`.
import type { EndReason, MatchSetup, MatchState, Seat } from "../engine/types";
import type { SystemCommand } from "../engine/commands";
import type { ClientCommand, DeckChoice } from "./commands";

export type MatchStatus = "lobby" | "active" | "finished" | "abandoned" | "cancelled";

/** Statuses a user can still be "in" (one at a time per user). */
export const OPEN_STATUSES: readonly MatchStatus[] = ["lobby", "active"];

export interface LobbySeat {
  deck: DeckChoice | null;
  ready: boolean;
}

export interface LobbyState {
  host: LobbySeat;
  guest: LobbySeat;
  lastError?: { seat: Seat; code: string }; // used from Phase 15
}

export interface MatchRow {
  id: string;
  code: string;
  status: MatchStatus;
  hostId: string;
  guestId: string | null;
  hostName: string;
  guestName: string | null; // denormalized at join (from profiles.username)
  lobby: LobbyState;
  state: MatchState | null;
  setup: MatchSetup | null;
  version: number;
  turnDeadline: Date | null;
  seenHost: Date | null;
  seenGuest: Date | null;
  winnerId: string | null;
  result: "win" | "draw" | null;
  endReason: EndReason | null;
  totalTurns: number;
  rewardsGrantedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  startedAt: Date | null;
  finishedAt: Date | null;
  now: Date; // DB clock at read
}

/**
 * A partial update. A key that is present (even with value `null`) is written; an absent key leaves the column untouched.
 * `version` (+1), `updatedAt` and the touched seat's `seen*` are always set by the store.
 */
export type MatchPatch = Partial<
  Pick<
    MatchRow,
    | "status"
    | "guestId"
    | "guestName"
    | "lobby"
    | "state"
    | "setup"
    | "turnDeadline"
    | "winnerId"
    | "result"
    | "endReason"
    | "totalTurns"
    | "startedAt"
    | "finishedAt"
  >
>;

/** One row of `cards_match_commands`. System commands have `userId = null`; `seat` is the seat the command acted as. */
export interface CommandLogEntry {
  commandId: string;
  userId: string | null;
  seat: Seat;
  command: ClientCommand | SystemCommand | { t: "lobby.join" };
}

/**
 * Contract (Phase 9 implements it in SQL with identical semantics):
 * - `insertLobby` creates a row with `status "lobby"`, `version 1`, `guestId/guestName null`, `seenHost = now`,
 *   every game column null/0, a fresh uuid `id`. Codes are unique across **all** rows ever created (not only open
 *   ones); a code conflict returns `null` (the caller picks another code).
 * - `load` / `loadByCode` return a deep copy (mutating it never affects the store) with `now` = store clock, or null.
 * - `findOpenForUser` returns the most recently created row with status `lobby|active` where the user is host or guest.
 * - `update(id, expectedVersion, patch, cmd, touchSeat)` is atomic:
 *     1. if the row's version ≠ `expectedVersion` (or the row does not exist) → throws `StoreConflict`, nothing written;
 *     2. else if `cmd` is given and `(id, cmd.commandId)` already exists → throws `DuplicateCommand`, nothing written
 *        (the version stays unchanged);
 *     3. else applies the patch, `version += 1`, `updatedAt = now`, sets `seenHost`/`seenGuest` to now when
 *        `touchSeat` is 0/1 (null = system write, nobody is marked online), and inserts the command with
 *        `seq = the new version`. Returns the updated row (with `now`).
 * - `hasCommand` checks the command log; `listCommands` returns all entries ordered by `seq`.
 * - `touch(id, seat)` only sets that seat's `seen*` to now (no version change, so polls can still answer `same`).
 * - `markStale(now)`: `active` rows with `updatedAt < now − 30 min` → `abandoned` (no winner);
 *   `lobby` rows with `updatedAt < now − 2 h` → `cancelled`. Both bump `version` and `updatedAt` (§6.11).
 */
export interface MatchStore {
  insertLobby(row: { code: string; hostId: string; hostName: string; lobby: LobbyState }): Promise<MatchRow | null>;
  load(id: string): Promise<MatchRow | null>;
  loadByCode(code: string): Promise<MatchRow | null>;
  findOpenForUser(userId: string): Promise<MatchRow | null>;
  update(id: string, expectedVersion: number, patch: MatchPatch, cmd: CommandLogEntry | null, touchSeat: Seat | null): Promise<MatchRow>;
  hasCommand(id: string, commandId: string): Promise<boolean>;
  touch(id: string, seat: Seat): Promise<void>;
  listCommands(id: string): Promise<(CommandLogEntry & { seq: number })[]>;
  markStale(now: Date): Promise<void>;
}

/** §6.11 stale rules. */
export const STALE_ACTIVE_MS = 30 * 60 * 1000;
export const STALE_LOBBY_MS = 2 * 60 * 60 * 1000;

/** The row's version changed since it was loaded (optimistic concurrency, ADR-02). */
export class StoreConflict extends Error {
  constructor(public readonly matchId: string) {
    super(`version conflict on match ${matchId}`);
    this.name = "StoreConflict";
  }
}

/** The command id was already recorded for this match (idempotency, ADR-03). */
export class DuplicateCommand extends Error {
  constructor(
    public readonly matchId: string,
    public readonly commandId: string,
  ) {
    super(`duplicate command ${commandId} on match ${matchId}`);
    this.name = "DuplicateCommand";
  }
}

export function seatOfUser(row: Pick<MatchRow, "hostId" | "guestId">, userId: string): Seat | null {
  if (row.hostId === userId) return 0;
  if (row.guestId !== null && row.guestId === userId) return 1;
  return null;
}
