// UI-06 recipes (arcane spells): arcane-insight, arcane-echo, growing-crystal, mana-spark, golem-forge, toad-hex,
// mind-thrall. See art.mjs / docs/cards/UI_VISUAL_SYSTEM.md §6. Each picture is the spell's action, not an orb:
// draw (eye + two rising cards), copy (prism mirroring a wolf), grow (hollow crystal), flash (gem over a palm),
// forge (two scrap golems assembled), transform (half knight / half toad), control (puppet hand over a brute).
import { Art, INK, blob, ellipse, f, limb, poly, polar, shard, smooth, star, zigzag } from "../lib.mjs";
import { GOLD, M } from "../materials.mjs";

const P = {
  card: { base: "#4b2f8f", shade: "#2f1f62", light: "#7a5ad0", rim: GOLD, rv: 4 },
  page: { base: "#efe4c8", shade: "#c2b08a", light: "#fffaf0" },
  cover: { base: "#6a1f4a", shade: "#3e0c2a", light: "#94306a" },
  crystal: { base: "#3fa9ff", shade: "#1f5fbf", light: "#bfe6ff" },
  prism: { base: "#7ad8e6", shade: "#4b6fc4", light: "#e6fbff", rim: "#c77dff", rv: 5 },
  stone: { base: "#4a4e78", shade: "#2c2e52", light: "#6a70a0" },
  iron: { base: "#6e6a80", shade: "#3e3a52", light: "#9a96b0" },
  copper: { base: "#c27a3a", shade: "#7a4420", light: "#e6a868" },
  anvil: { base: "#3e3a52", shade: "#211d33", light: "#6a6688" },
  rune: { base: "#c77dff", shade: "#7b2fd0", light: "#f0d8ff" },
  toad: { base: "#6fbf4a", shade: "#3d7a2a", light: "#a8e07a" },
  ghost: { base: "#b48cff", shade: "#6a3ab8", light: "#efe2ff", rim: "#b5179e", rv: 5 },
  brute: { base: "#6a7f86", shade: "#3a4a58", light: "#9ab4b8", rim: "#c77dff", rv: 5 },
};

/** Point-up crystal prism with its base centre at (cx, by), width w, height h, tilted `tilt` degrees. */
function crys(cx, by, w, h, tilt = 0) {
  const r = (tilt * Math.PI) / 180, c = Math.cos(r), s = Math.sin(r);
  return poly([[-w / 2, 0], [-w / 2, -h * 0.68], [0, -h], [w / 2, -h * 0.68], [w / 2, 0], [0, w * 0.12]].map(([x, y]) => [cx + x * c - y * s, by + x * s + y * c]));
}

/** Open spiral (hypnosis, hex swirls). */
function spiral(cx, cy, r, turns, start = 0) {
  const pts = [];
  for (let i = 0; i <= turns * 16; i++) pts.push(polar(cx, cy, (r * i) / (turns * 16), start + i * 22.5));
  return smooth(pts, false, 1);
}

/** A face-down card (violet back, gold border, star emblem) centred at (cx, cy), rotated `rot`. */
function card(a, cx, cy, rot, s = 1) {
  const w = 30 * s, h = 44 * s;
  a.begin(`rotate(${rot} ${cx} ${cy})`);
  a.mass(poly([[cx - w, cy - h], [cx + w, cy - h], [cx + w, cy + h], [cx - w, cy + h]]), { ...P.card, ow: 5, sv: [6, 6], hv: [4, 4] });
  a.line(poly([[cx - w + 7, cy - h + 7], [cx + w - 7, cy - h + 7], [cx + w - 7, cy + h - 7], [cx - w + 7, cy + h - 7]]), 3, GOLD, 0.8);
  a.fill(star(cx, cy, 4, 18 * s, 6 * s), GOLD).fill(ellipse(cx, cy, 4 * s), "#ff006e");
  return a.end();
}

const RECIPES = {
  /** Draw two — a great arcane eye opens over a grimoire and two cards spiral up out of its pages. */
  "arcane-insight"() {
    const a = new Art("arcane-insight");
    a.backdrop("#120830", "#34186e", "#160a30", { pool: "#c77dff", poolAt: [256, 170], poolR: 260, poolAlpha: 0.4 });
    // Eye sigil: rune ring, rays, almond eye with a cyan iris and a slit pupil.
    a.line(`${ellipse(256, 160, 150, 92)}${ellipse(256, 160, 132, 80)}`, 3, "#c77dff", 0.3);
    for (let i = 0; i < 16; i++) {
      const [x1, y1] = polar(256, 160, 112, i * 22.5), [x2, y2] = polar(256, 160, i % 2 ? 132 : 150, i * 22.5);
      a.line(`M${f(x1)} ${f(y1 * 0.6 + 64)}L${f(x2)} ${f(y2 * 0.6 + 64)}`, 4, "#e0b8ff", 0.45);
    }
    a.glow(256, 160, 120, "#e0b8ff", 0.7);
    a.mass("M150 160Q256 74 362 160Q256 246 150 160Z", { base: "#f3e8ff", shade: "#b48cff", light: "#ffffff", ow: 6, sv: [8, 8], hv: [5, 5] });
    a.mass(ellipse(256, 160, 40), { base: "#3fa9ff", shade: "#1f5fbf", light: "#bfe6ff", ow: 4, sv: [8, 8], hv: [5, 5] });
    a.line(ellipse(256, 160, 28), 3, "#9be7ff", 0.8);
    a.fill("M256 128C266 144 266 176 256 192C246 176 246 144 256 128Z", INK).fill(ellipse(242, 146, 6), "#ffffff");
    a.line("M150 160Q256 74 362 160M150 160Q256 246 362 160", 7);
    a.line("M168 120L180 136M210 98L216 116M256 92V110M302 98L296 116M344 120L332 136", 5, INK);
    // Grimoire: cover, two pages, page lines, light welling up.
    a.mass(poly([[112, 352], [256, 336], [400, 352], [394, 418], [256, 404], [118, 418]]), { ...P.cover, ow: 6, sv: [8, 8] });
    a.glow(256, 352, 130, "#fff1c1", 0.55);
    a.mass(poly([[124, 344], [252, 330], [256, 398], [130, 410]]), { ...P.page, ow: 5, sv: [8, 6], hv: [4, 4] });
    a.mass(poly([[388, 344], [260, 330], [256, 398], [382, 410]]), { ...P.page, ow: 5, sv: [8, 6], hv: [4, 4] });
    a.line("M146 358L232 349M148 372L234 363M150 386L234 377M366 358L280 349M364 372L278 363M362 386L278 377", 3, "#c2b08a");
    // Spiral trails out of the pages to the two cards.
    a.line(smooth([[236, 340], [214, 312], [168, 304], [150, 274], [170, 252]], false), 6, "#9be7ff", 0.65);
    a.line(smooth([[276, 338], [304, 318], [366, 312], [384, 280], [356, 254]], false), 7, "#e0b8ff", 0.7);
    card(a, 176, 252, -20, 1);
    card(a, 338, 236, 14, 1.3);
    a.motes({ seed: 61, count: 16, box: [110, 200, 410, 340], size: [3, 8], color: ["#9be7ff", "#e0b8ff", "#fff1c1"], alpha: [0.5, 1] });
    return a;
  },

  /** Copy a creature — a crystal prism splits a wolf into its translucent mirrored echo, rippling outward. */
  "arcane-echo"() {
    const a = new Art("arcane-echo");
    a.backdrop("#0c1a2e", "#1e3a6a", "#120a26", { pool: "#5ce1e6", poolAt: [256, 240], poolR: 260, poolAlpha: 0.35 });
    a.ground(352, "#120a26", "#24305a", { spot: "#5ce1e6", spotAt: [256, 380], spotR: 220 });
    // Echo ripples around the prism.
    for (const [r, o] of [[70, 0.7], [110, 0.5], [150, 0.34], [190, 0.2]]) a.line(ellipse(256, 244, r, r * 0.9), 4, "#9ff7f0", o);
    // A grey wolf facing the prism (viewer's left), and its ghostly mirrored copy (right).
    const wolf = [
      [limb([[92, 300], [70, 280], [64, 248]], [18, 14, 6]), 0],
      [limb([[120, 320], [116, 370]], [16, 12]), 1],
      [limb([[178, 320], [184, 370]], [16, 12]), 1],
      [smooth([[96, 292], [130, 268], [180, 266], [212, 290], [200, 332], [150, 340], [106, 330]]), 0],
      [limb([[132, 320], [130, 374]], [20, 16]), 0],
      [limb([[194, 316], [202, 374]], [20, 16]), 0],
      [poly([[200, 252], [206, 216], [226, 246]]), 0],
      [smooth([[192, 262], [210, 238], [238, 240], [262, 260], [256, 274], [230, 280], [204, 284]]), 0],
    ];
    const fur = { ...M.fur, rim: "#5ce1e6", rv: 4 };
    const fit = "translate(150 372) scale(0.9) translate(-150 -372)";
    a.begin(`translate(-30 0) ${fit}`);
    for (const [d, dark] of wolf) a.mass(d, dark ? { ...M.fur, base: "#74829f", sv: [5, 5] } : { ...fur, sv: [8, 8] });
    a.fill(ellipse(232, 254, 4.5), INK).fill(ellipse(260, 262, 5, 4), INK);
    a.end();
    a.begin(`translate(542 0) scale(-1 1) ${fit}`);
    for (const [d] of wolf) a.fill(d, "#5ce1e6", 0.3).line(d, 4, "#9ff7f0", 0.85);
    a.fill(ellipse(232, 254, 4.5), "#e6fbff");
    a.end();
    // Light passing in, splitting out.
    a.fill(poly([[244, 260], [190, 250], [190, 270]]), "#ffffff", 0.25);
    a.fill(poly([[268, 230], [330, 214], [330, 246]]), "#9ff7f0", 0.35).fill(poly([[268, 250], [330, 262], [330, 290]]), "#c77dff", 0.3);
    // The prism.
    a.glow(256, 240, 110, "#e6fbff", 0.6);
    a.mass(poly([[256, 112], [298, 228], [256, 384], [214, 228]]), { ...P.prism, ow: 6, sv: [10, 10], hv: [6, 6] });
    a.line("M256 112V384M214 228H298M256 112L236 228L256 384", 3, "#ffffff", 0.6);
    a.fill(star(256, 112, 4, 30, 5), "#ffffff");
    a.motes({ seed: 62, count: 14, box: [90, 120, 430, 380], size: [3, 7], color: ["#9ff7f0", "#c77dff", "#ffffff"], alpha: [0.5, 1] });
    return a;
  },

  /** Gain an empty mana crystal — a big hollow cyan crystal grows out of rock, ringed by growth halos and buds. */
  "growing-crystal"() {
    const a = new Art("growing-crystal");
    a.backdrop("#081428", "#14306a", "#0a1430", { pool: "#3fa9ff", poolAt: [256, 220], poolR: 270, poolAlpha: 0.45 });
    a.fill(shard(50, 300, 70, 170, { seed: 4, n: 6 }), "#0e1e40").fill(shard(470, 280, 80, 190, { seed: 7, n: 6 }), "#0e1e40");
    a.ground(360, "#0a1430", "#1a2c5a", { spot: "#3fa9ff", spotAt: [256, 390], spotR: 210 });
    // Growth rings on the ground.
    for (const [rx, o] of [[118, 0.7], [160, 0.45], [200, 0.25]]) a.line(ellipse(256, 380, rx, rx * 0.2), 4, "#9be7ff", o);
    a.glow(256, 250, 160, "#9be7ff", 0.55);
    // Budding side crystals (behind), the big hollow crystal, front buds.
    for (const [x, y, w, h, t] of [[176, 372, 44, 110, -28], [340, 370, 50, 130, 24], [138, 386, 26, 60, -50]]) a.mass(crys(x, y, w, h, t), { ...P.crystal, ow: 5, sv: [6, 6], hv: [4, 4] });
    a.mass(crys(256, 376, 128, 274), { ...P.crystal, rim: "#e6fbff", rv: 5, ow: 7, sv: [14, 12], hv: [8, 8] });
    // Hollow core: dark interior, bright inner edges = an empty crystal.
    a.fill(crys(256, 350, 76, 210), "#0a1a3a", 0.9);
    a.line(crys(256, 350, 76, 210), 4, "#bfe6ff", 0.9);
    a.line("M256 102V140M196 190L218 210M316 190L294 210M256 376V350", 4, "#e6fbff", 0.7);
    a.glow(256, 260, 34, "#3fa9ff", 0.35);
    // Rock cluster cradling the base.
    for (const [x, y, rx, ry, seed] of [[196, 388, 48, 26, 1], [318, 390, 52, 26, 2], [256, 400, 60, 22, 3], [380, 400, 30, 16, 4]]) a.mass(shard(x, y, rx, ry, { seed, n: 7, jitter: 0.15 }), { ...P.stone, ow: 5, sv: [6, 6], hv: [4, 4] });
    a.mass(crys(366, 398, 24, 48, 36), { ...P.crystal, ow: 4, sv: [4, 4], hv: [3, 3] });
    a.fill(star(206, 150, 4, 22, 4), "#ffffff").fill(star(320, 126, 4, 16, 3), "#ffffff", 0.9);
    a.motes({ seed: 63, count: 12, box: [110, 110, 410, 360], size: [3, 7], color: ["#bfe6ff", "#3fa9ff"], alpha: [0.5, 1] });
    return a;
  },

  /** Token — a single cyan mana drop flares into a four-point spark above an open palm (1 mana, this turn only). */
  "mana-spark"() {
    const a = new Art("mana-spark");
    a.backdrop("#0a1028", "#1a2a5a", "#0a0e22", { pool: "#3fa9ff", poolAt: [256, 250], poolR: 230, poolAlpha: 0.45 });
    // Open palm from below.
    const skin = { ...M.skin, rim: "#3fa9ff", rv: 4 };
    a.begin("translate(0 -26)");
    a.mass(limb([[256, 540], [256, 420]], [96, 104]), { ...skin, sv: [10, 8] });
    for (const [x, tx, ty] of [[220, 206, 344], [244, 240, 330], [268, 272, 330], [290, 306, 346]]) a.mass(limb([[x, 392], [tx, ty]], [26, 22]), { ...skin, ow: 5, sv: [6, 6], hv: [4, 4] });
    a.mass(limb([[302, 420], [338, 392], [350, 370]], [30, 24, 22]), { ...skin, ow: 5, sv: [6, 6], hv: [4, 4] });
    a.mass(ellipse(256, 410, 56, 30), { ...skin, sv: [8, 8], hv: [5, 5] });
    a.line("M222 404C240 414 270 414 288 404", 3, M.skin.shade);
    a.glow(256, 380, 70, "#3fa9ff", 0.5);
    a.end();
    // The flare: glow, long four-point flash, gem.
    a.glow(256, 254, 170, "#9be7ff", 0.75);
    a.fill(star(256, 254, 4, 150, 14), "#e6fbff", 0.9);
    a.fill(star(256, 254, 4, 70, 10, -45), "#ffffff", 0.75);
    a.mass(poly([[256, 214], [284, 254], [256, 300], [228, 254]]), { ...P.crystal, ow: 5, sv: [8, 8], hv: [5, 5] });
    a.line("M228 254H284M256 214L246 254L256 300", 3, "#e6fbff", 0.7);
    a.motes({ seed: 64, count: 8, box: [170, 150, 340, 330], size: [3, 6], color: ["#bfe6ff", "#ffffff"], alpha: [0.5, 1] });
    return a;
  },

  /** Summon two Scrap Golems — a spectral hammer strikes an arcane anvil and scrap flies together into two golems. */
  "golem-forge"() {
    const a = new Art("golem-forge");
    a.backdrop("#140a26", "#3a1f5e", "#120a20", { pool: "#c77dff", poolAt: [256, 300], poolR: 260, poolAlpha: 0.4 });
    // Forge wall: brick arch with a furnace mouth.
    a.fill("M140 0V170C140 110 196 74 256 74C316 74 372 110 372 170V0Z", "#1e1236");
    a.fill("M196 210C196 160 316 160 316 210V250H196Z", "#2a0c1a").glow(256, 220, 70, "#ff7b00", 0.5);
    a.ground(350, "#160c24", "#2e1c4e", { spot: "#c77dff", spotAt: [256, 396], spotR: 220 });
    // Rune circle.
    a.line(`${ellipse(256, 396, 210, 40)}${ellipse(256, 396, 180, 32)}`, 4, "#c77dff", 0.6);
    for (let i = 0; i < 12; i++) {
      const [x, y] = polar(256, 396, 195, i * 30);
      a.fill(poly([[x, y * 1 - 5], [x + 4, y], [x, y + 5], [x - 4, y]]), "#e0b8ff");
    }
    // Two scrap golems being assembled (left one still missing its head, right one its arm).
    const golem = (cx, s, flip) => {
      a.begin(`translate(${cx} 390) scale(${flip * s} ${s})`);
      a.mass(limb([[-24, -62], [-26, 0]], [24, 22]), { ...P.iron, ow: 5, sv: [5, 5] });
      a.mass(limb([[24, -62], [26, 0]], [24, 22]), { ...P.iron, ow: 5, sv: [5, 5] });
      a.mass(limb([[-48, -136], [-74, -98], [-68, -62]], [22, 20, 20]), { ...P.copper, ow: 5, sv: [5, 5], hv: [3, 3] });
      a.mass(smooth([[-50, -150], [0, -160], [50, -150], [54, -100], [48, -56], [0, -48], [-48, -56], [-54, -100]], true, 0.6), { ...P.iron, ow: 6, sv: [10, 10] });
      a.line("M-52 -132C-20 -126 20 -126 52 -132M-54 -78C-20 -72 20 -72 54 -78", 6, "#7a4420");
      a.glow(0, -104, 34, "#c77dff", 0.7);
      a.fill(star(0, -104, 6, 14, 6), "#f0d8ff");
      return a.end();
    };
    golem(146, 0.9, 1);
    golem(366, 0.9, -1);
    // Left golem's bucket head, right golem's chain arm: flying in.
    a.mass(poly([[124, 212], [170, 206], [176, 246], [126, 252]]), { ...P.iron, ow: 5, sv: [6, 6], hv: [4, 4] });
    a.glow(150, 230, 24, "#ffbe0b", 0.8).fill(ellipse(150, 230, 7), "#ffe066");
    a.line("M150 256V286M140 262L134 284M160 262L166 284", 4, "#e0b8ff", 0.7);
    a.mass(limb([[404, 238], [430, 270], [424, 300]], [20, 18, 16]), { ...P.copper, ow: 5, sv: [4, 4], hv: [3, 3] });
    a.mass(ellipse(424, 312, 18), { ...P.anvil, ow: 5, sv: [5, 5], hv: [3, 3] });
    a.line("M400 270L384 280M410 290L392 296", 4, "#e0b8ff", 0.7);
    // Gears + scrap plates converging.
    for (const [x, y, r] of [[96, 150, 22], [418, 160, 26], [330, 128, 14]]) {
      a.mass(star(x, y, 9, r, r * 0.76), { ...P.copper, ow: 4, sv: [4, 4], hv: [3, 3] }).fill(ellipse(x, y, r * 0.35), INK);
    }
    a.mass(shard(196, 128, 18, 12, { seed: 5, n: 5 }), { ...P.iron, ow: 4, sv: [3, 3], hv: [2, 2] });
    a.mass(shard(408, 214, 14, 10, { seed: 6, n: 5 }), { ...P.iron, ow: 4, sv: [3, 3], hv: [2, 2] });
    // Anvil, spectral hammer mid-strike, flash.
    a.mass("M196 308H316C330 308 344 300 354 290L362 304C350 320 334 328 316 330L300 330L292 352H310V370H202V352H220L212 330H196Z", { ...P.anvil, ow: 6, sv: [8, 6], hv: [5, 5] });
    a.mass(limb([[310, 196], [272, 268]], [14, 14]), { ...P.rune, ow: 5, sv: [4, 4], hv: [3, 3] });
    a.mass(poly([[226, 252], [292, 286], [278, 312], [212, 278]]), { ...P.rune, ow: 6, sv: [6, 6], hv: [4, 4] });
    a.glow(250, 308, 90, "#fff1c1", 0.8);
    a.fill(star(250, 306, 8, 66, 16, -10), "#ffe066").fill(star(250, 306, 8, 36, 10, 12), "#ffffff");
    a.motes({ seed: 65, count: 18, box: [120, 220, 400, 340], size: [3, 7], color: ["#ffbe0b", "#ffe066", "#e0b8ff"], alpha: [0.6, 1] });
    return a;
  },

  /** Transform into a 1/1 Toad — a hex bolt strikes a knight, and from the seam on he is already a fat toad. */
  "toad-hex"() {
    const a = new Art("toad-hex");
    a.backdrop("#10201a", "#2c2a5a", "#120a26", { pool: "#7bd389", poolAt: [290, 260], poolR: 250, poolAlpha: 0.35 });
    a.ground(360, "#120a26", "#24304a", { spot: "#7bd389", spotAt: [290, 396], spotR: 200 });
    a.line(spiral(290, 270, 190, 2.2, 20), 5, "#7bd389", 0.35);
    a.shadow(290, 396, 120, 16);
    a.defs.push(`<clipPath id="toad-hex-L"><rect width="290" height="512"/></clipPath><clipPath id="toad-hex-R"><rect x="290" width="222" height="512"/></clipPath>`);
    // Knight half (left of the seam), startled.
    const steel = { ...M.steel, rim: "#c77dff", rv: 4 };
    a.add(`<g clip-path="url(#toad-hex-L)">`);
    a.mass(limb([[258, 330], [254, 392]], [32, 28]), { ...steel, sv: [6, 6] });
    a.mass(limb([[228, 254], [196, 296], [184, 250]], [30, 24, 22]), { ...steel, sv: [6, 6] });
    a.mass(ellipse(180, 240, 16), { ...M.leather, ow: 5, sv: [4, 4], hv: [3, 3] });
    a.mass(poly([[214, 236], [366, 236], [350, 344], [230, 344]]), { ...steel, sv: [10, 8] });
    a.mass(poly([[240, 250], [340, 250], [332, 340], [248, 340]]), { ...M.tabard, ow: 4, sv: [6, 6], hv: [4, 4] });
    a.mass(limb([[250, 160], [230, 120], [244, 100]], [22, 16, 8]), { base: "#ff4d6d", shade: "#a8243c", light: "#ff8aa0", ow: 4, sv: [4, 4], hv: [3, 3] });
    a.mass(ellipse(290, 196, 52, 50), { ...steel, sv: [10, 10] });
    a.fill(poly([[242, 192], [338, 192], [338, 210], [242, 210]]), INK);
    a.fill(ellipse(266, 201, 9), "#ffffff").fill(ellipse(268, 202, 3.5), INK);
    a.fill("M222 150C228 160 230 170 222 176C214 170 216 160 222 150Z", "#9be7ff");
    a.end();
    // Toad half (right of the seam).
    a.add(`<g clip-path="url(#toad-hex-R)">`);
    a.mass(blob(374, 382, 38, 16, { seed: 3 }), { ...P.toad, ow: 5, sv: [4, 4], hv: [3, 3] });
    a.mass(ellipse(290, 300, 96, 84), { ...P.toad, sv: [12, 12], hv: [8, 8] });
    a.mass(ellipse(290, 324, 64, 50), { ...M.cream, ow: 0, sv: [6, 6], hv: [4, 4] });
    a.mass(ellipse(290, 224, 74, 52), { ...P.toad, sv: [10, 10], hv: [6, 6] });
    a.mass(ellipse(324, 182, 26, 24), { ...P.toad, ow: 5, sv: [5, 5], hv: [3, 3] });
    a.fill(ellipse(324, 182, 17), "#ffd34d").fill(ellipse(326, 184, 8, 10), INK).fill(ellipse(320, 178, 4), "#ffffff");
    a.line("M290 246C320 262 346 256 362 236", 5);
    a.fill(ellipse(344, 300, 8), "#3d7a2a", 0.8).fill(ellipse(366, 268, 6), "#3d7a2a", 0.8).fill(ellipse(330, 340, 6), "#3d7a2a", 0.6);
    a.end();
    // The seam where the hex is spreading.
    const seam = zigzag([290, 130], [290, 400], { segments: 9, amp: 9, seed: 4 });
    a.line(seam, 14, "#c77dff", 0.5).line(seam, 5, "#f0d8ff");
    // Hex bolt from the upper left.
    a.glow(110, 112, 60, "#7bd389", 0.7);
    for (const [seed, w, amp] of [[2, 14, 18], [8, 7, 24]]) {
      const b = zigzag([108, 110], [262, 228], { segments: 5, amp, seed });
      a.line(b, w + 8).line(b, w, "#7bd389").line(b, w * 0.35, "#f0ffe0");
    }
    a.fill(star(108, 110, 5, 30, 12), "#c77dff").fill(star(108, 110, 5, 16, 6), "#ffffff");
    a.glow(266, 226, 50, "#d8f5a2", 0.8);
    a.fill(star(266, 226, 6, 30, 10), "#f0ffe0");
    // Bubbles.
    for (const [x, y, r] of [[400, 160, 12], [420, 210, 8], [380, 120, 7], [130, 300, 9], [150, 340, 6]]) a.line(ellipse(x, y, r), 3, "#a8e07a", 0.85).fill(ellipse(x - r * 0.35, y - r * 0.35, r * 0.25), "#ffffff", 0.8);
    a.motes({ seed: 66, count: 10, box: [120, 120, 420, 380], size: [3, 7], color: ["#a8e07a", "#c77dff"], alpha: [0.5, 1] });
    return a;
  },

  /** Take control of an enemy — a giant spectral hand works a hulking brute like a puppet, its eyes and brow sigil lit. */
  "mind-thrall"() {
    const a = new Art("mind-thrall");
    a.backdrop("#0c0420", "#3a0e5a", "#140626", { pool: "#b5179e", poolAt: [256, 160], poolR: 300, poolAlpha: 0.5 });
    for (let i = -4; i <= 4; i++) a.fill(poly([[256, 40], [256 + i * 70 - 20, 512], [256 + i * 70 + 20, 512]]), "#e0b8ff", 0.05);
    a.ground(380, "#120626", "#2a0e46", { spot: "#c77dff", spotAt: [256, 420], spotR: 200 });
    a.line(`${ellipse(256, 420, 180, 34)}${ellipse(256, 420, 150, 26)}`, 4, "#c77dff", 0.5);
    a.shadow(256, 410, 130, 18);
    // The brute: hunched troll, arms hanging limp from the strings.
    const b = P.brute;
    a.begin("translate(256 410) scale(0.92) translate(-256 -410)");
    a.mass(limb([[218, 340], [210, 404]], [40, 36]), { ...b, sv: [6, 6] });
    a.mass(limb([[294, 340], [302, 404]], [40, 36]), { ...b, sv: [6, 6] });
    a.mass(blob(256, 314, 116, 78, { seed: 9, n: 10, jitter: 0.06 }), { ...b, sv: [14, 12], hv: [8, 8] });
    a.mass(blob(256, 334, 60, 40, { seed: 5, n: 8, jitter: 0.06 }), { base: "#8aa0a4", shade: "#5a7078", light: "#b8ccd0", ow: 0, sv: [6, 6], hv: [4, 4] });
    a.mass(limb([[158, 268], [128, 330], [138, 380]], [52, 40, 36]), { ...b, sv: [8, 8] });
    a.mass(limb([[354, 268], [384, 330], [374, 380]], [52, 40, 36]), { ...b, sv: [8, 8] });
    a.mass(blob(140, 392, 28, 22, { seed: 3 }), { ...b, ow: 5, sv: [5, 5], hv: [3, 3] });
    a.mass(blob(372, 392, 28, 22, { seed: 4 }), { ...b, ow: 5, sv: [5, 5], hv: [3, 3] });
    a.mass(blob(256, 248, 66, 46, { seed: 6, n: 9, jitter: 0.08 }), { ...b, sv: [10, 10] });
    // Head sunk between the shoulders, horns, glowing eyes, spiral sigil on the brow, slack tusked jaw.
    for (const s of [-1, 1]) a.mass(limb([[256 + s * 30, 210], [256 + s * 62, 190], [256 + s * 70, 156]], [22, 14, 2], { capEnd: false }), { ...M.bone, ow: 4, sv: [3, 3], hv: [2, 2] });
    a.mass(smooth([[214, 230], [222, 196], [256, 182], [290, 196], [298, 230], [282, 256], [230, 256]], true, 0.9), { ...b, sv: [8, 8] });
    a.glow(256, 214, 60, "#c77dff", 0.7);
    a.line(spiral(256, 206, 16, 2), 4, "#f0d8ff");
    for (const x of [238, 274]) a.fill(ellipse(x, 228, 9, 6), "#f0d8ff").glow(x, 228, 18, "#c77dff", 0.9);
    a.line("M236 244C250 250 262 250 276 244", 4);
    a.fill(poly([[240, 244], [244, 232], [248, 245]]), M.bone.base).fill(poly([[264, 245], [268, 232], [272, 244]]), M.bone.base);
    a.end();
    // Puppet strings from the fingertips to the wrists and the brow.
    const tips = [[172, 176], [222, 190], [290, 190], [340, 176]];
    for (const [[x1, y1], [x2, y2]] of tips.map((t, i) => [t, [[140, 380], [240, 214], [272, 214], [372, 380]][i]])) {
      a.line(`M${x1} ${y1}L${x2} ${y2}`, 6, "#c77dff", 0.35).line(`M${x1} ${y1}L${x2} ${y2}`, 2.5, "#f0d8ff");
    }
    // The spectral hand above: wrist from off-frame, back of the hand, four spread bent fingers, thumb.
    a.add(`<g opacity="0.92">`);
    a.glow(256, 110, 170, "#e0b8ff", 0.55);
    const h = P.ghost;
    a.mass(limb([[262, -40], [258, 70]], [100, 96]), { ...h, sv: [8, 8], hv: [5, 5] });
    a.mass(limb([[318, 92], [374, 104], [396, 146]], [40, 30, 24]), { ...h, ow: 5, sv: [6, 6], hv: [4, 4] });
    for (const [[tx, ty], kx] of tips.map((t, i) => [t, [196, 236, 278, 318][i]])) {
      a.mass(limb([[kx, 108], [(kx + tx) / 2 + (tx < 256 ? -10 : 10), 136], [tx, ty]], [34, 28, 22]), { ...h, ow: 5, sv: [6, 6], hv: [4, 4] });
    }
    a.mass(smooth([[188, 70], [256, 54], [326, 70], [334, 108], [256, 124], [182, 108]], true, 0.8), { ...h, sv: [10, 10], hv: [6, 6] });
    a.line("M204 104L210 92M240 110L242 98M276 110L274 98M310 104L304 92", 4, "#6a3ab8", 0.7);
    a.end();
    for (const [x, y] of tips) a.glow(x, y, 16, "#ffffff", 0.9).fill(ellipse(x, y, 5), "#ffffff");
    a.motes({ seed: 67, count: 14, box: [100, 100, 420, 380], size: [3, 7], color: ["#f0d8ff", "#c77dff", "#ff006e"], alpha: [0.4, 0.9] });
    return a;
  },
};

export default RECIPES;
