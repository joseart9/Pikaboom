import { describe, expect, it } from "vitest";
import { CATALOG } from "../catalog";
import type { CardDef, CardId } from "../catalog/types";
import { act, eventsOf, eventTypes, handIds, makeState, unitAt, type SideSpec, type UnitSpec } from "../testing/fixtures";
import { EngineError } from "./errors";
import { getLegalActions } from "./legal";
import { rngInt, seedToRng, type RngState } from "./rng";
import { getAttack, getHealth, getMaxHealth } from "./stats";
import type { MatchState, Seat } from "./types";

function mob(attack: number, health: number, extra: Omit<UnitSpec, "defId" | "attack" | "health"> = {}): UnitSpec {
  return { defId: "test-1-1", attack, health, ...extra };
}

function iidOf(s: MatchState, defId: CardId, seat: Seat = s.turn.activeSeat): string {
  const c = s.players[seat].hand.find((h) => h.defId === defId);
  if (!c) throw new Error(`${defId} not in hand`);
  return c.iid;
}

function play(s: MatchState, defId: CardId, extra: { target?: string; position?: number } = {}) {
  return act(s, s.turn.activeSeat, { t: "play", card: iidOf(s, defId), ...extra });
}

const boardIds = (s: MatchState, seat: Seat) => s.players[seat].board.map((u) => u.defId);

describe("spells (Phase 6 rows)", () => {
  it("row 1: arcane-spark on the enemy hero → 28; SPELL_CAST", () => {
    const s = makeState({ p0: { hand: ["arcane-spark"] } });
    const card = iidOf(s, "arcane-spark");
    const r = play(s, "arcane-spark", { target: "h1" });
    expect(r.state.players[1].hero.health).toBe(28);
    expect(eventTypes(r.events)).toEqual(["CARD_PLAYED", "MANA_CHANGED", "DAMAGE", "SPELL_CAST"]);
    expect(eventsOf(r.events, "DAMAGE")[0]).toMatchObject({ source: card, target: "h1", kind: "effect", dealt: 2 });
    expect(eventsOf(r.events, "CARD_PLAYED")[0]).toMatchObject({ target: "h1", position: null });
    expect(r.state.players[0].hand).toHaveLength(0);
    expect(r.state.players[0].graveyard).toHaveLength(0); // spells go nowhere
    expect(r.state.players[0].turnCounters).toEqual({ cardsPlayed: 1, spellsCast: 1, mobsPlayed: 0 });
  });

  it("row 2: arcane-spark pierces Escudo(2): 1/3 → health 1, charges still 2", () => {
    const s = makeState({ p0: { hand: ["arcane-spark"] }, p1: { board: [mob(1, 3, { keywords: { shield: 2 } })] } });
    const r = play(s, "arcane-spark", { target: unitAt(s, 1, 0).iid });
    expect(getHealth(unitAt(r.state, 1, 0))).toBe(1);
    expect(unitAt(r.state, 1, 0).shieldCharges).toBe(2);
  });

  it("row 3: bone-storm hits all enemy mobs simultaneously; one death step", () => {
    const s = makeState({ p0: { hand: ["bone-storm"] }, p1: { board: [mob(2, 2), mob(3, 3), mob(1, 5)] } });
    const r = play(s, "bone-storm");
    expect(r.state.players[1].board.map(getHealth)).toEqual([1, 3]);
    const dmg = eventsOf(r.events, "DAMAGE");
    expect(dmg).toHaveLength(3);
    expect(new Set(dmg.map((d) => d.step)).size).toBe(1);
    expect(eventsOf(r.events, "MOB_DESTROYED")).toHaveLength(1);
    expect(r.state.players[0].hero.health).toBe(30); // mobs only
  });

  it("row 4: soul-harvest only targets enemy mobs with ≤ 3 attack", () => {
    const s = makeState({ p0: { hand: ["soul-harvest"] }, p1: { board: [mob(4, 4), mob(3, 9)] } });
    expect(() => play(s, "soul-harvest", { target: unitAt(s, 1, 0).iid })).toThrow("invalid_target");
    const r = play(s, "soul-harvest", { target: unitAt(s, 1, 1).iid });
    expect(r.state.players[1].board.map((u) => u.iid)).toEqual([unitAt(s, 1, 0).iid]);
    expect(eventsOf(r.events, "MOB_DESTROYED")).toHaveLength(1);
  });

  it("soul-harvest with no valid target is unplayable (no_valid_targets) and not listed", () => {
    const s = makeState({ p0: { hand: ["soul-harvest"] }, p1: { board: [mob(4, 4)] } });
    expect(() => play(s, "soul-harvest", { target: unitAt(s, 1, 0).iid })).toThrow("no_valid_targets");
    expect(getLegalActions(s, 0).play).toEqual({});
  });

  it("row 5: necromancer at the end of [a, b] → [a, b, necro, skel, skel]", () => {
    const s = makeState({ p0: { hand: ["necromancer"], board: ["test-1-1", "test-2-3"] } });
    const r = play(s, "necromancer");
    expect(boardIds(r.state, 0)).toEqual(["test-1-1", "test-2-3", "necromancer", "skeleton", "skeleton"]);
    const summons = eventsOf(r.events, "MOB_SUMMONED");
    expect(summons.map((e) => [e.cause, e.index, e.sourceId])).toEqual([
      ["play", 2, null],
      ["effect", 3, iidOf(s, "necromancer")],
      ["effect", 4, iidOf(s, "necromancer")],
    ]);
    expect(eventsOf(r.events, "TRIGGER_ACTIVATED")).toMatchObject([{ abilityId: "battlecry", defId: "necromancer" }]);
    expect(unitAt(r.state, 0, 3).summonedTurn).toBe(s.turn.number); // tokens are summoning sick
  });

  it("row 6: board of 5 + necromancer → necro is 6th, both skeletons fizzle", () => {
    const s = makeState({ p0: { hand: ["necromancer"], board: Array(5).fill("test-1-1") } });
    const r = play(s, "necromancer");
    expect(r.state.players[0].board).toHaveLength(6);
    expect(eventsOf(r.events, "SUMMON_FIZZLED")).toMatchObject([{ seat: 0, defId: "skeleton", count: 2 }]);
  });

  it("row 7: skeleton-king with 5 others fills the board to 10 (Desborde)", () => {
    const s = makeState({ p0: { hand: ["skeleton-king"], board: Array(5).fill("test-1-1") } });
    const r = play(s, "skeleton-king");
    expect(r.state.players[0].board).toHaveLength(10);
    expect(eventsOf(r.events, "SUMMON_FIZZLED")).toEqual([]);
  });

  it("row 8: with ≥ 6 units after overflow, mobs cannot be played from hand", () => {
    let s = makeState({ p0: { hand: ["skeleton-king", "test-1-1", "arcane-spark"], board: Array(5).fill("test-1-1") } });
    s = play(s, "skeleton-king").state;
    expect(() => play(s, "test-1-1")).toThrow("board_full");
    expect(Object.keys(getLegalActions(s, 0).play)).toEqual([iidOf(s, "arcane-spark")]);
  });

  it("row 9: morvath destroys every other mob; 7 MOB_DESTROYED in one death step", () => {
    const s = makeState({ p0: { hand: ["morvath"], board: Array(3).fill("test-1-1") }, p1: { board: Array(4).fill("test-2-3") } });
    const r = play(s, "morvath");
    expect(boardIds(r.state, 0)).toEqual(["morvath"]);
    expect(r.state.players[1].board).toHaveLength(0);
    const deaths = eventsOf(r.events, "MOB_DESTROYED");
    expect(deaths).toHaveLength(7);
    expect(new Set(deaths.map((d) => d.step)).size).toBe(1);
    expect(deaths.map((d) => d.seat)).toEqual([0, 0, 0, 1, 1, 1, 1]); // board order, active seat first
  });

  it("row 10: wild-roar gives each friendly mob +1/+1 (max and current health)", () => {
    const s = makeState({ p0: { hand: ["wild-roar"], board: [mob(1, 3, { damage: 1 }), mob(2, 2), mob(0, 4)] }, p1: { board: [mob(1, 1)] } });
    const r = play(s, "wild-roar");
    expect(r.state.players[0].board.map((u) => [getAttack(u), getHealth(u), getMaxHealth(u)])).toEqual([
      [2, 3, 4],
      [3, 3, 3],
      [1, 5, 5],
    ]);
    expect(getAttack(unitAt(r.state, 1, 0))).toBe(1);
    expect(eventsOf(r.events, "STATS_CHANGED")).toHaveLength(3);
    expect(unitAt(r.state, 0, 0).modifiers).toEqual([{ attack: 1, health: 1, expires: "never", sourceId: iidOf(s, "wild-roar") }]);
  });

  it("row 11: savage-strike gives +3 attack this turn only", () => {
    const s = makeState({ p0: { hand: ["savage-strike"], board: [mob(2, 2)] } });
    let r = play(s, "savage-strike", { target: unitAt(s, 0, 0).iid });
    expect(getAttack(unitAt(r.state, 0, 0))).toBe(5);
    r = act(r.state, 0, { t: "endTurn" });
    expect(getAttack(unitAt(r.state, 0, 0))).toBe(2);
  });

  it("row 12: drain-life on an enemy unit: unit −2, hero 25 → 27", () => {
    const s = makeState({ p0: { hand: ["drain-life"], health: 25 }, p1: { board: [mob(1, 5)] } });
    const r = play(s, "drain-life", { target: unitAt(s, 1, 0).iid });
    expect(getHealth(unitAt(r.state, 1, 0))).toBe(3);
    expect(r.state.players[0].hero.health).toBe(27);
  });

  it("drain-life cannot target its own hero (enemyCharacters)", () => {
    const s = makeState({ p0: { hand: ["drain-life"], health: 25 } });
    expect(() => play(s, "drain-life", { target: "h0" })).toThrow("invalid_target");
    expect(() => play(s, "drain-life")).toThrow("target_required");
    expect(play(s, "drain-life", { target: "h1" }).state.players[1].hero.health).toBe(28);
  });

  it("row 13: mana-spark at 0/3 gives 1 temporary mana, spendable now, gone at end of turn", () => {
    const s = makeState({ p0: { hand: ["mana-spark", "test-1-1"], mana: 0, maxMana: 3 } });
    let r = play(s, "mana-spark");
    expect(r.state.players[0].mana).toMatchObject({ current: 0, max: 3, temporary: 1 });
    const unspent = act(r.state, 0, { t: "endTurn" });
    expect(unspent.state.players[0].mana.temporary).toBe(0);
    r = play(r.state, "test-1-1");
    expect(r.state.players[0].mana).toMatchObject({ current: 0, temporary: 0 });
    expect(boardIds(r.state, 0)).toEqual(["test-1-1"]);
  });

  it("row 14: growing-crystal at 2/2 → max 3, current 0", () => {
    const s = makeState({ p0: { hand: ["growing-crystal"], mana: 2 } });
    const r = play(s, "growing-crystal");
    expect(r.state.players[0].mana).toMatchObject({ current: 0, max: 3 });
  });

  it("row 15: full hand — scholar draws to 10; arcane-insight draws to 10 then burns", () => {
    const filler: CardId[] = Array(9).fill("test-1-1");
    const s1 = makeState({ p0: { hand: ["scholar", ...filler], deck: ["squire", "squire"] } });
    const r1 = play(s1, "scholar");
    expect(r1.state.players[0].hand).toHaveLength(10);
    expect(eventsOf(r1.events, "CARD_DRAWN")).toHaveLength(1);

    const s2 = makeState({ p0: { hand: ["arcane-insight", ...filler], deck: ["squire", "stone-golem"] } });
    const r2 = play(s2, "arcane-insight");
    expect(r2.state.players[0].hand).toHaveLength(10);
    expect(handIds(r2.state, 0).at(-1)).toBe("squire");
    expect(eventsOf(r2.events, "CARD_BURNED")).toMatchObject([{ seat: 0, defId: "stone-golem" }]);
    expect(r2.state.players[0].deck).toHaveLength(0);
  });

  it("row 16: storm-weaver vs 1 enemy unit + hero hits each exactly once", () => {
    const s = makeState({ p0: { hand: ["storm-weaver"] }, p1: { board: [mob(1, 9)] } });
    const r = play(s, "storm-weaver");
    const targets = eventsOf(r.events, "DAMAGE").map((d) => d.target).sort();
    expect(targets).toEqual(["h1", unitAt(s, 1, 0).iid].sort());
    expect(r.state.players[1].hero.health).toBe(28);
    expect(getHealth(unitAt(r.state, 1, 0))).toBe(7);
  });

  it("storm-weaver picks 3 distinct targets when more exist, never friendly ones", () => {
    for (const seed of ["11111111111111111111111111111111", "22222222222222222222222222222222", "33333333333333333333333333333333"]) {
      const s = makeState({ seed, p0: { hand: ["storm-weaver"], board: [mob(1, 9)] }, p1: { board: [mob(1, 9), mob(1, 9), mob(1, 9)] } });
      const targets = eventsOf(play(s, "storm-weaver").events, "DAMAGE").map((d) => d.target);
      expect(new Set(targets).size).toBe(3);
      expect(targets).not.toContain(unitAt(s, 0, 0).iid);
      expect(targets).not.toContain("h0");
    }
  });

  it("row 17: chain-lightning: A −3, the two others −2, never A twice", () => {
    const s = makeState({ p0: { hand: ["chain-lightning"] }, p1: { board: [mob(1, 9), mob(1, 9), mob(1, 9)] } });
    const a = unitAt(s, 1, 1).iid;
    const r = play(s, "chain-lightning", { target: a });
    expect(r.state.players[1].board.map(getHealth)).toEqual([7, 6, 7]);
    expect(eventsOf(r.events, "DAMAGE").filter((d) => d.target === a)).toHaveLength(1);
  });

  it("chain-lightning with 4 enemy units hits exactly two random others", () => {
    for (const seed of ["44444444444444444444444444444444", "55555555555555555555555555555555"]) {
      const s = makeState({ seed, p0: { hand: ["chain-lightning"] }, p1: { board: [mob(1, 9), mob(1, 9), mob(1, 9), mob(1, 9)] } });
      const a = unitAt(s, 1, 0).iid;
      const dmg = eventsOf(play(s, "chain-lightning", { target: a }).events, "DAMAGE");
      expect(dmg[0]).toMatchObject({ target: a, amount: 3 });
      const rest = dmg.slice(1).map((d) => d.target);
      expect(rest).toHaveLength(2);
      expect(new Set(rest).size).toBe(2);
      expect(rest).not.toContain(a);
    }
  });

  it("row 18: apprentice-mage needs a target only when enemy mobs exist", () => {
    const empty = makeState({ p0: { hand: ["apprentice-mage"] } });
    const r = play(empty, "apprentice-mage");
    expect(boardIds(r.state, 0)).toEqual(["apprentice-mage"]);
    expect(eventsOf(r.events, "DAMAGE")).toEqual([]); // the Grito de Guerra fizzles
    expect(getLegalActions(empty, 0).play[iidOf(empty, "apprentice-mage")]).toEqual({ needsPosition: false, targets: [], targetRequired: false });
    expect(() => play(empty, "apprentice-mage", { target: "h1" })).toThrow("invalid_target");

    const withFoe = makeState({ p0: { hand: ["apprentice-mage"] }, p1: { board: [mob(1, 3)] } });
    expect(() => play(withFoe, "apprentice-mage")).toThrow("target_required");
    expect(() => play(withFoe, "apprentice-mage", { target: "h1" })).toThrow("invalid_target");
    const ok = play(withFoe, "apprentice-mage", { target: unitAt(withFoe, 1, 0).iid });
    expect(getHealth(unitAt(ok.state, 1, 0))).toBe(2);
  });

  it("row 19: random effects are deterministic for the same seed and commands", () => {
    const build = () =>
      makeState({ seed: "abcdefabcdefabcdefabcdefabcdef01", p0: { hand: ["storm-weaver", "chain-lightning"] }, p1: { board: [mob(1, 9), mob(1, 9), mob(1, 9), mob(1, 9)] } });
    const run = () => {
      let s = build();
      const events = [];
      let r = play(s, "storm-weaver");
      events.push(...r.events);
      s = r.state;
      r = play(s, "chain-lightning", { target: unitAt(s, 1, 0).iid });
      events.push(...r.events);
      return { state: r.state, events };
    };
    const a = run();
    const b = run();
    expect(b.state).toEqual(a.state);
    expect(b.events).toEqual(a.events);
  });
});

describe("play abilities & targeting edge cases", () => {
  it("untargeted spell with a target → unexpected_target", () => {
    const s = makeState({ p0: { hand: ["bone-storm"] } });
    expect(() => play(s, "bone-storm", { target: "h1" })).toThrow("unexpected_target");
  });

  it("a Grito de Guerra summon fizzles when the new mob fills the board to 6", () => {
    const s = makeState({ p0: { hand: ["grave-digger"], board: Array(5).fill("test-1-1") } });
    const r = play(s, "grave-digger");
    expect(r.state.players[0].board).toHaveLength(6);
    expect(eventsOf(r.events, "SUMMON_FIZZLED")).toMatchObject([{ defId: "skeleton", count: 1 }]);
  });

  it("spell summons go to the right end (pack-call)", () => {
    const s = makeState({ p0: { hand: ["pack-call"], board: ["test-1-1"] } });
    const r = play(s, "pack-call");
    expect(boardIds(r.state, 0)).toEqual(["test-1-1", "wolf", "wolf"]);
    expect(eventsOf(r.events, "MOB_SUMMONED").map((e) => e.sourceId)).toEqual([iidOf(s, "pack-call"), iidOf(s, "pack-call")]);
  });

  it("ursaria summons two Embestida cubs to its right that may attack mobs at once", () => {
    const s = makeState({ p0: { hand: ["ursaria"], board: ["test-1-1"] }, p1: { board: [mob(1, 9)] } });
    const r = play(s, "ursaria", { position: 0 });
    expect(boardIds(r.state, 0)).toEqual(["ursaria", "bear-cub", "bear-cub", "test-1-1"]);
    expect(getLegalActions(r.state, 0).attacks[unitAt(r.state, 0, 1).iid]).toEqual([unitAt(r.state, 1, 0).iid]);
  });

  it("an earlier effect that makes the chosen unit lethal makes later `chosen` effects fizzle", () => {
    const s = makeState({ p0: { hand: ["test-1-1"] }, p1: { board: [mob(1, 2)] } });
    const def: CardDef = {
      id: "test-dmg-heal", version: 1, type: "spell", set: "core", cost: 1, rarity: "common", collectible: false, art: "x",
      abilities: [{
        id: "cast", trigger: { on: "play" }, target: { group: "enemyMobs" },
        effects: [
          { type: "damage", amount: 2, to: { kind: "chosen" } },
          { type: "heal", amount: 5, to: { kind: "chosen" } },
        ],
      }],
    };
    s.defs[def.id] = def;
    s.players[0].hand[0] = { iid: "c50", defId: def.id, costMod: 0 };
    const r = act(s, 0, { t: "play", card: "c50", target: unitAt(s, 1, 0).iid });
    expect(eventsOf(r.events, "HEAL")).toEqual([]);
    expect(r.state.players[1].board).toHaveLength(0);
  });

  it("ignis hits every enemy character for 3; lethal damage ends the game", () => {
    const s = makeState({ p0: { hand: ["ignis"] }, p1: { health: 3, board: [mob(1, 5), mob(1, 2)] } });
    const r = play(s, "ignis");
    expect(eventsOf(r.events, "DAMAGE").map((d) => d.target)).toEqual([unitAt(s, 1, 0).iid, unitAt(s, 1, 1).iid, "h1"]);
    expect(r.state).toMatchObject({ phase: "finished", winner: 0, endReason: "hero_destroyed" });
  });

  it("dawn-paladin heals its hero; healing-touch heals a friendly character; flame-lance may hit own mobs", () => {
    const s = makeState({ p0: { health: 20, hand: ["dawn-paladin", "healing-touch", "flame-lance"], board: [mob(1, 9, { damage: 6 })] } });
    let r = play(s, "dawn-paladin");
    expect(r.state.players[0].hero.health).toBe(23);
    r = play(r.state, "healing-touch", { target: unitAt(s, 0, 0).iid });
    expect(getHealth(unitAt(r.state, 0, 0))).toBe(7);
    expect(() => play(s, "healing-touch", { target: "h1" })).toThrow("invalid_target");
    r = play(r.state, "flame-lance", { target: unitAt(s, 0, 0).iid });
    expect(getHealth(unitAt(r.state, 0, 0))).toBe(2);
  });
});

describe("every catalog play ability resolves", () => {
  const withPlay = Object.values(CATALOG).filter((d) => d.abilities.some((a) => a.trigger.on === "play"));

  it.each(withPlay.map((d) => [d.id, d] as const))("%s", (_id, def) => {
    const s = makeState({
      p0: { hand: [def.id], board: [mob(2, 5, { damage: 2 }), mob(3, 3)], deck: ["squire", "squire", "squire"], health: 20 },
      p1: { board: [mob(2, 3), mob(4, 6), mob(1, 1)], deck: ["squire"] },
    });
    const card = s.players[0].hand[0].iid;
    const entry = getLegalActions(s, 0).play[card];
    expect(entry, "listed as playable").toBeDefined();
    const target = entry.targets?.[0];
    const r = act(s, 0, { t: "play", card, ...(target !== undefined ? { target } : {}) });
    const plays = def.abilities.filter((a) => a.trigger.on === "play").length;
    if (def.type === "spell") expect(eventsOf(r.events, "SPELL_CAST")).toHaveLength(1);
    else expect(eventsOf(r.events, "TRIGGER_ACTIVATED")).toHaveLength(plays);
    // Its effects produced at least one event beyond paying for and announcing the card
    // (mana cards emit a second MANA_CHANGED).
    const types = eventTypes(r.events);
    const manaEvents = types.filter((t) => t === "MANA_CHANGED").length;
    const effectEvents = types.filter((t) => !["CARD_PLAYED", "MANA_CHANGED", "SPELL_CAST", "TRIGGER_ACTIVATED", "MOB_SUMMONED"].includes(t));
    const summonedByEffect = eventsOf(r.events, "MOB_SUMMONED").filter((e) => e.cause === "effect").length;
    expect(effectEvents.length + summonedByEffect + Math.max(0, manaEvents - (def.cost > 0 ? 1 : 0))).toBeGreaterThan(0);
  });
});

describe("legal plays agree with applyCommand (property test)", () => {
  const POOL: CardId[] = [
    "test-1-1", "test-5-5", "test-spell-noop", "arcane-spark", "healing-touch", "apprentice-mage", "drain-life",
    "savage-strike", "soul-harvest", "chain-lightning", "flame-lance", "bone-storm", "necromancer", "mana-spark",
    "growing-crystal", "scholar", "skeleton-king",
  ];

  function randomSide(r: { rng: RngState }, withHand: boolean): SideSpec {
    const board = Array.from({ length: rngInt(r, 7) }, () => mob(rngInt(r, 6), 1 + rngInt(r, 6)));
    const hand = withHand ? Array.from({ length: 1 + rngInt(r, 5) }, () => POOL[rngInt(r, POOL.length)]) : [];
    return { board, hand, mana: rngInt(r, 11), deck: ["squire", "squire"] };
  }

  it("for 50 random states every listed (card, target) succeeds and every other choice fails", () => {
    const r = { rng: seedToRng("000000000000000000000000000ca4d5") };
    let accepted = 0;
    let rejected = 0;
    for (let n = 0; n < 50; n++) {
      const active = rngInt(r, 2) as Seat;
      const sides = [randomSide(r, active === 0), randomSide(r, active === 1)];
      const s = makeState({ active, p0: sides[0], p1: sides[1] });
      const legal = getLegalActions(s, active);
      const entities = [undefined, "h0", "h1", ...s.players[0].board.map((u) => u.iid), ...s.players[1].board.map((u) => u.iid)];
      for (const card of s.players[active].hand) {
        const entry = legal.play[card.iid];
        for (const target of entities) {
          const ok = !!entry && (target === undefined ? !entry.targetRequired : !!entry.targets?.includes(target));
          const run = () => act(s, active, { t: "play", card: card.iid, ...(target !== undefined ? { target } : {}) });
          const label = `state ${n} ${card.defId} → ${String(target)}`;
          if (ok) {
            expect(run, label).not.toThrow();
            accepted++;
          } else {
            expect(run, label).toThrow(EngineError);
            rejected++;
          }
        }
      }
    }
    expect(accepted).toBeGreaterThan(30);
    expect(rejected).toBeGreaterThan(30);
  });
});
