// Game end (§6.10). Once finished, the engine stops processing: queued triggers are discarded.
import { emit } from "./ctx";
import type { Ctx, EndReason, MatchState, Seat } from "./types";

/** Function form so callers re-read the phase after calls that may end the game (no stale TS narrowing). */
export function isGameOver(s: MatchState): boolean {
  return s.phase === "finished";
}

export function endGame(ctx: Ctx, winner: Seat | "draw", reason: EndReason): void {
  const s = ctx.s;
  if (isGameOver(s)) return;
  s.phase = "finished";
  s.winner = winner;
  s.endReason = reason;
  ctx.queue = [];
  emit(ctx, { type: "GAME_OVER", winner, reason });
}

/** Ends the game if a hero is at ≤ 0 health. Returns true when the game is (now) over. */
export function checkGameOver(ctx: Ctx): boolean {
  const s = ctx.s;
  if (isGameOver(s)) return true;
  const dead0 = s.players[0].hero.health <= 0;
  const dead1 = s.players[1].hero.health <= 0;
  if (dead0 && dead1) endGame(ctx, "draw", "mutual_destruction");
  else if (dead0) endGame(ctx, 1, "hero_destroyed");
  else if (dead1) endGame(ctx, 0, "hero_destroyed");
  return isGameOver(s);
}
