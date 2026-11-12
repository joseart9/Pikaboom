import "server-only";
import { randomInt } from "node:crypto";
import { db } from "@/lib/db";
import { createClient } from "@/lib/server";
import { fallbackUsername, isValidUsername } from "@/lib/username";

/** Thrown by `requireUser()` when the request has no valid Supabase session. API routes map it to 401. */
export class AuthError extends Error {
  status = 401;
  constructor(message = "unauthenticated") {
    super(message);
    this.name = "AuthError";
  }
}

/** Thrown by `updateUsername()`; `invalid` → 400, `taken` → 409. */
export class UsernameError extends Error {
  constructor(public code: "invalid" | "taken") {
    super(`username_${code}`);
    this.name = "UsernameError";
  }
}

export interface AuthUser {
  id: string;
  email: string | null;
  /** Name chosen at sign-up (user metadata). The `profiles` row is the source of truth after creation. */
  username?: string;
}

export interface Profile {
  id: string;
  username: string;
  createdAt: string;
}

/**
 * The signed-in user, or null. Uses `getClaims()`, which verifies the JWT (never trust `getSession()` on the server).
 * Use only this id for authorization; request bodies never carry user ids (§12.3).
 */
export async function getUser(): Promise<AuthUser | null> {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const c = data?.claims;
  if (!c?.sub) return null;
  const username = c.user_metadata?.username;
  return {
    id: c.sub,
    email: typeof c.email === "string" && c.email ? c.email : null,
    username: typeof username === "string" ? username : undefined,
  };
}

export async function requireUser(): Promise<AuthUser> {
  const user = await getUser();
  if (!user) throw new AuthError();
  return user;
}

type ProfileRow = { id: string; username: string; created_at: Date | string };

function toProfile(row: ProfileRow): Profile {
  return {
    id: row.id,
    username: row.username,
    createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : String(row.created_at),
  };
}

function isUniqueViolation(e: unknown): boolean {
  return typeof e === "object" && e !== null && (e as { code?: unknown }).code === "23505";
}

const ENSURE_SQL = `
  with ins as (
    insert into public.profiles (id, username) values ($1, $2)
    on conflict (id) do nothing
    returning id, username, created_at
  )
  select id, username, created_at from ins
  union all
  select id, username, created_at from public.profiles where id = $1
  limit 1`;

const MAX_PROFILE_TRIES = 5;

/**
 * Idempotently creates the user's profile (one statement per try) and returns it.
 * Name = sign-up metadata when valid; if missing/invalid or taken, `jugador_<6 digits>` (renamable in /account).
 */
export async function ensureProfile(user: AuthUser): Promise<Profile> {
  let candidate = isValidUsername(user.username) ? user.username : fallbackUsername(randomInt);
  for (let attempt = 1; ; attempt++) {
    try {
      const { rows } = await db().query<ProfileRow>(ENSURE_SQL, [user.id, candidate]);
      if (!rows[0]) throw new Error("ensureProfile: no row returned");
      return toProfile(rows[0]);
    } catch (e) {
      if (!isUniqueViolation(e) || attempt >= MAX_PROFILE_TRIES) throw e;
      candidate = fallbackUsername(randomInt);
    }
  }
}

/** Case-insensitive check against existing profiles. Invalid names are never available. */
export async function isUsernameAvailable(username: string): Promise<boolean> {
  if (!isValidUsername(username)) return false;
  const { rows } = await db().query(`select 1 from public.profiles where lower(username) = lower($1) limit 1`, [
    username,
  ]);
  return rows.length === 0;
}

/** Renames the user's existing profile (call `ensureProfile` first). */
export async function updateUsername(userId: string, username: unknown): Promise<Profile> {
  if (!isValidUsername(username)) throw new UsernameError("invalid");
  try {
    const { rows } = await db().query<ProfileRow>(
      `update public.profiles set username = $2, updated_at = now() where id = $1
       returning id, username, created_at`,
      [userId, username],
    );
    if (!rows[0]) throw new Error("updateUsername: profile not found");
    return toProfile(rows[0]);
  } catch (e) {
    if (isUniqueViolation(e)) throw new UsernameError("taken");
    throw e;
  }
}
