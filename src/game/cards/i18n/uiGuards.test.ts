// Source guards for the card-game UI (§17.4 skin rule, §17.8 i18n rule, Phase 10 K).
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = process.cwd();

function walk(dir: string): string[] {
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) out.push(...walk(p));
    else if (/\.(tsx?|css)$/.test(name) && !/\.test\.tsx?$/.test(name)) out.push(p);
  }
  return out;
}

/** Removes // and /* *\/ comments (rough but enough for these checks; keeps string contents). */
function stripComments(src: string): string {
  return src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:"'`])\/\/.*$/gm, "$1");
}

const UI_DIRS = [join(ROOT, "src", "components", "cards"), join(ROOT, "src", "app", "cards")];
const uiFiles = () => UI_DIRS.flatMap(walk).filter((f) => !f.endsWith(".css"));

describe("card UI source guards", () => {
  it("no Spanish literals in src/components/cards/** or src/app/cards/** (use t() from i18n/)", () => {
    const offenders: string[] = [];
    // Quoted strings or JSX text containing Spanish-only letters.
    const spanish = /(["'`][^"'`\n]*[áéíóúñÁÉÍÓÚÑ¿¡][^"'`\n]*["'`])|(>[^<>{}\n]*[áéíóúñÁÉÍÓÚÑ¿¡][^<>{}\n]*<)/;
    for (const f of uiFiles()) {
      const lines = stripComments(readFileSync(f, "utf8")).split("\n");
      lines.forEach((line, i) => {
        if (spanish.test(line)) offenders.push(`${relative(ROOT, f)}:${i + 1}: ${line.trim()}`);
      });
    }
    expect(offenders).toEqual([]);
  });

  it("no hex colors in src/components/cards/** outside skin/ (use var(--cg-*) tokens)", () => {
    const skin = `${sep}skin${sep}`;
    const offenders: string[] = [];
    for (const f of walk(join(ROOT, "src", "components", "cards"))) {
      if (f.includes(skin) || f.endsWith("cards.css")) continue;
      const lines = stripComments(readFileSync(f, "utf8")).split("\n");
      lines.forEach((line, i) => {
        if (/#[0-9a-fA-F]{3,8}\b/.test(line)) offenders.push(`${relative(ROOT, f)}:${i + 1}: ${line.trim()}`);
      });
    }
    expect(offenders).toEqual([]);
  });

  it("skin primitives never import the engine", () => {
    const offenders = walk(join(ROOT, "src", "components", "cards", "skin")).filter((f) => /from\s+["'][^"']*game\/cards\/engine/.test(readFileSync(f, "utf8")));
    expect(offenders.map((f) => relative(ROOT, f))).toEqual([]);
  });

  it("the guards are not vacuous", () => {
    expect(uiFiles().length).toBeGreaterThan(10);
    const spanish = /(["'`][^"'`\n]*[áéíóúñÁÉÍÓÚÑ¿¡][^"'`\n]*["'`])/;
    expect(spanish.test(`const x = "Turno rival ¡ya!";`)).toBe(true);
  });
});
