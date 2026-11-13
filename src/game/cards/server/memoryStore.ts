// In-memory MatchStore (tests, and a dev fallback). Mirrors the SQL semantics of §13.4 exactly — see the
// contract in store.ts. Every read and write goes through structuredClone, so callers never share objects with it.
import type { Seat } from "../engine/types";
import {
  DuplicateCommand,
  OPEN_STATUSES,
  STALE_ACTIVE_MS,
  STALE_LOBBY_MS,
  StoreConflict,
  type CommandLogEntry,
  type LobbyState,
  type MatchPatch,
  type MatchRow,
  type MatchStore,
} from "./store";

type StoredRow = Omit<MatchRow, "now">;

const PATCH_KEYS = [
  "status",
  "guestId",
  "guestName",
  "lobby",
  "state",
  "setup",
  "turnDeadline",
  "winnerId",
  "result",
  "endReason",
  "totalTurns",
  "startedAt",
  "finishedAt",
] as const satisfies readonly (keyof MatchPatch)[];

export class MemoryMatchStore implements MatchStore {
  private readonly rows = new Map<string, StoredRow>();
  private readonly commands = new Map<string, Map<string, CommandLogEntry & { seq: number }>>();
  private nextId = 0;
  private readonly now: () => Date;

  constructor(opts: { now?: () => Date } = {}) {
    this.now = opts.now ?? (() => new Date());
  }

  private out(row: StoredRow): MatchRow {
    return { ...structuredClone(row), now: new Date(this.now().getTime()) };
  }

  /** Lets other requests interleave between store calls, like real I/O would. */
  private async tick(): Promise<void> {
    await Promise.resolve();
  }

  async insertLobby(input: { code: string; hostId: string; hostName: string; lobby: LobbyState }): Promise<MatchRow | null> {
    await this.tick();
    for (const r of this.rows.values()) if (r.code === input.code) return null;
    const now = this.now();
    this.nextId += 1;
    const id = `00000000-0000-4000-8000-${this.nextId.toString(16).padStart(12, "0")}`;
    const row: StoredRow = {
      id,
      code: input.code,
      status: "lobby",
      hostId: input.hostId,
      guestId: null,
      hostName: input.hostName,
      guestName: null,
      lobby: structuredClone(input.lobby),
      state: null,
      setup: null,
      version: 1,
      turnDeadline: null,
      seenHost: now,
      seenGuest: null,
      winnerId: null,
      result: null,
      endReason: null,
      totalTurns: 0,
      rewardsGrantedAt: null,
      createdAt: now,
      updatedAt: now,
      startedAt: null,
      finishedAt: null,
    };
    this.rows.set(id, structuredClone(row));
    this.commands.set(id, new Map());
    return this.out(row);
  }

  async load(id: string): Promise<MatchRow | null> {
    await this.tick();
    const row = this.rows.get(id);
    return row ? this.out(row) : null;
  }

  async loadByCode(code: string): Promise<MatchRow | null> {
    await this.tick();
    for (const r of this.rows.values()) if (r.code === code) return this.out(r);
    return null;
  }

  async findOpenForUser(userId: string): Promise<MatchRow | null> {
    await this.tick();
    let best: StoredRow | null = null;
    for (const r of this.rows.values()) {
      if (!OPEN_STATUSES.includes(r.status)) continue;
      if (r.hostId !== userId && r.guestId !== userId) continue;
      if (!best || r.createdAt.getTime() >= best.createdAt.getTime()) best = r;
    }
    return best ? this.out(best) : null;
  }

  async update(id: string, expectedVersion: number, patch: MatchPatch, cmd: CommandLogEntry | null, touchSeat: Seat | null): Promise<MatchRow> {
    await this.tick();
    const row = this.rows.get(id);
    if (!row || row.version !== expectedVersion) throw new StoreConflict(id);
    const log = this.commands.get(id)!;
    if (cmd && log.has(cmd.commandId)) throw new DuplicateCommand(id, cmd.commandId);

    const next: StoredRow = structuredClone(row);
    for (const key of PATCH_KEYS) {
      if (Object.prototype.hasOwnProperty.call(patch, key)) {
        (next as Record<string, unknown>)[key] = structuredClone(patch[key] ?? null);
      }
    }
    const now = this.now();
    next.version = row.version + 1;
    next.updatedAt = now;
    if (touchSeat === 0) next.seenHost = now;
    if (touchSeat === 1) next.seenGuest = now;
    this.rows.set(id, next);
    if (cmd) log.set(cmd.commandId, { ...structuredClone(cmd), seq: next.version });
    return this.out(next);
  }

  async hasCommand(id: string, commandId: string): Promise<boolean> {
    await this.tick();
    return this.commands.get(id)?.has(commandId) ?? false;
  }

  async touch(id: string, seat: Seat): Promise<void> {
    await this.tick();
    const row = this.rows.get(id);
    if (!row) return;
    if (seat === 0) row.seenHost = this.now();
    else row.seenGuest = this.now();
  }

  async listCommands(id: string): Promise<(CommandLogEntry & { seq: number })[]> {
    await this.tick();
    return [...(this.commands.get(id)?.values() ?? [])].map((c) => structuredClone(c)).sort((a, b) => a.seq - b.seq);
  }

  /**
   * Not part of `MatchStore`: mirrors the last statement of `cards_grant_match_rewards` (Phase 16) — stamps
   * `rewardsGrantedAt` and bumps the version — for the test fake of the rewards port. False if already stamped.
   */
  async markRewardsGranted(id: string): Promise<boolean> {
    await this.tick();
    const row = this.rows.get(id);
    if (!row || row.rewardsGrantedAt) return false;
    const now = this.now();
    this.rows.set(id, { ...row, rewardsGrantedAt: now, version: row.version + 1, updatedAt: now });
    return true;
  }

  async markStale(now: Date): Promise<void> {
    await this.tick();
    const t = now.getTime();
    for (const [id, row] of this.rows) {
      const age = t - row.updatedAt.getTime();
      let status: StoredRow["status"] | null = null;
      if (row.status === "active" && age > STALE_ACTIVE_MS) status = "abandoned";
      else if (row.status === "lobby" && age > STALE_LOBBY_MS) status = "cancelled";
      if (!status) continue;
      this.rows.set(id, { ...row, status, version: row.version + 1, updatedAt: this.now(), turnDeadline: null });
    }
  }
}
