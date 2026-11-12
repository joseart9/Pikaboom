// MatchStore over Postgres (§13.4). Same contract as memoryStore.ts (documented in store.ts), in SQL:
// every write is one statement, guarded by the row version (ADR-02); command ids are deduplicated by the
// `cards_match_commands` primary key (ADR-03). The query function is injected so DB tests can pass PGlite.
import "server-only";
import type { Seat } from "../engine/types";
import {
  DuplicateCommand,
  STALE_ACTIVE_MS,
  STALE_LOBBY_MS,
  StoreConflict,
  type CommandLogEntry,
  type LobbyState,
  type MatchPatch,
  type MatchRow,
  type MatchStore,
} from "./store";

/** Anything with a node-postgres–style `query` (a `pg.Pool`, a `pg.Client`, a PGlite instance). */
export interface Queryable {
  query(sql: string, params?: unknown[]): Promise<{ rows: unknown[] }>;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const COLUMNS = `id, code, status, host_id, guest_id, host_name, guest_name, lobby, state, setup, version,
  turn_deadline, seen_host, seen_guest, winner_id, result, end_reason, total_turns, rewards_granted_at,
  created_at, updated_at, started_at, finished_at`;

type Kind = "text" | "uuid" | "jsonb" | "timestamptz" | "integer";

/** Whitelisted patch keys → column and SQL type. Keys outside this map are never written. */
const PATCH_COLUMNS: Record<keyof MatchPatch, { column: string; kind: Kind }> = {
  status: { column: "status", kind: "text" },
  guestId: { column: "guest_id", kind: "uuid" },
  guestName: { column: "guest_name", kind: "text" },
  lobby: { column: "lobby", kind: "jsonb" },
  state: { column: "state", kind: "jsonb" },
  setup: { column: "setup", kind: "jsonb" },
  turnDeadline: { column: "turn_deadline", kind: "timestamptz" },
  winnerId: { column: "winner_id", kind: "uuid" },
  result: { column: "result", kind: "text" },
  endReason: { column: "end_reason", kind: "text" },
  totalTurns: { column: "total_turns", kind: "integer" },
  startedAt: { column: "started_at", kind: "timestamptz" },
  finishedAt: { column: "finished_at", kind: "timestamptz" },
};

function param(kind: Kind, value: unknown): unknown {
  if (value === null || value === undefined) return null;
  if (kind === "jsonb") return JSON.stringify(value);
  if (kind === "timestamptz") return (value as Date).toISOString();
  return value;
}

type DbRow = Record<string, unknown>;

function date(v: unknown): Date | null {
  if (v === null || v === undefined) return null;
  return v instanceof Date ? v : new Date(String(v));
}

function json<T>(v: unknown): T {
  return (typeof v === "string" ? JSON.parse(v) : v) as T;
}

function toRow(r: DbRow): MatchRow {
  return {
    id: String(r.id),
    code: String(r.code),
    status: r.status as MatchRow["status"],
    hostId: String(r.host_id),
    guestId: (r.guest_id as string | null) ?? null,
    hostName: String(r.host_name),
    guestName: (r.guest_name as string | null) ?? null,
    lobby: json<LobbyState>(r.lobby),
    state: r.state == null ? null : json<MatchRow["state"]>(r.state),
    setup: r.setup == null ? null : json<MatchRow["setup"]>(r.setup),
    version: Number(r.version),
    turnDeadline: date(r.turn_deadline),
    seenHost: date(r.seen_host),
    seenGuest: date(r.seen_guest),
    winnerId: (r.winner_id as string | null) ?? null,
    result: (r.result as MatchRow["result"]) ?? null,
    endReason: (r.end_reason as MatchRow["endReason"]) ?? null,
    totalTurns: Number(r.total_turns),
    rewardsGrantedAt: date(r.rewards_granted_at),
    createdAt: date(r.created_at)!,
    updatedAt: date(r.updated_at)!,
    startedAt: date(r.started_at),
    finishedAt: date(r.finished_at),
    now: date(r.now)!,
  };
}

function isDuplicateCommand(e: unknown): boolean {
  if (typeof e !== "object" || e === null) return false;
  const err = e as { code?: unknown; constraint?: unknown };
  return err.code === "23505" && err.constraint === "cards_match_commands_pkey";
}

export class PgMatchStore implements MatchStore {
  constructor(private readonly db: Queryable) {}

  private async rows(sql: string, params: unknown[] = []): Promise<DbRow[]> {
    return (await this.db.query(sql, params)).rows as DbRow[];
  }

  async insertLobby(input: { code: string; hostId: string; hostName: string; lobby: LobbyState }): Promise<MatchRow | null> {
    const rows = await this.rows(
      `insert into public.cards_matches (code, host_id, host_name, lobby, seen_host)
       values ($1, $2::uuid, $3, $4::jsonb, now())
       on conflict (code) do nothing
       returning ${COLUMNS}, now() as now`,
      [input.code, input.hostId, input.hostName, JSON.stringify(input.lobby)],
    );
    return rows[0] ? toRow(rows[0]) : null;
  }

  async load(id: string): Promise<MatchRow | null> {
    if (!UUID_RE.test(id)) return null;
    const rows = await this.rows(`select ${COLUMNS}, now() as now from public.cards_matches where id = $1::uuid`, [id]);
    return rows[0] ? toRow(rows[0]) : null;
  }

  async loadByCode(code: string): Promise<MatchRow | null> {
    const rows = await this.rows(`select ${COLUMNS}, now() as now from public.cards_matches where code = $1`, [code]);
    return rows[0] ? toRow(rows[0]) : null;
  }

  async findOpenForUser(userId: string): Promise<MatchRow | null> {
    if (!UUID_RE.test(userId)) return null;
    // Two index-friendly branches (host / guest partial indexes) instead of an `or`.
    const rows = await this.rows(
      `select ${COLUMNS}, now() as now from (
         select * from public.cards_matches where host_id = $1::uuid and status in ('lobby','active')
         union all
         select * from public.cards_matches where guest_id = $1::uuid and status in ('lobby','active')
       ) m
       order by created_at desc
       limit 1`,
      [userId],
    );
    return rows[0] ? toRow(rows[0]) : null;
  }

  async update(id: string, expectedVersion: number, patch: MatchPatch, cmd: CommandLogEntry | null, touchSeat: Seat | null): Promise<MatchRow> {
    if (!UUID_RE.test(id)) throw new StoreConflict(id);
    const params: unknown[] = [id, expectedVersion, touchSeat];
    const p = (value: unknown): string => {
      params.push(value);
      return `$${params.length}`;
    };
    // Dynamic SET list from the keys present in the patch (§13.4 patch semantics); `null` writes NULL.
    const sets: string[] = [];
    for (const key of Object.keys(PATCH_COLUMNS) as (keyof MatchPatch)[]) {
      if (!Object.prototype.hasOwnProperty.call(patch, key)) continue;
      const { column, kind } = PATCH_COLUMNS[key];
      sets.push(`${column} = ${p(param(kind, patch[key]))}::${kind}`);
    }
    sets.push(
      "version = version + 1",
      "updated_at = now()",
      "seen_host = case when $3::smallint = 0 then now() else seen_host end",
      "seen_guest = case when $3::smallint = 1 then now() else seen_guest end",
    );
    const upd = `update public.cards_matches set ${sets.join(", ")}
       where id = $1::uuid and version = $2::integer
       returning ${COLUMNS}`;
    const sql = cmd
      ? `with upd as (${upd}), cmd as (
           insert into public.cards_match_commands (match_id, command_id, seq, user_id, seat, command)
           select id, ${p(cmd.commandId)}, version, ${p(cmd.userId)}::uuid, ${p(cmd.seat)}::smallint, ${p(JSON.stringify(cmd.command))}::jsonb
           from upd
         )
         select upd.*, now() as now from upd`
      : `with upd as (${upd}) select upd.*, now() as now from upd`;
    let rows: DbRow[];
    try {
      rows = await this.rows(sql, params);
    } catch (e) {
      // The whole statement fails, so the version bump is rolled back too (contract step 2).
      if (cmd && isDuplicateCommand(e)) throw new DuplicateCommand(id, cmd.commandId);
      throw e;
    }
    if (!rows[0]) throw new StoreConflict(id);
    return toRow(rows[0]);
  }

  async hasCommand(id: string, commandId: string): Promise<boolean> {
    if (!UUID_RE.test(id)) return false;
    const rows = await this.rows(`select 1 from public.cards_match_commands where match_id = $1::uuid and command_id = $2`, [id, commandId]);
    return rows.length > 0;
  }

  async touch(id: string, seat: Seat): Promise<void> {
    if (!UUID_RE.test(id)) return;
    const column = seat === 0 ? "seen_host" : "seen_guest";
    await this.rows(`update public.cards_matches set ${column} = now() where id = $1::uuid`, [id]);
  }

  async listCommands(id: string): Promise<(CommandLogEntry & { seq: number })[]> {
    if (!UUID_RE.test(id)) return [];
    const rows = await this.rows(
      `select command_id, user_id, seat, command, seq from public.cards_match_commands where match_id = $1::uuid order by seq`,
      [id],
    );
    return rows.map((r) => ({
      commandId: String(r.command_id),
      userId: (r.user_id as string | null) ?? null,
      seat: Number(r.seat) as Seat,
      command: json<CommandLogEntry["command"]>(r.command),
      seq: Number(r.seq),
    }));
  }

  /**
   * §6.11 stale rules, measured on the DB clock (the same clock that wrote `updated_at`); `_now` is the service clock
   * and is ignored here (DEC-015).
   */
  async markStale(_now: Date): Promise<void> {
    void _now;
    await this.rows(
      `update public.cards_matches
          set status = case when status = 'active' then 'abandoned' else 'cancelled' end,
              version = version + 1, updated_at = now(), turn_deadline = null
        where (status = 'active' and updated_at < now() - $1::integer * interval '1 millisecond')
           or (status = 'lobby'  and updated_at < now() - $2::integer * interval '1 millisecond')`,
      [STALE_ACTIVE_MS, STALE_LOBBY_MS],
    );
  }
}
