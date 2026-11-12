import { describe, expect, it } from "vitest";
import type { LegalActions } from "../engine/types";
import { canCast, currentTargets, IDLE, interactionReducer, type Interaction } from "./interaction";

// c1 mob (no target), c2 mob with targeted Grito (targets), c3 targeted spell, c4 untargeted spell, c5 not playable.
// Units: u1 can attack (taunt forces e1), u2 can attack anything; e1 enemy taunt, h1 enemy hero.
const LEGAL: LegalActions = {
  mulligan: false,
  play: {
    c1: { needsPosition: true, targets: null, targetRequired: false },
    c2: { needsPosition: true, targets: ["e1", "h1"], targetRequired: true },
    c3: { needsPosition: false, targets: ["e1", "u1"], targetRequired: true },
    c4: { needsPosition: false, targets: null, targetRequired: false },
    c6: { needsPosition: true, targets: [], targetRequired: false }, // targeted Grito with no valid target
  },
  attacks: { u1: ["e1"], u2: ["e1", "h1"] },
  endTurn: true,
};

const run = (inputs: Parameters<typeof interactionReducer>[1][], legal: LegalActions | null = LEGAL) => {
  let state: Interaction = IDLE;
  let last: ReturnType<typeof interactionReducer> = { state };
  for (const input of inputs) {
    last = interactionReducer(state, input, legal);
    state = last.state;
  }
  return last;
};

describe("interactionReducer (tap mode, §17.7)", () => {
  it("tapping an unplayable card does nothing", () => {
    expect(run([{ t: "tapHandCard", iid: "c5", kind: "mob" }])).toEqual({ state: IDLE });
  });

  it("nothing is selectable when legal is null (foe's turn)", () => {
    expect(run([{ t: "tapHandCard", iid: "c1", kind: "mob" }], null)).toEqual({ state: IDLE });
    expect(run([{ t: "tapEntity", id: "u1" }], null)).toEqual({ state: IDLE });
  });

  it("mob → slot → play with position", () => {
    const sel = run([{ t: "tapHandCard", iid: "c1", kind: "mob" }]);
    expect(sel.state).toEqual({ mode: "cardSelected", card: "c1", position: null });
    const r = run([{ t: "tapHandCard", iid: "c1", kind: "mob" }, { t: "tapSlot", index: 2 }]);
    expect(r).toEqual({ state: IDLE, command: { t: "play", card: "c1", position: 2 } });
  });

  it("mob with a targeted Grito → slot → target → play with position and target", () => {
    const afterSlot = run([{ t: "tapHandCard", iid: "c2", kind: "mob" }, { t: "tapSlot", index: 0 }]);
    expect(afterSlot.state).toEqual({ mode: "awaitingTarget", card: "c2", position: 0, targets: ["e1", "h1"] });
    expect(afterSlot.command).toBeUndefined();
    expect(canCast(afterSlot.state)).toBe(false);
    const r = interactionReducer(afterSlot.state, { t: "tapEntity", id: "h1" }, LEGAL);
    expect(r).toEqual({ state: IDLE, command: { t: "play", card: "c2", position: 0, target: "h1" } });
  });

  it("mob whose targeted Grito has no valid target is played straight away", () => {
    expect(run([{ t: "tapHandCard", iid: "c6", kind: "mob" }, { t: "tapSlot", index: 1 }])).toEqual({
      state: IDLE,
      command: { t: "play", card: "c6", position: 1 },
    });
  });

  it("targeted spell → target → play with target (no position)", () => {
    const sel = run([{ t: "tapHandCard", iid: "c3", kind: "spell" }]);
    expect(currentTargets(sel.state)).toEqual(["e1", "u1"]);
    expect(canCast(sel.state)).toBe(false);
    expect(run([{ t: "tapHandCard", iid: "c3", kind: "spell" }, { t: "tapCast" }]).command).toBeUndefined();
    expect(run([{ t: "tapHandCard", iid: "c3", kind: "spell" }, { t: "tapEntity", id: "u1" }])).toEqual({
      state: IDLE,
      command: { t: "play", card: "c3", target: "u1" },
    });
  });

  it("untargeted spell → tapCast → play", () => {
    const sel = run([{ t: "tapHandCard", iid: "c4", kind: "spell" }]);
    expect(canCast(sel.state)).toBe(true);
    expect(run([{ t: "tapHandCard", iid: "c4", kind: "spell" }, { t: "tapCast" }])).toEqual({ state: IDLE, command: { t: "play", card: "c4" } });
  });

  it("attacker → target → attack; Provocar limits the targets", () => {
    const sel = run([{ t: "tapEntity", id: "u1" }]);
    expect(sel.state).toEqual({ mode: "attackerSelected", attacker: "u1", targets: ["e1"] });
    expect(run([{ t: "tapEntity", id: "u1" }, { t: "tapEntity", id: "e1" }])).toEqual({
      state: IDLE,
      command: { t: "attack", attacker: "u1", target: "e1" },
    });
    // Tapping another ready unit switches the attacker; tapping the attacker again cancels.
    expect(run([{ t: "tapEntity", id: "u1" }, { t: "tapEntity", id: "u2" }]).state).toEqual({
      mode: "attackerSelected",
      attacker: "u2",
      targets: ["e1", "h1"],
    });
    expect(run([{ t: "tapEntity", id: "u1" }, { t: "tapEntity", id: "u1" }]).state).toEqual(IDLE);
    // A unit that cannot attack is not selectable.
    expect(run([{ t: "tapEntity", id: "e1" }])).toEqual({ state: IDLE });
  });

  it("cancel resets from every mode; tapping the selected card again cancels", () => {
    for (const first of [
      { t: "tapHandCard", iid: "c1", kind: "mob" },
      { t: "tapHandCard", iid: "c3", kind: "spell" },
      { t: "tapEntity", id: "u2" },
    ] as const) {
      expect(run([first, { t: "cancel" }])).toEqual({ state: IDLE });
    }
    expect(run([{ t: "tapHandCard", iid: "c3", kind: "spell" }, { t: "tapHandCard", iid: "c3", kind: "spell" }])).toEqual({ state: IDLE });
    // Selecting another playable card switches.
    expect(run([{ t: "tapHandCard", iid: "c3", kind: "spell" }, { t: "tapHandCard", iid: "c1", kind: "mob" }]).state).toEqual({
      mode: "cardSelected",
      card: "c1",
      position: null,
    });
  });

  it("tapping a non-target while awaiting a target keeps the state (with an invalid_target hint)", () => {
    const sel = run([{ t: "tapHandCard", iid: "c3", kind: "spell" }]);
    const r = interactionReducer(sel.state, { t: "tapEntity", id: "h1" }, LEGAL);
    expect(r).toEqual({ state: sel.state, hint: "invalid_target" });
    const att = run([{ t: "tapEntity", id: "u1" }]);
    expect(interactionReducer(att.state, { t: "tapEntity", id: "h1" }, LEGAL)).toEqual({ state: att.state, hint: "invalid_target" });
    // A slot tap while a spell awaits a target is ignored too.
    expect(interactionReducer(sel.state, { t: "tapSlot", index: 0 }, LEGAL)).toEqual({ state: sel.state });
  });

  it("viewChanged: a card that is no longer legal → idle; still legal → kept with refreshed targets", () => {
    const sel = run([{ t: "tapHandCard", iid: "c3", kind: "spell" }]).state;
    const gone: LegalActions = { ...LEGAL, play: { c1: LEGAL.play.c1 } };
    expect(interactionReducer(sel, { t: "viewChanged", legal: gone }, gone).state).toEqual(IDLE);
    expect(interactionReducer(sel, { t: "viewChanged", legal: null }, null).state).toEqual(IDLE);
    const fewer: LegalActions = { ...LEGAL, play: { ...LEGAL.play, c3: { needsPosition: false, targets: ["u1"], targetRequired: true } } };
    expect(interactionReducer(sel, { t: "viewChanged", legal: fewer }, fewer).state).toEqual({
      mode: "awaitingTarget",
      card: "c3",
      position: null,
      targets: ["u1"],
    });
    const att = run([{ t: "tapEntity", id: "u1" }]).state;
    const noAttacks: LegalActions = { ...LEGAL, attacks: {} };
    expect(interactionReducer(att, { t: "viewChanged", legal: noAttacks }, noAttacks).state).toEqual(IDLE);
    expect(interactionReducer(IDLE, { t: "viewChanged", legal: LEGAL }, LEGAL).state).toEqual(IDLE);
  });
});
