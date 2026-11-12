// Command context and event emission (§8.1–§8.2).
import type { EventPayload, GameEvent } from "./events";
import { matchTriggers } from "./triggers";
import type { Ctx, MatchState } from "./types";

/** Events kept in `state.log` (ring buffer). Views serve events from here (Phase 8). */
export const LOG_LIMIT = 300;

export function newCtx(s: MatchState): Ctx {
  return { s, events: [], queue: [], step: 0, resolutions: 0, depth: 0, chainLimitEmitted: false, departed: {} };
}

/** Assigns seq/step, appends to the state log and the command's event list, then lets listeners react. */
export function emit<P extends EventPayload>(ctx: Ctx, payload: P): P & { seq: number; step: number } {
  ctx.s.seq += 1;
  const event = { ...payload, seq: ctx.s.seq, step: ctx.step } as P & { seq: number; step: number };
  ctx.s.log.push(event as GameEvent);
  if (ctx.s.log.length > LOG_LIMIT) ctx.s.log.splice(0, ctx.s.log.length - LOG_LIMIT);
  ctx.events.push(event as GameEvent);
  matchTriggers(ctx, event as GameEvent);
  return event;
}
