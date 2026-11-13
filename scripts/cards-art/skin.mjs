// Offline generator for the 10 Duelo Arcano skin SVGs (UI-02, docs/cards/ART_GUIDE.md §3). Writes self-contained
// static files to public/cards/skin/ (committed); nothing here is imported by the app.
// Usage: node scripts/cards-art/skin.mjs [outDir]   then `npm test` (skin/assets.test.ts validates every file).
import { mkdirSync, writeFileSync } from "node:fs";

const OUT = process.argv[2] ?? "public/cards/skin";
mkdirSync(OUT, { recursive: true });
const f = (n) => +n.toFixed(1);
const P = (pts) => "M" + pts.map(([x, y]) => `${f(x)} ${f(y)}`).join("L") + "Z";
const polar = (cx, cy, r, deg) => [cx + r * Math.cos((deg * Math.PI) / 180), cy + r * Math.sin((deg * Math.PI) / 180)];
const ngon = (cx, cy, r, n, start = -90) => Array.from({ length: n }, (_, i) => polar(cx, cy, r, start + (i * 360) / n));
const starPts = (cx, cy, n, ro, ri, start = -90) => Array.from({ length: n * 2 }, (_, i) => polar(cx, cy, i % 2 ? ri : ro, start + (i * 180) / n));
const INK = "#1d0842";
const svg = (vb, body) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vb}">\n${body.trim()}\n</svg>\n`;
const lin = (id, x1, y1, x2, y2, stops) =>
  `<linearGradient id="${id}" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}">${stops.map(([o, c, a]) => `<stop offset="${o}" stop-color="${c}"${a !== undefined ? ` stop-opacity="${a}"` : ""}/>`).join("")}</linearGradient>`;
const rad = (id, cx, cy, r, stops, extra = "") =>
  `<radialGradient id="${id}" cx="${cx}" cy="${cy}" r="${r}"${extra}>${stops.map(([o, c, a]) => `<stop offset="${o}" stop-color="${c}"${a !== undefined ? ` stop-opacity="${a}"` : ""}/>`).join("")}</radialGradient>`;
const write = (name, text) => {
  writeFileSync(`${OUT}/${name}.svg`, text);
  console.log(name, Buffer.byteLength(text));
};

// ── Faceted badges (100×100) ────────────────────────────────────────────────────────────────────
function facetGem(id, outer, bezel, table, shades, tableStops) {
  const n = bezel.length;
  const facets = bezel
    .map((b, i) => `<path d="${P([b, bezel[(i + 1) % n], table[(i + 1) % n], table[i]])}" fill="${shades[i]}"/>`)
    .join("\n");
  return `<defs>${lin(`${id}-t`, 0.2, 0, 0.8, 1, tableStops)}</defs>
<path d="${P(outer)}" fill="${INK}" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/>
${facets}
<path d="${P(table)}" fill="url(#${id}-t)" stroke="${INK}" stroke-opacity="0.35" stroke-width="1.5" stroke-linejoin="round"/>`;
}

// Mana cost: hexagonal "table cut" gem, light from the upper left.
{
  const o = ngon(50, 50, 47, 6), b = ngon(50, 50, 41, 6), t = ngon(50, 50, 27, 6);
  // facet i goes from vertex i to i+1 (vertex 0 = top): top-right, right, bottom-right, bottom-left, left, top-left
  const body = facetGem("badge-gem", o, b, t, ["#7cc8ff", "#2f8ef0", "#15509e", "#1f6fd1", "#5cb8ff", "#b5e1ff"], [[0, "#5cbcff"], [1, "#2a80e0"]]);
  write("badge-gem", svg("0 0 100 100", body + `
<path d="M28.5 37.6 48.6 26 50 28.4 30.6 39.6Z" fill="#e6f6ff" fill-opacity="0.85"/>
<path d="M50 9 54 16.6 50 15.2 46 16.6Z" fill="#e6f6ff"/>`));
}
// Attack: diamond.
{
  const o = [[50, 2.5], [97.5, 50], [50, 97.5], [2.5, 50]], b = [[50, 10], [90, 50], [50, 90], [10, 50]], t = [[50, 27], [73, 50], [50, 73], [27, 50]];
  const body = facetGem("badge-diamond", o, b, t, ["#ffd23f", "#c98a00", "#e09a00", "#ffe39a"], [[0, "#ffd54a"], [1, "#f0a400"]]);
  write("badge-diamond", svg("0 0 100 100", body + `
<path d="M31 50 50 31 52 33.4 33.4 52Z" fill="#fff7d6" fill-opacity="0.8"/>
<path d="M50 10 53.6 17.4 50 16.2 46.4 17.4Z" fill="#fff7d6"/>`));
}
// Health: drop, widest in the lower half. The drop's round bottom reaches y ≈ 111.5 (with its stroke), so the body is
// scaled into the 100×100 box — otherwise the <image> viewport clips the bottom of every health badge.
{
  const drop = (s) => {
    const k = (x, y) => `${f(50 + (x - 50) * s)} ${f(62 + (y - 62) * s)}`;
    return `M${k(50, 3)}C${k(70, 29)} ${k(95, 45)} ${k(95, 65)}A${f(45 * s)} ${f(45 * s)} 0 0 1 ${k(5, 65)}C${k(5, 45)} ${k(30, 29)} ${k(50, 3)}Z`;
  };
  write("badge-drop", svg("0 0 100 100", `<defs>${lin("badge-drop-b", 0.2, 0, 0.8, 1, [[0, "#ff7a93"], [0.55, "#ff4d6d"], [1, "#b81d42"]])}${rad("badge-drop-g", 0.38, 0.55, 0.55, [[0, "#ff9aad", 0.9], [1, "#ff4d6d", 0]])}</defs>
<g transform="translate(6 1.2) scale(0.88)">
<path d="${drop(1)}" fill="${INK}" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/>
<path d="${drop(0.86)}" fill="url(#badge-drop-b)"/>
<path d="${drop(0.86)}" fill="url(#badge-drop-g)"/>
<path d="M24.6 62C24.6 50.4 33.4 39.6 42.4 28.6L45 30.6C37 41 30.2 51 30.2 62Z" fill="#ffe0e6" fill-opacity="0.8"/>
<path d="M20.8 74.6C27 86.4 44.6 91.2 60 86.8 47 88.6 32.4 84.6 26 74Z" fill="#7d0f2c" fill-opacity="0.55"/>
</g>`));
}
// Generic number: carved violet disc with a steel rim.
{
  write("badge-circle", svg("0 0 100 100", `<defs>${lin("badge-circle-r", 0.2, 0, 0.8, 1, [[0, "#c9bdf0"], [0.5, "#7d62c4"], [1, "#2f1f62"]])}${lin("badge-circle-f", 0.3, 0, 0.7, 1, [[0, "#6a48b8"], [1, "#2f1f62"]])}</defs>
<circle cx="50" cy="50" r="47" fill="${INK}"/>
<circle cx="50" cy="50" r="42" fill="url(#badge-circle-r)"/>
<circle cx="50" cy="50" r="33" fill="url(#badge-circle-f)" stroke="${INK}" stroke-opacity="0.45" stroke-width="2"/>
<path d="M24 40A28 28 0 0 1 46 21.6L46.6 25A24.6 24.6 0 0 0 27.4 41Z" fill="#ffffff" fill-opacity="0.45"/>`));
}

// ── Hero portraits (256×256, circle crop; centre 100×100 calm for the initial) ──────────────────
function hero(name, c) {
  const ticks = Array.from({ length: 12 }, (_, i) => {
    const a = -90 + i * 30;
    const pts = c.spikes
      ? [polar(128, 128, 121, a - 5), polar(128, 128, 121, a + 5), polar(128, 128, 103, a)]
      : [polar(128, 128, 122, a), polar(128, 128, 116, a + 4), polar(128, 128, 110, a), polar(128, 128, 116, a - 4)];
    return `<path d="${P(pts)}" fill="${c.tick}"/>`;
  }).join("");
  const runes = Array.from({ length: 24 }, (_, i) => {
    const a = -90 + 15 + i * 30;
    if (i >= 12) return "";
    const [x, y] = polar(128, 128, 116, a);
    return `<circle cx="${f(x)}" cy="${f(y)}" r="2.6" fill="${c.tick}" fill-opacity="0.6"/>`;
  }).join("");
  const sigil = P(starPts(128, 128, 6, 92, 80, -90));
  return svg("0 0 256 256", `<defs>${rad(`${name}-bg`, 0.42, 0.38, 0.62, [[0, c.hi], [0.55, c.base], [1, c.deep]])}${rad(`${name}-sh`, 0.5, 0.5, 0.5, [[0.78, "#000000", 0], [1, "#000000", 0.45]])}${lin(`${name}-rim`, 0.15, 0, 0.85, 1, c.rim)}</defs>
<rect width="256" height="256" fill="${c.deep}"/>
<circle cx="128" cy="128" r="128" fill="url(#${name}-rim)"/>
<circle cx="128" cy="128" r="124" fill="${INK}" fill-opacity="0.55"/>
${ticks}
${runes}
<circle cx="128" cy="128" r="106" fill="${INK}"/>
<circle cx="128" cy="128" r="102" fill="url(#${name}-bg)"/>
<path d="${sigil}" fill="none" stroke="${c.tick}" stroke-opacity="0.22" stroke-width="3" stroke-linejoin="round"/>
<circle cx="128" cy="128" r="70" fill="none" stroke="${c.tick}" stroke-opacity="0.16" stroke-width="2" stroke-dasharray="6 9"/>
<circle cx="128" cy="128" r="102" fill="url(#${name}-sh)"/>
<path d="M46 98A88 88 0 0 1 98 42L101 49A80 80 0 0 0 53 100Z" fill="#ffffff" fill-opacity="0.18"/>`);
}
write("hero-mine", hero("hero-mine", { hi: "#8a5fd6", base: "#5a2d9c", deep: "#2a1258", tick: "#c9b2ff", rim: [[0, "#b9a2f0"], [0.5, "#6a48b8"], [1, "#2f1f62"]], spikes: false }));
write("hero-foe", hero("hero-foe", { hi: "#c84a63", base: "#8a1c3a", deep: "#3d0818", tick: "#ffb3a3", rim: [[0, "#ff9a7a"], [0.5, "#a8274a"], [1, "#4a0a20"]], spikes: true }));

// ── Card back (360×500) ─────────────────────────────────────────────────────────────────────────
{
  const cx = 180, cy = 250;
  const star8 = P(starPts(cx, cy, 8, 92, 38, -90));
  const star4 = P(starPts(cx, cy, 4, 120, 22, -90));
  const ring = (r, s, w, extra = "") => `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${s}" stroke-width="${w}"${extra}/>`;
  const diamonds = [[cx, 52], [cx, 448], [44, cy], [316, cy]].map(([x, y]) => `<path d="${P([[x, y - 12], [x + 9, y], [x, y + 12], [x - 9, y]])}" fill="#ff7ab8" stroke="${INK}" stroke-width="3"/>`).join("");
  const corners = [[40, 40, 1, 1], [320, 40, -1, 1], [40, 460, 1, -1], [320, 460, -1, -1]]
    .map(([x, y, sx, sy]) => `<path d="M${x} ${y + sy * 46}V${y}H${x + sx * 46}" fill="none" stroke="#c77dff" stroke-opacity="0.55" stroke-width="4"/><path d="${P([[x + sx * 10, y + sy * 10], [x + sx * 20, y + sy * 14], [x + sx * 10, y + sy * 18], [x + sx * 0, y + sy * 14]].map(([a, b]) => [a, b - sy * 4]))}" fill="#c77dff" fill-opacity="0.6"/>`)
    .join("");
  write("card-back", svg("0 0 360 500", `<defs>
${lin("card-back-bg", 0.1, 0, 0.9, 1, [[0, "#5d22ad"], [0.5, "#4a1791"], [1, "#2a0d5c"]])}
${rad("card-back-glow", 0.5, 0.5, 0.5, [[0, "#ff4fa3", 0.55], [0.5, "#b5179e", 0.25], [1, "#4a1791", 0]])}
${lin("card-back-star", 0.2, 0, 0.8, 1, [[0, "#ffd6f0"], [0.45, "#ff7ab8"], [1, "#b5179e"]])}
${lin("card-back-gem", 0.2, 0, 0.8, 1, [[0, "#e6f6ff"], [0.5, "#c77dff"], [1, "#5a189a"]])}
<pattern id="card-back-lattice" width="36" height="36" patternUnits="userSpaceOnUse"><path d="M18 0 36 18 18 36 0 18Z" fill="none" stroke="#ffffff" stroke-opacity="0.06" stroke-width="2"/></pattern>
</defs>
<rect width="360" height="500" fill="url(#card-back-bg)"/>
<rect width="360" height="500" fill="url(#card-back-lattice)"/>
<rect x="30" y="30" width="300" height="440" rx="22" fill="none" stroke="${INK}" stroke-width="8"/>
<rect x="30" y="30" width="300" height="440" rx="22" fill="none" stroke="#ff006e" stroke-opacity="0.7" stroke-width="3"/>
${corners}
<path d="M${cx} 64V${cy - 124}M${cx} ${cy + 124}V436M58 ${cy}H${cx - 124}M${cx + 124} ${cy}H302" stroke="#ff7ab8" stroke-opacity="0.7" stroke-width="4"/>
${diamonds}
<circle cx="${cx}" cy="${cy}" r="150" fill="url(#card-back-glow)"/>
<path d="${star4}" fill="#2a0d5c" stroke="${INK}" stroke-width="6" stroke-linejoin="round"/>
<path d="${star4}" fill="none" stroke="#c77dff" stroke-opacity="0.8" stroke-width="2.5" stroke-linejoin="round"/>
${ring(100, INK, 12)}
${ring(100, "#ff006e", 4)}
${ring(86, "#ffd6f0", 2, ' stroke-opacity="0.5" stroke-dasharray="4 8"')}
<path d="${star8}" fill="url(#card-back-star)" stroke="${INK}" stroke-width="6" stroke-linejoin="round"/>
<circle cx="${cx}" cy="${cy}" r="34" fill="${INK}"/>
<path d="${P(ngon(cx, cy, 28, 6))}" fill="url(#card-back-gem)"/>
<path d="${P([[cx, cy - 28], [cx + 24.2, cy - 14], [cx, cy], [cx - 24.2, cy - 14]])}" fill="#ffffff" fill-opacity="0.35"/>
<path d="${P([[cx - 14, cy - 18], [cx - 2, cy - 25], [cx + 1, cy - 22], [cx - 11, cy - 15]])}" fill="#ffffff" fill-opacity="0.8"/>`));
}

// ── Board backdrop (1600×900): quiet carved indigo table, darkest at the edges ─────────────────
{
  const runeTicks = Array.from({ length: 36 }, (_, i) => {
    const a = i * 10;
    const [x1, y1] = polar(800, 450, 262, a), [x2, y2] = polar(800, 450, i % 3 ? 272 : 286, a);
    return `M${f(x1)} ${f(y1)}L${f(x2)} ${f(y2)}`;
  }).join("");
  const hexa = P(starPts(800, 450, 6, 236, 136, -90));
  const studs = [[150, 110], [1450, 110], [150, 790], [1450, 790]]
    .map(([x, y]) => `<circle cx="${x}" cy="${y}" r="14" fill="#140b2c" stroke="#ffffff" stroke-opacity="0.08" stroke-width="3"/><path d="${P([[x, y - 26], [x + 7, y], [x, y + 26], [x - 7, y]])}" fill="#ffffff" fill-opacity="0.05"/><path d="${P([[x - 26, y], [x, y - 7], [x + 26, y], [x, y + 7]])}" fill="#ffffff" fill-opacity="0.05"/>`)
    .join("");
  write("board-backdrop", svg("0 0 1600 900", `<defs>
${rad("board-backdrop-bg", 0.5, 0.5, 0.62, [[0, "#2e1c5a"], [0.5, "#24164c"], [0.85, "#1a1038"], [1, "#100822"]], ' gradientTransform="translate(0.5 0.5) scale(1 1.78) translate(-0.5 -0.5)"')}
${rad("board-backdrop-vig", 0.5, 0.5, 0.75, [[0.55, "#0a0518", 0], [1, "#0a0518", 0.85]], ' gradientTransform="translate(0.5 0.5) scale(1 1.78) translate(-0.5 -0.5)"')}
${lin("board-backdrop-slab", 0, 0, 0, 1, [[0, "#ffffff", 0.035], [0.5, "#ffffff", 0], [1, "#000000", 0.12]])}
<pattern id="board-backdrop-grain" width="48" height="48" patternUnits="userSpaceOnUse"><circle cx="8" cy="10" r="1.5" fill="#ffffff" fill-opacity="0.025"/><circle cx="32" cy="30" r="1.2" fill="#ffffff" fill-opacity="0.02"/><circle cx="40" cy="6" r="1" fill="#000000" fill-opacity="0.12"/><circle cx="18" cy="40" r="1.4" fill="#000000" fill-opacity="0.1"/></pattern>
</defs>
<rect width="1600" height="900" fill="url(#board-backdrop-bg)"/>
<rect width="1600" height="900" fill="url(#board-backdrop-grain)"/>
<rect x="110" y="70" width="1380" height="760" rx="48" fill="url(#board-backdrop-slab)"/>
<rect x="110" y="70" width="1380" height="760" rx="48" fill="none" stroke="#000000" stroke-opacity="0.35" stroke-width="10"/>
<rect x="116" y="76" width="1368" height="748" rx="44" fill="none" stroke="#ffffff" stroke-opacity="0.06" stroke-width="3"/>
<path d="M170 450H520M1080 450H1430" stroke="#ffffff" stroke-opacity="0.05" stroke-width="3"/>
<path d="M520 450 540 440 560 450 540 460ZM1080 450 1060 440 1040 450 1060 460Z" fill="#ffffff" fill-opacity="0.06"/>
<circle cx="800" cy="450" r="250" fill="none" stroke="#ffffff" stroke-opacity="0.045" stroke-width="4"/>
<circle cx="800" cy="450" r="236" fill="none" stroke="#000000" stroke-opacity="0.18" stroke-width="3"/>
<path d="${runeTicks}" stroke="#ffffff" stroke-opacity="0.05" stroke-width="4"/>
<path d="${hexa}" fill="none" stroke="#ffffff" stroke-opacity="0.035" stroke-width="3" stroke-linejoin="round"/>
<circle cx="800" cy="450" r="120" fill="none" stroke="#c77dff" stroke-opacity="0.05" stroke-width="3" stroke-dasharray="10 14"/>
${studs}
<rect width="1600" height="900" fill="url(#board-backdrop-vig)"/>`));
}

// ── Card frames (360×500). Zones: art oval x 28.8–331.2 / y 30–230; name y 235–280; text x 25–335 / y 290–440 ──
function frame(name, c, ornament) {
  return svg("0 0 360 500", `<defs>
${lin(`${name}-bg`, 0.15, 0, 0.85, 1, c.body)}
${lin(`${name}-trim`, 0.1, 0, 0.9, 1, c.trim)}
${lin(`${name}-band`, 0, 0, 0, 1, [[0, c.band[0]], [1, c.band[1]]])}
${rad(`${name}-glow`, 0.5, 0.26, 0.5, [[0, c.glow, 0.35], [1, c.glow, 0]])}
</defs>
<rect width="360" height="500" fill="url(#${name}-bg)"/>
<rect width="360" height="500" fill="url(#${name}-glow)"/>
<rect x="7" y="7" width="346" height="486" rx="30" fill="none" stroke="#ffffff" stroke-opacity="0.12" stroke-width="2"/>
<rect x="11" y="11" width="338" height="478" rx="27" fill="none" stroke="${INK}" stroke-opacity="0.55" stroke-width="3"/>
${ornament}
<ellipse cx="180" cy="130" rx="164" ry="112" fill="url(#${name}-trim)" stroke="${INK}" stroke-width="4"/>
<ellipse cx="180" cy="130" rx="155" ry="104" fill="${INK}"/>
<path d="M14 232H346L334 258 346 284H14L26 258Z" fill="url(#${name}-band)" stroke="${INK}" stroke-width="4" stroke-linejoin="round"/>
<path d="M30 238H330" stroke="#ffffff" stroke-opacity="0.18" stroke-width="2"/>
<rect x="19" y="287" width="322" height="158" rx="16" fill="url(#${name}-trim)" stroke="${INK}" stroke-width="4"/>
<rect x="24" y="292" width="312" height="148" rx="12" fill="${INK}"/>
<path d="M92 452H268L278 468 268 484H92L82 468Z" fill="${INK}" fill-opacity="0.45"/>`);
}
{
  // Mob: riveted armor plates around the art and text sockets.
  const rivets = (cx, cy, rx, ry, n, from, to) =>
    Array.from({ length: n }, (_, i) => {
      const a = from + ((to - from) * i) / (n - 1);
      const [x, y] = [cx + rx * Math.cos((a * Math.PI) / 180), cy + ry * Math.sin((a * Math.PI) / 180)];
      return `<circle cx="${f(x)}" cy="${f(y)}" r="4.2" fill="#d8cdf2" stroke="${INK}" stroke-width="2"/>`;
    }).join("");
  const plates = `
<path d="M11 120 38 70V196L11 176Z" fill="#2a1d55" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/>
<path d="M349 120 322 70V196L349 176Z" fill="#2a1d55" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/>
<path d="M18 300 6 330V420L18 436Z M342 300 354 330V420L342 436Z" fill="#2a1d55" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/>
<path d="M140 12H220L208 26H152Z" fill="#8f7bc4" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/>`;
  const after = `
${rivets(180, 130, 160, 108, 9, 200, 340)}
<circle cx="24" cy="258" r="5" fill="#d8cdf2" stroke="${INK}" stroke-width="2"/><circle cx="336" cy="258" r="5" fill="#d8cdf2" stroke="${INK}" stroke-width="2"/>
<circle cx="34" cy="300" r="3.6" fill="#d8cdf2" stroke="${INK}" stroke-width="2"/><circle cx="326" cy="300" r="3.6" fill="#d8cdf2" stroke="${INK}" stroke-width="2"/>`;
  const out = frame("frame-mob", {
    body: [[0, "#4d378c"], [0.45, "#3b2a6b"], [1, "#1a1040"]],
    trim: [[0, "#cfc2f0"], [0.35, "#8f7bc4"], [0.7, "#5a4796"], [1, "#2f2260"]],
    band: ["#3d2a7c", "#22154a"],
    glow: "#b8a3ff",
  }, plates).replace("</svg>", after.trim() + "\n</svg>");
  write("frame-mob", out);
}
{
  // Spell: rune filigree, sparkles and crescents instead of armor.
  const sparkle = (x, y, r) => `<path d="${P(starPts(x, y, 4, r, r * 0.3))}" fill="#e6f6ff" fill-opacity="0.85" stroke="${INK}" stroke-width="2" stroke-linejoin="round"/>`;
  const dots = [[40, 40], [320, 46], [56, 214], [304, 220], [30, 470], [330, 466], [120, 18], [246, 20]]
    .map(([x, y], i) => `<circle cx="${x}" cy="${y}" r="${i % 2 ? 2 : 2.8}" fill="#9be7ff" fill-opacity="0.55"/>`).join("");
  const filigree = `
${dots}
<path d="M14 150C40 120 40 90 20 66M346 150C320 120 320 90 340 66" fill="none" stroke="#9be7ff" stroke-opacity="0.35" stroke-width="4" stroke-linecap="round"/>
<path d="M22 300C8 330 8 410 22 438M338 300C352 330 352 410 338 438" fill="none" stroke="#9be7ff" stroke-opacity="0.3" stroke-width="4" stroke-linecap="round"/>`;
  const ticks = Array.from({ length: 28 }, (_, i) => {
    const a = (i * 360) / 28;
    const [x1, y1] = [180 + 160 * Math.cos((a * Math.PI) / 180), 130 + 108 * Math.sin((a * Math.PI) / 180)];
    const [x2, y2] = [180 + 152 * Math.cos((a * Math.PI) / 180), 130 + 101 * Math.sin((a * Math.PI) / 180)];
    return `M${f(x1)} ${f(y1)}L${f(x2)} ${f(y2)}`;
  }).join("");
  const after = `
<path d="${ticks}" stroke="#e6f6ff" stroke-opacity="0.55" stroke-width="2.5"/>
${sparkle(180, 18, 13)}${sparkle(30, 258, 10)}${sparkle(330, 258, 10)}
<path d="M38 452C30 462 30 474 38 484 26 478 26 458 38 452ZM322 452C330 462 330 474 322 484 334 478 334 458 322 452Z" fill="#9be7ff" fill-opacity="0.7"/>
<path d="M24 296C40 296 44 300 44 312M336 296C320 296 316 300 316 312M24 436C40 436 44 432 44 420M336 436C320 436 316 432 316 420" fill="none" stroke="#e6f6ff" stroke-opacity="0.5" stroke-width="2.5" stroke-linecap="round"/>`;
  const out = frame("frame-spell", {
    body: [[0, "#3a58a8"], [0.45, "#2c3f7a"], [1, "#11183a"]],
    trim: [[0, "#e6f6ff"], [0.35, "#7cc8ff"], [0.7, "#4a5fb8"], [1, "#2a2f6e"]],
    band: ["#34478a", "#1c2452"],
    glow: "#9be7ff",
  }, filigree).replace("</svg>", after.trim() + "\n</svg>");
  write("frame-spell", out);
}
