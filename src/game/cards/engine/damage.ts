// Damage and healing primitives (§6.8, §8.4).
import { findUnit } from "./board";
import { emit } from "./ctx";
import type { BlockReason, DamageKind } from "./events";
import { heroId, seatOfHero } from "./ids";
import { getHealth, getMaxHealth, isAlive } from "./stats";
import type { Ctx, EntityId, Hero, MatchState, Seat, Unit } from "./types";

export interface DamageInstance {
  source: EntityId;
  target: EntityId;
  amount: number;
  kind: DamageKind;
}

export interface DamageResult extends DamageInstance {
  dealt: number; // damage actually applied (0 when prevented)
  blocked: BlockReason | null;
  healthAfter: number;
}

type DamageTarget = { kind: "hero"; seat: Seat; hero: Hero } | { kind: "unit"; unit: Unit };

function resolveTarget(s: MatchState, id: EntityId): DamageTarget | null {
  const seat = seatOfHero(id);
  if (seat !== null) return { kind: "hero", seat, hero: s.players[seat].hero };
  const unit = findUnit(s, id);
  return unit ? { kind: "unit", unit } : null;
}

/**
 * The prevention pipeline for ONE instance (§6.8 steps 2–5), evaluated before any damage of the batch is
 * applied. Consumes what it uses (a shield charge). Returns the damage that gets through (0 when blocked).
 *
 * Extension point, in this order:
 *   (2) Vulnerabilidad — `amount += magnitude` (Phase 18)
 *   (3) Inmune — `{ amount: 0, blocked: "immune" }` (Phase 18)
 *   (4) Escudo — combat damage only, one charge per instance (ADR-21) ← implemented
 *   (5) Escudo Divino — any damage, then removed: `{ amount: 0, blocked: "divine" }` (Phase 19)
 */
export function preventDamage(ctx: Ctx, inst: DamageInstance): { amount: number; blocked: BlockReason | null } {
  const target = resolveTarget(ctx.s, inst.target);
  const amount = inst.amount;
  if (target?.kind === "unit") {
    const u = target.unit;
    if (inst.kind === "combat" && !u.silenced && u.shieldCharges > 0) {
      u.shieldCharges -= 1;
      // DEC-011: the keyword disappears with its last charge, so `keywords.shield` ⇔ "has Escudo now".
      if (u.shieldCharges === 0) delete u.keywords.shield;
      return { amount: 0, blocked: "shield" };
    }
  }
  return { amount, blocked: null };
}

/**
 * Applies a batch of damage "simultaneously" (§8.4): (a) drops instances with amount ≤ 0 or a missing target;
 * (b) runs prevention for each instance in list order (an Escudo charge used by one instance is gone for the
 * next); (c) applies all damage; (d) emits one DAMAGE per instance in list order; (e) emits KEYWORDS_CHANGED
 * for each unit whose shield charges changed. Health never influences prevention, so applying in list order is
 * equivalent to applying at once; each DAMAGE's `healthAfter` is the target's health after that instance.
 * Deaths are not processed here (next `processDeaths`).
 */
export function applyDamageInstances(ctx: Ctx, instances: readonly DamageInstance[]): DamageResult[] {
  const s = ctx.s;
  const shieldsBefore = new Map<Unit, number>();
  const prevented: { inst: DamageInstance; target: DamageTarget; amount: number; blocked: BlockReason | null }[] = [];
  for (const inst of instances) {
    if (!(inst.amount > 0)) continue;
    const target = resolveTarget(s, inst.target);
    if (!target) continue;
    if (target.kind === "unit" && !shieldsBefore.has(target.unit)) shieldsBefore.set(target.unit, target.unit.shieldCharges);
    prevented.push({ inst, target, ...preventDamage(ctx, inst) });
  }

  const results: DamageResult[] = prevented.map(({ inst, target, amount, blocked }) => {
    let healthAfter: number;
    if (target.kind === "hero") {
      target.hero.health -= amount;
      healthAfter = target.hero.health;
    } else {
      if (amount > 0) {
        target.unit.damage += amount;
        target.unit.lastDamagedBy = inst.source;
      }
      healthAfter = getHealth(target.unit);
    }
    return { source: inst.source, target: inst.target, amount: inst.amount, kind: inst.kind, dealt: amount, blocked, healthAfter };
  });

  for (const r of results) {
    emit(ctx, {
      type: "DAMAGE",
      source: r.source,
      target: r.target,
      amount: r.amount,
      dealt: r.dealt,
      kind: r.kind,
      blocked: r.blocked,
      healthAfter: r.healthAfter,
    });
  }
  for (const [u, before] of shieldsBefore) {
    if (u.shieldCharges !== before) {
      emit(ctx, { type: "KEYWORDS_CHANGED", iid: u.iid, keywords: structuredClone(u.keywords), shieldCharges: u.shieldCharges });
    }
  }
  return results;
}

/** Damage to a hero (fatigue): heroes have no prevention in V1, so this always lands. */
export function damageHero(ctx: Ctx, seat: Seat, amount: number, source: EntityId, kind: DamageKind): void {
  applyDamageInstances(ctx, [{ source, target: heroId(seat), amount, kind }]);
}

/**
 * Heals a hero or a living unit by up to `amount`, never above max health (§6.8). Emits HEAL only when ≥ 1
 * health was restored; returns the amount restored. Dead/dying units cannot be healed.
 * Extension point: Maldición makes a unit unhealable (Phase 18).
 */
export function heal(ctx: Ctx, sourceId: EntityId, targetId: EntityId, amount: number): number {
  if (!(amount > 0)) return 0;
  const target = resolveTarget(ctx.s, targetId);
  if (!target) return 0;
  let restored: number;
  let healthAfter: number;
  if (target.kind === "hero") {
    const hero = target.hero;
    restored = Math.min(amount, Math.max(0, hero.maxHealth - hero.health));
    hero.health += restored;
    healthAfter = hero.health;
  } else {
    const u = target.unit;
    if (!isAlive(u)) return 0;
    restored = Math.min(amount, Math.max(0, getMaxHealth(u) - getHealth(u)));
    u.damage -= restored;
    healthAfter = getHealth(u);
  }
  if (restored === 0) return 0;
  emit(ctx, { type: "HEAL", source: sourceId, target: targetId, amount: restored, healthAfter });
  return restored;
}
