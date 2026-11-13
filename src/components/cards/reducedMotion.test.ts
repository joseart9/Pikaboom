// Regression guard (UI-10, DUELO_UI_UX_ENHANCEMENT_PLAN.md §1.2.4/§1.2.6): every endless CSS animation in the card
// game has a reduced-motion opt-out — the selector that starts the loop is also listed inside a
// `@media (prefers-reduced-motion: reduce)` block. (Battlefield-only motion is additionally switched off by the
// in-game setting via `.cg-battlefield--reduced`; that path is covered by the animation tests.)
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const CSS = readFileSync(join(process.cwd(), "src/components/cards/cards.css"), "utf8").replace(/\/\*[\s\S]*?\*\//g, "");

/** Top-level rules as `{ selector, body }`, plus the text of every reduced-motion media block. */
function parse(css: string): { rules: { selector: string; body: string }[]; reduced: string } {
  const rules: { selector: string; body: string }[] = [];
  let reduced = "";
  let i = 0;
  while (i < css.length) {
    const open = css.indexOf("{", i);
    if (open < 0) break;
    const head = css.slice(i, open).trim();
    let depth = 1;
    let j = open + 1;
    while (j < css.length && depth > 0) {
      if (css[j] === "{") depth++;
      else if (css[j] === "}") depth--;
      j++;
    }
    const body = css.slice(open + 1, j - 1);
    if (head.startsWith("@media") && head.includes("prefers-reduced-motion: reduce")) reduced += body;
    else if (!head.startsWith("@")) rules.push({ selector: head, body });
    else if (head.startsWith("@media")) rules.push(...parse(body).rules);
    i = j;
  }
  return { rules, reduced };
}

describe("reduced motion (UI-10)", () => {
  const { rules, reduced } = parse(CSS);
  const looping = rules.filter((r) => /animation\s*:[^;]*\binfinite\b/.test(r.body));

  it("finds the endless animations", () => {
    expect(looping.length).toBeGreaterThanOrEqual(10);
  });

  it.each(looping.map((r) => r.selector))("%s has a prefers-reduced-motion opt-out", (selector) => {
    const parts = selector.split(",").map((s) => s.trim());
    for (const part of parts) expect(reduced, `${part} is not stopped under prefers-reduced-motion`).toContain(part);
  });
});
