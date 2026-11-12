// Effect amounts (§9.3 `Amount`).
import type { Amount } from "../../catalog/types";
import type { Ctx } from "../types";
import type { AbilityContext } from "./context";
import { resolveSelector } from "./selectors";

export function resolveAmount(ctx: Ctx, amount: Amount, a: AbilityContext): number {
  if (typeof amount === "number") return amount;
  if (amount.from === "count") return resolveSelector(ctx, amount.selector, a).length * (amount.multiplier ?? 1);
  // eventAmount: damage actually dealt / health actually restored by the triggering event.
  const e = a.event;
  if (e?.type === "DAMAGE") return e.dealt;
  if (e?.type === "HEAL") return e.amount;
  return 0;
}
