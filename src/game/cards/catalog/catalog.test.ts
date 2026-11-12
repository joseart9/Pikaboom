import { describe, expect, it } from "vitest";
import { DECK_FORMATS } from "../config/deckRules";
import { validateDeck } from "../decks/validate";
import { es } from "../i18n/es";
import { BASIC_CARDS, CATALOG, COLLECTIBLE_CARDS, RARITIES, cardsByRarity, getDef, hasDef, isMob, isSpell } from "./index";
import { KEYWORDS } from "./keywords";
import { STARTER_DECKS, STARTER_DECK_IDS } from "./starterDecks";
import { STATUS_DEFS } from "./statuses";
import { MVP_EFFECT_TYPES, type CardDef, type EffectDef, type MobCardDef } from "./types";
import { validateCatalog } from "./validate";

// §20.2, transcribed: [id, type, cost, attack, health, rarity, tribe, collectible]. Spells use "-" for stats/tribe.
const TABLE: [string, "mob" | "spell", number, number | "-", number | "-", string, string, boolean][] = [
  ["squire", "mob", 1, 1, 2, "basic", "human", true],
  ["wolf-pup", "mob", 1, 1, 1, "basic", "beast", true],
  ["arcane-spark", "spell", 1, "-", "-", "basic", "-", true],
  ["healing-touch", "spell", 1, "-", "-", "basic", "-", true],
  ["shield-bearer", "mob", 2, 1, 3, "basic", "human", true],
  ["forest-boar", "mob", 2, 3, 2, "basic", "beast", true],
  ["iron-guard", "mob", 3, 2, 4, "basic", "human", true],
  ["stone-golem", "mob", 4, 3, 5, "basic", "construct", true],
  ["apprentice-mage", "mob", 2, 2, 2, "common", "human", true],
  ["restless-skeleton", "mob", 2, 2, 1, "common", "undead", true],
  ["vampire-bat", "mob", 2, 2, 2, "common", "undead", true],
  ["drain-life", "spell", 2, "-", "-", "common", "-", true],
  ["savage-strike", "spell", 1, "-", "-", "common", "-", true],
  ["grave-digger", "mob", 3, 2, 3, "common", "human", true],
  ["pack-call", "spell", 3, "-", "-", "common", "-", true],
  ["wild-roar", "spell", 3, "-", "-", "common", "-", true],
  ["scholar", "mob", 3, 2, 3, "common", "human", true],
  ["berserker-bear", "mob", 4, 3, 5, "common", "beast", true],
  ["charging-rhino", "mob", 4, 4, 2, "common", "beast", true],
  ["flame-lance", "spell", 4, "-", "-", "common", "-", true],
  ["arcane-insight", "spell", 3, "-", "-", "common", "-", true],
  ["bone-wall", "mob", 3, 1, 4, "rare", "undead", true],
  ["hungry-ghoul", "mob", 3, 3, 2, "rare", "undead", true],
  ["thornback-tortoise", "mob", 3, 1, 5, "rare", "beast", true],
  ["alpha-wolf", "mob", 3, 2, 3, "rare", "beast", true],
  ["soul-harvest", "spell", 3, "-", "-", "rare", "-", true],
  ["bone-storm", "spell", 4, "-", "-", "rare", "-", true],
  ["twin-claw-panther", "mob", 4, 3, 3, "rare", "beast", true],
  ["chain-lightning", "spell", 4, "-", "-", "rare", "-", true],
  ["dawn-paladin", "mob", 4, 3, 3, "rare", "human", true],
  ["necromancer", "mob", 5, 3, 4, "rare", "human", true],
  ["line-breaker", "mob", 5, 4, 4, "rare", "beast", true],
  ["swamp-ent", "mob", 5, 4, 5, "rare", "elemental", true],
  ["crypt-banshee", "mob", 4, 3, 3, "magic", "undead", true],
  ["growing-crystal", "spell", 2, "-", "-", "magic", "-", true],
  ["storm-weaver", "mob", 6, 4, 4, "magic", "elemental", true],
  ["last-stand-knight", "mob", 5, 4, 6, "magic", "human", true],
  ["morvath", "mob", 8, 6, 6, "legendary", "undead", true],
  ["ursaria", "mob", 7, 5, 7, "legendary", "beast", true],
  ["skeleton-king", "mob", 6, 4, 5, "legendary", "undead", true],
  ["ignis", "mob", 10, 8, 8, "unique", "dragon", true],
  ["skeleton", "mob", 1, 1, 1, "basic", "undead", false],
  ["wolf", "mob", 2, 2, 2, "basic", "beast", false],
  ["bear-cub", "mob", 2, 2, 2, "basic", "beast", false],
  ["mana-spark", "spell", 0, "-", "-", "basic", "-", false],
];

// §20.2 keywords per mob (everything not listed has none).
const KEYWORD_TABLE: Record<string, MobCardDef["keywords"]> = {
  "wolf-pup": { rush: true },
  "shield-bearer": { taunt: true },
  "iron-guard": { shield: 1 },
  "stone-golem": { taunt: true },
  "vampire-bat": { lifesteal: 2 },
  "berserker-bear": { berserk: { percent: 50, attack: 3 } },
  "charging-rhino": { charge: true },
  "bone-wall": { taunt: true, shield: 2 },
  "hungry-ghoul": { rush: true },
  "thornback-tortoise": { taunt: true, thorns: 2 },
  "twin-claw-panther": { doubleStrike: true },
  "dawn-paladin": { shield: 2 },
  "line-breaker": { cleave: true },
  "swamp-ent": { regeneration: 2 },
  ursaria: { taunt: true },
  ignis: { reborn: true },
  "bear-cub": { rush: true },
};

function allEffects(def: CardDef): EffectDef[] {
  const out: EffectDef[] = [];
  const walk = (effects: EffectDef[]) => {
    for (const e of effects) {
      out.push(e);
      if (e.type === "if") walk([...e.then, ...(e.else ?? [])]);
    }
  };
  for (const a of def.abilities) walk(a.effects);
  return out;
}

describe("catalog", () => {
  it("passes validateCatalog", () => {
    expect(validateCatalog(CATALOG, es.cards)).toEqual([]);
  });

  it("has 41 collectible cards and 4 tokens, split 8/13/12/4/3/1 by rarity", () => {
    const all = Object.values(CATALOG);
    expect(all.filter((d) => d.collectible)).toHaveLength(41);
    expect(all.filter((d) => !d.collectible).map((d) => d.id).sort()).toEqual(["bear-cub", "mana-spark", "skeleton", "wolf"]);
    expect(RARITIES.map((r) => cardsByRarity(r).length)).toEqual([8, 13, 12, 4, 3, 1]);
    expect(COLLECTIBLE_CARDS).toHaveLength(41);
    expect(BASIC_CARDS).toHaveLength(8);
  });

  it("matches the §20.2 table exactly (type, cost, stats, rarity, tribe, collectible, keywords)", () => {
    expect(Object.keys(CATALOG).sort()).toEqual(TABLE.map((r) => r[0]).sort());
    for (const [id, type, cost, attack, health, rarity, tribe, collectible] of TABLE) {
      const d = getDef(id);
      expect({ id, type: d.type, cost: d.cost, rarity: d.rarity, collectible: d.collectible }).toEqual({
        id, type, cost, rarity, collectible,
      });
      expect(d.version).toBe(1);
      expect(d.art).toBe(id);
      if (isMob(d)) {
        expect([d.attack, d.health, d.tribes], id).toEqual([attack, health, [tribe]]);
        expect(d.keywords, id).toEqual(KEYWORD_TABLE[id] ?? {});
      } else {
        expect(d.abilities, id).toHaveLength(1);
      }
    }
  });

  it("maps the interpreted ability notations as specified (Phase 3 G.3)", () => {
    expect(getDef("drain-life").abilities[0]).toEqual({
      id: "cast", trigger: { on: "play" }, target: { group: "enemyCharacters" },
      effects: [
        { type: "damage", amount: 2, to: { kind: "chosen" } },
        { type: "heal", amount: 2, to: { kind: "hero", side: "friendly" } },
      ],
    });
    expect(getDef("skeleton-king").abilities[0].effects).toEqual([{ type: "summon", card: "skeleton", count: 4, overflow: true }]);
    expect(getDef("last-stand-knight").abilities[0]).toMatchObject({
      trigger: { on: "healthThreshold", percent: 50 },
      effects: [
        { type: "grantKeyword", to: { kind: "self" }, keyword: "taunt" },
        { type: "buff", to: { kind: "self" }, attack: 2 },
      ],
    });
    expect(getDef("hungry-ghoul").abilities[0]).toEqual({
      id: "onKill", trigger: { on: "kill" }, effects: [{ type: "buff", to: { kind: "self" }, attack: 1, health: 1 }],
    });
    expect(getDef("crypt-banshee").abilities[0]).toMatchObject({
      trigger: { on: "otherDied", side: "friendly", filter: { tribe: "undead" } },
      effects: [{ type: "buff", to: { kind: "self" }, attack: 1, health: 1 }],
    });
    expect(getDef("necromancer").abilities.map((a) => a.trigger.on)).toEqual(["play", "death"]);
  });

  it("uses no V1-only keyword or effect", () => {
    for (const def of Object.values(CATALOG)) {
      if (isMob(def)) {
        for (const k of Object.keys(def.keywords)) expect(KEYWORDS[k as keyof typeof KEYWORDS].available, `${def.id}.${k}`).toBe("mvp");
      }
      for (const e of allEffects(def)) expect(MVP_EFFECT_TYPES, `${def.id}: ${e.type}`).toContain(e.type);
    }
  });

  it("has a Spanish name for every card and a text (possibly empty) for every card", () => {
    for (const def of Object.values(CATALOG)) {
      expect(es.cards[def.id]?.name, def.id).toBeTruthy();
      expect(typeof es.cards[def.id]?.text, def.id).toBe("string");
    }
  });

  it("exposes lookup helpers", () => {
    expect(hasDef("squire")).toBe(true);
    expect(hasDef("nope")).toBe(false);
    expect(hasDef("toString")).toBe(false);
    expect(() => getDef("nope")).toThrow(/Unknown card id/);
    expect(isMob(getDef("squire"))).toBe(true);
    expect(isSpell(getDef("arcane-spark"))).toBe(true);
    expect(Object.isFrozen(CATALOG)).toBe(true);
  });

  it("sorts COLLECTIBLE_CARDS by cost, then Spanish name", () => {
    for (let i = 1; i < COLLECTIBLE_CARDS.length; i++) {
      const [a, b] = [COLLECTIBLE_CARDS[i - 1], COLLECTIBLE_CARDS[i]];
      expect(a.cost <= b.cost, `${a.id} before ${b.id}`).toBe(true);
      if (a.cost === b.cost) expect(es.cards[a.id].name.localeCompare(es.cards[b.id].name, "es")).toBeLessThanOrEqual(0);
    }
  });
});

describe("registries", () => {
  it("has metadata and Spanish texts for every keyword", () => {
    expect(Object.keys(KEYWORDS)).toHaveLength(15);
    for (const [id, meta] of Object.entries(KEYWORDS)) {
      expect(meta.id).toBe(id);
      expect(es.keyword[id as keyof typeof es.keyword].name.length).toBeGreaterThan(0);
    }
    expect(Object.values(KEYWORDS).filter((k) => k.available === "v1").map((k) => k.id).sort()).toEqual(
      ["divineShield", "flying", "poison", "stealth"],
    );
  });

  it("has the §7.2 status defaults and Spanish texts", () => {
    expect(Object.fromEntries(Object.values(STATUS_DEFS).map((s) => [s.id, s.defaultDuration]))).toEqual({
      burn: 2, freeze: 1, stun: 1, weakness: 2, vulnerability: 2, curse: null, blessing: 2, disarm: 1, bleed: 2, immune: 1,
    });
    expect(Object.values(STATUS_DEFS).filter((s) => s.hasMagnitude).map((s) => s.id).sort()).toEqual(
      ["bleed", "blessing", "burn", "vulnerability", "weakness"],
    );
    for (const s of Object.values(STATUS_DEFS)) {
      expect(s.icon).toBe(s.id);
      expect(es.status[s.id].name.length).toBeGreaterThan(0);
    }
  });
});

describe("starter decks", () => {
  it.each(STARTER_DECK_IDS)("%s has 30 cards, is valid in play mode and contains no tokens", (id) => {
    const deck = STARTER_DECKS[id];
    expect(deck.entries.reduce((n, e) => n + e.count, 0)).toBe(30);
    expect(validateDeck(deck.entries, DECK_FORMATS.standard, null, "play")).toEqual([]);
    for (const e of deck.entries) expect(getDef(e.cardId).collectible, e.cardId).toBe(true); // §9.6 rule 11
    expect(es.starterDecks[deck.nameKey.split(".")[1] as keyof typeof es.starterDecks]).toBeTruthy();
  });

  it("leaves exactly the §20.3 pack-only cards out of both decks", () => {
    const inDecks = new Set(STARTER_DECK_IDS.flatMap((id) => STARTER_DECKS[id].entries.map((e) => e.cardId)));
    const packOnly = COLLECTIBLE_CARDS.filter((d) => !inDecks.has(d.id)).map((d) => d.id).sort();
    expect(packOnly).toEqual(
      ["arcane-insight", "chain-lightning", "crypt-banshee", "dawn-paladin", "growing-crystal", "ignis",
        "last-stand-knight", "scholar", "skeleton-king", "storm-weaver"].sort(),
    );
  });
});
