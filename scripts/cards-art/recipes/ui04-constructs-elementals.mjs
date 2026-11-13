// UI-04 recipes (constructs-elementals). See art.mjs / docs/cards/UI_VISUAL_SYSTEM.md §6.
// Constructs follow the construct template (stone-golem) but differ in scale, material and silhouette:
// little brass clockwork sentinel · massive riveted iron colossus · patched junk scrap golem (token).
import { Art, INK, blob, ellipse, limb, poly, polar, shard, smooth, star, zigzag } from "../lib.mjs";
import { M } from "../materials.mjs";

// Local material ramps (palette-aligned hexes).
const R = {
  brass: { base: "#d9a441", shade: "#8a5a1c", light: "#ffe08a" },
  copper: { base: "#c46a3a", shade: "#7a3a1e", light: "#f0a070" },
  iron: { base: "#5a6078", shade: "#33374a", light: "#8a92ab" },
  ironDark: { base: "#464b62", shade: "#272a3a", light: "#6e7590" },
  wood: { base: "#7a5434", shade: "#4a3020", light: "#a07850" },
  bark: { base: "#6b5034", shade: "#3e2c1c", light: "#93714a" },
  cyan: { base: "#3fa9ff", shade: "#1f5fb0", light: "#9be7ff" },
  fire: { base: "#ff7b00", shade: "#c2410c", light: "#ffbe0b" },
  flame: { base: "#ffe066", shade: "#ffbe0b", light: "#fff8d6" },
  cloud: { base: "#7a8cc8", shade: "#40508e", light: "#c3cff0" },
  storm: { base: "#bcd0ff", shade: "#7f94d6", light: "#eef3ff" },
};
const small = { sv: [4, 4], hv: [3, 3], ow: 4 };

/** Cog wheel outline (square-ish teeth). */
function gear(cx, cy, ro, ri, n, rot = 0) {
  const t = 360 / n / 4;
  const pts = [];
  for (let i = 0; i < n; i++) {
    const a = rot + (i * 360) / n;
    pts.push(polar(cx, cy, ri, a - 2 * t), polar(cx, cy, ro, a - t), polar(cx, cy, ro, a + t), polar(cx, cy, ri, a + 2 * t));
  }
  return poly(pts);
}
const rivets = (a, list, r = 4, color = "#8a92ab") => {
  for (const [x, y] of list) a.fill(ellipse(x, y, r), INK).fill(ellipse(x - 0.5, y - 0.5, r - 1.5), color);
};

const RECIPES = {
  /** Construct template, small scale — a cute brass clockwork sentinel on spindly legs, buckler + spear, one lens eye. */
  "clockwork-sentinel"() {
    const a = new Art("clockwork-sentinel");
    a.backdrop("#1e1236", "#3a2a5a", "#24163e", { pool: "#ffcf7a", poolAt: [256, 240], poolR: 250, poolAlpha: 0.3 });
    // Workshop: wall gears, a shelf with jars, pegged tools.
    a.fill(gear(84, 140, 62, 48, 10), "#2c1d4c").fill(ellipse(84, 140, 18), "#1e1236");
    a.fill(gear(440, 100, 46, 34, 8, 10), "#2c1d4c").fill(ellipse(440, 100, 12), "#1e1236");
    a.fill(gear(470, 196, 30, 22, 7), "#2c1d4c");
    a.fill("M330 236H512V248H330Z", "#2c1d4c");
    for (const [x, w, h] of [[360, 22, 34], [396, 30, 24], [440, 18, 40], [480, 26, 30]]) a.fill(`M${x - w / 2} 236V${236 - h + 6}Q${x} ${236 - h - 6} ${x + w / 2} ${236 - h + 6}V236Z`, "#2c1d4c");
    a.line("M30 230L70 290M60 236L40 300", 8, "#2c1d4c");
    a.ground(350, "#1e1236", "#4a3360", { spot: "#ffcf7a", spotAt: [256, 398], spotR: 160 });
    a.line("M40 390H180M330 410H480M90 450H240", 3, "#1e1236", 0.6);
    a.fill(gear(110, 420, 16, 11, 7), "#5a4378").fill(gear(420, 380, 12, 8, 6, 15), "#5a4378");
    a.shadow(256, 398, 104, 14);

    // Wind-up key on the back (behind the body, upper left), tilted.
    a.mass(limb([[214, 214], [164, 178]], 14), { ...R.brass, ...small });
    a.begin("rotate(35 146 164)");
    a.mass(ellipse(128, 164, 18, 14), { ...R.brass, ...small });
    a.mass(ellipse(164, 164, 18, 14), { ...R.brass, ...small });
    a.end();
    a.fill(ellipse(146, 164, 6), R.brass.shade);
    // Spindly legs, knee bolts, little feet.
    for (const s of [-1, 1]) {
      const x0 = 256 + s * 26;
      a.mass(limb([[x0, 316], [x0 + s * 10, 356], [x0 + s * 16, 390]], [14, 10, 10]), { ...R.copper, sv: [3, 3], hv: [2, 2], ow: 4 });
      a.mass(ellipse(x0 + s * 10, 356, 8), { ...R.brass, sv: [2, 2], hv: [2, 2], ow: 3 });
      a.mass(ellipse(x0 + s * 24, 394, 22, 9), { ...R.brass, ...small });
    }
    // Spear arm (viewer's right): shaft, steel tip, hand.
    a.mass(limb([[352, 384], [348, 250], [344, 132]], 7), { ...R.wood, sv: [2, 2], hv: [2, 2], ow: 4 });
    a.mass(poly([[344, 104], [356, 136], [344, 146], [332, 136]]), { ...M.steel, ...small });
    a.mass(limb([[318, 262], [340, 282], [348, 262]], [12, 10, 10]), { ...R.copper, sv: [3, 3], hv: [2, 2], ow: 4 });
    a.mass(ellipse(348, 256, 11), { ...R.brass, ...small });
    // Domed cap with a finial (peeks above the cog body).
    a.mass(limb([[256, 150], [256, 122]], 6), { ...R.copper, sv: [2, 2], hv: [1, 1], ow: 3 });
    a.mass(ellipse(256, 116, 9), { ...R.copper, ...small });
    a.mass("M206 182C208 132 304 132 306 182Z", { ...R.copper, sv: [8, 8], hv: [5, 5] });
    a.line("M222 160C240 150 272 150 290 160", 3, INK, 0.5);
    // Round cog body: teeth ring, brass face, rivets, belly grill.
    a.mass(gear(256, 254, 94, 82, 16, 11), { ...R.brass, shade: "#6e4614", base: "#b8862e", sv: [8, 8], ow: 6 });
    a.mass(ellipse(256, 254, 76), { ...R.brass, sv: [14, 12], hv: [8, 8], ow: 4 });
    rivets(a, Array.from({ length: 10 }, (_, i) => polar(256, 254, 66, i * 36 + 18)), 4, "#ffe08a");
    a.line("M226 300H286M222 312H290M228 324H284", 4, INK, 0.7);
    // Single cyan lens eye.
    a.glow(256, 238, 64, "#3fa9ff", 0.55);
    a.mass(ellipse(256, 238, 30), { ...M.steel, sv: [6, 6], hv: [4, 4], ow: 5 });
    a.mass(ellipse(256, 238, 20), { ...R.cyan, sv: [5, 5], hv: [4, 4], ow: 3 });
    a.fill(ellipse(256, 240, 8), INK).fill(ellipse(250, 232, 5), "#ffffff").fill(ellipse(262, 246, 2), "#ffffff");
    // Little round buckler (Escudo) in front, held by a thin arm.
    a.mass(limb([[194, 262], [168, 292]], 12), { ...R.copper, sv: [3, 3], hv: [2, 2], ow: 4 });
    a.mass(ellipse(158, 300, 44), { ...R.copper, sv: [9, 9], hv: [6, 6] });
    a.mass(ellipse(158, 300, 31), { ...R.brass, sv: [6, 6], hv: [4, 4], ow: 3 });
    a.mass(ellipse(158, 300, 10), { ...M.steel, sv: [3, 3], hv: [2, 2], ow: 3 });
    rivets(a, Array.from({ length: 6 }, (_, i) => polar(158, 300, 38, i * 60)), 3.5, "#ffe08a");
    a.add(`<path d="M126 282A36 36 0 0 1 150 264" fill="none" stroke="#ffffff" stroke-opacity="0.55" stroke-width="5"/>`);
    a.motes({ seed: 3, count: 8, box: [100, 120, 420, 360], size: [2, 5], color: "#ffe08a", alpha: [0.3, 0.7], shape: "circle" });
    return a;
  },

  /** Construct template, heavy scale — a massive riveted iron war colossus, furnace core, tower shield; low angle. */
  "iron-colossus"() {
    const a = new Art("iron-colossus");
    a.backdrop("#170812", "#4a1a1a", "#2a0e14", { pool: "#ff7b00", poolAt: [256, 300], poolR: 290, poolAlpha: 0.38 });
    // Foundry: smoke stacks with smoke, molten channel.
    a.fill(poly([[18, 512], [26, 120], [72, 120], [80, 512]]), "#240c18").fill(poly([[430, 512], [438, 80], [486, 80], [494, 512]]), "#240c18");
    a.fill("M16 112H82V128H16ZM428 72H496V88H428Z", "#36142a");
    a.fill(blob(54, 76, 56, 32, { seed: 3, n: 9 }), "#3a2a3a", 0.75).fill(blob(90, 40, 60, 26, { seed: 4, n: 9 }), "#3a2a3a", 0.5);
    a.fill(blob(462, 44, 66, 32, { seed: 5, n: 9 }), "#3a2a3a", 0.75);
    a.ground(378, "#1a0810", "#3a1418", { spot: "#ff7b00", spotAt: [256, 420], spotR: 230 });
    a.line("M0 470C80 450 140 486 230 462M300 486C380 456 440 490 512 466", 6, "#ff7b00", 0.6);
    a.shadow(256, 412, 196, 22, 0.6);

    // Pillar legs + wide feet (low camera: feet biggest, head smallest).
    a.mass(poly([[178, 316], [240, 316], [246, 400], [164, 400]]), { ...R.iron, sv: [10, 8] });
    a.mass(poly([[274, 316], [336, 316], [350, 400], [268, 400]]), { ...R.iron, sv: [10, 8] });
    a.mass(poly([[146, 394], [254, 394], [258, 418], [140, 418]]), { ...R.ironDark, sv: [6, 6] });
    a.mass(poly([[262, 394], [368, 394], [374, 418], [258, 418]]), { ...R.ironDark, sv: [6, 6] });
    a.line("M168 350H244M272 350H344", 4, INK, 0.6);
    // Right arm (viewer's right) hanging, huge fist.
    a.mass(limb([[364, 196], [394, 262], [392, 316]], [64, 54, 50]), { ...R.iron, sv: [12, 10] });
    a.line("M372 250L414 262M378 290L410 296", 4, INK, 0.6);
    a.mass(shard(394, 344, 42, 36, { seed: 7, n: 7, jitter: 0.1, rot: 15 }), { ...R.ironDark, sv: [10, 10] });
    a.line("M362 344L392 336L424 344", 4, INK, 0.7);
    // Exhaust pipes on the back with steam puffs.
    a.mass(limb([[214, 160], [206, 106]], 18), { ...R.ironDark, ...small });
    a.mass(limb([[310, 160], [318, 102]], 18), { ...R.ironDark, ...small });
    a.fill(blob(200, 86, 26, 18, { seed: 8 }), "#6a5a6a", 0.7).fill(blob(326, 82, 30, 18, { seed: 9 }), "#6a5a6a", 0.7);
    // Barrel torso of riveted plates.
    a.mass(poly([[150, 174], [374, 174], [360, 296], [318, 334], [206, 334], [164, 296]]), { ...R.iron, sv: [16, 14], hv: [10, 10], ow: 7 });
    a.line("M162 228H362M178 296H346M262 174V200", 4, INK, 0.7);
    rivets(a, [[172, 186], [200, 186], [324, 186], [352, 186], [176, 238], [348, 238], [190, 308], [334, 308], [226, 324], [298, 324]], 5);
    // Furnace core.
    a.glow(262, 258, 120, "#ff7b00", 0.7);
    a.mass(ellipse(262, 258, 46), { ...R.ironDark, sv: [8, 8], hv: [5, 5], ow: 6 });
    a.mass(ellipse(262, 258, 34), { ...R.fire, sv: [6, 6], hv: [4, 4], ow: 0 });
    a.fill(ellipse(258, 252, 18), "#ffe066");
    a.line("M244 228V288M262 224V292M280 228V288", 6);
    // Tiny head with a glowing visor slit.
    a.mass("M236 176L238 146C244 130 280 130 286 146L288 176Z", { ...R.ironDark, sv: [6, 6], hv: [4, 4] });
    a.glow(262, 156, 34, "#ff7b00", 0.7);
    a.fill(poly([[244, 150], [280, 150], [278, 160], [246, 160]]), INK).fill(poly([[248, 153], [276, 153], [275, 157], [249, 157]]), "#ffe066");
    // Massive layered pauldrons.
    for (const s of [-1, 1]) {
      const cx = 262 + s * 102;
      a.mass(ellipse(cx, 176, 64, 46), { ...R.iron, sv: [12, 12], hv: [8, 8], ow: 7 });
      a.mass(`M${cx - 58} 196C${cx - 30} 228 ${cx + 30} 228 ${cx + 58} 196L${cx + 54} 214C${cx + 26} 246 ${cx - 26} 246 ${cx - 54} 214Z`, { ...R.ironDark, sv: [5, 5], hv: [3, 3], ow: 5 });
      rivets(a, [[cx - 36, 162], [cx, 148], [cx + 36, 162]], 5);
    }
    // Tower shield (viewer's left) in front.
    a.mass("M96 170L198 156L206 378L152 406L102 378Z", { ...R.ironDark, sv: [12, 10], hv: [8, 8], ow: 7 });
    a.mass("M112 186L186 176L192 368L152 390L116 368Z", { ...R.iron, sv: [8, 8], hv: [6, 6], ow: 4 });
    a.line("M150 182V390M114 270H190", 8, R.ironDark.shade);
    a.mass(ellipse(150, 270, 20), { ...R.iron, ...small, ow: 5 });
    rivets(a, [[106, 182], [192, 170], [108, 270], [196, 270], [110, 362], [198, 366], [152, 398]], 5);
    a.fill("M184 190L190 366L178 372L174 196Z", "#ff7b00", 0.35);
    a.motes({ seed: 13, count: 16, box: [40, 120, 480, 420], size: [3, 7], color: ["#ffbe0b", "#ff7b00"], alpha: [0.5, 1] });
    return a;
  },

  /** Construct template, token — a patched junk golem: barrel torso, pipe arm, chain arm, bucket head, one eye. */
  "scrap-golem"() {
    const a = new Art("scrap-golem");
    a.backdrop("#1b1036", "#33285a", "#22163e", { pool: "#d8c08a", poolAt: [256, 236], poolR: 240, poolAlpha: 0.24 });
    // Junk piles with a wheel and a pipe.
    a.fill(blob(60, 370, 130, 90, { seed: 2, n: 9 }), "#2a1e48").fill(blob(458, 360, 120, 100, { seed: 6, n: 9 }), "#2a1e48");
    a.line(`${ellipse(104, 296, 34)}M104 262V330M70 296H138`, 8, "#2a1e48");
    a.fill(limb([[420, 300], [470, 240]], 22), "#2a1e48");
    a.ground(360, "#1b1036", "#3d2c66", { spot: "#d8c08a", spotAt: [256, 400], spotR: 150 });
    a.shadow(256, 400, 110, 15);

    // Legs: a pipe and a wooden stump.
    a.mass(limb([[226, 340], [222, 390]], 26), { ...M.steel, sv: [5, 5], hv: [3, 3], ow: 5 });
    a.mass(ellipse(216, 396, 26, 10), { ...R.iron, ...small });
    a.mass(poly([[272, 338], [306, 338], [310, 398], [268, 398]]), { ...R.wood, sv: [6, 6], hv: [4, 4], ow: 5 });
    a.line("M280 350V392M296 350V392", 3, INK, 0.5);
    // Chain arm (viewer's right) ending in an iron ball.
    const links = [[318, 246], [334, 264], [344, 286], [350, 310], [354, 332]];
    links.forEach(([x, y], i) => {
      const d = i % 2 ? ellipse(x, y, 8, 12) : ellipse(x, y, 12, 8);
      a.line(d, 12).line(d, 6, R.iron.light);
    });
    a.mass(ellipse(358, 360, 24), { ...R.iron, sv: [7, 7], hv: [5, 5], ow: 5 });
    a.fill(ellipse(350, 352, 5), "#ffffff", 0.4);
    // Barrel torso: staves, iron bands, a riveted patch.
    a.mass("M198 230C190 270 190 312 202 346L310 346C322 312 322 270 314 230Z", { ...R.wood, sv: [12, 10], hv: [7, 7] });
    a.line("M226 236C222 280 224 316 230 344M256 236V346M286 236C290 280 288 316 282 344", 3, INK, 0.5);
    a.mass("M196 256H316L318 270H194Z", { ...R.iron, sv: [2, 3], hv: [2, 2], ow: 4 });
    a.mass("M198 318H314L312 332H200Z", { ...R.iron, sv: [2, 3], hv: [2, 2], ow: 4 });
    a.mass(poly([[262, 280], [298, 276], [300, 306], [264, 310]]), { ...M.steel, ...small });
    rivets(a, [[268, 285], [292, 282], [270, 302], [294, 299]], 3);
    a.mass(ellipse(256, 230, 58, 12), { base: "#3e2a1c", shade: "#2a1c12", ow: 4, sv: [0, 0] });
    // Pipe arm (viewer's left) with flanges.
    a.mass(limb([[200, 252], [154, 278], [140, 326]], [22, 20, 20]), { ...R.copper, sv: [5, 5], hv: [3, 3] });
    a.mass(ellipse(154, 278, 15), { ...R.copper, ...small });
    a.mass(ellipse(140, 334, 16, 9), { ...R.copper, ...small });
    a.fill(ellipse(140, 335, 9, 4), INK);
    // Dented upside-down bucket head with one glowing eye and a bolt for the other.
    a.mass("M222 228L230 164L256 168L264 160L284 162L292 228Z", { ...R.iron, base: "#7a8098", sv: [8, 6], hv: [5, 5] });
    a.line("M224 214H290M256 168L250 186L262 196", 3, INK, 0.6);
    a.glow(244, 194, 32, "#ffbe0b", 0.75);
    a.fill(ellipse(244, 194, 11), INK).fill(ellipse(244, 194, 7), "#ffe066");
    rivets(a, [[274, 194]], 6, "#9fb3c8");
    a.mass(limb([[270, 162], [276, 136], [290, 128]], 5, { capEnd: false }), { ...M.steel, sv: [1, 1], hv: [1, 1], ow: 3 });
    return a;
  },

  /** Elemental — a hunched swamp ent of gnarled bark: moss beard, green eyes, roots in murky water, regrowing sprouts. */
  "swamp-ent"() {
    const a = new Art("swamp-ent");
    a.backdrop("#0b1814", "#1f3a2c", "#10201a", { pool: "#9ad89a", poolAt: [240, 210], poolR: 260, poolAlpha: 0.3 });
    // Dead swamp trees, mist.
    a.fill(limb([[52, 520], [60, 260], [40, 140], [20, 100]], [44, 30, 16, 6]), "#0c1812");
    a.fill(limb([[58, 230], [100, 196], [126, 200]], [12, 8, 3]), "#0c1812");
    a.fill(limb([[462, 520], [456, 230], [480, 120]], [50, 32, 10]), "#0c1812");
    a.fill(limb([[458, 260], [412, 220], [396, 228]], [14, 8, 3]), "#0c1812");
    a.fill(blob(120, 300, 140, 22, { seed: 2 }), "#9ad89a", 0.1).fill(blob(400, 280, 130, 20, { seed: 4 }), "#9ad89a", 0.1);
    a.ground(346, "#0a1614", "#1e3a32", { spot: "#7bd389", spotAt: [256, 392], spotR: 180 });
    a.line("M30 380H130M380 372H490M60 450H200M320 470H470", 3, "#5f9a4a", 0.35);
    const bark = { ...R.bark, rim: "#7bd389", rv: 4 };
    // Branch crown behind the body, leaf clumps.
    for (const [pts, w] of [
      [[[272, 176], [302, 128], [336, 104], [356, 110]], [24, 16, 8, 3]],
      [[[246, 168], [232, 124], [206, 102]], [22, 12, 3]],
      [[[294, 180], [338, 160], [366, 166]], [18, 10, 3]],
    ]) a.mass(limb(pts, w, { capEnd: false }), { ...bark, sv: [4, 4], hv: [3, 3], ow: 5 });
    for (const [x, y, rx, ry, s] of [[336, 104, 26, 16, 1], [206, 104, 22, 14, 2], [364, 162, 20, 12, 3]]) a.mass(blob(x, y, rx, ry, { seed: s, n: 8, jitter: 0.25 }), { ...M.moss, ...small });
    // Root legs into the water.
    a.mass(limb([[222, 324], [194, 366], [164, 392]], [46, 30, 16], { capEnd: false }), { ...bark, sv: [7, 7] });
    a.mass(limb([[298, 324], [324, 366], [356, 394]], [46, 30, 16], { capEnd: false }), { ...bark, sv: [7, 7] });
    a.mass(limb([[256, 344], [254, 396]], [26, 12], { capEnd: false }), { ...bark, sv: [4, 4], hv: [3, 3] });
    // Long drooping arm (viewer's left) with twig fingers trailing to the water.
    a.mass(limb([[212, 214], [162, 266], [140, 330]], [42, 30, 24]), { ...bark, sv: [8, 8] });
    for (const [dx, dy] of [[-22, 30], [-6, 38], [12, 30]]) a.mass(limb([[140, 334], [140 + dx, 334 + dy]], [10, 2], { capEnd: false }), { ...bark, sv: [2, 2], hv: [1, 1], ow: 4 });
    // Hunched trunk body.
    a.mass(smooth([[194, 196], [252, 150], [318, 166], [342, 244], [324, 334], [258, 356], [200, 336], [186, 270]], true, 0.9), { ...bark, sv: [16, 14], hv: [10, 10], ow: 7 });
    a.line("M306 200C318 240 316 290 300 330M214 290C220 312 230 330 246 344M280 300L292 316", 4, INK, 0.6);
    a.mass(blob(312, 174, 34, 14, { seed: 7, n: 8, jitter: 0.25 }), { ...M.moss, ...small });
    // Raised arm (viewer's right) with a sprouting leafy hand + healing glow (Regeneración).
    a.mass(limb([[318, 220], [372, 226], [390, 184]], [40, 30, 24]), { ...bark, sv: [8, 8] });
    for (const [dx, dy] of [[-12, -34], [6, -36], [22, -24]]) a.mass(limb([[390, 180], [390 + dx, 180 + dy]], [10, 2], { capEnd: false }), { ...bark, sv: [2, 2], hv: [1, 1], ow: 4 });
    a.glow(392, 156, 70, "#06d6a0", 0.55);
    const leaf = (x, y, dx, dy) => a.mass(limb([[x, y], [x + dx * 0.5 - dy * 0.25, y + dy * 0.5 + dx * 0.25], [x + dx, y + dy]], [2, 14, 2], { capEnd: false }), { ...M.moss, light: "#b7f5a0", sv: [2, 2], hv: [2, 2], ow: 3 });
    leaf(378, 148, -18, -22);
    leaf(398, 146, 10, -26);
    leaf(410, 160, 24, -10);
    leaf(222, 176, -20, -18);
    leaf(326, 330, 22, -10);
    // Bark face: brow ridge, glowing eyes, hollow mouth, moss beard.
    a.mass("M196 202C210 186 246 182 282 192L280 208C252 200 222 202 200 214Z", { ...bark, sv: [4, 4], hv: [3, 3], ow: 5 });
    a.glow(222, 220, 26, "#7bd389", 0.85).glow(262, 216, 26, "#7bd389", 0.85);
    a.fill(ellipse(222, 220, 9, 7), INK).fill(ellipse(262, 216, 9, 7), INK);
    a.fill(ellipse(222, 220, 5, 4), "#c8ffb0").fill(ellipse(262, 216, 5, 4), "#c8ffb0");
    a.fill(ellipse(244, 252, 16, 10), INK);
    a.mass("M204 246C220 268 266 268 288 244L286 292L276 272L268 304L256 274L246 308L236 276L224 300L218 268Z", { ...M.moss, sv: [5, 5], hv: [3, 3], ow: 4 });
    // Murky water over the roots, ripples.
    a.fill(blob(256, 398, 200, 18, { seed: 9, n: 10 }), "#2f5a4a", 0.75);
    a.line("M120 398C150 392 180 392 200 398M300 404C330 396 370 396 400 404M220 412C240 408 270 408 290 412", 3, "#9ad89a", 0.5);
    a.motes({ seed: 17, count: 12, box: [80, 90, 440, 360], size: [3, 7], color: ["#b7f5a0", "#06d6a0"], alpha: [0.4, 0.9], shape: "circle" });
    return a;
  },

  /** Elemental — a storm weaver: cloud-vortex lower body, wind-streamed hair, arms spread casting three forked bolts. */
  "storm-weaver"() {
    const a = new Art("storm-weaver");
    a.backdrop("#070c28", "#1c2a6a", "#0b1238", { pool: "#9ab8ff", poolAt: [256, 210], poolR: 260, poolAlpha: 0.35 });
    // Storm clouds at the corners, faint distant fork.
    a.fill(blob(60, 60, 140, 60, { seed: 2, n: 10 }), "#16205a").fill(blob(470, 40, 150, 60, { seed: 3, n: 10 }), "#16205a");
    a.fill(blob(80, 470, 170, 60, { seed: 4, n: 10 }), "#111a4a").fill(blob(450, 480, 160, 60, { seed: 5, n: 10 }), "#111a4a");
    a.line(zigzag([430, 60], [470, 200], { segments: 5, amp: 12, seed: 4 }), 3, "#ffe066", 0.3);

    // Three forked bolts thrown outward from the hands (drawn behind the figure).
    const bolt = (from, to, seed, fork) => {
      const d = zigzag(from, to, { segments: 6, amp: 18, seed });
      const fd = zigzag(fork[0], fork[1], { segments: 3, amp: 10, seed: seed + 7 });
      a.line(d + fd, 16).line(d + fd, 9, "#ffe066").line(d, 3.5, "#ffffff");
      a.glow(to[0], to[1], 40, "#ffe066", 0.7);
      a.mass(star(to[0], to[1], 6, 24, 9, seed * 13), { ...R.flame, ow: 3, sv: [2, 2], hv: [2, 2] });
    };
    bolt([138, 150], [84, 84], 3, [[116, 120], [72, 132]]);
    bolt([136, 160], [82, 306], 5, [[110, 230], [60, 236]]);
    bolt([376, 160], [440, 300], 8, [[406, 226], [454, 210]]);
    // Wind-streamed hair behind the head: three wavy strands sweeping right.
    const hair = { base: "#8fe0ff", shade: "#3a86c8", light: "#e0f8ff", sv: [6, 6], hv: [4, 4], ow: 5 };
    a.mass(limb([[262, 118], [304, 92], [352, 96], [396, 80]], [36, 30, 20, 3], { capEnd: false }), hair);
    a.mass(limb([[276, 132], [326, 120], [370, 134], [420, 118]], [40, 32, 22, 3], { capEnd: false }), hair);
    a.mass(limb([[280, 152], [320, 156], [356, 176], [398, 172]], [30, 24, 16, 3], { capEnd: false }), hair);
    // Vortex lower body with swirl lines and puffs.
    const cloud = { ...R.cloud, rim: "#ffe066", rv: 4 };
    a.mass(smooth([[196, 246], [316, 246], [334, 292], [296, 334], [276, 378], [258, 404], [246, 376], [220, 334], [180, 292]], true, 0.9), { ...cloud, sv: [12, 10], hv: [8, 8] });
    a.line("M200 280C240 296 290 290 322 272M216 316C250 328 286 320 304 306M240 352C256 358 270 354 280 346", 4, "#e2ecf5", 0.7);
    for (const [x, y, r, s] of [[184, 266, 26, 1], [330, 268, 24, 2], [212, 330, 18, 3], [300, 334, 18, 4]]) a.mass(blob(x, y, r, r * 0.75, { seed: s, n: 7 }), { ...cloud, sv: [4, 4], hv: [3, 3], ow: 4 });
    // Torso, arms spread, glowing hands.
    a.mass(smooth([[226, 186], [286, 186], [298, 244], [256, 262], [214, 244]], true, 0.8), { ...R.storm, sv: [10, 8] });
    a.mass("M222 196C240 210 272 210 290 196L288 212C270 226 242 226 224 212Z", { ...cloud, sv: [3, 3], hv: [2, 2], ow: 4 });
    a.mass(limb([[230, 200], [184, 184], [146, 154]], [22, 18, 16]), { ...R.storm, sv: [5, 5], hv: [3, 3] });
    a.mass(limb([[284, 200], [330, 190], [368, 164]], [22, 18, 16]), { ...R.storm, sv: [5, 5], hv: [3, 3] });
    a.glow(140, 150, 50, "#ffe066", 0.8).glow(374, 158, 50, "#ffe066", 0.8);
    a.mass(ellipse(140, 150, 14), { ...R.storm, ...small });
    a.mass(ellipse(374, 158, 14), { ...R.storm, ...small });
    // Head, glowing eyes, bangs.
    a.mass(limb([[256, 186], [256, 172]], 16), { ...R.storm, sv: [3, 0], hv: [2, 2], ow: 4 });
    a.mass(smooth([[228, 146], [240, 122], [266, 118], [284, 134], [284, 162], [266, 180], [244, 178], [230, 164]], true, 0.95), { ...R.storm, sv: [8, 6], hv: [5, 5] });
    a.mass("M226 150C222 120 250 104 274 110C292 116 296 136 290 150C280 134 264 132 252 136C242 138 232 144 226 150Z", { ...hair, sv: [5, 5], hv: [3, 3] });
    a.glow(246, 152, 14, "#ffe066", 0.9).glow(272, 150, 14, "#ffe066", 0.9);
    a.fill("M238 150L254 152L252 156L240 155Z", "#fff8d6").fill("M264 151L280 148L280 153L266 155Z", "#fff8d6");
    a.line("M252 168C258 170 264 170 268 167", 3);
    a.motes({ seed: 23, count: 14, box: [60, 70, 460, 400], size: [3, 7], color: ["#ffe066", "#e2ecf5"], alpha: [0.4, 1] });
    return a;
  },

  /** Elemental — a fluffy phoenix chick hatching in an ember nest, flame crest + stubby wings, one spark flying off. */
  "phoenix-chick"() {
    const a = new Art("phoenix-chick");
    a.backdrop("#3a0c1a", "#a8341a", "#4a1414", { pool: "#ffbe0b", poolAt: [256, 250], poolR: 270, poolAlpha: 0.45 });
    a.fill("M0 340L70 270L120 310L170 260L200 340ZM312 340L360 280L410 300L460 250L512 290V340Z", "#5a1414", 0.8);
    a.ground(350, "#2a0810", "#5a1a1a", { spot: "#ffbe0b", spotAt: [256, 390], spotR: 190 });
    a.glow(256, 360, 160, "#ff7b00", 0.45);
    // Nest of charred twigs with glowing embers (back rim).
    a.mass(smooth([[130, 364], [180, 334], [256, 326], [332, 334], [382, 364], [340, 404], [256, 414], [172, 404]], true, 0.9), { base: "#5a3020", shade: "#2e160e", light: "#7a4a30", sv: [8, 8], hv: [5, 5] });
    a.line("M146 360L200 344M176 380L250 360M270 352L344 368M300 344L368 352M210 398L300 388", 4, "#ff7b00", 0.8);
    // Stubby flame-feathered wings (behind the body).
    const wing = (s) => {
      const pts = [[200, 260], [174, 246], [146, 230], [122, 198], [148, 210], [136, 182], [162, 200], [162, 170], [186, 200], [204, 230]];
      return smooth(pts.map(([x, y]) => [258 + s * (258 - x), y]), true, 0.5);
    };
    a.mass(wing(1), { ...R.fire, sv: [6, 6], hv: [4, 4] });
    a.mass(wing(-1), { ...R.fire, sv: [6, 6], hv: [4, 4] });
    // Flame crest.
    for (const [pts, w] of [
      [[[250, 196], [232, 166], [240, 132]], [26, 16, 2]],
      [[[260, 192], [266, 150], [256, 114]], [30, 18, 2]],
      [[[270, 196], [292, 170], [290, 140]], [24, 14, 2]],
    ]) a.mass(limb(pts, w, { capEnd: false }), { ...R.fire, sv: [4, 4], hv: [3, 3], ow: 4 });
    a.mass(limb([[260, 196], [264, 160], [258, 136]], [14, 8, 2], { capEnd: false }), { ...R.flame, ow: 0, sv: [2, 2], hv: [2, 2] });
    // Round fluffy body + belly.
    a.glow(258, 270, 120, "#ffe066", 0.4);
    a.mass(blob(258, 272, 84, 80, { seed: 11, n: 14, jitter: 0.07 }), { ...R.fire, sv: [14, 12], hv: [9, 9] });
    a.mass(blob(258, 304, 50, 40, { seed: 12, n: 10, jitter: 0.08 }), { ...R.flame, sv: [6, 6], hv: [4, 4], ow: 0 });
    // Big eyes, beak, cheeks.
    a.fill(ellipse(232, 254, 12, 15), INK).fill(ellipse(284, 254, 12, 15), INK);
    a.fill(ellipse(228, 248, 5), "#ffffff").fill(ellipse(280, 248, 5), "#ffffff").fill(ellipse(236, 261, 2.2), "#ffffff").fill(ellipse(288, 261, 2.2), "#ffffff");
    a.mass("M246 274L270 274L258 294Z", { ...R.flame, base: "#f2c14e", shade: "#a8742a", sv: [3, 3], hv: [2, 2], ow: 4 });
    a.line("M248 276H268", 2.5);
    a.fill(ellipse(214, 276, 9, 5), "#ff4d6d", 0.4).fill(ellipse(302, 276, 9, 5), "#ff4d6d", 0.4);
    // Cracked egg shell around the bottom half.
    a.mass("M170 300L186 320L202 298L220 324L238 302L258 326L278 302L296 324L314 298L330 320L346 300C352 362 306 394 258 394C210 394 164 362 170 300Z", { ...M.cream, sv: [10, 10], hv: [6, 6] });
    a.line("M200 336L214 350L208 368M318 334L304 352L314 372M258 340L262 358", 3, INK, 0.6);
    // Shell cap lying on the nest (left).
    a.mass("M110 378C112 352 144 340 166 352L158 362L150 356L142 372L132 364Z", { ...M.cream, ...small });
    // Ember spark flying off (Al ser invocada: 1 de daño).
    a.fill(limb([[330, 210], [366, 168], [392, 132]], [4, 10, 16]), "#ffbe0b", 0.45);
    a.glow(396, 128, 50, "#ffe066", 0.85);
    a.mass(star(396, 128, 4, 24, 7, -45), { ...R.flame, ow: 3, sv: [2, 2], hv: [2, 2] });
    a.motes({ seed: 29, count: 16, box: [80, 90, 440, 360], size: [3, 8], color: ["#ffbe0b", "#ff7b00", "#ffe066"], alpha: [0.5, 1] });
    return a;
  },
};

export default RECIPES;
