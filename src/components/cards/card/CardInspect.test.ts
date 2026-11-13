import { describe, expect, it } from "vitest";
import { CATALOG } from "@/game/cards/catalog";
import type { UnitSnapshot } from "@/game/cards/engine/events";
import { cardText } from "@/game/cards/i18n";
import { es } from "@/game/cards/i18n/es";
import { glossaryRows, statusTiming } from "./CardInspect";

describe("CardInspect glossary (Phase 12 G.6)", () => {
  it("every catalog card explains each of its keywords and every bold term in its text", () => {
    const problems: string[] = [];
    for (const def of Object.values(CATALOG)) {
      const rows = glossaryRows(def);
      const names = rows.map((r) => r.name);
      if (names.length !== new Set(names).size) problems.push(`${def.id}: duplicate glossary rows`);
      if (def.type === "mob") {
        for (const id of Object.keys(def.keywords) as (keyof typeof es.keyword)[]) {
          if (!names.includes(es.keyword[id].name)) problems.push(`${def.id}: keyword ${id} missing`);
        }
      }
      for (const m of cardText(def.id).matchAll(/\*\*([^*]+)\*\*/g)) {
        // "Renacer. Grito de Guerra:" → ["Renacer", "Grito de Guerra"]; "Escudo (2)" → "Escudo"
        for (const term of m[1].split(/[.:]/).map((s) => s.replace(/\(\d+\)/, "").trim()).filter(Boolean)) {
          // A term is explained by a row with that name, or by the status/Silencio row whose verb it is ("Congela").
          if (!rows.some((r) => r.name === term || r.verb === term)) problems.push(`${def.id}: "${term}" not explained`);
        }
      }
      for (const r of rows) if (r.text.includes("{n}")) problems.push(`${def.id}: unfilled {n} in ${r.name}`);
    }
    expect(problems).toEqual([]);
  });

  it("a unit uses its live keywords, Escudo charges, statuses and sleeping note; silenced units lose keywords", () => {
    const def = Object.values(CATALOG).find((d) => d.type === "mob" && d.keywords.shield !== undefined);
    if (!def || def.type !== "mob") throw new Error("catalog has no Escudo mob");
    const unit: UnitSnapshot = {
      iid: "u1",
      defId: def.id,
      controller: 0,
      attack: def.attack,
      health: def.health,
      maxHealth: def.health,
      keywords: { ...def.keywords, taunt: true },
      shieldCharges: 1,
      statuses: [{ id: "burn", magnitude: 2, expiresAfterTurn: null }],
      silenced: false,
      sleeping: true,
    };
    const rows = glossaryRows(def, unit);
    const shield = rows.find((r) => r.name === es.keyword.shield.name);
    expect(shield?.text).toBe(es.keyword.shield.text.replace("{n}", "1"));
    expect(rows.some((r) => r.name === es.keyword.taunt.name)).toBe(true);
    expect(rows.find((r) => r.kind === "status")?.text).toBe(es.status.burn.text.replace("{n}", "2"));
    expect(rows.some((r) => r.name === es.match.sleeping)).toBe(true);

    const silenced = glossaryRows(def, { ...unit, silenced: true, sleeping: false });
    expect(silenced.some((r) => r.kind === "keyword" && r.name === es.keyword.taunt.name)).toBe(false);
    expect(silenced.some((r) => r.name === es.inspect.silenced)).toBe(true);
  });

  it("status cards explain the statuses their text names, with the magnitude from the text (Phase 18)", () => {
    const rows = (id: string) => glossaryRows(CATALOG[id]);
    expect(rows("ember-imp").find((r) => r.kind === "status")).toMatchObject({
      name: es.status.burn.name,
      text: es.status.burn.text.replace("{n}", "1"),
    });
    // Registry order (§7.2 table): Debilidad before Maldición.
    expect(rows("curse-weaver").filter((r) => r.kind === "status").map((r) => r.name)).toEqual([
      es.status.weakness.name,
      es.status.curse.name,
    ]);
    expect(rows("ice-shard").find((r) => r.kind === "status")?.name).toBe(es.status.freeze.name);
    expect(rows("silence-monk").find((r) => r.verb === "Silencia")?.name).toBe(es.abilityWords.silence.name);
    expect(rows("aegis-ward").map((r) => r.name)).toContain(es.status.immune.name);
  });

  it("a unit's statuses say how long they last in its owner's turns (§7.3)", () => {
    const def = CATALOG["ember-imp"];
    const unit: UnitSnapshot = {
      iid: "u1", defId: def.id, controller: 1, attack: 1, health: 2, maxHealth: 2, keywords: {}, shieldCharges: 0,
      statuses: [{ id: "freeze", magnitude: 0, expiresAfterTurn: 6 }, { id: "curse", magnitude: 0, expiresAfterTurn: null }],
      silenced: false, sleeping: false,
    };
    const rows = glossaryRows(def, unit, { number: 5, activeSeat: 0 });
    expect(rows.find((r) => r.name === es.status.freeze.name)?.text).toBe(`${es.status.freeze.text} ${es.statusTiming.next}`);
    expect(rows.find((r) => r.name === es.status.curse.name)?.text).toBe(`${es.status.curse.text} ${es.statusTiming.permanent}`);

    // Owner's own turn 5: expires after 5 → this turn; after 7 → next; after 9 → 2 more.
    expect(statusTiming(5, 0, { number: 5, activeSeat: 0 })).toBe(es.statusTiming.thisTurn);
    expect(statusTiming(7, 0, { number: 5, activeSeat: 0 })).toBe(es.statusTiming.next);
    expect(statusTiming(9, 0, { number: 5, activeSeat: 0 })).toBe(es.statusTiming.many.replace("{turns}", "2"));
    // Opponent's turn 5: the owner's turn 6 is next; 8 → 2 more.
    expect(statusTiming(6, 0, { number: 5, activeSeat: 1 })).toBe(es.statusTiming.next);
    expect(statusTiming(8, 0, { number: 5, activeSeat: 1 })).toBe(es.statusTiming.many.replace("{turns}", "2"));
  });
});
