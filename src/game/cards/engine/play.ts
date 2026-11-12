// Playing cards (§6.5): validation (incl. targets), then mob or spell resolution through the effect executor.
import type { AbilityDef, CardDef, TargetSpec } from "../catalog/types";
import { canFit, placeUnit } from "./board";
import type { GameCommand } from "./commands";
import { emit } from "./ctx";
import { runEffects } from "./effects/execute";
import { validTargets } from "./effects/selectors";
import { EngineError } from "./errors";
import { isGameOver } from "./gameOver";
import { availableMana, payCost } from "./mana";
import type { CardInstance, Ctx, EntityId, MatchState, Seat } from "./types";

type PlayCommand = Extract<GameCommand, { t: "play" }>;

export function effectiveCost(s: MatchState, card: CardInstance): number {
  return Math.max(0, s.defs[card.defId].cost + card.costMod);
}

/** The card's player-chosen target spec, if its `play` ability has one (at most one per card, §9.6 rule 5). */
export function playTargetSpec(def: CardDef): TargetSpec | null {
  return def.abilities.find((a) => a.trigger.on === "play" && a.target)?.target ?? null;
}

function playAbilities(def: CardDef): AbilityDef[] {
  return def.abilities.filter((a) => a.trigger.on === "play");
}

/** Legal targets for playing `card` now, or null when the card takes no target. */
export function playTargets(s: MatchState, seat: Seat, card: CardInstance): EntityId[] | null {
  const spec = playTargetSpec(s.defs[card.defId]);
  return spec ? validTargets(s, seat, spec, card.iid) : null;
}

/**
 * §6.5 rule 5. Spells: a valid target must exist and be sent. Mobs: if valid targets exist one is required;
 * if none exist the mob is played without one and its targeted Grito de Guerra fizzles. No spec ⇒ no target.
 */
function checkTarget(def: CardDef, targets: EntityId[] | null, target: EntityId | undefined): void {
  if (targets === null) {
    if (target !== undefined) throw new EngineError("unexpected_target");
    return;
  }
  if (def.type === "spell" && targets.length === 0) throw new EngineError("no_valid_targets");
  if (targets.length === 0) {
    if (target !== undefined) throw new EngineError("invalid_target");
    return;
  }
  if (target === undefined) throw new EngineError("target_required");
  if (!targets.includes(target)) throw new EngineError("invalid_target");
}

export function playCard(ctx: Ctx, seat: Seat, cmd: PlayCommand): void {
  const s = ctx.s;
  // 1. Phase and turn.
  if (s.phase !== "playing") throw new EngineError("wrong_phase");
  if (s.turn.activeSeat !== seat) throw new EngineError("not_your_turn");
  const p = s.players[seat];
  // 2. Card in hand.
  const handIndex = p.hand.findIndex((c) => c.iid === cmd.card);
  if (handIndex < 0) throw new EngineError("card_not_in_hand");
  const card = p.hand[handIndex];
  const def = s.defs[card.defId];
  // 3. Mana.
  const cost = effectiveCost(s, card);
  if (cost > availableMana(p)) throw new EngineError("not_enough_mana");
  // 4. Mob: board space and position. Spells ignore `position` (DEC-012).
  let position: number | null = null;
  if (def.type === "mob") {
    if (!canFit(s, seat)) throw new EngineError("board_full");
    const pos = cmd.position ?? p.board.length;
    if (typeof pos !== "number" || !Number.isInteger(pos) || pos < 0 || pos > p.board.length) {
      throw new EngineError("invalid_position");
    }
    position = pos;
  }
  // 5. Target.
  const target = cmd.target;
  checkTarget(def, playTargets(s, seat, card), target);

  // Resolution.
  p.hand.splice(handIndex, 1);
  p.turnCounters.cardsPlayed += 1;
  if (def.type === "mob") p.turnCounters.mobsPlayed += 1;
  else p.turnCounters.spellsCast += 1;
  emit(ctx, { type: "CARD_PLAYED", seat, iid: card.iid, defId: card.defId, target: target ?? null, position });
  payCost(ctx, seat, cost);

  if (def.type === "mob") {
    const unit = placeUnit(ctx, seat, card.defId, card.iid, position ?? p.board.length, "play", null);
    // Gritos de Guerra resolve immediately, in ability order (not queued).
    for (const ability of playAbilities(def)) {
      if (isGameOver(s)) return;
      emit(ctx, { type: "TRIGGER_ACTIVATED", sourceId: unit.iid, abilityId: ability.id, defId: def.id });
      runEffects(ctx, ability.effects, {
        controller: seat,
        sourceId: unit.iid,
        sourceDefId: def.id,
        sourceIndex: p.board.indexOf(unit),
        chosen: ability.target ? target : undefined,
        depth: 0,
      });
    }
    return;
  }

  // Spell: its single `play` ability, then SPELL_CAST. The card goes nowhere (no graveyard entry).
  for (const ability of playAbilities(def)) {
    runEffects(ctx, ability.effects, { controller: seat, sourceId: card.iid, sourceDefId: def.id, chosen: target, depth: 0 });
  }
  if (!isGameOver(s)) emit(ctx, { type: "SPELL_CAST", seat, iid: card.iid, defId: def.id });
}
