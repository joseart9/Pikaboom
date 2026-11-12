// Ability conditions (§9.3 `ConditionDef`), evaluated at resolution time. All conditions of an ability must pass.
import type { ConditionDef, Side, Subject } from "../../catalog/types";
import { findUnit } from "../board";
import { otherSeat, seatOfHero } from "../ids";
import { getHealth, getMaxHealth } from "../stats";
import type { Ctx, EntityId, MatchState, Seat, Unit } from "../types";
import type { AbilityContext } from "./context";
import { eventSubjects, matchesFilter, resolveSelector } from "./selectors";

/** Condition kinds the engine evaluates (validator gate, like rule 10). `hasStatus` arrives with statuses (Phase 18). */
export const IMPLEMENTED_CONDITION_KINDS: readonly ConditionDef["kind"][] = [
  "unitMatches", "isFriendly", "isEnemy", "countAtLeast", "healthPercent", "diedThisGame", "playedThisTurn",
  "heroHealth", "not", "anyOf",
];

type SubjectRef = { id: EntityId; unit: Unit | null; heroSeat: Seat | null };

/** The entity a subject names. Units that died during this command are still found (via `ctx.departed`). */
function subject(ctx: Ctx, which: Subject, a: AbilityContext): SubjectRef | null {
  const id =
    which === "self" ? a.sourceId
    : which === "chosen" ? a.chosen
    : which === "eventSource" ? eventSubjects(a.event, ctx.departed).source
    : eventSubjects(a.event, ctx.departed).target;
  if (!id) return null;
  const heroSeat = seatOfHero(id);
  if (heroSeat !== null) return { id, unit: null, heroSeat };
  const unit = findUnit(ctx.s, id) ?? ctx.departed[id] ?? null;
  return unit ? { id, unit, heroSeat: null } : null;
}

function controllerOf(ref: SubjectRef): Seat {
  return ref.heroSeat ?? (ref.unit as Unit).controller;
}

/** Seats a `Side` covers, relative to the ability's controller. */
function seatsFor(side: Side, controller: Seat): Seat[] {
  return side === "friendly" ? [controller] : side === "enemy" ? [otherSeat(controller)] : [0, 1];
}

function compare(op: "lte" | "gte", left: number, right: number): boolean {
  return op === "lte" ? left <= right : left >= right;
}

function healthPercentOk(s: MatchState, ref: SubjectRef, op: "lte" | "gte", percent: number): boolean {
  const [health, max] = ref.unit
    ? [getHealth(ref.unit), getMaxHealth(ref.unit)]
    : [s.players[ref.heroSeat as Seat].hero.health, s.players[ref.heroSeat as Seat].hero.maxHealth];
  // Integer comparison: health/max vs percent/100.
  return compare(op, health * 100, max * percent);
}

export function checkCondition(ctx: Ctx, c: ConditionDef, a: AbilityContext): boolean {
  const s = ctx.s;
  switch (c.kind) {
    case "unitMatches": {
      const ref = subject(ctx, c.subject, a);
      return !!ref && matchesFilter(s, ref.id, c.filter, ctx.departed);
    }
    case "isFriendly": {
      const ref = subject(ctx, c.subject, a);
      return !!ref && controllerOf(ref) === a.controller;
    }
    case "isEnemy": {
      const ref = subject(ctx, c.subject, a);
      return !!ref && controllerOf(ref) !== a.controller;
    }
    case "countAtLeast":
      return resolveSelector(ctx, c.selector, a).length >= c.min;
    case "healthPercent": {
      const ref = subject(ctx, c.subject, a);
      return !!ref && healthPercentOk(s, ref, c.op, c.percent);
    }
    case "diedThisGame": {
      let n = 0;
      for (const seat of seatsFor(c.side, a.controller)) {
        const d = s.players[seat].deaths;
        n += c.filter?.tribe ? (d.byTribe[c.filter.tribe] ?? 0) : d.total;
      }
      return n >= c.min;
    }
    case "playedThisTurn": {
      let n = 0;
      for (const seat of seatsFor(c.side, a.controller)) {
        const t = s.players[seat].turnCounters;
        n += c.cardType === "mob" ? t.mobsPlayed : c.cardType === "spell" ? t.spellsCast : t.cardsPlayed;
      }
      return n >= c.min;
    }
    case "heroHealth":
      // "any": satisfied if either hero satisfies it.
      return seatsFor(c.side, a.controller).some((seat) => compare(c.op, s.players[seat].hero.health, c.value));
    case "not":
      return !checkCondition(ctx, c.condition, a);
    case "anyOf":
      return c.conditions.some((sub) => checkCondition(ctx, sub, a));
    case "hasStatus":
      throw new Error("Condition not implemented: hasStatus"); // Phase 18; the validator rejects it until then
  }
}

/** True when every condition passes (no conditions ⇒ true). */
export function checkConditions(ctx: Ctx, conditions: readonly ConditionDef[] | undefined, a: AbilityContext): boolean {
  return (conditions ?? []).every((c) => checkCondition(ctx, c, a));
}
