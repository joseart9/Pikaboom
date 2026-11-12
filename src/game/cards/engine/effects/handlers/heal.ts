// `heal`: heals each target in selector order (capped at max health; HEAL only when > 0 restored).
import { heal as healEntity } from "../../damage";
import { resolveAmount } from "../amount";
import type { EffectHandler } from "../execute";
import { resolveSelector } from "../selectors";

export const heal: EffectHandler<"heal"> = (ctx, e, a) => {
  const targets = resolveSelector(ctx, e.to, a);
  const amount = resolveAmount(ctx, e.amount, a);
  for (const target of targets) healEntity(ctx, a.sourceId, target, amount);
};
