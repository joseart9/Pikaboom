// Spells, humans, elementals and the dragon (§20.2).
import type { CardDef } from "../types";
import { core } from "./core";

export const NEUTRAL_DEFS: readonly CardDef[] = [
  // ── Normal ──
  {
    ...core("apprentice-mage"), type: "mob", cost: 2, rarity: "common", collectible: true,
    attack: 2, health: 2, tribes: ["human"], keywords: {},
    abilities: [{
      id: "battlecry", trigger: { on: "play" }, target: { group: "enemyMobs" },
      effects: [{ type: "damage", amount: 1, to: { kind: "chosen" } }],
    }],
  },
  {
    ...core("drain-life"), type: "spell", cost: 2, rarity: "common", collectible: true,
    abilities: [{
      id: "cast", trigger: { on: "play" }, target: { group: "enemyCharacters" },
      effects: [
        { type: "damage", amount: 2, to: { kind: "chosen" } },
        { type: "heal", amount: 2, to: { kind: "hero", side: "friendly" } },
      ],
    }],
  },
  {
    ...core("savage-strike"), type: "spell", cost: 1, rarity: "common", collectible: true,
    abilities: [{
      id: "cast", trigger: { on: "play" }, target: { group: "friendlyMobs" },
      effects: [{ type: "buff", to: { kind: "chosen" }, attack: 3, duration: "thisTurn" }],
    }],
  },
  {
    ...core("grave-digger"), type: "mob", cost: 3, rarity: "common", collectible: true,
    attack: 2, health: 3, tribes: ["human"], keywords: {},
    abilities: [{ id: "battlecry", trigger: { on: "play" }, effects: [{ type: "summon", card: "skeleton", count: 1 }] }],
  },
  {
    ...core("pack-call"), type: "spell", cost: 3, rarity: "common", collectible: true,
    abilities: [{ id: "cast", trigger: { on: "play" }, effects: [{ type: "summon", card: "wolf", count: 2 }] }],
  },
  {
    ...core("wild-roar"), type: "spell", cost: 3, rarity: "common", collectible: true,
    abilities: [{
      id: "cast", trigger: { on: "play" },
      effects: [{ type: "buff", to: { kind: "all", group: "friendlyMobs" }, attack: 1, health: 1 }],
    }],
  },
  {
    ...core("scholar"), type: "mob", cost: 3, rarity: "common", collectible: true,
    attack: 2, health: 3, tribes: ["human"], keywords: {},
    abilities: [{ id: "battlecry", trigger: { on: "play" }, effects: [{ type: "draw", count: 1 }] }],
  },
  {
    ...core("flame-lance"), type: "spell", cost: 4, rarity: "common", collectible: true,
    abilities: [{
      id: "cast", trigger: { on: "play" }, target: { group: "allMobs" },
      effects: [{ type: "damage", amount: 5, to: { kind: "chosen" } }],
    }],
  },
  {
    ...core("arcane-insight"), type: "spell", cost: 3, rarity: "common", collectible: true,
    abilities: [{ id: "cast", trigger: { on: "play" }, effects: [{ type: "draw", count: 2 }] }],
  },
  // ── Rara ──
  {
    ...core("soul-harvest"), type: "spell", cost: 3, rarity: "rare", collectible: true,
    abilities: [{
      id: "cast", trigger: { on: "play" }, target: { group: "enemyMobs", filter: { maxAttack: 3 } },
      effects: [{ type: "destroy", to: { kind: "chosen" } }],
    }],
  },
  {
    ...core("bone-storm"), type: "spell", cost: 4, rarity: "rare", collectible: true,
    abilities: [{
      id: "cast", trigger: { on: "play" },
      effects: [{ type: "damage", amount: 2, to: { kind: "all", group: "enemyMobs" } }],
    }],
  },
  {
    ...core("chain-lightning"), type: "spell", cost: 4, rarity: "rare", collectible: true,
    abilities: [{
      id: "cast", trigger: { on: "play" }, target: { group: "enemyMobs" },
      effects: [
        { type: "damage", amount: 3, to: { kind: "chosen" } },
        { type: "damage", amount: 2, to: { kind: "random", group: "enemyMobs", count: 2, excludeChosen: true } },
      ],
    }],
  },
  {
    ...core("dawn-paladin"), type: "mob", cost: 4, rarity: "rare", collectible: true,
    attack: 3, health: 3, tribes: ["human"], keywords: { shield: 2 },
    abilities: [{
      id: "battlecry", trigger: { on: "play" },
      effects: [{ type: "heal", amount: 3, to: { kind: "hero", side: "friendly" } }],
    }],
  },
  {
    ...core("necromancer"), type: "mob", cost: 5, rarity: "rare", collectible: true,
    attack: 3, health: 4, tribes: ["human"], keywords: {},
    abilities: [
      { id: "battlecry", trigger: { on: "play" }, effects: [{ type: "summon", card: "skeleton", count: 2 }] },
      { id: "deathrattle", trigger: { on: "death" }, effects: [{ type: "summon", card: "skeleton", count: 1 }] },
    ],
  },
  {
    ...core("swamp-ent"), type: "mob", cost: 5, rarity: "rare", collectible: true,
    attack: 4, health: 5, tribes: ["elemental"], keywords: { regeneration: 2 }, abilities: [],
  },
  // ── Mágica ──
  {
    ...core("growing-crystal"), type: "spell", cost: 2, rarity: "magic", collectible: true,
    abilities: [{ id: "cast", trigger: { on: "play" }, effects: [{ type: "gainMana", amount: 1, kind: "emptyMax" }] }],
  },
  {
    ...core("storm-weaver"), type: "mob", cost: 6, rarity: "magic", collectible: true,
    attack: 4, health: 4, tribes: ["elemental"], keywords: {},
    abilities: [{
      id: "battlecry", trigger: { on: "play" },
      effects: [{ type: "damage", amount: 2, to: { kind: "random", group: "enemyCharacters", count: 3 } }],
    }],
  },
  {
    ...core("last-stand-knight"), type: "mob", cost: 5, rarity: "magic", collectible: true,
    attack: 4, health: 6, tribes: ["human"], keywords: {},
    abilities: [{
      id: "lastStand", trigger: { on: "healthThreshold", percent: 50 },
      effects: [
        { type: "grantKeyword", to: { kind: "self" }, keyword: "taunt" },
        { type: "buff", to: { kind: "self" }, attack: 2 },
      ],
    }],
  },
  // ── Única ──
  {
    ...core("ignis"), type: "mob", cost: 10, rarity: "unique", collectible: true,
    attack: 8, health: 8, tribes: ["dragon"], keywords: { reborn: true },
    abilities: [{
      id: "battlecry", trigger: { on: "play" },
      effects: [{ type: "damage", amount: 3, to: { kind: "all", group: "enemyCharacters" } }],
    }],
  },
];
