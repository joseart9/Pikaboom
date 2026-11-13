// `resurrect` (Phase 19 F): up to `count` times, the most recent graveyard entry of `side` (optionally of a tribe) not
// already picked by this effect comes back as a fresh unit of its card (cause "resurrect": summoning sick, no Grito de
// Guerra; `summoned` triggers fire). Placement follows `summon` (§6.9); without room under the normal limit an entry
// fizzles (SUMMON_FIZZLED). Graveyard entries stay where they are.
import { canFit, placeUnit } from "../../board";
import type { CardId } from "../../../catalog/types";
import { emit } from "../../ctx";
import { nextIid } from "../../ids";
import type { EffectHandler } from "../execute";
import { summonBase } from "./position";
import { seatFor } from "./side";

export const resurrect: EffectHandler<"resurrect"> = (ctx, e, a) => {
  const s = ctx.s;
  const seat = seatFor(a, e.side);
  const tribe = e.filter?.tribe;
  const picks: CardId[] = [];
  const graveyard = s.players[seat].graveyard;
  for (let i = graveyard.length - 1; i >= 0 && picks.length < e.count; i--) {
    const def = s.defs[graveyard[i].defId];
    if (def?.type !== "mob" || (tribe !== undefined && !def.tribes.includes(tribe))) continue;
    picks.push(def.id);
  }
  const base = summonBase(ctx, a, seat, "auto");
  let placed = 0;
  for (const defId of picks) {
    if (!canFit(s, seat)) {
      emit(ctx, { type: "SUMMON_FIZZLED", seat, defId, count: 1 });
      continue;
    }
    const index = base === null ? s.players[seat].board.length : base + placed;
    placeUnit(ctx, seat, defId, nextIid(s), index, "resurrect", a.sourceId);
    placed += 1;
  }
};
