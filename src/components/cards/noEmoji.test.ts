// Regression guard (UI-02, DUELO_UI_UX_ENHANCEMENT_PLAN.md §1.2.1): no emoji or dingbat characters as icons in
// Duelo Arcano's UI code and Spanish copy — icons are GameIcon / glyph-map vectors. Scoped to the card game's
// components, routes and i18n (not other games, tests or user content). Comments are stripped first, so arrows in
// code comments are fine. Typographic `×` (quantities), `·`, `…` and `«»` are text, not icons, and stay allowed.
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = process.cwd();
const SCOPES = ["src/components/cards", "src/app/cards", "src/game/cards/i18n"];

/** Arrows, misc technical (⏳⌛), enclosed alphanumerics, geometric shapes, misc symbols, dingbats (✓✕✦⚠),
 *  misc symbols & arrows, emoji blocks, variation selector 16. */
const PICTOGRAPHIC = /[←-⇿⌀-⏿①-⓿■-➿⤀-⥿⬀-⯿️]|[\u{1F000}-\u{1FAFF}]/u;

function files(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) return files(p);
    return /\.(tsx?|css)$/.test(name) && !/\.test\.tsx?$/.test(name) ? [p] : [];
  });
}

/** Removes block and line comments (good enough for our sources: no `//` inside the scanned strings). */
function stripComments(text: string): string {
  return text.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:"'`])\/\/.*$/gm, "$1");
}

export function pictographicLines(text: string): string[] {
  return stripComments(text)
    .split("\n")
    .filter((line) => PICTOGRAPHIC.test(line))
    .map((line) => line.trim());
}

describe("no emoji / dingbat icons in Duelo Arcano UI (UI-02)", () => {
  it("the guard detects what it forbids (not vacuous)", () => {
    expect(pictographicLines(`<span>✓ {t("x")}</span>`)).toHaveLength(1);
    expect(pictographicLines(`const a = "⚠";`)).toHaveLength(1);
    expect(pictographicLines(`label: "Jugar 🎴",`)).toHaveLength(1);
    expect(pictographicLines(`quantity: "×{n}", loading: "Cargando…", sep: " · "`)).toEqual([]);
    expect(pictographicLines(`// a → b\nconst x = 1; /* ✓ */`)).toEqual([]);
  });

  it("components, routes and i18n contain none", () => {
    const offenders = SCOPES.flatMap((scope) => files(join(ROOT, scope))).flatMap((file) =>
      pictographicLines(readFileSync(file, "utf8")).map((line) => `${file.slice(ROOT.length + 1)}: ${line}`),
    );
    expect(offenders).toEqual([]);
  });
});
