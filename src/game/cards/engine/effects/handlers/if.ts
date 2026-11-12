// `if`: runs `then` when the condition holds at resolution time, else `else` (if any).
// The runner is injected by execute.ts (avoids an import cycle with runEffects).
import type { EffectDef } from "../../../catalog/types";
import type { Ctx } from "../../types";
import { checkCondition } from "../conditions";
import type { AbilityContext } from "../context";
import type { EffectHandler } from "../execute";

type Runner = (ctx: Ctx, effects: readonly EffectDef[], a: AbilityContext) => void;

export function makeIfHandler(run: Runner): EffectHandler<"if"> {
  return (ctx, e, a) => {
    if (checkCondition(ctx, e.condition, a)) run(ctx, e.then, a);
    else if (e.else) run(ctx, e.else, a);
  };
}
