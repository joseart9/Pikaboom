// Statuses (§7.2–§7.4, Phase 18): apply with stacking, duration math, turn-boundary expiry and Quemadura ticks.
// Metadata (polarity, stacking, default duration) lives in catalog/statuses.ts; rule reads go through the
// lookups below so every status behaves the same wherever it is checked.
import { STATUS_DEFS } from "../catalog/statuses";
import type { StatusId } from "../catalog/types";
import { snapshotUnit } from "./board";
import { emit } from "./ctx";
import type { DamageInstance } from "./damage";
import { getAttack, getHealth, getMaxHealth } from "./stats";
import type { Ctx, EntityId, MatchState, Seat, StatusInstance, Unit } from "./types";

export function statusOf(u: Unit, id: StatusId): StatusInstance | undefined {
  return u.statuses.find((st) => st.id === id);
}

export function hasStatus(u: Unit, id: StatusId): boolean {
  return u.statuses.some((st) => st.id === id);
}

/** The status's magnitude, or 0 when the unit does not have it. */
export function statusMagnitude(u: Unit, id: StatusId): number {
  return statusOf(u, id)?.magnitude ?? 0;
}

/**
 * §7.3: `duration` D ≥ 1 lasts until the end of the controller's D-th turn after the status was applied, counting
 * the current turn only when it is the opponent's. `null` = permanent.
 */
export function expiryFor(s: MatchState, controller: Seat, duration: number | null): number | null {
  if (duration === null) return null;
  const nextOwnerTurn = s.turn.activeSeat === controller ? s.turn.number + 2 : s.turn.number + 1;
  return nextOwnerTurn + 2 * (Math.max(1, duration) - 1);
}

/** The later of two expiries (`null` = permanent wins). */
function laterExpiry(a: number | null, b: number | null): number | null {
  return a === null || b === null ? null : Math.max(a, b);
}

/**
 * Runs `mutate` and keeps §6.8's buff-removal rule: current health becomes min(current, new max), so losing a
 * health buff never heals and never kills by itself. Emits STATS_CHANGED when attack, health or max moved.
 */
export function changeStats(ctx: Ctx, u: Unit, mutate: () => void): void {
  const attackBefore = getAttack(u);
  const healthBefore = getHealth(u);
  const maxBefore = getMaxHealth(u);
  mutate();
  const maxAfter = getMaxHealth(u);
  if (maxAfter < maxBefore) u.damage = Math.max(0, maxAfter - Math.min(healthBefore, maxAfter));
  if (getAttack(u) === attackBefore && getHealth(u) === healthBefore && maxAfter === maxBefore) return;
  const snap = snapshotUnit(ctx.s, u);
  emit(ctx, { type: "STATS_CHANGED", iid: u.iid, attack: snap.attack, health: snap.health, maxHealth: snap.maxHealth });
}

/**
 * Applies status `id` to a unit (§7.4 stacking: one instance per id). `magnitude` is ignored for statuses without
 * one (stored as 0); `duration` undefined = the status's default. Emits STATUS_APPLIED with the resulting
 * magnitude, plus STATS_CHANGED when Debilidad/Bendición changed the numbers. Returns false when nothing changed
 * ("ignore" stacking on a unit that already has it).
 */
export function applyStatus(
  ctx: Ctx,
  u: Unit,
  id: StatusId,
  magnitude: number | undefined,
  duration: number | null | undefined,
  sourceId: EntityId,
): boolean {
  const def = STATUS_DEFS[id];
  const s = ctx.s;
  const mag = def.hasMagnitude ? Math.max(1, magnitude ?? 1) : 0;
  const expires = expiryFor(s, u.controller, duration === undefined ? def.defaultDuration : duration);
  const existing = statusOf(u, id);
  if (existing && def.stacking === "ignore") return false;
  changeStats(ctx, u, () => {
    if (!existing) {
      u.statuses.push({ id, magnitude: mag, expiresAfterTurn: expires, sourceId, appliedTurn: s.turn.number });
      return;
    }
    if (def.stacking === "add") existing.magnitude += mag;
    else if (def.stacking === "max") existing.magnitude = Math.max(existing.magnitude, mag);
    existing.expiresAfterTurn = laterExpiry(existing.expiresAfterTurn, expires);
    existing.sourceId = sourceId;
    existing.appliedTurn = s.turn.number;
  });
  emit(ctx, { type: "STATUS_APPLIED", iid: u.iid, status: id, magnitude: statusMagnitude(u, id) });
  return true;
}

/** Removes the statuses matching `which` (emits STATUS_REMOVED each, then STATS_CHANGED if the numbers moved). */
export function removeStatuses(ctx: Ctx, u: Unit, which: (st: StatusInstance) => boolean): StatusId[] {
  const removed = u.statuses.filter(which).map((st) => st.id);
  if (removed.length === 0) return removed;
  for (const id of removed) emit(ctx, { type: "STATUS_REMOVED", iid: u.iid, status: id });
  changeStats(ctx, u, () => {
    u.statuses = u.statuses.filter((st) => !which(st));
  });
  return removed;
}

/** End of turn T (§6.3 step 3): statuses on `seat`'s units with `expiresAfterTurn <= T` are removed, in board order. */
export function expireStatuses(ctx: Ctx, seat: Seat): void {
  const turn = ctx.s.turn.number;
  for (const u of [...ctx.s.players[seat].board]) {
    removeStatuses(ctx, u, (st) => st.expiresAfterTurn !== null && st.expiresAfterTurn <= turn);
  }
}

/** Start of `seat`'s turn (§6.3 step 4): one Quemadura effect-damage instance per burning unit, in board order. */
export function burnInstances(s: MatchState, seat: Seat): DamageInstance[] {
  const out: DamageInstance[] = [];
  for (const u of s.players[seat].board) {
    const burn = statusOf(u, "burn");
    if (burn && burn.magnitude > 0) out.push({ source: burn.sourceId, target: u.iid, amount: burn.magnitude, kind: "effect" });
  }
  return out;
}

/** Statuses that change what a unit may do (read by combat and triggers). */
export const isFrozen = (u: Unit) => hasStatus(u, "freeze");
export const isStunned = (u: Unit) => hasStatus(u, "stun");
export const isDisarmed = (u: Unit) => hasStatus(u, "disarm");
export const isCursed = (u: Unit) => hasStatus(u, "curse");
export const isImmune = (u: Unit) => hasStatus(u, "immune");
