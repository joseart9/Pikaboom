// Damage and healing primitives (§6.8, §8.4).
import { findUnit, snapshotUnit } from "./board";
import { emit } from "./ctx";
import type { BlockReason, DamageKind } from "./events";
import { heroId, seatOfHero } from "./ids";
import { hasKeyword } from "./keywords";
import { getAttack, getHealth, getMaxHealth, isAlive } from "./stats";
import { isCursed, isImmune, statusMagnitude } from "./statuses";
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
 * applied. Consumes what it uses (a shield charge). Returns the incoming amount after Vulnerabilidad (`amount`)
 * and the damage that gets through (`dealt`, 0 when blocked).
 *
 *   (2) Vulnerabilidad — `amount += magnitude`
 *   (3) Inmune — `{ dealt: 0, blocked: "immune" }`
 *   (4) Escudo — combat damage only, one charge per instance (ADR-21)
 *   (5) Escudo Divino — any damage kind, then the keyword is removed: `{ dealt: 0, blocked: "divine" }` (Phase 19).
 *       Checked after Escudo, so a combat hit spends an Escudo charge first.
 */
export function preventDamage(ctx: Ctx, inst: DamageInstance): { amount: number; dealt: number; blocked: BlockReason | null } {
  const target = resolveTarget(ctx.s, inst.target);
  let amount = inst.amount;
  if (target?.kind === "unit") {
    const u = target.unit;
    amount += statusMagnitude(u, "vulnerability");
    if (isImmune(u)) return { amount, dealt: 0, blocked: "immune" };
    if (inst.kind === "combat" && !u.silenced && u.shieldCharges > 0) {
      u.shieldCharges -= 1;
      // DEC-011: the keyword disappears with its last charge, so `keywords.shield` ⇔ "has Escudo now".
      if (u.shieldCharges === 0) delete u.keywords.shield;
      return { amount, dealt: 0, blocked: "shield" };
    }
    if (hasKeyword(u, "divineShield")) {
      delete u.keywords.divineShield;
      return { amount, dealt: 0, blocked: "divine" };
    }
  }
  return { amount, dealt: amount, blocked: null };
}

/** The unit behind a damage source id: on the board, or departed during this command (a dead unit's Último Aliento). */
function sourceUnit(ctx: Ctx, id: EntityId): Unit | null {
  return findUnit(ctx.s, id) ?? ctx.departed[id] ?? null;
}

const keywordKey = (u: Unit) => `${JSON.stringify(u.keywords)}|${u.shieldCharges}`;

/**
 * Applies a batch of damage "simultaneously" (§8.4): (a) drops instances with amount ≤ 0 or a missing target;
 * (b) runs prevention for each instance in list order (an Escudo charge or Escudo Divino used by one instance is
 * gone for the next); (c) applies all damage; (d) emits one DAMAGE per instance in list order; (e) Veneno: a unit
 * that took > 0 damage from a unit with Veneno is flagged `pendingDestroy` (heroes are unaffected); Sigilo: a unit
 * that dealt > 0 damage loses it (Phase 19); (f) emits KEYWORDS_CHANGED for each unit whose keywords or shield
 * charges changed; (g) emits STATS_CHANGED for each surviving unit whose attack changed (Furia crossing its
 * threshold, Phase 13). Health never influences prevention, so applying in list order is equivalent to applying at
 * once; each DAMAGE's `healthAfter` is the target's health after that instance. Deaths are not processed here
 * (next `processDeaths`).
 */
export function applyDamageInstances(ctx: Ctx, instances: readonly DamageInstance[]): DamageResult[] {
  const s = ctx.s;
  const keywordsBefore = new Map<Unit, string>();
  const attackBefore = new Map<Unit, number>();
  const watch = (u: Unit | null) => {
    if (u && !keywordsBefore.has(u)) keywordsBefore.set(u, keywordKey(u));
  };
  const prevented: { inst: DamageInstance; target: DamageTarget; amount: number; dealt: number; blocked: BlockReason | null }[] = [];
  for (const inst of instances) {
    if (!(inst.amount > 0)) continue;
    const target = resolveTarget(s, inst.target);
    if (!target) continue;
    if (target.kind === "unit") {
      watch(target.unit);
      if (!attackBefore.has(target.unit)) attackBefore.set(target.unit, getAttack(target.unit));
    }
    prevented.push({ inst, target, ...preventDamage(ctx, inst) });
  }

  const results: DamageResult[] = prevented.map(({ inst, target, amount, dealt, blocked }) => {
    let healthAfter: number;
    if (target.kind === "hero") {
      target.hero.health -= dealt;
      healthAfter = target.hero.health;
    } else {
      if (dealt > 0) {
        target.unit.damage += dealt;
        target.unit.lastDamagedBy = inst.source;
      }
      healthAfter = getHealth(target.unit);
    }
    return { source: inst.source, target: inst.target, amount, kind: inst.kind, dealt, blocked, healthAfter };
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
  // Veneno and Sigilo (§7.1): only instances that really dealt damage count (prevented ⇒ no poison).
  for (const [i, r] of results.entries()) {
    if (r.dealt <= 0) continue;
    const from = sourceUnit(ctx, r.source);
    if (!from) continue;
    const target = prevented[i].target;
    if (target.kind === "unit" && hasKeyword(from, "poison")) target.unit.pendingDestroy = true;
    if (hasKeyword(from, "stealth") && findUnit(s, from.iid)) {
      watch(from);
      delete from.keywords.stealth;
    }
  }
  for (const [u, before] of keywordsBefore) {
    if (keywordKey(u) !== before) {
      emit(ctx, { type: "KEYWORDS_CHANGED", iid: u.iid, keywords: structuredClone(u.keywords), shieldCharges: u.shieldCharges });
    }
  }
  for (const [u, before] of attackBefore) emitAttackChange(ctx, u, before);
  return results;
}

/** STATS_CHANGED when a living unit's attack moved (Furia toggling on damage/heal), so clients need no rule logic. */
function emitAttackChange(ctx: Ctx, u: Unit, before: number): void {
  if (!isAlive(u) || getAttack(u) === before) return;
  const snap = snapshotUnit(ctx.s, u);
  emit(ctx, { type: "STATS_CHANGED", iid: u.iid, attack: snap.attack, health: snap.health, maxHealth: snap.maxHealth });
}

/** Damage to a hero (fatigue): heroes have no prevention in V1, so this always lands. */
export function damageHero(ctx: Ctx, seat: Seat, amount: number, source: EntityId, kind: DamageKind): void {
  applyDamageInstances(ctx, [{ source, target: heroId(seat), amount, kind }]);
}

/**
 * Heals a hero or a living unit by up to `amount`, never above max health (§6.8). Emits HEAL only when ≥ 1
 * health was restored; returns the amount restored. Dead/dying units and units with Maldición cannot be healed.
 */
export function heal(ctx: Ctx, sourceId: EntityId, targetId: EntityId, amount: number): number {
  if (!(amount > 0)) return 0;
  const target = resolveTarget(ctx.s, targetId);
  if (!target) return 0;
  let restored: number;
  let healthAfter: number;
  let attackBefore: number | null = null;
  if (target.kind === "hero") {
    const hero = target.hero;
    restored = Math.min(amount, Math.max(0, hero.maxHealth - hero.health));
    hero.health += restored;
    healthAfter = hero.health;
  } else {
    const u = target.unit;
    if (!isAlive(u) || isCursed(u)) return 0;
    attackBefore = getAttack(u);
    restored = Math.min(amount, Math.max(0, getMaxHealth(u) - getHealth(u)));
    u.damage -= restored;
    healthAfter = getHealth(u);
  }
  if (restored === 0) return 0;
  emit(ctx, { type: "HEAL", source: sourceId, target: targetId, amount: restored, healthAfter });
  if (target.kind === "unit" && attackBefore !== null) emitAttackChange(ctx, target.unit, attackBefore);
  return restored;
}
