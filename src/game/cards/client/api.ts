"use client";

// Browser helpers for the Duelo Arcano match API (§13.2, §13.5). Mirrors src/game/battleship/useRoom.ts:
// every request times out after 8 s; network failures and 5xx are retried with backoff (400 ms × 1.8, max 4 s);
// 4xx answers are final and returned to the caller as `{ ok: false, status, error, code }`.
// Commands carry a `commandId` generated ONCE per command and reused by every retry, so a retry after a lost
// response can never apply the command twice (ADR-03).

import type { ReadResult } from "../server/matchService";
import type { ClientCommand } from "../server/commands";
import type { MatchView } from "../server/view";

export const REQUEST_TIMEOUT_MS = 8000;
const RETRY_START_MS = 400;
const RETRY_FACTOR = 1.8;
const RETRY_MAX_MS = 4000;
const COMMAND_ATTEMPTS = 10;
const DEFAULT_ATTEMPTS = 4;

export type ApiError = { ok: false; status: number; error: string; code: string; matchId?: string };
export type ApiResult<T> = ({ ok: true } & T) | ApiError;

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

/** 32 lowercase hex chars from `crypto.getRandomValues` (valid for the server's `COMMAND_ID_RE`). */
export function newCommandId(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

async function once(path: string, init?: RequestInit): Promise<{ status: number; body: Record<string, unknown> }> {
  const res = await fetch(`/api/cards${path}`, {
    ...init,
    cache: "no-store",
    credentials: "same-origin",
    headers: { "content-type": "application/json", ...(init?.headers ?? {}) },
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
  const body = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  return { status: res.status, body };
}

/** Retries network errors and 5xx; the same `init` (and so the same body / commandId) is sent every time. */
async function withRetry<T>(path: string, init: RequestInit | undefined, attempts: number): Promise<ApiResult<T>> {
  let delay = RETRY_START_MS;
  let last: ApiError = { ok: false, status: 0, error: "", code: "network" };
  for (let i = 0; i < attempts; i++) {
    try {
      const { status, body } = await once(path, init);
      if (status < 500) {
        if (status >= 200 && status < 300) return { ok: true, ...(body as T) };
        return { ok: false, status, error: String(body.error ?? ""), code: String(body.code ?? "error"), ...(typeof body.matchId === "string" ? { matchId: body.matchId } : {}) };
      }
      last = { ok: false, status, error: String(body.error ?? ""), code: String(body.code ?? "unavailable") };
    } catch {
      last = { ok: false, status: 0, error: "", code: "network" };
    }
    if (i < attempts - 1) {
      await sleep(delay);
      delay = Math.min(delay * RETRY_FACTOR, RETRY_MAX_MS);
    }
  }
  return last;
}

const post = (body: unknown): RequestInit => ({ method: "POST", body: JSON.stringify(body) });

/** New lobby (or your open one). */
export function createMatch(): Promise<ApiResult<{ view: MatchView }>> {
  return withRetry("/matches", post({}), DEFAULT_ATTEMPTS);
}

/** Join by code. 409 `already_in_match` includes `matchId`. */
export function joinMatch(code: string): Promise<ApiResult<{ view: MatchView }>> {
  return withRetry("/matches/join", post({ code }), DEFAULT_ATTEMPTS);
}

/** Your lobby/active match id, or null. */
export function currentMatch(): Promise<ApiResult<{ matchId: string | null }>> {
  return withRetry("/matches/current", undefined, DEFAULT_ATTEMPTS);
}

/** One poll (no retry: the poll loop itself is the retry). `version`/`since` make unchanged answers tiny. */
export async function pollMatch(matchId: string, version?: number, since?: number): Promise<ApiResult<ReadResult>> {
  const q = new URLSearchParams();
  if (version !== undefined) q.set("v", String(version));
  if (since !== undefined) q.set("since", String(since));
  const qs = q.size ? `?${q}` : "";
  return withRetry<ReadResult>(`/matches/${encodeURIComponent(matchId)}${qs}`, undefined, 1);
}

/**
 * Sends a command; retries network/5xx up to 10× reusing the same `commandId`. Pass `commandId` to resume a
 * command whose outcome is unknown (e.g. after a reload).
 */
export function commandRequest(
  matchId: string,
  command: ClientCommand,
  opts: { since?: number; commandId?: string } = {},
): Promise<ApiResult<{ view: MatchView }> & { commandId: string }> {
  const commandId = opts.commandId ?? newCommandId();
  const qs = opts.since !== undefined ? `?since=${opts.since}` : "";
  return withRetry<{ view: MatchView }>(`/matches/${encodeURIComponent(matchId)}/commands${qs}`, post({ commandId, command }), COMMAND_ATTEMPTS).then(
    (r) => ({ ...r, commandId }),
  );
}
