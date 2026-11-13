// Selectors: who an effect applies to (§9.3, Phase 6 G.1). Everything is enumerated in board order (ADR-20)
// so random picks and multi-target batches are deterministic.
import type { Group, Selector, TargetSpec, UnitFilter } from "../../catalog/types";
import { boardIndexOf, findUnit } from "../board";
import type { GameEvent } from "../events";
import { heroId, otherSeat, seatOfHero } from "../ids";
import { hasKeyword } from "../keywords";
import { rngPick } from "../rng";
import { getAttack, getHealth, getMaxHealth, isAlive } from "../stats";
import { hasStatus } from "../statuses";
import type { Ctx, EntityId, MatchState, Seat, Unit } from "../types";
import type { AbilityContext } from "./context";

function livingUnits(s: MatchState, seat: Seat): EntityId[] {
  return s.players[seat].board.filter(isAlive).map((u) => u.iid);
}

/**
 * Members of `group` relative to `controller`, in this exact order (dead/pendingDestroy units excluded):
 * friendlyMobs / enemyMobs = that board 0→n; allMobs = active seat's board then the other board;
 * friendlyCharacters = friendly mobs then friendly hero; enemyCharacters = enemy mobs then enemy hero;
 * allCharacters = active board, other board, active hero, other hero.
 */
export function groupMembers(s: MatchState, group: Group, controller: Seat): EntityId[] {
  const enemy = otherSeat(controller);
  const active = s.turn.activeSeat;
  const inactive = otherSeat(active);
  switch (group) {
    case "friendlyMobs":
      return livingUnits(s, controller);
    case "enemyMobs":
      return livingUnits(s, enemy);
    case "allMobs":
      return [...livingUnits(s, active), ...livingUnits(s, inactive)];
    case "friendlyCharacters":
      return [...livingUnits(s, controller), heroId(controller)];
    case "enemyCharacters":
      return [...livingUnits(s, enemy), heroId(enemy)];
    case "allCharacters":
      return [...livingUnits(s, active), ...livingUnits(s, inactive), heroId(active), heroId(inactive)];
  }
}

/**
 * A filter never matches heroes except through `damaged` alone; every other field excludes heroes (§9.3).
 * `departed` (Ctx.departed) lets filters match units that just died (`otherDied`, conditions on eventTarget).
 */
export function matchesFilter(s: MatchState, id: EntityId, filter: UnitFilter | undefined, departed?: Record<EntityId, Unit>): boolean {
  if (!filter) return true;
  const heroSeat = seatOfHero(id);
  if (heroSeat !== null) {
    const unitOnly = Object.keys(filter).some((k) => k !== "damaged");
    if (unitOnly) return false;
    const hero = s.players[heroSeat].hero;
    return filter.damaged === undefined || (hero.health < hero.maxHealth) === filter.damaged;
  }
  const u = findUnit(s, id) ?? departed?.[id] ?? null;
  return u ? unitMatchesFilter(s, u, filter) : false;
}

export function unitMatchesFilter(s: MatchState, u: Unit, f: UnitFilter): boolean {
  const def = s.defs[u.defId];
  if (f.tribe !== undefined && !(def.type === "mob" && def.tribes.includes(f.tribe))) return false;
  if (f.minAttack !== undefined && getAttack(u) < f.minAttack) return false;
  if (f.maxAttack !== undefined && getAttack(u) > f.maxAttack) return false;
  if (f.maxCost !== undefined && def.cost > f.maxCost) return false;
  if (f.damaged !== undefined && (getHealth(u) < getMaxHealth(u)) !== f.damaged) return false;
  if (f.hasKeyword !== undefined && !hasKeyword(u, f.hasKeyword)) return false;
  if (f.hasStatus !== undefined && !hasStatus(u, f.hasStatus)) return false;
  if (f.defId !== undefined && u.defId !== f.defId) return false;
  return true;
}

/** An enemy unit (relative to `seat`) with Sigilo: never a legal `chosen` target or attack target for `seat`. */
function hiddenBySigilo(s: MatchState, seat: Seat, id: EntityId): boolean {
  const u = findUnit(s, id);
  return !!u && u.controller !== seat && hasKeyword(u, "stealth");
}

/**
 * Legal player-chosen targets for a `play` ability (§6.5 rule 5), in group order. `sourceId` (the card being
 * played) is never its own target. Enemy units with Sigilo are not targetable (§7.1); friendly ones are.
 */
export function validTargets(s: MatchState, seat: Seat, spec: TargetSpec, sourceId: EntityId): EntityId[] {
  return groupMembers(s, spec.group, seat).filter(
    (id) => id !== sourceId && !hiddenBySigilo(s, seat, id) && matchesFilter(s, id, spec.filter),
  );
}

/** A hero, or a unit on the board that is still alive (selectors never return dead/dying units, §8.7). */
function isLiveEntity(s: MatchState, id: EntityId | null | undefined): id is EntityId {
  if (!id) return false;
  if (seatOfHero(id) !== null) return true;
  const u = findUnit(s, id);
  return !!u && isAlive(u);
}

/**
 * `eventSource` / `eventTarget` of a triggering event (§9.3 "Event context for selectors"). For MOB_DESTROYED the
 * source is the killer (`lastDamagedBy` of the dead unit, looked up in `departed`).
 */
export function eventSubjects(
  event: GameEvent | undefined,
  departed?: Record<EntityId, Unit>,
): { source: EntityId | null; target: EntityId | null } {
  switch (event?.type) {
    case "DAMAGE":
    case "HEAL":
      return { source: event.source, target: event.target };
    case "MOB_SUMMONED":
      return { source: event.sourceId, target: event.unit.iid };
    case "MOB_DESTROYED":
      return { source: departed?.[event.iid]?.lastDamagedBy ?? null, target: event.iid };
    case "ATTACK_DECLARED":
      return { source: event.attacker, target: event.target };
    default:
      return { source: null, target: null };
  }
}

function single(s: MatchState, id: EntityId | null | undefined): EntityId[] {
  return isLiveEntity(s, id) ? [id] : [];
}

function candidates(s: MatchState, sel: { group: Group; filter?: UnitFilter; excludeSelf?: boolean; excludeChosen?: boolean }, a: AbilityContext): EntityId[] {
  return groupMembers(s, sel.group, a.controller).filter(
    (id) =>
      matchesFilter(s, id, sel.filter) &&
      !(sel.excludeSelf && id === a.sourceId) &&
      !(sel.excludeChosen && id === a.chosen),
  );
}

/** Resolves a selector to entity ids at this moment. Never returns dead/dying units; missing subjects → []. */
export function resolveSelector(ctx: Ctx, sel: Selector, a: AbilityContext): EntityId[] {
  const s = ctx.s;
  switch (sel.kind) {
    case "self":
      return single(s, a.sourceId);
    case "chosen":
      return single(s, a.chosen);
    case "eventSource":
      return single(s, eventSubjects(a.event, ctx.departed).source);
    case "eventTarget":
      return single(s, eventSubjects(a.event, ctx.departed).target);
    case "hero":
      return [heroId(sel.side === "friendly" ? a.controller : otherSeat(a.controller))];
    case "all":
      return candidates(s, sel, a);
    case "random":
      // Distinct picks; fewer candidates ⇒ all of them (in picked order). Zero candidates ⇒ no RNG use.
      return rngPick(s, candidates(s, sel, a), sel.count);
    case "adjacent": {
      const ref = sel.of === "self" ? a.sourceId : sel.of === "chosen" ? a.chosen : eventSubjects(a.event, ctx.departed).target;
      const at = ref ? boardIndexOf(s, ref) : null;
      if (!at) return [];
      const board = s.players[at.seat].board;
      return [board[at.index - 1], board[at.index + 1]].filter((u): u is Unit => !!u && isAlive(u)).map((u) => u.iid);
    }
  }
}
