// `changeControl` (Phase 19 F): the unit moves to the right end of the OTHER side's board — a no-op when that side
// already has `normalLimit` (6) units. There it counts as summoned this turn (`summonedTurn = turn.number`: sleeping
// unless Carga/Embestida) with a fresh attack count. Keywords, damage, modifiers and statuses stay (a status keeps
// its stored expiry, §7.3); `owner` is unchanged. Emits CONTROL_CHANGED.
import { boardIndexOf } from "../../board";
import { emit } from "../../ctx";
import { otherSeat } from "../../ids";
import type { EffectHandler } from "../execute";
import { resolveSelector } from "../selectors";

export const changeControl: EffectHandler<"changeControl"> = (ctx, e, a) => {
  const s = ctx.s;
  for (const id of resolveSelector(ctx, e.to, a)) {
    const at = boardIndexOf(s, id);
    if (!at) continue; // heroes
    const from = at.seat;
    const to = otherSeat(from);
    const dest = s.players[to].board;
    if (dest.length >= s.rules.board.normalLimit) continue;
    const [unit] = s.players[from].board.splice(at.index, 1);
    unit.controller = to;
    unit.summonedTurn = s.turn.number;
    unit.attacksThisTurn = 0;
    dest.push(unit);
    emit(ctx, { type: "CONTROL_CHANGED", iid: unit.iid, from, to, index: dest.length - 1 });
  }
};
