// Applies migrations and seeds the word bank. Run: npm run db:setup
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import pg from "pg";
import { LOCAL_WORDS } from "../src/game/words.ts";

const ref = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL!).hostname.split(".")[0];
const password = process.env.SUPABASE_DB_PASSWORD;
if (!password) throw new Error("SUPABASE_DB_PASSWORD missing in .env.local");

const connectionString =
  process.env.SUPABASE_DB_URL ??
  `postgresql://postgres.${ref}:${encodeURIComponent(password)}@aws-0-us-east-1.pooler.supabase.com:5432/postgres`;

const client = new pg.Client({ connectionString, ssl: { rejectUnauthorized: false } });
await client.connect();

const dir = "supabase/migrations";
for (const file of readdirSync(dir).sort()) {
  console.log("applying", file);
  await client.query(readFileSync(join(dir, file), "utf8"));
}

const values = LOCAL_WORDS.map((_, i) => `($${i * 2 + 1}, $${i * 2 + 2})`).join(",");
const params = LOCAL_WORDS.flatMap((w) => [w.word, w.category]);
const res = await client.query(
  `insert into public.charades_words (word, category) values ${values} on conflict do nothing`,
  params,
);
console.log(`seeded ${res.rowCount} new words (${LOCAL_WORDS.length} total in list)`);
await client.end();
