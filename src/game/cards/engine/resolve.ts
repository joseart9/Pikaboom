// Resolution loop (§8.1) and death processing (§8.3).
import { canFit, findUnit, placeUnit, unitsInBoardOrder } from "./board";
import { emit } from "./ctx";
import { checkConditions } from "./effects/conditions";
import type { AbilityContext } from "./effects/context";
import { runEffects } from "./effects/execute";
import { checkGameOver, isGameOver } from "./gameOver";
import { nextIid } from "./ids";
import { isAlive } from "./stats";
import { isStunned } from "./statuses";
import { emitChainLimit, queueTrigger, recordUse, withinLimit } from "./triggers";
import type { GameEvent } from "./events";
import type { Ctx, PendingTrigger, Unit } from "./types";

/**
 * Removes every dead unit (health ≤ 0 or pendingDestroy) in board order and repeats until none remain (§8.3).
 * All dying units leave the board before any death is announced (they never see each other's deaths). Then, per
 * dead unit in board order: its Último Aliento abilities, Renacer, and its killer's `kill` abilities are queued.
 */
export function processDeaths(ctx: Ctx): void {
  const s = ctx.s;
  for (;;) {
    const dying = unitsInBoardOrder(s).filter((u) => !isAlive(u));
    if (dying.length === 0) return;
    ctx.step += 1;
    // Indices are captured before removal.
    const snapshots = dying.map((u) => ({ unit: u, seat: u.controller, index: s.players[u.controller].board.indexOf(u) }));
    for (const seat of [0, 1] as const) s.players[seat].board = s.players[seat].board.filter((u) => isAlive(u));
    for (const snap of snapshots) ctx.departed[snap.unit.iid] = snap.unit;

    const deathEvents = new Map<string, GameEvent>();
    for (const snap of snapshots) {
      const p = s.players[snap.seat];
      p.graveyard.push({ iid: snap.unit.iid, defId: snap.unit.defId, diedTurn: s.turn.number });
      p.deaths.total += 1;
      const def = s.defs[snap.unit.defId];
      if (def?.type === "mob") {
        for (const tribe of def.tribes) p.deaths.byTribe[tribe] = (p.deaths.byTribe[tribe] ?? 0) + 1;
      }
      // Queues `otherDied` listeners among the surviving units.
      const e = emit(ctx, { type: "MOB_DESTROYED", iid: snap.unit.iid, seat: snap.seat, defId: snap.unit.defId, index: snap.index });
      deathEvents.set(snap.unit.iid, e as GameEvent);
    }

    for (const snap of snapshots) {
      const u = snap.unit;
      const deathEvent = deathEvents.get(u.iid) ?? null;
      const snapshot = { seat: snap.seat, index: snap.index, silenced: u.silenced };
      if (!u.silenced) {
        for (const ability of s.defs[u.defId].abilities) {
          if (ability.trigger.on !== "death" || !withinLimit(s, u, ability)) continue;
          queueTrigger(ctx, { kind: "ability", sourceId: u.iid, controller: snap.seat, defId: u.defId, abilityId: ability.id, event: deathEvent, snapshot });
        }
        // Renacer is queued after the unit's own Último Aliento (so a deathrattle may take the slot).
        if (u.keywords.reborn) {
          queueTrigger(ctx, { kind: "reborn", sourceId: u.iid, controller: snap.seat, defId: u.defId, abilityId: null, event: deathEvent, snapshot });
        }
      }
      // The killer reacts only if it is still on the board (a killer that died in the same step is gone).
      const killer = u.lastDamagedBy ? findUnit(s, u.lastDamagedBy) : null;
      if (killer && isAlive(killer) && !killer.silenced && !isStunned(killer)) {
        for (const ability of s.defs[killer.defId].abilities) {
          if (ability.trigger.on !== "kill" || !withinLimit(s, killer, ability)) continue;
          queueTrigger(ctx, { kind: "ability", sourceId: killer.iid, controller: killer.controller, defId: killer.defId, abilityId: ability.id, event: deathEvent });
        }
      }
    }
    // Loop again in case pendingDestroy flags were set meanwhile; queued triggers run later in resolveAll.
  }
}

/** Renacer: the same card returns at its former index with 1 health and without Renacer (respects the normal limit). */
function resolveReborn(ctx: Ctx, t: PendingTrigger): void {
  const s = ctx.s;
  const snap = t.snapshot;
  if (!snap) return;
  if (!canFit(s, snap.seat)) {
    emit(ctx, { type: "SUMMON_FIZZLED", seat: snap.seat, defId: t.defId, count: 1 });
    return;
  }
  const index = Math.min(snap.index, s.players[snap.seat].board.length);
  placeUnit(ctx, snap.seat, t.defId, nextIid(s), index, "reborn", t.sourceId, (u) => {
    u.damage = u.baseHealth - 1;
    delete u.keywords.reborn;
    u.rebornUsed = true;
  });
}

/** The unit a trigger belongs to and whether it may still resolve (§8.1 `stillValid`). */
function triggerSource(ctx: Ctx, t: PendingTrigger): Unit | null {
  const onBoard = findUnit(ctx.s, t.sourceId);
  if (t.snapshot) return ctx.departed[t.sourceId] ?? null; // Último Aliento: resolves from its snapshot
  // Everything else (incl. kill and healthThreshold) needs its source alive, on the board, not silenced and
  // not Aturdido (a trigger queued before its source was stunned fizzles).
  return onBoard && isAlive(onBoard) && !onBoard.silenced && !isStunned(onBoard) ? onBoard : null;
}

function resolveTrigger(ctx: Ctx, t: PendingTrigger): boolean {
  const s = ctx.s;
  if (t.kind === "reborn") {
    ctx.step += 1;
    ctx.depth = t.depth;
    resolveReborn(ctx, t);
    return true;
  }
  const source = triggerSource(ctx, t);
  if (!source) return false;
  const ability = s.defs[t.defId].abilities.find((a) => a.id === t.abilityId);
  if (!ability || !withinLimit(s, source, ability)) return false;
  const a: AbilityContext = {
    controller: t.controller,
    sourceId: t.sourceId,
    sourceDefId: t.defId,
    sourceIndex: t.snapshot ? t.snapshot.index : s.players[source.controller].board.indexOf(source),
    event: t.event ?? undefined,
    depth: t.depth,
  };
  if (!checkConditions(ctx, ability.conditions, a)) return false;
  ctx.step += 1;
  recordUse(s, source, ability.id);
  emit(ctx, { type: "TRIGGER_ACTIVATED", sourceId: t.sourceId, abilityId: ability.id, defId: t.defId });
  // ctx.depth stays at this trigger's depth until the next one starts, so triggers queued by its events AND by the
  // deaths it causes (processed right after it) are one level deeper. resolveAll restores the outer depth.
  ctx.depth = t.depth;
  runEffects(ctx, ability.effects, a);
  return true;
}

/**
 * Deaths → game over check → next queued trigger (FIFO) … until the queue is empty or the game ends (§8.1).
 * More than `rules.chain.maxResolutionsPerCommand` resolutions in one command → CHAIN_LIMIT_REACHED, the queue is
 * discarded and the board settles.
 */
export function resolveAll(ctx: Ctx): void {
  const outer = ctx.depth;
  try {
    resolveLoop(ctx);
  } finally {
    ctx.depth = outer;
  }
}

function resolveLoop(ctx: Ctx): void {
  const s = ctx.s;
  for (;;) {
    if (isGameOver(s)) {
      ctx.queue = [];
      return;
    }
    processDeaths(ctx);
    if (checkGameOver(ctx)) return;
    const t = ctx.queue.shift();
    if (!t) return;
    if (!resolveTrigger(ctx, t)) continue;
    ctx.resolutions += 1;
    if (ctx.resolutions > s.rules.chain.maxResolutionsPerCommand) {
      emitChainLimit(ctx);
      ctx.queue = [];
      processDeaths(ctx);
      ctx.queue = []; // triggers queued by these last deaths are discarded too
      checkGameOver(ctx);
      return;
    }
  }
}
