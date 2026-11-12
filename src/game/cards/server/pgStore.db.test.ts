// Phase 9 DB tests: PgMatchStore on PGlite (store contract, privileges) + the shared Phase 8 service suite.
import type { PGlite } from "@electric-sql/pglite";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { createTestDb, createTestUser } from "../testing/pglite";
import { GUEST, HOST, makeService, STRANGER } from "../testing/server";
import { defineSharedServiceTests } from "../testing/serviceSuite";
import { newLobby } from "./lobby";
import { PgMatchStore } from "./pgStore";
import { DuplicateCommand, StoreConflict, type CommandLogEntry } from "./store";

let db: PGlite;
let store: PgMatchStore;

beforeAll(async () => {
  db = await createTestDb();
  store = new PgMatchStore(db);
  await createTestUser(db, HOST, "Ana");
  await createTestUser(db, GUEST, "Beto");
  await createTestUser(db, STRANGER, "Ceci");
});

afterAll(async () => {
  await db?.close();
});

beforeEach(async () => {
  await db.exec(`truncate public.cards_matches cascade`);
});

const lobbyFor = (hostId: string, code: string) => ({ code, hostId, hostName: "Ana", lobby: newLobby() });
const cmd = (commandId: string, seat: 0 | 1 = 0): CommandLogEntry => ({ commandId, userId: seat === 0 ? HOST : GUEST, seat, command: { t: "endTurn" } });

/** Moves a row's `updated_at` into the past (the store measures staleness on the DB clock). */
async function age(id: string, ms: number): Promise<void> {
  await db.query(`update public.cards_matches set updated_at = updated_at - $2::integer * interval '1 millisecond' where id = $1`, [id, ms]);
}

describe("harness", () => {
  it("default privileges are granted, so the revoke assertions below are not vacuous", async () => {
    await db.exec(`create table if not exists public.harness_probe (id int)`);
    const { rows } = await db.query<{ ok: boolean }>(`select has_table_privilege('anon', 'public.harness_probe', 'select') as ok`);
    expect(rows[0].ok).toBe(true);
    await db.exec(`drop table public.harness_probe`);
  });

  it("migrations are idempotent (applying them again succeeds)", async () => {
    const { applyMigrations } = await import("../testing/pglite");
    await applyMigrations(db);
  });
});

describe("privileges (T2, T3)", () => {
  for (const role of ["anon", "authenticated"]) {
    for (const table of ["public.cards_matches", "public.cards_match_commands"]) {
      it(`${role} has no privilege on ${table}`, async () => {
        const { rows } = await db.query<Record<string, boolean>>(
          `select has_table_privilege($1, $2, 'select') as s, has_table_privilege($1, $2, 'insert') as i,
                  has_table_privilege($1, $2, 'update') as u, has_table_privilege($1, $2, 'delete') as d`,
          [role, table],
        );
        expect(rows[0]).toEqual({ s: false, i: false, u: false, d: false });
      });
    }
  }

  it("a client role selecting the table is denied", async () => {
    await store.insertLobby(lobbyFor(HOST, "AAAAAA"));
    await db.exec(`set role anon`);
    try {
      await expect(db.query(`select * from public.cards_matches`)).rejects.toThrow(/permission denied/);
    } finally {
      await db.exec(`reset role`);
    }
  });

  it("RLS is enabled on both tables", async () => {
    const { rows } = await db.query<{ relname: string; relrowsecurity: boolean }>(
      `select relname, relrowsecurity from pg_class where relname in ('cards_matches', 'cards_match_commands') order by relname`,
    );
    expect(rows).toEqual([
      { relname: "cards_match_commands", relrowsecurity: true },
      { relname: "cards_matches", relrowsecurity: true },
    ]);
  });
});

describe("PgMatchStore contract", () => {
  it("insertLobby creates a version-1 lobby; a code conflict returns null", async () => {
    const row = await store.insertLobby(lobbyFor(HOST, "ABCDEF"));
    expect(row).toMatchObject({ code: "ABCDEF", status: "lobby", hostId: HOST, guestId: null, version: 1, state: null, totalTurns: 0 });
    expect(row!.id).toMatch(/^[0-9a-f-]{36}$/);
    expect(row!.lobby).toEqual(newLobby());
    expect(row!.seenHost).toBeInstanceOf(Date);
    expect(row!.now).toBeInstanceOf(Date);
    expect(await store.insertLobby(lobbyFor(GUEST, "ABCDEF"))).toBeNull();
    expect((await store.loadByCode("ABCDEF"))!.id).toBe(row!.id);
    expect(await store.load("00000000-0000-4000-8000-000000000000")).toBeNull();
    expect(await store.load("not-a-uuid")).toBeNull();
  });

  it("update with the wrong version throws StoreConflict and writes nothing", async () => {
    const row = (await store.insertLobby(lobbyFor(HOST, "BBBBBB")))!;
    await expect(store.update(row.id, 7, { guestName: "x" }, cmd("c-wrong-version-000"), 0)).rejects.toBeInstanceOf(StoreConflict);
    expect((await store.load(row.id))!.version).toBe(1);
    expect(await store.hasCommand(row.id, "c-wrong-version-000")).toBe(false);
  });

  it("update patches only present keys, null writes NULL, bumps version, touches the seat, logs the command", async () => {
    const row = (await store.insertLobby(lobbyFor(HOST, "CCCCCC")))!;
    const joined = await store.update(row.id, 1, { guestId: GUEST, guestName: "Beto" }, cmd("c-join-00000000000", 1), 1);
    expect(joined).toMatchObject({ version: 2, guestId: GUEST, guestName: "Beto", hostName: "Ana", status: "lobby" });
    expect(joined.seenGuest).toBeInstanceOf(Date);
    const deadline = new Date("2030-01-01T00:00:00.000Z");
    const next = await store.update(row.id, 2, { guestId: null, guestName: null, turnDeadline: deadline }, null, null);
    expect(next).toMatchObject({ version: 3, guestId: null, guestName: null, status: "lobby" });
    expect(next.turnDeadline).toEqual(deadline);
    expect(await store.listCommands(row.id)).toEqual([{ commandId: "c-join-00000000000", userId: GUEST, seat: 1, command: { t: "endTurn" }, seq: 2 }]);
  });

  it("a duplicate command id throws DuplicateCommand and leaves the version unchanged", async () => {
    const row = (await store.insertLobby(lobbyFor(HOST, "DDDDDD")))!;
    await store.update(row.id, 1, { guestName: "a" }, cmd("c-dup-000000000000"), 0);
    await expect(store.update(row.id, 2, { guestName: "b" }, cmd("c-dup-000000000000"), 0)).rejects.toBeInstanceOf(DuplicateCommand);
    const after = (await store.load(row.id))!;
    expect(after.version).toBe(2);
    expect(after.guestName).toBe("a");
    expect(await store.listCommands(row.id)).toHaveLength(1);
  });

  it("JSONB state and dates round-trip", async () => {
    const row = (await store.insertLobby(lobbyFor(HOST, "EEEEEE")))!;
    const lobby = { host: { deck: { kind: "starter" as const, id: "starter-undead" as const }, ready: true }, guest: { deck: null, ready: false } };
    const started = new Date("2026-11-12T12:00:00.123Z");
    const r = await store.update(row.id, 1, { lobby, startedAt: started, totalTurns: 4, result: "draw", endReason: "turn_limit" }, null, null);
    expect(r).toMatchObject({ lobby, totalTurns: 4, result: "draw", endReason: "turn_limit" });
    expect(r.startedAt).toEqual(started);
  });

  it("touch sets seen without bumping the version", async () => {
    const row = (await store.insertLobby(lobbyFor(HOST, "FFFFFF")))!;
    expect(row.seenGuest).toBeNull();
    await store.touch(row.id, 1);
    const after = (await store.load(row.id))!;
    expect(after.version).toBe(1);
    expect(after.seenGuest).toBeInstanceOf(Date);
  });

  it("findOpenForUser only returns lobby/active rows of that user (host or guest), newest first", async () => {
    const a = (await store.insertLobby(lobbyFor(HOST, "GGGGGG")))!;
    expect((await store.findOpenForUser(HOST))!.id).toBe(a.id);
    expect(await store.findOpenForUser(GUEST)).toBeNull();
    await store.update(a.id, 1, { guestId: GUEST, guestName: "Beto" }, null, null);
    expect((await store.findOpenForUser(GUEST))!.id).toBe(a.id);
    await store.update(a.id, 2, { status: "active" }, null, null);
    expect((await store.findOpenForUser(GUEST))!.id).toBe(a.id);
    for (const status of ["finished", "abandoned", "cancelled"] as const) {
      const v = (await store.load(a.id))!.version;
      await store.update(a.id, v, { status }, null, null);
      expect(await store.findOpenForUser(HOST)).toBeNull();
      expect(await store.findOpenForUser(GUEST)).toBeNull();
    }
    const b = (await store.insertLobby(lobbyFor(HOST, "HHHHHH")))!;
    expect((await store.findOpenForUser(HOST))!.id).toBe(b.id);
    expect(await store.findOpenForUser(STRANGER)).toBeNull();
  });

  it("markStale: active idle > 30 min → abandoned, lobby idle > 2 h → cancelled (version bumped, deadline cleared)", async () => {
    const lobbyFresh = (await store.insertLobby(lobbyFor(HOST, "JJJJJJ")))!;
    const lobbyOld = (await store.insertLobby(lobbyFor(GUEST, "KKKKKK")))!;
    const active = (await store.insertLobby(lobbyFor(STRANGER, "LLLLLL")))!;
    await store.update(active.id, 1, { status: "active", turnDeadline: new Date() }, null, null);
    const activeFresh = (await store.insertLobby(lobbyFor(STRANGER, "MMMMMM")))!;
    await store.update(activeFresh.id, 1, { status: "active" }, null, null);
    await age(lobbyFresh.id, 31 * 60 * 1000); // a lobby only expires after 2 h
    await age(lobbyOld.id, 2 * 60 * 60 * 1000 + 1000);
    await age(active.id, 30 * 60 * 1000 + 1000);
    await store.markStale(new Date());
    expect((await store.load(lobbyFresh.id))!).toMatchObject({ status: "lobby", version: 1 });
    expect((await store.load(lobbyOld.id))!).toMatchObject({ status: "cancelled", version: 2 });
    expect((await store.load(active.id))!).toMatchObject({ status: "abandoned", version: 3, turnDeadline: null, winnerId: null });
    expect((await store.load(activeFresh.id))!).toMatchObject({ status: "active", version: 2 });
  });

  it("the distinct-players constraint rejects host = guest", async () => {
    const row = (await store.insertLobby(lobbyFor(HOST, "NNNNNN")))!;
    await expect(store.update(row.id, 1, { guestId: HOST }, null, null)).rejects.toThrow(/cards_matches_distinct_players/);
  });
});

defineSharedServiceTests("PgMatchStore on PGlite", async (opts) => makeService({ ...opts, store: () => store }));
