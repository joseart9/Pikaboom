// `summon` (§6.9): up to `count` fresh units of `card`, inserted left→right consecutively from `summonBase`
// (right of the source / its death-snapshot index / the right end; "end" = always the right end).
// Without `overflow` the board limit is `normalLimit` (6); with Desborde it is `hardLimit` (10).
// Leftovers fizzle with one SUMMON_FIZZLED { count }.
import { canFit, placeUnit } from "../../board";
import { emit } from "../../ctx";
import { nextIid } from "../../ids";
import type { EffectHandler } from "../execute";
import { summonBase } from "./position";
import { seatFor } from "./side";

export const summon: EffectHandler<"summon"> = (ctx, e, a) => {
  const s = ctx.s;
  const seat = seatFor(a, e.side);
  const base = summonBase(ctx, a, seat, e.position);
  for (let k = 0; k < e.count; k++) {
    if (!canFit(s, seat, e.overflow ?? false)) {
      emit(ctx, { type: "SUMMON_FIZZLED", seat, defId: e.card, count: e.count - k });
      return;
    }
    const index = base === null ? s.players[seat].board.length : base + k;
    placeUnit(ctx, seat, e.card, nextIid(s), index, "effect", a.sourceId);
  }
};
