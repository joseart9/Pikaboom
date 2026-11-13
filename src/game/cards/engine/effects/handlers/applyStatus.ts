// `applyStatus`: applies a status to each target unit (§7.2–§7.4). Heroes cannot have statuses in V1 (no-op).
import { findUnit } from "../../board";
import { applyStatus as apply } from "../../statuses";
import type { EffectHandler } from "../execute";
import { resolveSelector } from "../selectors";

export const applyStatus: EffectHandler<"applyStatus"> = (ctx, e, a) => {
  for (const id of resolveSelector(ctx, e.to, a)) {
    const u = findUnit(ctx.s, id);
    if (u) apply(ctx, u, e.status, e.magnitude, e.duration, a.sourceId);
  }
};
