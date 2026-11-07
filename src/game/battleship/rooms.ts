import "server-only";
import { db } from "@/lib/db";
import {
  type Action,
  applyAction,
  GameError,
  type GameState,
  joinGame,
  type Mode,
  newGame,
  rememberAction,
  type Seat,
  seatOf,
  viewFor,
  type View,
} from "./logic";

// Rooms live in Postgres, so the game survives phones locking, reloads, app switches and flaky
// mobile data: any device can reconnect at any moment and pick up exactly where the game is.
// Every write is an optimistic "update … where version = n", so two simultaneous moves never clash.

const CODE_LETTERS = "ABCDEFGHJKLMNPQRSTUVWXYZ"; // no I / O (they look like 1 / 0)
const ONLINE_MS = 9_000; // a player that hasn't polled for this long shows as disconnected
const TAKEOVER_MS = 60_000; // a seat whose player vanished this long ago can be claimed by a new phone
const SEEN_EVERY_MS = 3_000;

type Row = { version: number; state: GameState; seen0: Date | null; seen1: Date | null; now: Date };

type Store = {
  load(code: string): Promise<Row | null>;
  insert(code: string, state: GameState, seat0Seen: boolean): Promise<Row | null>;
  /** Writes only if the room is still at `version`. */
  update(code: string, version: number, state: GameState, seat: Seat): Promise<Row | null>;
  touch(code: string, seat: Seat): Promise<void>;
  cleanup(): Promise<void>;
};

// ───────────────────────── Postgres (production) ─────────────────────────

const RETURNING = "returning version, state, seen0, seen1, now() as now";

let tableReady: Promise<void> | null = null;

/** Creates the table on first use, so no manual migration is needed (same SQL as supabase/migrations). */
function ensureTable() {
  tableReady ??= db()
    .query(
      `create table if not exists public.battleship_rooms (
         code text primary key,
         version integer not null default 1,
         state jsonb not null,
         seen0 timestamptz,
         seen1 timestamptz,
         created_at timestamptz not null default now(),
         updated_at timestamptz not null default now()
       );
       alter table public.battleship_rooms enable row level security;
       create index if not exists battleship_rooms_updated_at_idx on public.battleship_rooms (updated_at);`,
    )
    .then(() => undefined)
    .catch((e) => {
      tableReady = null;
      throw e;
    });
  return tableReady;
}

const pgStore: Store = {
  async load(code) {
    await ensureTable();
    const { rows } = await db().query<Row>(`select version, state, seen0, seen1, now() as now from public.battleship_rooms where code = $1`, [code]);
    return rows[0] ?? null;
  },
  async insert(code, state) {
    await ensureTable();
    const { rows } = await db().query<Row>(
      `insert into public.battleship_rooms (code, state, seen0) values ($1, $2, now()) on conflict (code) do nothing ${RETURNING}`,
      [code, state],
    );
    return rows[0] ?? null;
  },
  async update(code, version, state, seat) {
    const { rows } = await db().query<Row>(
      `update public.battleship_rooms set state = $3, version = version + 1, updated_at = now(), seen${seat} = now()
       where code = $1 and version = $2 ${RETURNING}`,
      [code, version, state],
    );
    return rows[0] ?? null;
  },
  async touch(code, seat) {
    await db().query(`update public.battleship_rooms set seen${seat} = now() where code = $1`, [code]);
  },
  async cleanup() {
    await ensureTable();
    await db().query(`delete from public.battleship_rooms where updated_at < now() - interval '2 days'`);
  },
};

// ───────────────────────── in-memory (local dev without DB credentials) ─────────────────────────

const mem = ((globalThis as unknown as { battleshipRooms?: Map<string, Omit<Row, "now">> }).battleshipRooms ??= new Map());
const snapshot = (r: Omit<Row, "now"> | undefined): Row | null => (r ? structuredClone({ ...r, now: new Date() }) : null);

const memoryStore: Store = {
  async load(code) {
    return snapshot(mem.get(code));
  },
  async insert(code, state) {
    if (mem.has(code)) return null;
    mem.set(code, { version: 1, state: structuredClone(state), seen0: new Date(), seen1: null });
    return snapshot(mem.get(code));
  },
  async update(code, version, state, seat) {
    const r = mem.get(code);
    if (!r || r.version !== version) return null;
    mem.set(code, { ...r, version: version + 1, state: structuredClone(state), [`seen${seat}`]: new Date() });
    return snapshot(mem.get(code));
  },
  async touch(code, seat) {
    const r = mem.get(code);
    if (r) r[`seen${seat}`] = new Date();
  },
  async cleanup() {},
};

const hasDb = !!(process.env.SUPABASE_DB_URL || process.env.SUPABASE_DB_PASSWORD);
const store: Store = hasDb || process.env.NODE_ENV === "production" ? pgStore : memoryStore;
if (store === memoryStore) console.warn("[battleship] No DB credentials: using an in-memory room store (dev only).");

// ───────────────────────── API ─────────────────────────

export class RoomError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}

export function normalizeCode(code: string) {
  return code.toUpperCase().replace(/[^A-Z]/g, "").slice(0, 4);
}

const msSince = (d: Date | null, now: Date) => (d ? now.getTime() - new Date(d).getTime() : Infinity);

function toView(code: string, row: Row, seat: Seat): View {
  const foeSeen = seat === 0 ? row.seen1 : row.seen0;
  return viewFor(row.state, seat, code, row.version, msSince(foeSeen, row.now) < ONLINE_MS);
}

async function load(code: string): Promise<Row> {
  const row = await store.load(code);
  if (!row) throw new RoomError("Esa sala no existe o ya expiró.", 404);
  return row;
}

export async function createRoom(playerId: string, name: string, mode: Mode, extraTurn: boolean): Promise<View> {
  void store.cleanup().catch(() => {}); // forget rooms nobody touched in two days
  const state = newGame(playerId, name, mode, extraTurn);
  for (let attempt = 0; attempt < 12; attempt++) {
    const code = Array.from({ length: 4 }, () => CODE_LETTERS[Math.floor(Math.random() * CODE_LETTERS.length)]).join("");
    const row = await store.insert(code, state, true);
    if (row) return toView(code, row, 0);
  }
  throw new RoomError("No se pudo crear la sala, intenta otra vez.", 503);
}

/** Current view for a player. Also marks them as online. */
export async function readRoom(code: string, playerId: string): Promise<View> {
  const row = await load(code);
  const seat = seatOf(row.state, playerId);
  if (seat === null) throw new RoomError("No estás en esta sala.", 403);
  if (msSince(seat === 0 ? row.seen0 : row.seen1, row.now) > SEEN_EVERY_MS) {
    await store.touch(code, seat);
    row[seat === 0 ? "seen0" : "seen1"] = row.now;
  }
  return toView(code, row, seat);
}

/** Applies an action (or a join) with optimistic concurrency. Safe to retry with the same actionId. */
export async function actOnRoom(code: string, playerId: string, actionId: string, action: Action): Promise<View> {
  for (let attempt = 0; attempt < 6; attempt++) {
    const row = await load(code);
    let seat = seatOf(row.state, playerId);

    if (seat !== null && row.state.players[seat]?.applied.includes(actionId)) {
      return toView(code, row, seat); // a retry of something we already did
    }

    let next: GameState;
    try {
      if (action.t === "join") {
        const joined = joinGame(row.state, playerId, action.name, msSince(row.seen1, row.now) > TAKEOVER_MS);
        next = joined.state;
        seat = joined.seat;
      } else {
        if (seat === null) throw new RoomError("No estás en esta sala.", 403);
        next = applyAction(row.state, seat, action);
      }
    } catch (e) {
      if (e instanceof GameError) throw new RoomError(e.message, 409);
      throw e;
    }
    rememberAction(next, seat, actionId);

    const saved = await store.update(code, row.version, next, seat);
    if (saved) return toView(code, saved, seat);
    // Someone else wrote first: reload and try again.
  }
  throw new RoomError("La sala está ocupada, intenta de nuevo.", 503);
}
