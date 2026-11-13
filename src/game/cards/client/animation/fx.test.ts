import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { FX_ELEMENTS } from "../../catalog/visuals";
import {
  FRAME_SAMPLE,
  FrameMonitor,
  LOW_END_FRAME_MS,
  lowEndByCores,
  MAX_PARTICLES,
  particleBudget,
  PROJECTILE_KINDS,
  scaledCount,
  type ParticleKind,
} from "./fx";

describe("particle budget on low-end devices (Phase 20 H)", () => {
  it("≤ 4 cores → low-end; unknown or more cores → full budget", () => {
    expect(lowEndByCores({ hardwareConcurrency: 4 })).toBe(true);
    expect(lowEndByCores({ hardwareConcurrency: 2 })).toBe(true);
    expect(lowEndByCores({ hardwareConcurrency: 8 })).toBe(false);
    expect(lowEndByCores({})).toBe(false);
    expect(lowEndByCores(undefined)).toBe(false);
  });

  it("a 30-frame window averaging > 24 ms latches low-end; fast windows and pauses do not", () => {
    const m = new FrameMonitor();
    for (let i = 0; i < FRAME_SAMPLE * 3; i++) m.push(16);
    expect(m.lowEnd).toBe(false);
    for (let i = 0; i < FRAME_SAMPLE - 1; i++) m.push(LOW_END_FRAME_MS + 10);
    expect(m.lowEnd).toBe(false); // the window is not complete yet
    m.restart(); // an idle gap discards the partial window
    for (let i = 0; i < FRAME_SAMPLE - 1; i++) m.push(16);
    expect(m.lowEnd).toBe(false);
    m.restart();
    for (let i = 0; i < FRAME_SAMPLE; i++) m.push(LOW_END_FRAME_MS + 6);
    expect(m.lowEnd).toBe(true);
    m.push(10);
    expect(m.lowEnd).toBe(true); // latched
  });

  it("halves the budget and every burst", () => {
    expect(particleBudget(false)).toBe(MAX_PARTICLES);
    expect(particleBudget(true)).toBe(MAX_PARTICLES / 2);
    expect(scaledCount(16, false)).toBe(16);
    expect(scaledCount(16, true)).toBe(8);
    expect(scaledCount(1, true)).toBe(1);
  });
});

describe("FX styles cover every kind (Phase 20 C)", () => {
  const css = readFileSync(join(process.cwd(), "src", "components", "cards", "cards.css"), "utf8");

  it("every projectile kind (each FxElement + heal) has a style", () => {
    expect([...PROJECTILE_KINDS].sort()).toEqual([...FX_ELEMENTS, "heal"].sort());
    for (const kind of PROJECTILE_KINDS) expect(css, kind).toContain(`.cg-fx-projectile--${kind}`);
  });

  it("every particle kind has a color token (confetti mixes the element colors)", () => {
    const kinds: ParticleKind[] = [...FX_ELEMENTS, "heal", "dust", "debris"];
    for (const kind of kinds) expect(css, kind).toMatch(new RegExp(`--cg-fx-${kind}:`));
  });

  it("FX keyframes in cards.css animate only transform and opacity (§18.6)", () => {
    const blocks = css.match(/@keyframes\s+cg-(fx|confetti|gameover|pack-flash|pack-rays|pack-hint|stealth)[\w-]*\s*\{[\s\S]*?\n\}/g) ?? [];
    expect(blocks.length).toBeGreaterThan(5);
    for (const block of blocks) {
      const props = [...block.matchAll(/([a-z-]+)\s*:/g)].map((m) => m[1]);
      expect(props.filter((p) => !["transform", "opacity"].includes(p)), block.slice(0, 40)).toEqual([]);
    }
  });
});
