// `transform` (Phase 19 F): each target unit is replaced IN PLACE by a fresh unit of `card` — same index, controller,
// owner, `summonedTurn` (sleep state kept) and `attacksThisTurn`, but a NEW iid, the new def's stats and keywords,
// and no damage, modifiers, statuses or silence. No `play`/`summoned` triggers and no death; triggers still queued
// for the old iid fizzle (it is no longer on the board). Emits MOB_TRANSFORMED { iid: old iid, unit: new snapshot }.
import { boardIndexOf, createUnit, snapshotUnit } from "../../board";
import { emit } from "../../ctx";
import { nextIid } from "../../ids";
import type { EffectHandler } from "../execute";
import { resolveSelector } from "../selectors";

export const transform: EffectHandler<"transform"> = (ctx, e, a) => {
  const s = ctx.s;
  for (const id of resolveSelector(ctx, e.to, a)) {
    const at = boardIndexOf(s, id);
    if (!at) continue; // heroes
    const board = s.players[at.seat].board;
    const old = board[at.index];
    const unit = createUnit(s, old.controller, e.card, nextIid(s));
    unit.owner = old.owner;
    unit.summonedTurn = old.summonedTurn;
    unit.attacksThisTurn = old.attacksThisTurn;
    board[at.index] = unit;
    emit(ctx, { type: "MOB_TRANSFORMED", iid: old.iid, unit: snapshotUnit(s, unit) });
  }
};
