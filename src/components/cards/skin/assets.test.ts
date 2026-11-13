// Drop-in art checks (Phase 20, docs/cards/ART_GUIDE.md): every registered file exists and follows the guide, and the
// guide lists every card art key. Runs with `npm test`.
import { existsSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { CATALOG } from "@/game/cards/catalog";
import { KEYWORDS } from "@/game/cards/catalog/keywords";
import { STATUS_DEFS } from "@/game/cards/catalog/statuses";
import { CARD_ART_FILES, cardArtUrl, MAX_SVG_BYTES, SKIN_ASSETS, SKIN_FILES, skinUrl } from "./assets";

const ROOT = process.cwd();
const publicPath = (url: string) => join(ROOT, "public", ...decodeURIComponent(url).split("/").filter(Boolean));

/** ART_GUIDE §2 rules for one SVG; returns the problems (empty = OK). */
function svgProblems(text: string, bytes: number, viewBox: string): string[] {
  const out: string[] = [];
  if (bytes > MAX_SVG_BYTES) out.push(`larger than ${MAX_SVG_BYTES} bytes`);
  const root = text.match(/<svg\b[^>]*>/i)?.[0];
  if (!root) return [...out, "no <svg> root"];
  if (!root.includes(`viewBox="${viewBox}"`)) out.push(`viewBox must be "${viewBox}"`);
  if (/<image\b/i.test(text) || /data:image\//i.test(text)) out.push("embedded raster image");
  if (/(href|src)\s*=\s*["'](https?:)?\/\//i.test(text) || /url\(\s*["']?(https?:)?\/\//i.test(text) || /@import/i.test(text)) out.push("external reference");
  if (/<script\b/i.test(text) || /\son[a-z]+\s*=/i.test(text)) out.push("script or event handler");
  if (/<foreignObject\b/i.test(text)) out.push("foreignObject");
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

function check(url: string, viewBox: string): string[] {
  const file = publicPath(url);
  if (!existsSync(file)) return [`missing file ${file}`];
  return svgProblems(readFileSync(file, "utf8"), statSync(file).size, viewBox);
}

describe("drop-in SVG art (ART_GUIDE.md)", () => {
  it("every registered card art key is a catalog art key, and its file follows the guide", () => {
    const keys = new Set(Object.values(CATALOG).map((d) => d.art));
    for (const key of CARD_ART_FILES) {
      expect(keys.has(key), `${key} is not a card art key`).toBe(true);
      expect(check(cardArtUrl(key), VIEWBOX_ART), key).toEqual([]);
    }
  });

  it("every registered skin file follows the guide", () => {
    expect(Object.keys(VIEWBOX_SKIN).sort()).toEqual([...SKIN_ASSETS].sort());
    for (const name of SKIN_FILES) expect(check(skinUrl(name), VIEWBOX_SKIN[name]), name).toEqual([]);
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
