// The Phase 19 catalog expansion (F table): Veneno, Sigilo, Escudo Divino and Vuelo, plus the advanced effects
// (transform, resurrect, returnToHand, changeControl, copyToHand, stealFromHand, modifyMana).
import type { CardDef } from "../types";
import { core } from "./core";

export const ADVANCED_CARD_DEFS: readonly CardDef[] = [
  // ── Normal ──
  {
    ...core("shadow-stalker"), type: "mob", cost: 3, rarity: "common", collectible: true,
    attack: 3, health: 2, tribes: ["demon"], keywords: { stealth: true }, abilities: [],
  },
  {
    ...core("sun-cleric"), type: "mob", cost: 2, rarity: "common", collectible: true,
    attack: 2, health: 2, tribes: ["human"], keywords: { divineShield: true }, abilities: [],
  },
  {
    ...core("ash-drake"), type: "mob", cost: 5, rarity: "common", collectible: true,
    attack: 4, health: 5, tribes: ["dragon"], keywords: { flying: true }, abilities: [],
  },
  {
    ...core("clockwork-sentinel"), type: "mob", cost: 2, rarity: "common", collectible: true,
    attack: 2, health: 2, tribes: ["construct"], keywords: { taunt: true, shield: 1 }, abilities: [],
  },
  {
    ...core("banish"), type: "spell", cost: 2, rarity: "common", collectible: true,
    abilities: [{
      id: "cast", trigger: { on: "play" }, target: { group: "allMobs" },
      effects: [{ type: "returnToHand", to: { kind: "chosen" } }],
    }],
  },
  {
    ...core("dark-pact"), type: "spell", cost: 1, rarity: "common", collectible: true,
    abilities: [{
      id: "cast", trigger: { on: "play" }, target: { group: "friendlyMobs" },
      effects: [
        { type: "destroy", to: { kind: "chosen" } },
        { type: "draw", count: 2 },
      ],
    }],
  },
  // ── Rara ──
  {
    ...core("venom-spider"), type: "mob", cost: 2, rarity: "rare", collectible: true,
    attack: 1, health: 2, tribes: ["beast"], keywords: { poison: true }, abilities: [],
  },
  {
    ...core("storm-drake"), type: "mob", cost: 6, rarity: "rare", collectible: true,
    attack: 5, health: 5, tribes: ["dragon"], keywords: { flying: true },
    abilities: [{
      id: "battlecry", trigger: { on: "play" },
      effects: [{ type: "applyStatus", to: { kind: "random", group: "enemyMobs", count: 1 }, status: "stun", duration: 1 }],
    }],
  },
  {
    ...core("golem-forge"), type: "spell", cost: 4, rarity: "rare", collectible: true,
    abilities: [{ id: "cast", trigger: { on: "play" }, effects: [{ type: "summon", card: "scrap-golem", count: 2 }] }],
  },
  {
    ...core("toad-hex"), type: "spell", cost: 4, rarity: "rare", collectible: true,
    abilities: [{
      id: "cast", trigger: { on: "play" }, target: { group: "allMobs" },
      effects: [{ type: "transform", to: { kind: "chosen" }, card: "toad" }],
    }],
  },
  {
    ...core("raise-dead"), type: "spell", cost: 4, rarity: "rare", collectible: true,
    abilities: [{
      id: "cast", trigger: { on: "play" },
      effects: [{ type: "resurrect", side: "friendly", count: 2, filter: { tribe: "undead" } }],
    }],
  },
  {
    ...core("arcane-echo"), type: "spell", cost: 2, rarity: "rare", collectible: true,
    abilities: [{
      id: "cast", trigger: { on: "play" }, target: { group: "allMobs" },
      effects: [{ type: "copyToHand", to: { kind: "chosen" } }],
    }],
  },
  {
    ...core("phoenix-chick"), type: "mob", cost: 3, rarity: "rare", collectible: true,
    attack: 2, health: 1, tribes: ["elemental"], keywords: { reborn: true },
    abilities: [{
      id: "ignite", trigger: { on: "summoned" },
      effects: [{ type: "damage", amount: 1, to: { kind: "random", group: "enemyCharacters", count: 1 } }],
    }],
  },
  // ── Mágica ──
  {
    ...core("larval-drake"), type: "mob", cost: 2, rarity: "magic", collectible: true,
    attack: 1, health: 3, tribes: ["dragon"], keywords: {},
    abilities: [{
      id: "evolve", trigger: { on: "turnStart", whose: "own" },
      effects: [{ type: "transform", to: { kind: "self" }, card: "ash-drake" }],
    }],
  },
  {
    ...core("iron-colossus"), type: "mob", cost: 7, rarity: "magic", collectible: true,
    attack: 7, health: 7, tribes: ["construct"], keywords: { taunt: true, shield: 3 }, abilities: [],
  },
  {
    ...core("mind-thrall"), type: "spell", cost: 9, rarity: "magic", collectible: true,
    abilities: [{
      id: "cast", trigger: { on: "play" }, target: { group: "enemyMobs" },
      effects: [{ type: "changeControl", to: { kind: "chosen" } }],
    }],
  },
  {
    ...core("mana-leech"), type: "mob", cost: 3, rarity: "magic", collectible: true,
    attack: 2, health: 3, tribes: ["demon"], keywords: {},
    abilities: [{ id: "battlecry", trigger: { on: "play" }, effects: [{ type: "modifyMana", side: "enemy", max: -1 }] }],
  },
  {
    ...core("soul-thief"), type: "mob", cost: 3, rarity: "magic", collectible: true,
    attack: 2, health: 3, tribes: ["human"], keywords: {},
    abilities: [{ id: "battlecry", trigger: { on: "play" }, effects: [{ type: "stealFromHand", count: 1 }] }],
  },
  // ── Legendaria ──
  {
    ...core("vaelra"), type: "mob", cost: 8, rarity: "legendary", collectible: true,
    attack: 6, health: 7, tribes: ["dragon"], keywords: { flying: true },
    abilities: [{
      id: "battlecry", trigger: { on: "play" },
      effects: [
        { type: "applyStatus", to: { kind: "all", group: "enemyMobs" }, status: "freeze", duration: 1 },
        { type: "damage", amount: 2, to: { kind: "hero", side: "enemy" } },
      ],
    }],
  },
  // ── Única ──
  {
    ...core("nyxara"), type: "mob", cost: 9, rarity: "unique", collectible: true,
    attack: 6, health: 6, tribes: ["demon"], keywords: { stealth: true, lifesteal: 6 },
    abilities: [{ id: "battlecry", trigger: { on: "play" }, effects: [{ type: "silence", to: { kind: "all", group: "enemyMobs" } }] }],
  },
];
