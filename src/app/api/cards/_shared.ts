// Helpers shared by the /api/cards/* route handlers (Phase 9, §13.2). Not a route: no route.ts in its name.
import "server-only";
import { randomInt } from "node:crypto";
import { isRequestError, MAX_COMMAND_BODY_BYTES } from "@/game/cards/server/commands";
import { errorText, isServiceError } from "@/game/cards/server/errors";
import { hasMatchDb } from "@/game/cards/server/instance";
import { t } from "@/game/cards/i18n";
import { AuthError, ensureProfile, requireUser } from "@/lib/auth";
import { fallbackUsername, isValidUsername } from "@/lib/username";

const NO_STORE = { "Cache-Control": "no-store" };

/** Path ids must look like a UUID before they reach the store (anything else is a 404). */
export const UUID_PATH_RE = /^[0-9a-f-]{36}$/;

/** An HTTP-level rejection (bad content type, oversize body, bad path). */
export class HttpError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
  ) {
    super(code);
    this.name = "HttpError";
  }
}

export function json(data: unknown, status = 200): Response {
  return Response.json(data, { status, headers: NO_STORE });
}

/** Maps every error a card route can hit to `{ error, code, ...details }` with the right status. */
export function errorResponse(e: unknown, where: string): Response {
  if (e instanceof AuthError) return json({ error: t("auth.loginToPlay"), code: "unauthenticated" }, 401);
  if (isServiceError(e)) return json({ error: e.message, code: e.code, ...e.details }, e.status);
  if (isRequestError(e)) return json({ error: errorText("bad_request"), code: "bad_request" }, 400);
  if (e instanceof HttpError) return json({ error: errorText(e.code), code: e.code }, e.status);
  console.error(`api/cards ${where}:`, e);
  return json({ error: errorText("unavailable"), code: "unavailable" }, 503);
}

/**
 * Reads a JSON body: `content-type: application/json` is required (415 otherwise — it also forces a CORS preflight
 * for cross-site requests, T15), the body is capped at `maxBytes` (413), and malformed JSON is a 400.
 */
export async function readJson(request: Request, maxBytes = MAX_COMMAND_BODY_BYTES): Promise<unknown> {
  const type = (request.headers.get("content-type") ?? "").split(";")[0].trim().toLowerCase();
  if (type !== "application/json") throw new HttpError(415, "unsupported_media_type");
  const declared = Number(request.headers.get("content-length") ?? 0);
  if (declared > maxBytes) throw new HttpError(413, "payload_too_large");
  const text = await request.text();
  if (new TextEncoder().encode(text).length > maxBytes) throw new HttpError(413, "payload_too_large");
  try {
    return JSON.parse(text);
  } catch {
    throw new HttpError(400, "bad_request");
  }
}

/** Validates a `[id]` path segment (404 otherwise). */
export function matchIdFrom(id: string): string {
  const lower = id.toLowerCase();
  if (!UUID_PATH_RE.test(lower)) throw new HttpError(404, "not_found");
  return lower;
}

/** Validates a deck `[id]` path segment (Phase 15): a UUID, otherwise 404 `deck_not_found`. */
export function deckIdFrom(id: string): string {
  const lower = id.toLowerCase();
  if (!UUID_PATH_RE.test(lower)) throw new HttpError(404, "deck_not_found");
  return lower;
}

/** Optional non-negative integer query param (`?v=`, `?since=`); anything else counts as absent. */
export function intParam(url: URL, name: string): number | undefined {
  const raw = url.searchParams.get(name);
  if (raw === null || !/^\d{1,9}$/.test(raw)) return undefined;
  return Number(raw);
}

/**
 * The signed-in player: id from the verified session and the public name from `profiles` (created on first use).
 * Without a DB (local dev memory store) the sign-up name is used instead.
 */
export async function requirePlayer(): Promise<{ id: string; name: string }> {
  const user = await requireUser();
  if (hasMatchDb) {
    const profile = await ensureProfile(user);
    return { id: user.id, name: profile.username };
  }
  return { id: user.id, name: isValidUsername(user.username) ? user.username : fallbackUsername(randomInt) };
}
