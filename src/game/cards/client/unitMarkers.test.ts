import { describe, expect, it } from "vitest";
import { CATALOG } from "../catalog";
import type { UnitSnapshot } from "../engine/events";
import { markerName, statDeltas, unitMarkers, visibleMarkers } from "./unitMarkers";

function unit(over: Partial<UnitSnapshot> = {}): UnitSnapshot {
  return {
    iid: "u1",
    defId: "stone-golem",
    controller: 0,
    attack: 0,
    health: 0,
    maxHealth: 0,
    keywords: {},
    shieldCharges: 0,
    statuses: [],
    silenced: false,
    sleeping: false,
    ...over,
  };
}

const ids = (u: UnitSnapshot) => unitMarkers(u).map((m) => `${m.kind}:${m.id}`);

describe("unitMarkers (UI-08)", () => {
  it("orders can't-act states, then blockers and Provocar, then harmful statuses, then other keywords", () => {
    const u = unit({
      keywords: { lifesteal: 2, taunt: true, divineShield: true, shield: 1 },
      shieldCharges: 1,
      statuses: [
        { id: "burn", magnitude: 2, expiresAfterTurn: 4 },
        { id: "freeze", magnitude: 0, expiresAfterTurn: 3 },
      ],
    });
    expect(ids(u)).toEqual(["status:freeze", "keyword:divineShield", "keyword:shield", "keyword:taunt", "status:burn", "keyword:lifesteal"]);
  });

  it("shows Escudo only while it has charges, with the count; magnitude only for statuses that have one", () => {
    const u = unit({ keywords: { shield: 2 }, shieldCharges: 0, statuses: [{ id: "freeze", magnitude: 3, expiresAfterTurn: 1 }, { id: "weakness", magnitude: 2, expiresAfterTurn: 1 }] });
    const m = unitMarkers(u);
    expect(m.find((x) => x.id === "shield")).toBeUndefined();
    expect(m.find((x) => x.id === "freeze")).toMatchObject({ magnitude: undefined, harmful: true });
    expect(m.find((x) => x.id === "weakness")).toMatchObject({ magnitude: 2, harmful: true });
    expect(unitMarkers(unit({ keywords: { shield: 2 }, shieldCharges: 2 }))[0]).toEqual({ kind: "keyword", id: "shield", value: 2 });
  });

  it("a silenced unit shows the Silencio marker instead of its keywords, but keeps statuses", () => {
    const u = unit({ silenced: true, keywords: { taunt: true }, statuses: [{ id: "blessing", magnitude: 1, expiresAfterTurn: 2 }] });
    expect(ids(u)).toEqual(["status:silenced", "status:blessing"]);
    expect(markerName(unitMarkers(u)[0])).toBeTruthy();
  });

  it("visibleMarkers keeps ≤ max slots and turns the last into +N", () => {
    const all = unitMarkers(unit({ keywords: { taunt: true, stealth: true, poison: true, flying: true } }));
    expect(visibleMarkers(all, 4)).toEqual({ shown: all, hidden: 0 });
    const v = visibleMarkers(all.slice(0, 3), 3);
    expect(v.hidden).toBe(0);
    const over = visibleMarkers(all, 3);
    expect(over.shown).toHaveLength(2);
    expect(over.hidden).toBe(2);
  });

  it("statDeltas compares live attack / max health with the printed card", () => {
    const def = CATALOG["stone-golem"];
    if (def?.type !== "mob") throw new Error("stone-golem should be a mob");
    expect(statDeltas(unit({ attack: def.attack + 2, maxHealth: def.health - 1 }), def)).toEqual({ attack: 2, health: -1 });
    expect(statDeltas(unit({ attack: def.attack, maxHealth: def.health }), def)).toEqual({ attack: 0, health: 0 });
    expect(statDeltas(unit(), undefined)).toEqual({ attack: 0, health: 0 });
  });
});
