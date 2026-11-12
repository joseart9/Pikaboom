// `buff`: pushes a Modifier on each target unit (negative values debuff and can kill). Health buffs raise max
// and current health. "thisTurn" expires at end of turn (§6.3 step 2). Heroes are ignored.
import { findUnit, snapshotUnit } from "../../board";
import { emit } from "../../ctx";
import type { EffectHandler } from "../execute";
import { resolveSelector } from "../selectors";

export const buff: EffectHandler<"buff"> = (ctx, e, a) => {
  for (const id of resolveSelector(ctx, e.to, a)) {
    const u = findUnit(ctx.s, id);
    if (!u) continue;
    u.modifiers.push({
      attack: e.attack ?? 0,
      health: e.health ?? 0,
      expires: e.duration === "thisTurn" ? "endOfTurn" : "never",
      sourceId: a.sourceId,
    });
    const snap = snapshotUnit(ctx.s, u);
    emit(ctx, { type: "STATS_CHANGED", iid: u.iid, attack: snap.attack, health: snap.health, maxHealth: snap.maxHealth });
  }
};
