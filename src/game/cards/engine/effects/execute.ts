// The effect executor (§9.4). One handler per primitive; adding a primitive = union variant + handler +
// validator rules + tests. The catalog validator (rule 10) only accepts effect types listed here.
import type { EffectDef, EffectType } from "../../catalog/types";
import { isGameOver } from "../gameOver";
import type { Ctx } from "../types";
import type { AbilityContext } from "./context";
import { addToHand } from "./handlers/addToHand";
import { applyStatus } from "./handlers/applyStatus";
import { buff } from "./handlers/buff";
import { changeControl } from "./handlers/changeControl";
import { copyToHand } from "./handlers/copyToHand";
import { damage } from "./handlers/damage";
import { destroy } from "./handlers/destroy";
import { draw } from "./handlers/draw";
import { gainMana } from "./handlers/gainMana";
import { grantKeyword } from "./handlers/grantKeyword";
import { heal } from "./handlers/heal";
import { makeIfHandler } from "./handlers/if";
import { modifyMana } from "./handlers/modifyMana";
import { removeStatus } from "./handlers/removeStatus";
import { resurrect } from "./handlers/resurrect";
import { returnToHand } from "./handlers/returnToHand";
import { silence } from "./handlers/silence";
import { stealFromHand } from "./handlers/stealFromHand";
import { summon } from "./handlers/summon";
import { transform } from "./handlers/transform";

export type EffectHandler<T extends EffectType> = (ctx: Ctx, effect: Extract<EffectDef, { type: T }>, a: AbilityContext) => void;

/** MVP primitives (Phases 6–7) + the status family (Phase 18) + the advanced effects (Phase 19): every V1 effect. */
export const EFFECT_HANDLERS: { [K in EffectType]?: EffectHandler<K> } = {
  damage,
  heal,
  summon,
  destroy,
  draw,
  addToHand,
  buff,
  grantKeyword,
  gainMana,
  if: makeIfHandler((ctx, effects, a) => runEffects(ctx, effects, a)),
  silence,
  applyStatus,
  removeStatus,
  transform,
  resurrect,
  returnToHand,
  changeControl,
  copyToHand,
  stealFromHand,
  modifyMana,
};

/** Effect types with a handler (what the catalog validator accepts, §9.6 rule 10). */
export const IMPLEMENTED_EFFECT_TYPES = Object.keys(EFFECT_HANDLERS) as EffectType[];

/**
 * Runs effects in order; each sees the result of the previous ones (units at ≤ 0 health stay on the board until
 * the next death step but selectors skip them, §8.5). Stops as soon as the game is over.
 */
export function runEffects(ctx: Ctx, effects: readonly EffectDef[], a: AbilityContext): void {
  for (const e of effects) {
    if (isGameOver(ctx.s)) return;
    const handler = EFFECT_HANDLERS[e.type] as EffectHandler<EffectType> | undefined;
    if (!handler) throw new Error(`Effect not implemented: ${e.type}`); // the validator prevents this in the catalog
    handler(ctx, e as never, a);
  }
}
