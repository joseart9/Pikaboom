// Attacking (§6.7) and the combat algorithm (§8.4).
import { boardIndexOf, findUnit } from "./board";
import type { GameCommand } from "./commands";
import { emit } from "./ctx";
import { applyDamageInstances, heal, type DamageInstance } from "./damage";
import { EngineError, type EngineErrorCode } from "./errors";
import { isGameOver } from "./gameOver";
import { heroId, otherSeat, seatOfHero } from "./ids";
import { hasKeyword, keywordValue, maxAttacks } from "./keywords";
import { resolveAll } from "./resolve";
import { getAttack, isAlive, summonedThisTurn } from "./stats";
import { isDisarmed, isFrozen, isStunned, statusOf } from "./statuses";
import type { Ctx, EntityId, MatchState, Seat, Unit } from "./types";

type AttackCommand = Extract<GameCommand, { t: "attack" }>;

/** Why `u` cannot attack right now (§6.7.1), or null when it can. Ignores whose turn it is. */
export function attackBlocker(s: MatchState, u: Unit): EngineErrorCode | null {
  // Congelado/Aturdido cannot attack; Desarmado may (it just deals 0 combat damage).
  if (isFrozen(u) || isStunned(u)) return "cannot_attack";
  if (getAttack(u) <= 0) return "cannot_attack";
  if (u.attacksThisTurn >= maxAttacks(u)) return "cannot_attack";
  if (summonedThisTurn(s, u) && !hasKeyword(u, "charge") && !hasKeyword(u, "rush")) return "summoning_sick";
  return null;
}

export function canAttack(s: MatchState, u: Unit): boolean {
  return isAlive(u) && attackBlocker(s, u) === null;
}

/** Summoned this turn with Embestida but without Carga: may attack mobs only. */
function rushOnly(s: MatchState, u: Unit): boolean {
  return summonedThisTurn(s, u) && !hasKeyword(u, "charge") && hasKeyword(u, "rush");
}

/**
 * Enemy units `u` must attack first (§6.7.2): living, non-Sigilo enemy units with Provocar. An attacker with Vuelo
 * ignores the Provocar of units without Vuelo.
 */
function bindingTaunts(s: MatchState, u: Unit): Unit[] {
  const flying = hasKeyword(u, "flying");
  return s.players[otherSeat(u.controller)].board.filter(
    (t) => isAlive(t) && !hasKeyword(t, "stealth") && hasKeyword(t, "taunt") && (!flying || hasKeyword(t, "flying")),
  );
}

/**
 * Entities `u` may attack (§6.7.2), in board order with the hero last. Does not check `canAttack`.
 * Candidates: living enemy units without Sigilo + the enemy hero (not for Embestida on its summon turn). If any
 * binding Provocar unit exists (see `bindingTaunts`: Sigilo hides Provocar, Vuelo ignores non-flying Provocar),
 * only those remain.
 */
export function attackTargets(s: MatchState, u: Unit): EntityId[] {
  const enemy = otherSeat(u.controller);
  const taunts = bindingTaunts(s, u);
  if (taunts.length > 0) return taunts.map((t) => t.iid);
  const targets = s.players[enemy].board.filter((t) => isAlive(t) && !hasKeyword(t, "stealth")).map((t) => t.iid);
  if (!rushOnly(s, u)) targets.push(heroId(enemy));
  return targets;
}

/** Validates and resolves `{ t: "attack" }` from the active seat (phase/turn are checked by applyCommand). */
export function attack(ctx: Ctx, seat: Seat, cmd: AttackCommand): void {
  const s = ctx.s;
  // 1. Attacker: a living unit the sender controls.
  const at = typeof cmd.attacker === "string" ? boardIndexOf(s, cmd.attacker) : null;
  if (!at) throw new EngineError("unit_not_found");
  if (at.seat !== seat) throw new EngineError("cannot_attack"); // an enemy unit cannot be ordered to attack
  const attacker = s.players[seat].board[at.index];
  if (!isAlive(attacker)) throw new EngineError("unit_not_found");
  // 2. Attacker can attack.
  const blocker = attackBlocker(s, attacker);
  if (blocker) throw new EngineError(blocker);
  // 3. Target: an enemy hero or enemy unit that is attackable.
  const targetId = cmd.target;
  const heroSeat = typeof targetId === "string" ? seatOfHero(targetId) : null;
  const targetUnit = heroSeat === null && typeof targetId === "string" ? findUnit(s, targetId) : null;
  if (heroSeat === null && !targetUnit) throw new EngineError("unit_not_found");
  if (heroSeat === seat || targetUnit?.controller === seat) throw new EngineError("invalid_target");
  if (!attackTargets(s, attacker).includes(targetId)) {
    if (heroSeat !== null && rushOnly(s, attacker)) throw new EngineError("rush_no_hero");
    if (bindingTaunts(s, attacker).length > 0) throw new EngineError("must_attack_taunt");
    throw new EngineError("invalid_target");
  }

  // Resolution (§8.4).
  attacker.attacksThisTurn += 1;
  // Attacking removes the attacker's Sigilo (§6.7.3).
  if (hasKeyword(attacker, "stealth")) {
    delete attacker.keywords.stealth;
    emit(ctx, { type: "KEYWORDS_CHANGED", iid: attacker.iid, keywords: structuredClone(attacker.keywords), shieldCharges: attacker.shieldCharges });
  }
  emit(ctx, { type: "ATTACK_DECLARED", attacker: attacker.iid, target: targetId });
  resolveAll(ctx); // `attack` (attacker) and `attacked` (target) triggers resolve here, before damage.

  const a = findUnit(s, attacker.iid);
  const t = heroSeat === null ? findUnit(s, targetId) : null;
  const targetGone = heroSeat === null ? !t || !isAlive(t) : s.players[heroSeat].hero.health <= 0;
  if (isGameOver(s) || !a || !isAlive(a) || a.controller !== seat || targetGone) {
    if (!isGameOver(s)) emit(ctx, { type: "ATTACK_CANCELLED", attacker: attacker.iid });
    return; // the attack still counts as used
  }

  ctx.step += 1;
  // Desarmado deals 0 combat damage (attacking and retaliating); Aturdido deals no retaliation. 0-damage
  // instances are dropped by applyDamageInstances, so they never hit (no Vulnerabilidad, no triggers).
  const power = isDisarmed(a) ? 0 : getAttack(a);
  const inst: DamageInstance[] = [{ source: a.iid, target: targetId, amount: power, kind: "combat" }];
  if (t) {
    const retaliation = isDisarmed(t) || isStunned(t) ? 0 : getAttack(t);
    inst.push({ source: t.iid, target: a.iid, amount: retaliation, kind: "combat" });
    if (hasKeyword(a, "cleave")) {
      const board = s.players[t.controller].board;
      const index = board.indexOf(t);
      for (const n of [board[index - 1], board[index + 1]]) {
        if (n && isAlive(n)) inst.push({ source: a.iid, target: n.iid, amount: power, kind: "combat" });
      }
    }
    const thorns = keywordValue(t, "thorns");
    if (thorns) inst.push({ source: t.iid, target: a.iid, amount: thorns, kind: "combat" });
  }
  const lifesteal = keywordValue(a, "lifesteal");
  const results = applyDamageInstances(ctx, inst);
  // Robo de Vida: once per attack if any of the attacker's instances dealt damage (retaliation never heals).
  if (lifesteal && results.some((r) => r.source === a.iid && r.dealt > 0)) {
    heal(ctx, a.iid, heroId(a.controller), lifesteal);
  }
  // Veneno (both sides, incl. Espinas and Barrido) is applied inside applyDamageInstances.
  // Sangrado: after its combat damage, a living attacker takes N effect damage (source = whoever applied it).
  const bleed = statusOf(a, "bleed");
  if (bleed && bleed.magnitude > 0 && isAlive(a)) {
    applyDamageInstances(ctx, [{ source: bleed.sourceId, target: a.iid, amount: bleed.magnitude, kind: "effect" }]);
  }
  resolveAll(ctx);
}
