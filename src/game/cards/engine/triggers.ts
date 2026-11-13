// Trigger matching (§8.2, §9.3 matching table). `emit` calls `matchTriggers` for every event: listeners are
// scanned in board order (active seat's board left→right, then the other's — ADR-20) and each matching ability
// is appended to the FIFO `ctx.queue`. `play` and `death`/`kill` abilities are never matched here: `play`
// resolves inside the play command, `death`/`kill` are queued by death processing (resolve.ts).
import type { AbilityDef, Side, Whose } from "../catalog/types";
import { unitsInBoardOrder } from "./board";
import { emit } from "./ctx";
import { matchesFilter } from "./effects/selectors";
import type { GameEvent } from "./events";
import { getMaxHealth, isAlive } from "./stats";
import { isStunned } from "./statuses";
import type { Ctx, MatchState, PendingTrigger, Seat, Unit } from "./types";

/** Units that may react to events, in board order (ADR-20). */
export function listenersInBoardOrder(s: MatchState): Unit[] {
  return unitsInBoardOrder(s);
}

function whoseMatches(whose: Whose, eventSeat: Seat, controller: Seat): boolean {
  return whose === "any" || (whose === "own") === (eventSeat === controller);
}

function sideMatches(side: Side, eventSeat: Seat, controller: Seat): boolean {
  return side === "any" || (side === "friendly") === (eventSeat === controller);
}

/** Resistencia Final: this DAMAGE took `unit` from above `percent` of max health to at/below it, and it survived. */
function crossedThreshold(unit: Unit, ability: AbilityDef, percent: number, event: Extract<GameEvent, { type: "DAMAGE" }>): boolean {
  if (event.target !== unit.iid || event.dealt <= 0 || unit.thresholdsFired.includes(ability.id)) return false;
  const max = getMaxHealth(unit);
  const after = event.healthAfter;
  const before = after + event.dealt;
  return before * 100 > max * percent && after * 100 <= max * percent && after > 0;
}

/** Whether `ability` of listener `unit` reacts to `event` (§9.3 table). Ignores limits and conditions. */
export function triggerMatches(s: MatchState, unit: Unit, ability: AbilityDef, event: GameEvent, departed?: Record<string, Unit>): boolean {
  const t = ability.trigger;
  const me = unit.iid;
  switch (t.on) {
    case "summoned":
      return event.type === "MOB_SUMMONED" && event.unit.iid === me;
    case "attack":
      return event.type === "ATTACK_DECLARED" && event.attacker === me;
    case "attacked":
      return event.type === "ATTACK_DECLARED" && event.target === me;
    case "damageDealt":
      return event.type === "DAMAGE" && event.source === me && event.dealt > 0 && (!t.combatOnly || event.kind === "combat");
    case "damageTaken":
      return event.type === "DAMAGE" && event.target === me && event.dealt > 0;
    case "healthThreshold":
      return event.type === "DAMAGE" && crossedThreshold(unit, ability, t.percent, event);
    case "turnStart":
      return event.type === "TURN_STARTED" && whoseMatches(t.whose, event.seat, unit.controller);
    case "turnEnd":
      return event.type === "TURN_ENDED" && whoseMatches(t.whose, event.seat, unit.controller);
    case "healed":
      return event.type === "HEAL" && event.target === me;
    case "cardDrawn":
      return event.type === "CARD_DRAWN" && whoseMatches(t.whose, event.seat, unit.controller);
    case "spellCast":
      return event.type === "SPELL_CAST" && whoseMatches(t.whose, event.seat, unit.controller);
    case "otherSummoned":
      return (
        event.type === "MOB_SUMMONED" &&
        event.unit.iid !== me &&
        sideMatches(t.side, event.seat, unit.controller) &&
        matchesFilter(s, event.unit.iid, t.filter)
      );
    case "otherDied":
      return (
        event.type === "MOB_DESTROYED" &&
        event.iid !== me &&
        sideMatches(t.side, event.seat, unit.controller) &&
        matchesFilter(s, event.iid, t.filter, departed)
      );
    case "play":
    case "death":
    case "kill":
      return false;
  }
}

/** Per-ability use counters, with `thisTurn` reset when the turn changed. */
function uses(s: MatchState, unit: Unit, abilityId: string): { turn: number; thisTurn: number; total: number } {
  const u = unit.abilityUses[abilityId] ?? { turn: s.turn.number, thisTurn: 0, total: 0 };
  return u.turn === s.turn.number ? u : { turn: s.turn.number, thisTurn: 0, total: u.total };
}

/** `limit` check (§8.8). Uses are counted when a trigger resolves (`recordUse`), not when it is queued. */
export function withinLimit(s: MatchState, unit: Unit, ability: AbilityDef): boolean {
  if (!ability.limit) return true;
  const u = uses(s, unit, ability.id);
  if (ability.limit.perTurn !== undefined && u.thisTurn >= ability.limit.perTurn) return false;
  if (ability.limit.perGame !== undefined && u.total >= ability.limit.perGame) return false;
  return true;
}

export function recordUse(s: MatchState, unit: Unit, abilityId: string): void {
  const u = uses(s, unit, abilityId);
  unit.abilityUses[abilityId] = { turn: s.turn.number, thisTurn: u.thisTurn + 1, total: u.total + 1 };
}

/**
 * Appends a trigger at depth `ctx.depth + 1`. Beyond `rules.chain.maxDepth` it is dropped and
 * CHAIN_LIMIT_REACHED is emitted (once per command). Returns whether it was queued.
 */
export function queueTrigger(ctx: Ctx, t: Omit<PendingTrigger, "depth">): boolean {
  const depth = ctx.depth + 1;
  if (depth > ctx.s.rules.chain.maxDepth) {
    emitChainLimit(ctx);
    return false;
  }
  ctx.queue.push({ ...t, depth });
  return true;
}

export function emitChainLimit(ctx: Ctx): void {
  if (ctx.chainLimitEmitted) return;
  ctx.chainLimitEmitted = true;
  emit(ctx, { type: "CHAIN_LIMIT_REACHED" });
}

/** Queues every ability that reacts to `event`, listeners in board order, abilities in definition order. */
export function matchTriggers(ctx: Ctx, event: GameEvent): void {
  const s = ctx.s;
  if (s.phase !== "playing") return; // no reactions during mulligan or after the game ended
  if (event.type === "CHAIN_LIMIT_REACHED") return;
  for (const unit of listenersInBoardOrder(s)) {
    // Silenced and Aturdido units' triggers do not fire (Último Aliento is queued by death processing instead).
    if (unit.silenced || isStunned(unit) || !isAlive(unit)) continue;
    const def = s.defs[unit.defId];
    for (const ability of def.abilities) {
      if (!triggerMatches(s, unit, ability, event, ctx.departed)) continue;
      if (!withinLimit(s, unit, ability)) continue;
      const queued = queueTrigger(ctx, {
        kind: "ability",
        sourceId: unit.iid,
        controller: unit.controller,
        defId: unit.defId,
        abilityId: ability.id,
        event,
      });
      // Resistencia Final fires once per life: mark it when queued so later damage in the chain can't re-queue it.
      if (queued && ability.trigger.on === "healthThreshold") unit.thresholdsFired.push(ability.id);
    }
  }
}
