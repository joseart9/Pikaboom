// `damage`: one effect-damage instance per target, applied as one simultaneous batch (§8.5). Pierces Escudo.
import { applyDamageInstances } from "../../damage";
import { resolveAmount } from "../amount";
import type { EffectHandler } from "../execute";
import { resolveSelector } from "../selectors";

export const damage: EffectHandler<"damage"> = (ctx, e, a) => {
  const targets = resolveSelector(ctx, e.to, a);
  const amount = resolveAmount(ctx, e.amount, a);
  applyDamageInstances(ctx, targets.map((target) => ({ source: a.sourceId, target, amount, kind: "effect" as const })));
};
