// Contact sheet for card-art review (UI-04, docs/cards/UI_VISUAL_SYSTEM.md §6.1 step 4). Dev-only, never imported by
// the app. Rasterizes public/cards/art/<key>.svg with sharp (installed with Next) into one PNG grid.
// Usage: node scripts/cards-art/sheet.mjs <out.png> <tile px> <columns> <key …>
//        CROP=1 node … overlays the safe box (green) and the landscape/portrait crop lines (red).
// Write the PNG outside the repo (e.g. a temp dir); it is a review aid, not an asset.
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";

const sharp = createRequire(import.meta.url)("sharp");
const [out, size, cols, ...keys] = process.argv.slice(2);
if (!out || !keys.length) throw new Error("usage: node scripts/cards-art/sheet.mjs <out.png> <tile px> <columns> <key …>");
const S = +size, C = +cols, R = Math.ceil(keys.length / C), pad = 6;
const overlay = Buffer.from(
  `<svg xmlns="http://www.w3.org/2000/svg" width="${S}" height="${S}" viewBox="0 0 512 512"><rect x="96" y="112" width="320" height="288" fill="none" stroke="#00ff66" stroke-width="3"/><path d="M0 87H512M0 425H512M56 0V512M456 0V512" stroke="#ff2222" stroke-width="3"/></svg>`,
);
const tiles = await Promise.all(
  keys.map(async (k) => {
    const png = await sharp(readFileSync(`public/cards/art/${k}.svg`)).resize(S, S).png().toBuffer();
    return process.env.CROP ? sharp(png).composite([{ input: overlay }]).png().toBuffer() : png;
  }),
);
await sharp({ create: { width: C * (S + pad) + pad, height: R * (S + pad) + pad, channels: 4, background: "#000000" } })
  .composite(tiles.map((input, i) => ({ input, left: pad + (i % C) * (S + pad), top: pad + Math.floor(i / C) * (S + pad) })))
  .png()
  .toFile(out);
console.log(`${keys.length} tiles → ${out}`);
