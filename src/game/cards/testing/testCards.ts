// Test-only card definitions (ids prefixed `test-`). Never part of CATALOG (§20.1).
import type { CardDef, CardId, MobCardDef } from "../catalog/types";

function vanilla(id: string, cost: number, attack: number, health: number): MobCardDef {
  return {
    id, version: 1, type: "mob", set: "core", cost, rarity: "common", collectible: false, art: id,
    attack, health, tribes: [], keywords: {}, abilities: [],
  };
}

function withAbilities(base: MobCardDef, abilities: MobCardDef["abilities"]): MobCardDef {
  return { ...base, abilities };
}

export const TEST_DEFS: Record<CardId, CardDef> = {
  "test-1-1": vanilla("test-1-1", 1, 1, 1),
  "test-2-3": vanilla("test-2-3", 2, 2, 3),
  "test-5-5": vanilla("test-5-5", 5, 5, 5),
  "test-0-3": vanilla("test-0-3", 1, 0, 3),
  // Phase 7: a recursive pair (each summons the other whenever another friendly mob is summoned) — must terminate.
  "test-echo-a": withAbilities(vanilla("test-echo-a", 1, 1, 1), [{
    id: "echo", trigger: { on: "otherSummoned", side: "friendly" },
    effects: [{ type: "summon", card: "test-echo-b", count: 1, overflow: true }],
  }]),
  "test-echo-b": withAbilities(vanilla("test-echo-b", 1, 1, 1), [{
    id: "echo", trigger: { on: "otherSummoned", side: "friendly" },
    effects: [{ type: "summon", card: "test-echo-a", count: 1, overflow: true }],
  }]),
  // +1 attack whenever another friendly mob is summoned, at most once per turn.
  "test-limited": withAbilities(vanilla("test-limited", 1, 1, 3), [{
    id: "grow", trigger: { on: "otherSummoned", side: "friendly" }, limit: { perTurn: 1 },
    effects: [{ type: "buff", to: { kind: "self" }, attack: 1 }],
  }]),
  // At the start of its controller's turn: 1 damage to the enemy hero.
  "test-turnstart-dmg": withAbilities(vanilla("test-turnstart-dmg", 1, 1, 3), [{
    id: "ping", trigger: { on: "turnStart", whose: "own" },
    effects: [{ type: "damage", amount: 1, to: { kind: "hero", side: "enemy" } }],
  }]),
  // When attacked, destroys the attacker before combat damage (makes ATTACK_CANCELLED reachable).
  "test-guardian": withAbilities(vanilla("test-guardian", 1, 0, 5), [{
    id: "repel", trigger: { on: "attacked" },
    effects: [{ type: "destroy", to: { kind: "eventSource" } }],
  }]),
  // When damaged: at ≤ 50% health +2 attack, otherwise +1 max health (exercises `if` + healthPercent).
  "test-if": withAbilities(vanilla("test-if", 1, 2, 6), [{
    id: "react", trigger: { on: "damageTaken" },
    effects: [{
      type: "if", condition: { kind: "healthPercent", subject: "self", op: "lte", percent: 50 },
      then: [{ type: "buff", to: { kind: "self" }, attack: 2 }],
      else: [{ type: "buff", to: { kind: "self" }, health: 1 }],
    }],
  }]),
  "test-spell-noop": {
    id: "test-spell-noop", version: 1, type: "spell", set: "core", cost: 1, rarity: "common", collectible: false,
    art: "test-spell-noop",
    // 0 damage creates no damage instance: a spell that does nothing.
    abilities: [{ id: "cast", trigger: { on: "play" }, effects: [{ type: "damage", amount: 0, to: { kind: "hero", side: "enemy" } }] }],
  },
};
