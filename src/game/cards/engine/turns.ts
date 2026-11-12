// Turn structure (§6.3).
import { snapshotUnit } from "./board";
import { heal } from "./damage";
import { emit } from "./ctx";
import { drawCards } from "./draw";
import { endGame, isGameOver } from "./gameOver";
import { otherSeat } from "./ids";
import { keywordValue } from "./keywords";
import { clearTemporaryMana, refreshManaForTurn } from "./mana";
import { resolveAll } from "./resolve";
import { getHealth, getMaxHealth } from "./stats";
import type { Ctx, Unit } from "./types";

/** Start of turn, steps 1–5 of §6.3. */
export function startTurn(ctx: Ctx): void {
  const s = ctx.s;
  // 1. Turn number and active seat (turn 1 belongs to firstSeat).
  s.turn.number += 1;
  s.turn.activeSeat = s.turn.number === 1 ? s.firstSeat : otherSeat(s.turn.activeSeat);
  const seat = s.turn.activeSeat;
  const p = s.players[seat];
  // 2. Mana.
  refreshManaForTurn(ctx, seat);
  // 3. Per-turn resets.
  for (const u of p.board) u.attacksThisTurn = 0;
  p.turnCounters = { cardsPlayed: 0, spellsCast: 0, mobsPlayed: 0 };
  p.actedThisTurn = false;
  // 4. `turnStart` triggers are queued by TURN_STARTED (status ticks: Phase 18), then resolve.
  emit(ctx, { type: "TURN_STARTED", seat, turn: s.turn.number });
  resolveAll(ctx);
  if (isGameOver(s)) return;
  // 5. Draw.
  drawCards(ctx, seat, s.rules.draw.perTurn);
  resolveAll(ctx);
}

/** Removes `endOfTurn` modifiers. Losing a health buff never kills: current health = min(current, new max). */
function expireEndOfTurnModifiers(ctx: Ctx, u: Unit): void {
  if (!u.modifiers.some((m) => m.expires === "endOfTurn")) return;
  const healthBefore = getHealth(u);
  u.modifiers = u.modifiers.filter((m) => m.expires !== "endOfTurn");
  const maxAfter = getMaxHealth(u);
  u.damage = maxAfter - Math.min(healthBefore, maxAfter);
  const snap = snapshotUnit(ctx.s, u);
  emit(ctx, { type: "STATS_CHANGED", iid: u.iid, attack: snap.attack, health: snap.health, maxHealth: snap.maxHealth });
}

/** End of turn (§6.3 steps 1–5), then the next turn starts unless the game ended. */
export function endTurnAndStartNext(ctx: Ctx, timeout: boolean): void {
  const s = ctx.s;
  const seat = s.turn.activeSeat;
  // 1. `turnEnd` triggers are queued by TURN_ENDED; Regeneración ticks for the active seat's units
  //    in board order (before modifier expiry).
  emit(ctx, { type: "TURN_ENDED", seat, turn: s.turn.number, timeout });
  for (const u of [...s.players[seat].board]) {
    const regeneration = keywordValue(u, "regeneration");
    if (regeneration) heal(ctx, u.iid, u.iid, regeneration);
  }
  resolveAll(ctx);
  if (isGameOver(s)) return;
  // 2. Expire end-of-turn modifiers on both sides; discard temporary mana.
  for (const p of s.players) for (const u of p.board) expireEndOfTurnModifiers(ctx, u);
  clearTemporaryMana(ctx, seat);
  // 3. Status expiry for the active seat's units (Phase 18).
  resolveAll(ctx);
  if (isGameOver(s)) return;
  // 4. Turn limit → draw.
  if (s.turn.number >= s.rules.turn.maxTurns) {
    endGame(ctx, "draw", "turn_limit");
    return;
  }
  // 5. Next turn.
  startTurn(ctx);
}
