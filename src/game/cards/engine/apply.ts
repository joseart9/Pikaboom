// The single entry point that changes a match (§8.1): validate → perform → resolve, on a clone.
import { attack } from "./combat";
import type { EngineCommand } from "./commands";
import { newCtx } from "./ctx";
import { EngineError } from "./errors";
import { endGame } from "./gameOver";
import { otherSeat } from "./ids";
import { applyMulligan, finishMulliganIfDone } from "./mulligan";
import { playCard } from "./play";
import { resolveAll } from "./resolve";
import { endTurnAndStartNext } from "./turns";
import type { ApplyResult, Ctx, MatchState, Seat } from "./types";

/**
 * Applies `cmd` sent by `seat` and returns the new state plus the events it produced.
 * Never mutates `prev`. Throws `EngineError` for illegal commands (and plain `Error` for malformed input).
 * For system commands (`timeout`, `mulliganTimeout`) the `seat` argument is ignored.
 */
export function applyCommand(prev: MatchState, seat: Seat, cmd: EngineCommand): ApplyResult {
  if (prev.phase === "finished") throw new EngineError("game_over");
  if (seat !== 0 && seat !== 1) throw new Error(`invalid seat ${String(seat)}`);
  const s = structuredClone(prev);
  const ctx = newCtx(s);
  perform(ctx, seat, cmd);
  resolveAll(ctx);
  return { state: s, events: ctx.events };
}

function requirePhase(ctx: Ctx, phase: MatchState["phase"]): void {
  if (ctx.s.phase !== phase) throw new EngineError("wrong_phase");
}

function requireActive(ctx: Ctx, seat: Seat): void {
  if (ctx.s.turn.activeSeat !== seat) throw new EngineError("not_your_turn");
}

/** An accepted command by the active player: counts as acting this turn and resets the timeout streak (§6.3). */
function markActed(ctx: Ctx, seat: Seat): void {
  const p = ctx.s.players[seat];
  p.actedThisTurn = true;
  p.consecutiveTimeouts = 0;
}

function perform(ctx: Ctx, seat: Seat, cmd: EngineCommand): void {
  const s = ctx.s;
  switch (cmd?.t) {
    case "mulligan":
      requirePhase(ctx, "mulligan");
      applyMulligan(ctx, seat, cmd.replace);
      finishMulliganIfDone(ctx);
      return;
    case "mulliganTimeout":
      requirePhase(ctx, "mulligan");
      if (cmd.seat !== 0 && cmd.seat !== 1) throw new Error("mulliganTimeout: invalid seat");
      applyMulligan(ctx, cmd.seat, []);
      finishMulliganIfDone(ctx);
      return;
    case "play":
      requirePhase(ctx, "playing");
      playCard(ctx, seat, cmd);
      markActed(ctx, seat);
      return;
    case "attack":
      requirePhase(ctx, "playing");
      requireActive(ctx, seat);
      attack(ctx, seat, cmd);
      markActed(ctx, seat);
      return;
    case "endTurn":
      requirePhase(ctx, "playing");
      requireActive(ctx, seat);
      markActed(ctx, seat);
      endTurnAndStartNext(ctx, false);
      return;
    case "timeout": {
      requirePhase(ctx, "playing");
      const active = s.turn.activeSeat;
      const p = s.players[active];
      if (!p.actedThisTurn) p.consecutiveTimeouts += 1;
      if (p.consecutiveTimeouts >= s.rules.turn.timeoutsToForfeit) {
        endGame(ctx, otherSeat(active), "abandon");
        return;
      }
      endTurnAndStartNext(ctx, true);
      return;
    }
    case "concede":
      if (s.phase !== "mulligan" && s.phase !== "playing") throw new EngineError("wrong_phase");
      endGame(ctx, otherSeat(seat), "concede");
      return;
    default:
      throw new Error(`unknown command ${JSON.stringify((cmd as { t?: unknown })?.t)}`);
  }
}
