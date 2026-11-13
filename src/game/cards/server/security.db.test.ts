// Catalog-wide lockdown check (Phase 21, §19.2 items 2–3, §12.3, T3): instead of naming tables, enumerate every
// `profiles` / `cards_*` relation and every `cards_*` function the migrations create, so a future table or function
// that forgets its revokes fails here. Run with `npm run test:db`.
import type { PGlite } from "@electric-sql/pglite";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createTestDb } from "../testing/pglite";

let db: PGlite;

beforeAll(async () => {
  db = await createTestDb();
});

afterAll(async () => {
  await db.close();
});

const CLIENT_ROLES = ["anon", "authenticated"] as const;
const TABLE_FILTER = `n.nspname = 'public' and (c.relname like 'cards\\_%' or c.relname = 'profiles')`;

async function tables(): Promise<{ relname: string; relrowsecurity: boolean }[]> {
  const { rows } = await db.query<{ relname: string; relrowsecurity: boolean }>(
    `select c.relname, c.relrowsecurity from pg_class c join pg_namespace n on n.oid = c.relnamespace
      where c.relkind = 'r' and ${TABLE_FILTER} order by c.relname`,
  );
  return rows;
}

describe("§19.2 — card-game tables", () => {
  it("enumerates every expected table", async () => {
    expect((await tables()).map((t) => t.relname)).toEqual([
      "cards_currency_transactions",
      "cards_decks",
      "cards_inventory",
      "cards_match_commands",
      "cards_match_rewards",
      "cards_matches",
      "cards_pack_openings",
      "cards_wallets",
      "profiles",
    ]);
  });

  it("RLS is on for every table", async () => {
    expect((await tables()).filter((t) => !t.relrowsecurity)).toEqual([]);
  });

  it("no RLS policies exist (the browser never reads these tables)", async () => {
    const { rows } = await db.query(`select tablename, policyname from pg_policies where schemaname = 'public' and (tablename like 'cards\\_%' or tablename = 'profiles')`);
    expect(rows).toEqual([]);
  });

  it("the plan's evidence query returns 0 rows: no table grant to anon/authenticated", async () => {
    const { rows } = await db.query(
      `select table_name, grantee, privilege_type from information_schema.role_table_grants
        where (table_name like 'cards\\_%' or table_name = 'profiles') and grantee in ('anon', 'authenticated')`,
    );
    expect(rows).toEqual([]);
  });

  it("has_table_privilege is false for every privilege, table and client role", async () => {
    const { rows } = await db.query<{ relname: string; role: string; priv: string }>(
      `select c.relname, r.role, p.priv
         from pg_class c join pg_namespace n on n.oid = c.relnamespace
        cross join (values ('anon'), ('authenticated')) r(role)
        cross join (values ('select'), ('insert'), ('update'), ('delete'), ('truncate'), ('references'), ('trigger')) p(priv)
        where c.relkind = 'r' and ${TABLE_FILTER} and has_table_privilege(r.role, c.oid, p.priv)`,
    );
    expect(rows).toEqual([]);
  });

  it("no sequence is usable by client roles", async () => {
    const { rows } = await db.query(
      `select c.relname, r.role from pg_class c join pg_namespace n on n.oid = c.relnamespace
        cross join (values ('anon'), ('authenticated')) r(role)
        where c.relkind = 'S' and n.nspname = 'public' and c.relname like 'cards\\_%'
          and (has_sequence_privilege(r.role, c.oid, 'usage') or has_sequence_privilege(r.role, c.oid, 'select') or has_sequence_privilege(r.role, c.oid, 'update'))`,
    );
    expect(rows).toEqual([]);
  });

  it.each(CLIENT_ROLES)("as %s, reading any table is denied", async (role) => {
    for (const { relname } of await tables()) {
      await db.exec(`set role ${role}`);
      try {
        await expect(db.query(`select * from public.${relname} limit 1`)).rejects.toThrow(/permission denied/);
      } finally {
        await db.exec(`reset role`);
      }
    }
  });
});

type Fn = { proname: string; signature: string; prosecdef: boolean; proconfig: string[] | null };

async function functions(): Promise<Fn[]> {
  const { rows } = await db.query<Fn>(
    `select p.proname, p.oid::regprocedure::text as signature, p.prosecdef, p.proconfig
       from pg_proc p join pg_namespace n on n.oid = p.pronamespace
      where n.nspname = 'public' and p.proname like 'cards\\_%' order by p.proname`,
  );
  return rows;
}

describe("§19.2 — card-game functions", () => {
  it("enumerates every expected function", async () => {
    expect((await functions()).map((f) => f.proname)).toEqual([
      "cards_create_deck",
      "cards_grant_match_rewards",
      "cards_grant_starter",
      "cards_grant_starter_decks",
      "cards_purchase_pack",
    ]);
  });

  it("every function pins search_path = '' and is not security definer", async () => {
    for (const f of await functions()) {
      expect(f.prosecdef, f.signature).toBe(false);
      expect(f.proconfig ?? [], f.signature).toContain('search_path=""');
    }
  });

  it("no client role (nor PUBLIC through them) can execute any function", async () => {
    for (const f of await functions()) {
      for (const role of CLIENT_ROLES) {
        const { rows } = await db.query<{ ok: boolean }>(`select has_function_privilege($1, $2, 'execute') as ok`, [role, f.signature]);
        expect(rows[0].ok, `${role} → ${f.signature}`).toBe(false);
      }
    }
  });

  it("as authenticated, calling cards_purchase_pack (the RPC an attacker would try) is denied", async () => {
    await db.exec(`set role authenticated`);
    try {
      await expect(
        db.query(`select public.cards_purchase_pack('00000000-0000-4000-8000-000000000001'::uuid, 'basic', 0, array['ignis'], 'k')`),
      ).rejects.toThrow(/permission denied/);
    } finally {
      await db.exec(`reset role`);
    }
  });
});
