// Drop-in art checks (Phase 20, docs/cards/ART_GUIDE.md): every registered file exists and follows the guide, and the
// guide lists every card art key. Runs with `npm test`.
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { CATALOG } from "@/game/cards/catalog";
import { KEYWORDS } from "@/game/cards/catalog/keywords";
import { STATUS_DEFS } from "@/game/cards/catalog/statuses";
import { CARD_ART_FILES, cardArtUrl, MAX_SVG_BYTES, SKIN_ASSETS, SKIN_FILES, skinUrl } from "./assets";
import { GAME_ICONS } from "./icons/gameIcons";
import { KEYWORD_GLYPHS } from "./icons/keywordGlyphs";
import { STATUS_GLYPHS } from "./icons/statusGlyphs";

const ROOT = process.cwd();
const publicPath = (url: string) => join(ROOT, "public", ...decodeURIComponent(url).split("/").filter(Boolean));

/** ART_GUIDE §2 rules for one SVG; returns the problems (empty = OK). `key` = file name, the required id prefix. */
function svgProblems(text: string, bytes: number, viewBox: string, key?: string): string[] {
  const out: string[] = [];
  if (bytes > MAX_SVG_BYTES) out.push(`larger than ${MAX_SVG_BYTES} bytes`);
  const root = text.match(/<svg\b[^>]*>/i)?.[0];
  if (!root) return [...out, "no <svg> root"];
  if (!root.includes(`viewBox="${viewBox}"`)) out.push(`viewBox must be "${viewBox}"`);
  if (/<image\b/i.test(text) || /data:image\//i.test(text)) out.push("embedded raster image");
  if (/(href|src)\s*=\s*["'](https?:)?\/\//i.test(text) || /url\(\s*["']?(https?:)?\/\//i.test(text) || /@import/i.test(text)) out.push("external reference");
  if (/<script\b/i.test(text) || /\son[a-z]+\s*=/i.test(text)) out.push("script or event handler");
  if (/<foreignObject\b/i.test(text)) out.push("foreignObject");
  if (/<text\b/i.test(text)) out.push("text element");
  if (/<filter\b/i.test(text)) out.push("filter element");
  if (/<(animate|animateMotion|animateTransform|set)\b/i.test(text) || /@keyframes|animation\s*:/i.test(text)) out.push("internal animation");
  if (/\s(width|height)\s*=/.test(root)) out.push("width/height on the root");
  if (key) {
    const bad = [...text.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]).filter((id) => !id.startsWith(`${key}-`));
    if (bad.length) out.push(`ids not prefixed with "${key}-": ${bad.slice(0, 3).join(", ")}`);
  }
  return out;
}

const VIEWBOX_ART = "0 0 512 512";
const VIEWBOX_SKIN: Record<string, string> = {
  "card-back": "0 0 360 500",
  "board-backdrop": "0 0 1600 900",
  "frame-mob": "0 0 360 500",
  "frame-spell": "0 0 360 500",
  "hero-mine": "0 0 256 256",
  "hero-foe": "0 0 256 256",
  "badge-gem": "0 0 100 100",
  "badge-diamond": "0 0 100 100",
  "badge-drop": "0 0 100 100",
  "badge-circle": "0 0 100 100",
};

function check(url: string, viewBox: string, key: string): string[] {
  const file = publicPath(url);
  if (!existsSync(file)) return [`missing file ${file}`];
  return svgProblems(readFileSync(file, "utf8"), statSync(file).size, viewBox, key);
}

/** UI-03 pilot roster (DUELO_UI_UX_ENHANCEMENT_PLAN.md §5 UI-03). */
const UI03_PILOTS = ["squire", "wolf-pup", "stone-golem", "restless-skeleton", "arcane-spark", "flame-lance", "morvath", "ignis"];
/** UI-04 wave: 30 humanoid, beast, construct and elemental keys (plan §5 UI-04, manifest phase column). */
const UI04_WAVE = [
  "shield-bearer", "forest-boar", "iron-guard", "berserker-bear", "charging-rhino", "thornback-tortoise", "alpha-wolf",
  "twin-claw-panther", "line-breaker", "ursaria", "apprentice-mage", "grave-digger", "scholar", "dawn-paladin",
  "necromancer", "swamp-ent", "storm-weaver", "last-stand-knight", "blood-hound", "silence-monk", "sun-cleric",
  "clockwork-sentinel", "venom-spider", "phoenix-chick", "iron-colossus", "soul-thief", "wolf", "bear-cub", "toad",
  "scrap-golem",
];
/** UI-05 wave: 16 undead, demon and dragon keys (plan §5 UI-05). */
const UI05_WAVE = [
  "vampire-bat", "bone-wall", "hungry-ghoul", "crypt-banshee", "skeleton-king", "ember-imp", "flame-wyrm", "curse-weaver",
  "shadow-stalker", "ash-drake", "storm-drake", "larval-drake", "mana-leech", "vaelra", "nyxara", "skeleton",
];
/** UI-06 wave: the 26 remaining spell keys (plan §5 UI-06). */
const UI06_WAVE = [
  "healing-touch", "drain-life", "savage-strike", "pack-call", "wild-roar", "arcane-insight", "soul-harvest", "bone-storm",
  "chain-lightning", "growing-crystal", "ice-shard", "blessing-of-light", "purify", "shatter-armor", "disarming-strike",
  "stone-sleep", "aegis-ward", "frozen-gale", "banish", "dark-pact", "golem-forge", "toad-hex", "raise-dead", "arcane-echo",
  "mind-thrall", "mana-spark",
];
/** The six Legendaria/Única illustrations (plan §5 UI-05 flagship sheet). */
const PREMIUM = ["morvath", "skeleton-king", "ursaria", "vaelra", "ignis", "nyxara"];

describe("drop-in SVG art (ART_GUIDE.md)", () => {
  it("every registered card art key is a catalog art key, and its file follows the guide", () => {
    const keys = new Set(Object.values(CATALOG).map((d) => d.art));
    for (const key of CARD_ART_FILES) {
      expect(keys.has(key), `${key} is not a card art key`).toBe(true);
      expect(check(cardArtUrl(key), VIEWBOX_ART, key), key).toEqual([]);
    }
  });

  it("the 8 UI-03 pilot illustrations are registered", () => {
    for (const key of UI03_PILOTS) expect(CARD_ART_FILES.has(key), key).toBe(true);
  });

  it("the 30 UI-04 illustrations are registered (art coverage 38/80)", () => {
    expect(new Set(UI04_WAVE).size).toBe(30);
    for (const key of UI04_WAVE) expect(CARD_ART_FILES.has(key), key).toBe(true);
    expect(CARD_ART_FILES.size).toBeGreaterThanOrEqual(38);
  });

  it("the 16 UI-05 illustrations and all six premium artworks are registered (art coverage 54/80)", () => {
    expect(new Set(UI05_WAVE).size).toBe(16);
    for (const key of [...UI05_WAVE, ...PREMIUM]) expect(CARD_ART_FILES.has(key), key).toBe(true);
    expect(CARD_ART_FILES.size).toBeGreaterThanOrEqual(54);
  });

  it("the 26 UI-06 spell illustrations are registered", () => {
    expect(new Set(UI06_WAVE).size).toBe(26);
    for (const key of UI06_WAVE) expect(CARD_ART_FILES.has(key), key).toBe(true);
  });

  // UI-06 full-catalog gate: every CURRENT card (collectible and token) has exactly one registered, existing,
  // contract-compliant file. The placeholder fallback in the primitives stays for FUTURE cards; adding a card without
  // art makes this test fail until its SVG is drawn and registered.
  it("every current CardDef.art has exactly one registered, existing, compliant SVG (art coverage 80/80)", () => {
    const keys = [...new Set(Object.values(CATALOG).map((d) => d.art))].sort();
    expect(keys).toHaveLength(80);
    const missing = keys.filter((k) => !CARD_ART_FILES.has(k));
    expect(missing, "catalog art keys without a registered file").toEqual([]);
    expect([...CARD_ART_FILES].sort()).toEqual(keys);
    const dir = join(ROOT, "public", "cards", "art");
    const files = readdirSync(dir).filter((n) => n.endsWith(".svg")).map((n) => n.replace(/\.svg$/, ""));
    for (const key of keys) {
      expect(files.filter((n) => n === key), `${key}: exactly one file`).toHaveLength(1);
      expect(check(cardArtUrl(key), VIEWBOX_ART, key), key).toEqual([]);
    }
  });

  it("every file in public/cards/art is a registered key (no orphan or misspelled art)", () => {
    const dir = join(ROOT, "public", "cards", "art");
    for (const name of existsSync(dir) ? readdirSync(dir) : []) {
      expect(name, "only .svg files").toMatch(/\.svg$/);
      expect(CARD_ART_FILES.has(name.replace(/\.svg$/, "")), `${name} is not registered in CARD_ART_FILES`).toBe(true);
    }
  });

  it("all 10 skin slots are registered (UI-02)", () => {
    expect([...SKIN_FILES].sort()).toEqual([...SKIN_ASSETS].sort());
  });

  it("every registered skin file follows the guide", () => {
    expect(Object.keys(VIEWBOX_SKIN).sort()).toEqual([...SKIN_ASSETS].sort());
    for (const name of SKIN_FILES) expect(check(skinUrl(name), VIEWBOX_SKIN[name], name), name).toEqual([]);
  });

  it("the validator catches what the guide forbids (not vacuous)", () => {
    const ok = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><path d="M0 0H10V10Z" fill="#fff"/></svg>`;
    expect(svgProblems(ok, ok.length, VIEWBOX_ART)).toEqual([]);
    expect(svgProblems(ok, MAX_SVG_BYTES + 1, VIEWBOX_ART)).toContain(`larger than ${MAX_SVG_BYTES} bytes`);
    expect(svgProblems(ok.replace("512 512", "100 100"), 10, VIEWBOX_ART)).toHaveLength(1);
    expect(svgProblems(ok.replace("<path", `<image href="data:image/png;base64,AAAA"/><path`), 10, VIEWBOX_ART)).toContain("embedded raster image");
    expect(svgProblems(ok.replace("<path", `<use href="https://x.example/a.svg#b"/><path`), 10, VIEWBOX_ART)).toContain("external reference");
    expect(svgProblems(ok.replace("<path", `<style>@import url(x.css);</style><path`), 10, VIEWBOX_ART)).toContain("external reference");
    expect(svgProblems(ok.replace("<path", `<script>1</script><path`), 10, VIEWBOX_ART)).toContain("script or event handler");
    expect(svgProblems(ok.replace("<path", `<path onclick="x()"`), 10, VIEWBOX_ART)).toContain("script or event handler");
    expect(svgProblems(ok.replace("<path", `<text>Hola</text><path`), 10, VIEWBOX_ART)).toContain("text element");
    expect(svgProblems(ok.replace("<path", `<filter id="k-f"/><path`), 10, VIEWBOX_ART)).toContain("filter element");
    expect(svgProblems(ok.replace("/></svg>", `><animate attributeName="x"/></path></svg>`), 10, VIEWBOX_ART)).toContain("internal animation");
    expect(svgProblems(ok.replace("<svg ", `<svg width="512" `), 10, VIEWBOX_ART)).toContain("width/height on the root");
    expect(svgProblems(ok.replace("<path", `<path id="other-a"`), 10, VIEWBOX_ART, "k")).toContain(`ids not prefixed with "k-": other-a`);
    expect(svgProblems(ok.replace("<path", `<path id="k-a"`), 10, VIEWBOX_ART, "k")).toEqual([]);
  });

  it("ART_GUIDE.md lists every card art key, keyword and status (so nothing is left without a spec)", () => {
    const guide = readFileSync(join(ROOT, "docs", "cards", "ART_GUIDE.md"), "utf8");
    const missing = [
      ...new Set(Object.values(CATALOG).map((d) => d.art)),
      ...Object.keys(KEYWORDS).map((k) => `keyword:${k}`),
      ...Object.keys(STATUS_DEFS).map((s) => `status:${s}`),
      "status:silenced",
      ...SKIN_ASSETS.map((s) => `skin/${s}.svg`),
    ].filter((key) => !guide.includes(`\`${key}\``) && !guide.includes(key));
    expect(missing).toEqual([]);
  });
});

describe("UI asset manifest (docs/cards/UI_ASSET_STATUS.md, UI-01)", () => {
  /** `key → status` from the manifest's table rows (first cell is the backticked key, the status cell is `registered|missing`). */
  function manifestRows(): Map<string, string[]> {
    const text = readFileSync(join(ROOT, "docs", "cards", "UI_ASSET_STATUS.md"), "utf8");
    const rows = new Map<string, string[]>();
    for (const line of text.split("\n")) {
      const m = line.match(/^\| `([a-z0-9-]+)` \|/);
      if (!m) continue;
      const statuses = line.split("|").map((c) => c.trim()).filter((c) => c === "registered" || c === "missing");
      rows.set(m[1], [...(rows.get(m[1]) ?? []), ...statuses]);
    }
    return rows;
  }

  it("lists every catalog art key and skin slot exactly once, with the status the registries say", () => {
    const rows = manifestRows();
    const expected = new Map<string, string>([
      ...[...new Set(Object.values(CATALOG).map((d) => d.art))].map((k) => [k, CARD_ART_FILES.has(k) ? "registered" : "missing"] as const),
      ...SKIN_ASSETS.map((s) => [s, SKIN_FILES.has(s) ? "registered" : "missing"] as const),
    ]);
    expect([...rows.keys()].sort()).toEqual([...expected.keys()].sort());
    for (const [key, status] of expected) expect(rows.get(key), key).toEqual([status]);
  });
});

describe("24×24 glyph maps (ART_GUIDE §4, UI-02)", () => {
  const all = {
    ...Object.fromEntries(Object.entries(KEYWORD_GLYPHS).map(([k, g]) => [`keyword:${k}`, g.d])),
    ...Object.fromEntries(Object.entries(STATUS_GLYPHS).map(([k, g]) => [`status:${k}`, g.d])),
    ...Object.fromEntries(Object.entries(GAME_ICONS).map(([k, g]) => [`icon:${k}`, g.d])),
  };

  it("every glyph is one path whose coordinates stay inside the 24×24 box", () => {
    for (const [key, d] of Object.entries(all)) {
      expect(d, key).toMatch(/^M[\d.\sMLHVCSQTAZ-]+$/i);
      const nums = (d.match(/-?\d*\.?\d+/g) ?? []).map(Number);
      expect(nums.every((n) => n >= 0 && n <= 24), `${key} leaves the 24×24 box`).toBe(true);
    }
  });

  it("no two glyphs share a path (each icon is its own silhouette)", () => {
    const seen = new Map<string, string>();
    for (const [key, d] of Object.entries(all)) {
      expect(seen.get(d), `${key} duplicates ${seen.get(d)}`).toBeUndefined();
      seen.set(d, key);
    }
  });
});
