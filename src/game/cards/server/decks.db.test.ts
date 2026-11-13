// Phase 15 I: `cards_decks`, `cards_create_deck`, `cards_grant_starter_decks` on PGlite — the DeckStore contract
// (10-deck limit incl. parallel creates, other users' decks, idempotent starter decks), the starter deck grant through
// the collection store (also for accounts that got their cards before Phase 15), constraints and the lockdown.
import type { PGlite } from "@electric-sql/pglite";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { MAX_SAVED_DECKS } from "../config/deckRules";
import { defineDeckStoreTests } from "../testing/deckSuite";
import { createTestDb, createTestUser } from "../testing/pglite";
import { GUEST, HOST, STRANGER } from "../testing/server";
import { PgCollectionStore } from "./collection";
import { DeckService, PgDeckStore } from "./decks";

let db: PGlite;
let decks: PgDeckStore;
let collection: PgCollectionStore;

const FUNCTIONS = ["public.cards_create_deck(uuid,text,jsonb,integer,integer)", "public.cards_grant_starter_decks(uuid,jsonb)"];

beforeAll(async () => {
  db = await createTestDb();
  decks = new PgDeckStore(db);
  collection = new PgCollectionStore(db);
  await createTestUser(db, HOST, "Ana");
  await createTestUser(db, GUEST, "Beto");
});

afterAll(async () => {
  await db?.close();
});

beforeEach(async () => {
  await db.exec(`truncate public.cards_decks, public.cards_wallets, public.cards_currency_transactions, public.cards_inventory`);
});

describe("PgDeckStore (shared contract)", () => {
  defineDeckStoreTests(() => decks, [HOST, GUEST]);
});

describe("starter decks through the collection grant", () => {
  it("ensureStarterGrant saves the two starter decks exactly once", async () => {
    await collection.ensureStarterGrant(HOST);
    await collection.ensureStarterGrant(HOST);
    await Promise.all([collection.ensureStarterGrant(HOST), collection.ensureStarterGrant(HOST)]);
    const { rows } = await db.query<{ name: string; card_count: number }>(`select name, card_count from public.cards_decks where user_id = $1 order by name`, [HOST]);
    expect(rows).toEqual([
      { name: "Furia Salvaje", card_count: 30 },
      { name: "Legión de Huesos", card_count: 30 },
    ]);
    const service = new DeckService({ decks, collection });
    expect((await service.listDecks(HOST)).map((d) => d.problems)).toEqual([[], []]); // playable with the granted cards
  });

  it("an account whose cards were granted before Phase 15 still receives the decks (separate guard)", async () => {
    await db.query(`select public.cards_grant_starter($1::uuid, '[]'::jsonb, 300)`, [HOST]); // Phase 14-only grant
    expect(await decks.listDecks(HOST)).toEqual([]);
    expect(await collection.ensureStarterGrant(HOST)).toBe(false); // cards already granted…
    expect(await decks.listDecks(HOST)).toHaveLength(2); // …but the decks arrive now
    const { rows } = await db.query<{ n: number }>(`select count(*)::int as n from public.cards_currency_transactions where user_id = $1`, [HOST]);
    expect(rows[0].n).toBe(1); // no second balance grant
  });

  it("deleting a starter deck does not bring it back", async () => {
    await collection.ensureStarterGrant(HOST);
    const [first] = await decks.listDecks(HOST);
    await decks.deleteDeck(HOST, first.id);
    await collection.ensureStarterGrant(HOST);
    expect(await decks.listDecks(HOST)).toHaveLength(1);
  });
});

describe("cards_create_deck", () => {
  it("raises no_profile for an unknown user (no orphan decks)", async () => {
    await expect(decks.createDeck(STRANGER, { name: "X", entries: [], cardCount: 0 }, MAX_SAVED_DECKS)).rejects.toThrow(/no_profile|foreign key/);
  });

  it("the limit counts starter decks too", async () => {
    await decks.grantStarterDecks(HOST);
    for (let i = 0; i < MAX_SAVED_DECKS - 2; i++) await decks.createDeck(HOST, { name: `M${i}`, entries: [], cardCount: 0 }, MAX_SAVED_DECKS);
    await expect(decks.createDeck(HOST, { name: "M", entries: [], cardCount: 0 }, MAX_SAVED_DECKS)).rejects.toMatchObject({ code: "deck_limit" });
  });
});

describe("constraints", () => {
  const insert = (name: string, entries: string, count: number) =>
    db.query(`insert into public.cards_decks (user_id, name, entries, card_count) values ($1, $2, $3::jsonb, $4)`, [HOST, name, entries, count]);

  it("name 1–30 chars, entries must be an array, card_count 0–30", async () => {
    await expect(insert("", "[]", 0)).rejects.toThrow(/check/i);
    await expect(insert("x".repeat(31), "[]", 0)).rejects.toThrow(/check/i);
    await expect(insert("ok", "{}", 0)).rejects.toThrow(/check/i);
    await expect(insert("ok", "[]", 31)).rejects.toThrow(/check/i);
    await expect(insert("ok", "[]", -1)).rejects.toThrow(/check/i);
    await insert("x".repeat(30), "[]", 30);
  });

  it("deleting the profile cascades to decks", async () => {
    const C = "44444444-4444-4444-8444-444444444444";
    await createTestUser(db, C, "Dani");
    await decks.grantStarterDecks(C);
    await db.query(`delete from public.profiles where id = $1`, [C]);
    const { rows } = await db.query<{ n: number }>(`select count(*)::int as n from public.cards_decks where user_id = $1`, [C]);
    expect(rows[0].n).toBe(0);
  });
});

describe("privileges (§12.3)", () => {
  for (const role of ["anon", "authenticated"]) {
    it(`${role} has no privilege on public.cards_decks`, async () => {
      const { rows } = await db.query<Record<string, boolean>>(
        `select has_table_privilege($1, 'public.cards_decks', 'select') as s, has_table_privilege($1, 'public.cards_decks', 'insert') as i,
                has_table_privilege($1, 'public.cards_decks', 'update') as u, has_table_privilege($1, 'public.cards_decks', 'delete') as d`,
        [role],
      );
      expect(rows[0]).toEqual({ s: false, i: false, u: false, d: false });
    });

    for (const fn of FUNCTIONS) {
      it(`${role} cannot execute ${fn}`, async () => {
        const { rows } = await db.query<{ ok: boolean }>(`select has_function_privilege($1, $2, 'execute') as ok`, [role, fn]);
        expect(rows[0].ok).toBe(false);
      });
    }
  }

  it("a client role calling the functions is denied", async () => {
    await db.exec(`set role authenticated`);
    try {
      await expect(db.query(`select public.cards_create_deck($1::uuid, 'x', '[]'::jsonb, 0, 999)`, [HOST])).rejects.toThrow(/permission denied/);
      await expect(db.query(`select public.cards_grant_starter_decks($1::uuid, '[]'::jsonb)`, [HOST])).rejects.toThrow(/permission denied/);
    } finally {
      await db.exec(`reset role`);
    }
  });

  it("RLS is enabled; functions are not security definer and pin search_path", async () => {
    const rls = await db.query<{ relrowsecurity: boolean }>(`select relrowsecurity from pg_class where relname = 'cards_decks' and relkind = 'r'`);
    expect(rls.rows).toEqual([{ relrowsecurity: true }]);
    const { rows } = await db.query<{ proname: string; prosecdef: boolean; proconfig: string[] | null }>(
      `select proname, prosecdef, proconfig from pg_proc where proname in ('cards_create_deck', 'cards_grant_starter_decks') order by proname`,
    );
    expect(rows.map((r) => r.proname)).toEqual(["cards_create_deck", "cards_grant_starter_decks"]);
    for (const r of rows) {
      expect(r.prosecdef).toBe(false);
      expect(r.proconfig).toContain('search_path=""');
    }
  });

  it("the migration is idempotent (re-applying it changes nothing)", async () => {
    await decks.grantStarterDecks(HOST);
    const { readFileSync } = await import("node:fs");
    const { join } = await import("node:path");
    await db.exec(readFileSync(join(process.cwd(), "supabase", "migrations", "20261113030000_cards_decks.sql"), "utf8"));
    expect(await decks.listDecks(HOST)).toHaveLength(2);
  });
});
