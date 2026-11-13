import { describe, expect, it } from "vitest";
import { CATALOG } from "./index";
import { CARD_VISUALS, cardEntrance, effectElement, FX_ELEMENTS, HEAVY_COST, TRIBE_ELEMENT } from "./visuals";

describe("CARD_VISUALS (Phase 20 I)", () => {
  it("references only existing card ids, with known elements and entrances", () => {
    const unknown = Object.keys(CARD_VISUALS).filter((id) => !CATALOG[id]);
    expect(unknown).toEqual([]);
    for (const [id, v] of Object.entries(CARD_VISUALS)) {
      if (v?.element) expect(FX_ELEMENTS, id).toContain(v.element);
      if (v?.entrance) expect(["normal", "heavy", "cinematic"], id).toContain(v.entrance);
    }
    expect(Object.keys(CARD_VISUALS).length).toBeGreaterThan(30);
  });

  it("entrance defaults: Legendaria/Única → cinematic, cost ≥ 7 → heavy, else normal", () => {
    for (const def of Object.values(CATALOG)) {
      if (CARD_VISUALS[def.id]?.entrance) continue;
      const expected = def.rarity === "legendary" || def.rarity === "unique" ? "cinematic" : def.cost >= HEAVY_COST ? "heavy" : "normal";
      expect(cardEntrance(def), def.id).toBe(expected);
    }
    expect(["ignis", "morvath", "vaelra", "nyxara", "ursaria", "skeleton-king"].map((id) => cardEntrance(CATALOG[id]))).toEqual(Array(6).fill("cinematic"));
    expect(cardEntrance(CATALOG["iron-colossus"])).toBe("heavy");
    expect(cardEntrance(CATALOG.squire)).toBe("normal");
    expect(cardEntrance(undefined)).toBe("normal");
  });

  it("effect elements: explicit entry first, else the tribe's element, else null", () => {
    expect(effectElement(CATALOG["flame-lance"])).toBe("fire");
    expect(effectElement(CATALOG["frozen-gale"])).toBe("ice");
    expect(effectElement(CATALOG["chain-lightning"])).toBe("lightning");
    expect(effectElement(CATALOG["healing-touch"])).toBe("holy");
    expect(effectElement(CATALOG.skeleton)).toBe(TRIBE_ELEMENT.undead);
    expect(effectElement(CATALOG.wolf)).toBe(TRIBE_ELEMENT.beast);
    expect(effectElement(CATALOG.squire)).toBeNull(); // human: neutral
    expect(effectElement(undefined)).toBeNull();
    // Every damaging spell has a look (no spell falls back silently to the neutral default).
    const spells = Object.values(CATALOG).filter((d) => d.type === "spell" && d.abilities.some((a) => a.effects.some((e) => e.type === "damage")));
    expect(spells.filter((d) => effectElement(d) === null).map((d) => d.id)).toEqual([]);
  });
});
