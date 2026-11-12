// DB test harness (Phase 9): an in-process Postgres (PGlite) with just enough of Supabase stubbed — the `auth`
// schema, `auth.users`, the `anon`/`authenticated` roles and Supabase's default grants — and the Duelo Arcano
// migrations (`*_profiles*.sql`, `*_cards_*.sql`) applied in name order. Used only by `*.db.test.ts`.
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { PGlite } from "@electric-sql/pglite";

const MIGRATIONS_DIR = join(process.cwd(), "supabase", "migrations");
const MIGRATION_RE = /_(profiles|cards_)/;

/** Mimics the bits of a Supabase project the migrations rely on, including its default privileges, so the
 * revoke assertions in the tests are meaningful. */
export const SUPABASE_STUB_SQL = `
  create schema if not exists auth;
  create table if not exists auth.users (id uuid primary key);
  do $$ begin create role anon nologin; exception when duplicate_object then null; end $$;
  do $$ begin create role authenticated nologin; exception when duplicate_object then null; end $$;
  grant usage on schema public to anon, authenticated;
  alter default privileges in schema public grant all on tables to anon, authenticated;
  alter default privileges in schema public grant all on sequences to anon, authenticated;
  alter default privileges in schema public grant execute on functions to anon, authenticated;
`;

export function migrationFiles(): string[] {
  return readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith(".sql") && MIGRATION_RE.test(f))
    .sort();
}

export async function applyMigrations(db: PGlite): Promise<void> {
  for (const file of migrationFiles()) await db.exec(readFileSync(join(MIGRATIONS_DIR, file), "utf8"));
}

/** A fresh in-memory database with the stubs and every Duelo Arcano migration applied. */
export async function createTestDb(): Promise<PGlite> {
  const db = new PGlite();
  await db.exec(SUPABASE_STUB_SQL);
  await applyMigrations(db);
  return db;
}

/** Creates `auth.users` + `profiles` rows so match rows can reference the user. */
export async function createTestUser(db: PGlite, id: string, username: string): Promise<void> {
  await db.query(`insert into auth.users (id) values ($1) on conflict do nothing`, [id]);
  await db.query(`insert into public.profiles (id, username) values ($1, $2) on conflict (id) do nothing`, [id, username]);
}
