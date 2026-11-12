// `summon` (§6.9): up to `count` fresh units of `card`, inserted left→right consecutively.
// Position "auto": right of the source if it is on the target board; else the source's former index
// (death snapshot); else the right end. "end": always the right end.
// Without `overflow` the board limit is `normalLimit` (6); with Desborde it is `hardLimit` (10).
// Leftovers fizzle with one SUMMON_FIZZLED { count }.
import { boardIndexOf, canFit, placeUnit } from "../../board";
import { emit } from "../../ctx";
import { nextIid } from "../../ids";
import type { EffectHandler } from "../execute";
import { seatFor } from "./side";

export const summon: EffectHandler<"summon"> = (ctx, e, a) => {
  const s = ctx.s;
  const seat = seatFor(a, e.side);
  const board = () => s.players[seat].board;
  let base: number | null = null;
  if (e.position !== "end") {
    const at = boardIndexOf(s, a.sourceId);
    if (at && at.seat === seat) base = at.index + 1;
    else if (a.sourceIndex !== undefined && seat === a.controller) base = Math.min(a.sourceIndex, board().length);
  }
  for (let k = 0; k < e.count; k++) {
    if (!canFit(s, seat, e.overflow ?? false)) {
      emit(ctx, { type: "SUMMON_FIZZLED", seat, defId: e.card, count: e.count - k });
      return;
    }
    const index = base === null ? board().length : base + k;
    placeUnit(ctx, seat, e.card, nextIid(s), index, "effect", a.sourceId);
  }
};
