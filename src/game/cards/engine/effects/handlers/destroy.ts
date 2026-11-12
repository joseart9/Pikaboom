// `destroy`: flags units (`pendingDestroy`); they die together in the next death step (§8.3). Heroes are ignored.
import { findUnit } from "../../board";
import type { EffectHandler } from "../execute";
import { resolveSelector } from "../selectors";

export const destroy: EffectHandler<"destroy"> = (ctx, e, a) => {
  for (const id of resolveSelector(ctx, e.to, a)) {
    const u = findUnit(ctx.s, id);
    if (u) u.pendingDestroy = true;
  }
};
