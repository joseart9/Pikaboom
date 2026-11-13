// `silence` (Silencio, §7.2 note): the unit loses its keywords, Escudo charges, modifiers and every status, and its
// triggered abilities (incl. Último Aliento and Renacer) stop working for good. Damage stays; losing health buffs
// follows §6.8 (current = min(current, new max): it never kills by itself). Emits MOB_SILENCED, then
// STATS_CHANGED when the numbers moved. Heroes are ignored.
import { findUnit } from "../../board";
import { emit } from "../../ctx";
import { changeStats } from "../../statuses";
import type { EffectHandler } from "../execute";
import { resolveSelector } from "../selectors";

export const silence: EffectHandler<"silence"> = (ctx, e, a) => {
  for (const id of resolveSelector(ctx, e.to, a)) {
    const u = findUnit(ctx.s, id);
    if (!u) continue;
    // Stats are measured before anything is removed (Furia's bonus goes too), MOB_SILENCED precedes STATS_CHANGED.
    changeStats(ctx, u, () => {
      u.silenced = true;
      u.keywords = {};
      u.shieldCharges = 0;
      u.modifiers = [];
      u.statuses = [];
      emit(ctx, { type: "MOB_SILENCED", iid: u.iid });
    });
  }
};
