import "server-only";
import { Pool } from "pg";

/**
 * Direct Postgres connection for trusted server code (the admin portal).
 * Uses the Supavisor transaction pooler (port 6543), which suits serverless.
 * Set SUPABASE_DB_URL, or SUPABASE_DB_PASSWORD and it is built for you.
 */
function connectionString() {
  if (process.env.SUPABASE_DB_URL) return process.env.SUPABASE_DB_URL;
  const password = process.env.SUPABASE_DB_PASSWORD;
  if (!password) throw new Error("Missing SUPABASE_DB_URL or SUPABASE_DB_PASSWORD");
  const ref = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL!).hostname.split(".")[0];
  return `postgresql://postgres.${ref}:${encodeURIComponent(password)}@aws-0-us-east-1.pooler.supabase.com:6543/postgres`;
}

const globalForDb = globalThis as unknown as { pgPool?: Pool };

export function db() {
  globalForDb.pgPool ??= new Pool({
    connectionString: connectionString(),
    ssl: { rejectUnauthorized: false },
    max: 3,
    idleTimeoutMillis: 10_000,
  });
  return globalForDb.pgPool;
}
