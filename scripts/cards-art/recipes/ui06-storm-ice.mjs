// UI-06 recipes (storm & ice spells): chain-lightning, ice-shard, frozen-gale, disarming-strike, stone-sleep.
// See art.mjs / docs/cards/UI_VISUAL_SYSTEM.md §6. Each picture is the spell's action, not a generic orb:
// a chained bolt across three targets / one icicle spear / a blizzard over many frozen foes / a sword knocked
// spinning / a stunned brute turning to stone.
import { Art, INK, blob, ellipse, f, limb, poly, polar, shard, smooth, star, zigzag } from "../lib.mjs";
import { M } from "../materials.mjs";

const P = {
  storm: { base: "#3a3f78", shade: "#22244e", light: "#5a62a8", ow: 5 },
  bolt: { base: "#ffe066", shade: "#ffbe0b", light: "#fff8d6", ow: 4, sv: [4, 4], hv: [3, 3] },
  ice: { base: "#9be7ff", shade: "#3fa9ff", light: "#e6f6ff", ow: 4, sv: [5, 5], hv: [3, 3] },
  wood: { base: "#8a5a2b", shade: "#5c3a1c", light: "#b07a40" },
  goblin: { base: "#7aa04a", shade: "#4a6a2a", light: "#a8cc6a" },
  orc: { base: "#7a9a5a", shade: "#4a6a3a", light: "#a8c88a" },
  wind: { base: "#e6f6ff", shade: "#9be7ff", light: "#ffffff", ow: 4, sv: [5, 5], hv: [3, 3] },
};

/** Lightning stroke: soft halo, ink edge, amber body, white-hot core. */
const zap = (a, d, w) => a.line(d, w + 26, "#ffe066", 0.18).line(d, w + 8).line(d, w + 3, "#ffbe0b").line(d, w * 0.55, "#fff8d6");

/** Open spiral path (wind curls, dazed eyes). */
function spiral(cx, cy, r0, turns, dir = 1, start = 0) {
  const n = Math.round(turns * 14), pts = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    pts.push(polar(cx, cy, r0 * (1 - t * 0.85), start + dir * t * turns * 360));
  }
  return smooth(pts, false, 1);
}

const RECIPES = {
  /** One bolt from a storm cloud hits the near practice shield, then chains to two smaller shields behind it. */
  "chain-lightning"() {
    const a = new Art("chain-lightning");
    a.backdrop("#0c0a2a", "#1e2a5e", "#140c30", { pool: "#ffe066", poolAt: [260, 250], poolR: 270, poolAlpha: 0.26 });
    a.fill("M0 300L70 254L140 284L220 236L300 272L380 226L440 250L512 232V340H0Z", "#1a1a46");
    a.line("M40 120L20 170M110 140L90 190M330 120L310 170M440 110L420 160M470 190L450 240M60 220L40 270", 2, "#9be7ff", 0.25);
    a.ground(318, "#120a2c", "#2a2a5e", { spot: "#ffe066", spotAt: [250, 380], spotR: 230 });
    // Three wooden practice shields on stakes, receding to the right.
    const T = [[176, 300, 58, 400], [304, 250, 42, 340], [396, 214, 30, 302]];
    for (const [x, y, r, foot] of [...T].reverse()) {
      a.shadow(x, foot, r * 0.8, r * 0.14);
      a.mass(limb([[x, y], [x, foot]], r * 0.28), { ...P.wood, sv: [3, 3], hv: [2, 2], ow: 4 });
      a.mass(ellipse(x, y, r), { ...M.steel, sv: [r / 6, r / 6], ow: 5 });
      a.mass(ellipse(x, y, r * 0.8), { ...P.wood, sv: [r / 6, r / 6], hv: [r / 9, r / 9], ow: 3 });
      a.fill(`M${f(x - r * 0.8)} ${f(y)}L${f(x)} ${f(y - r * 0.8)}L${f(x + r * 0.8)} ${f(y)}L${f(x)} ${f(y + r * 0.8)}Z`, "#3d6fc4", 0.85);
    }
    // Storm cloud.
    for (const [x, y, rx, ry, s] of [[110, 92, 90, 44, 1], [210, 76, 100, 52, 2], [310, 96, 80, 40, 3], [180, 110, 120, 34, 4]]) {
      a.mass(blob(x, y, rx, ry, { seed: s, n: 9 }), { ...P.storm, sv: [10, 10] });
    }
    a.glow(196, 120, 80, "#ffe066", 0.45);
    // The main bolt and its chain.
    zap(a, zigzag([196, 112], [176, 290], { segments: 6, amp: 24, seed: 3 }), 13);
    zap(a, zigzag([188, 168], [126, 214], { segments: 3, amp: 10, seed: 6 }), 4);
    zap(a, zigzag([180, 296], [304, 250], { segments: 5, amp: 18, seed: 8 }), 9);
    zap(a, zigzag([304, 250], [396, 214], { segments: 4, amp: 14, seed: 11 }), 6);
    for (const [[x, y, r], k] of T.map((t, i) => [t, [1, 0.8, 0.65][i]])) {
      a.glow(x, y, r * 1.8, "#fff1c1", 0.75);
      a.mass(star(x, y, 8, r * 0.7 * k + 8, r * 0.24, -80), { ...P.bolt });
      a.fill(star(x, y, 4, r * 0.5, r * 0.12, -45), "#ffffff");
    }
    a.motes({ seed: 17, count: 16, box: [100, 150, 450, 380], size: [3, 7], color: ["#fff8d6", "#ffe066"], alpha: [0.5, 1] });
    return a;
  },

  /** A single icicle spear lances ↘ into a startled goblin, frost crusting over it from the wound. */
  "ice-shard"() {
    const a = new Art("ice-shard");
    a.backdrop("#0a1a3a", "#1f4f8a", "#0c1f40", { pool: "#bfe6ff", poolAt: [310, 270], poolR: 250, poolAlpha: 0.38 });
    for (const [x, h] of [[40, 210], [96, 150], [440, 200], [486, 160]]) a.fill(poly([[x, 340 - h], [x - 40, 350], [x + 40, 350]]), "#12305e");
    a.ground(352, "#5a8ac0", "#2a5a8a", { spot: "#e6f6ff", spotAt: [320, 396], spotR: 180 });
    a.shadow(326, 384, 96, 14);
    // Goblin: feet, body, raised arms, ears, startled face looking up at the shard.
    for (const s of [-1, 1]) a.mass(ellipse(326 + s * 34, 378, 26, 12), { ...P.goblin, sv: [4, 4], hv: [3, 3], ow: 4 });
    a.mass(limb([[284, 300], [252, 286], [240, 256]], [20, 16, 14]), { ...P.goblin, sv: [4, 4], hv: [3, 3] });
    a.mass(limb([[370, 304], [404, 286], [414, 256]], [20, 16, 14]), { ...P.goblin, sv: [4, 4], hv: [3, 3] });
    a.mass(poly([[262, 270], [214, 236], [270, 248]]), { ...P.goblin, sv: [4, 4], hv: [3, 3], ow: 5 });
    a.mass(poly([[390, 270], [438, 236], [384, 248]]), { ...P.goblin, sv: [4, 4], hv: [3, 3], ow: 5 });
    a.mass(smooth([[262, 312], [272, 258], [326, 236], [380, 258], [390, 312], [372, 366], [326, 380], [280, 366]], true, 0.9), { ...P.goblin, sv: [12, 12] });
    a.fill(ellipse(300, 290, 15, 18), "#ffffff").fill(ellipse(350, 290, 15, 18), "#ffffff");
    a.line(ellipse(300, 290, 15, 18) + ellipse(350, 290, 15, 18), 4);
    a.fill(ellipse(296, 282, 6), INK).fill(ellipse(346, 282, 6), INK);
    a.fill(ellipse(326, 334, 12, 15), "#3a0612").line(ellipse(326, 334, 12, 15), 4);
    a.line("M286 264L310 272M366 264L342 272", 4);
    // Frost crust creeping over the right/lower body from the wound.
    a.fill(smooth([[300, 262], [372, 254], [394, 300], [386, 360], [340, 382], [322, 340], [352, 300]], true, 0.8), "#e6f6ff", 0.45);
    for (const [x, y, rx, ry, s, rot] of [[380, 300, 18, 30, 1, 10], [392, 340, 14, 24, 2, 30], [356, 370, 22, 14, 3, 0], [404, 260, 12, 22, 4, -20], [316, 384, 16, 10, 5, 0], [418, 380, 16, 12, 6, 0]]) {
      a.mass(shard(x, y, rx, ry, { seed: s, n: 5, jitter: 0.2, rot }), P.ice);
    }
    a.line("M296 262L330 280L360 270M330 280L344 314L376 330M344 314L330 350", 3, "#ffffff", 0.8);
    // Speed streaks + the icicle spear (thick faceted butt, needle tip in the goblin's crown).
    a.line("M60 140L150 226M86 104L168 186M50 196L120 262", 4, "#e6f6ff", 0.45);
    a.glow(300, 256, 70, "#e6f6ff", 0.85);
    a.mass(limb([[92, 100], [190, 184], [300, 262]], [44, 36, 2], { capEnd: false }), { ...P.ice, ow: 5, sv: [8, 8], hv: [5, 5] });
    a.line("M100 108L294 258", 4, "#ffffff", 0.85);
    a.line("M108 86L124 124M144 124L156 160", 3, "#3fa9ff", 0.8);
    a.mass(star(300, 260, 8, 34, 10, -60), { base: "#ffffff", shade: "#9be7ff", ow: 3, sv: [3, 3] });
    a.motes({ seed: 23, count: 18, box: [60, 90, 470, 400], size: [3, 8], color: ["#ffffff", "#bfe6ff"], alpha: [0.5, 1] });
    return a;
  },

  /** A howling blizzard sweeps left → right over the field, freezing three foes solid in blocks of ice. */
  "frozen-gale"() {
    const a = new Art("frozen-gale");
    a.backdrop("#0e1c3e", "#2a4f86", "#16284e", { pool: "#bfe6ff", poolAt: [220, 220], poolR: 280, poolAlpha: 0.35 });
    a.fill("M0 280L90 190L150 240L240 160L330 236L410 180L512 250V330H0Z", "#1e3a6a");
    a.fill("M210 186L240 160L270 186L254 182L240 192Z", "#e6f6ff", 0.7).fill("M380 204L410 180L436 204L420 200L410 208Z", "#e6f6ff", 0.7);
    a.ground(330, "#8ab4e0", "#4a76b0", { spot: "#e6f6ff", spotAt: [270, 390], spotR: 240 });
    // Back gust.
    a.mass(limb([[-20, 150], [120, 124], [260, 140], [400, 114], [530, 128]], [4, 28, 20, 14, 2], { capEnd: false }), { ...P.wind, sv: [6, 6] });
    a.line(spiral(410, 120, 30, 1.4, -1, 90), 6, "#ffffff", 0.8);
    // Three foes frozen in ice blocks: warrior, horned imp, small beast.
    const fig = (d) => a.mass(d, { base: "#4a2a7a", shade: "#2a1450", light: "#7a58b8", ow: 4, sv: [5, 5], hv: [3, 3] });
    const eyes = (pts) => a.fill(pts.map(([x, y]) => ellipse(x, y, 3.5)).join(""), "#ff4d6d");
    const blocks = [
      [150, 392, 104, 140, () => {
        fig(limb([[174, 334], [200, 290]], 10) + limb([[190, 304], [212, 316]], 8));
        fig(ellipse(150, 296, 20) + poly([[122, 318], [178, 318], [186, 380], [114, 380]]));
        eyes([[143, 294], [157, 294]]);
      }],
      [282, 362, 88, 108, () => {
        fig(poly([[266, 290], [250, 260], [278, 282]]) + poly([[298, 290], [314, 260], [286, 282]]));
        fig(ellipse(282, 302, 24, 22) + poly([[262, 318], [302, 318], [312, 352], [252, 352]]));
        eyes([[274, 300], [290, 300]]);
      }],
      [392, 336, 74, 74, () => {
        fig(smooth([[364, 316], [384, 300], [418, 306], [420, 330], [366, 330]], true, 0.9) + limb([[376, 324], [376, 332]], 8) + limb([[408, 324], [408, 332]], 8));
        fig(ellipse(366, 306, 15, 13) + poly([[358, 298], [354, 282], [370, 294]]));
        eyes([[361, 304]]);
      }],
    ];
    for (const [x, base, w, h, figure] of blocks) {
      a.shadow(x, base, w * 0.62, 10);
      figure();
      const top = base - h;
      const d = poly([[x - w / 2, base], [x - w / 2 - 4, top + 18], [x - w / 4, top + 4], [x + 6, top + 14], [x + w / 2 - 6, top], [x + w / 2 + 4, top + 22], [x + w / 2, base]]);
      a.fill(d, "#9be7ff", 0.28).line(d, 6);
      a.fill(poly([[x - w / 2 + 8, base - 10], [x - w / 2 + 6, top + 22], [x - w / 4, top + 12], [x - w / 4 - 10, base - 10]]), "#ffffff", 0.32);
      a.line(`M${f(x + w / 6)} ${f(top + 24)}L${f(x + w / 4)} ${f(top + h / 2)}L${f(x + w / 8)} ${f(base - 20)}`, 3, "#ffffff", 0.7);
      for (const [dx, s] of [[-w / 2, 1], [w / 2, -1]]) a.mass(shard(x + dx + s * 4, base - 6, 12, 10, { seed: x + s, n: 5 }), P.ice);
    }
    // Front gust curling round the blocks + snow streaks.
    a.mass(limb([[-20, 250], [90, 226], [200, 250], [330, 222], [450, 240], [530, 226]], [4, 30, 22, 26, 16, 2], { capEnd: false }), { ...P.wind, sv: [5, 5] });
    a.line(spiral(78, 236, 40, 1.6, 1, 180), 7, "#ffffff", 0.85);
    a.line(spiral(470, 232, 24, 1.3, -1, 60), 5, "#ffffff", 0.8);
    const streaks = [];
    for (let i = 0; i < 22; i++) {
      const x = (i * 97) % 500, y = 90 + ((i * 53) % 320);
      streaks.push(`M${x} ${y}l${36 + (i % 3) * 14} ${6 + (i % 2) * 4}`);
    }
    a.line(streaks.join(""), 3, "#ffffff", 0.55);
    a.motes({ seed: 29, count: 24, box: [20, 90, 500, 420], size: [3, 7], color: ["#ffffff", "#e6f6ff"], alpha: [0.5, 1], shape: "circle" });
    return a;
  },

  /** A crackling lightning lash strikes a gauntleted wrist and sends the sword spinning away. */
  "disarming-strike"() {
    const a = new Art("disarming-strike");
    a.backdrop("#120a2e", "#2e1f6a", "#160c34", { pool: "#ffe066", poolAt: [240, 200], poolR: 260, poolAlpha: 0.3 });
    a.fill("M0 330V120H60V330ZM452 330V140H512V330Z", "#1e1448");
    a.ground(340, "#1a1036", "#3a2a6e", { spot: "#ffe066", spotAt: [300, 400], spotR: 200 });
    a.line("M30 380L120 372M170 430L280 418M350 450L470 436", 3, INK, 0.5);
    // Spin trails around the flying sword.
    a.add(`<path d="M104 250A150 150 0 0 1 220 58M384 130A150 150 0 0 1 300 330" fill="none" stroke="#fff8d6" stroke-opacity="0.45" stroke-width="10"/>`);
    a.add(`<path d="M126 286A150 150 0 0 1 120 160M372 252A150 150 0 0 1 344 300" fill="none" stroke="#ffe066" stroke-opacity="0.35" stroke-width="5"/>`);
    // The sword, spinning (drawn along +x, then rotated).
    a.glow(240, 196, 120, "#fff1c1", 0.35);
    a.begin("translate(240 196) rotate(-34)");
    a.mass(poly([[-24, -12], [118, -10], [154, 0], [118, 10], [-24, 12]]), { ...M.steel, sv: [5, 5], hv: [3, 3] });
    a.line("M-14 0H124", 3, "#5e6f8a").line("M-14 -6H118", 2.5, "#ffffff", 0.75);
    a.mass(limb([[-28, -40], [-28, 40]], 14), { ...M.gold, sv: [3, 3], hv: [2, 2], ow: 5 });
    a.mass(limb([[-34, 0], [-82, 0]], 16), { ...M.leather, sv: [3, 3], hv: [2, 2], ow: 5 });
    a.line("M-46 -8L-42 8M-58 -8L-54 8M-70 -8L-66 8", 2.5, INK, 0.6);
    a.mass(ellipse(-92, 0, 12), { ...M.gold, sv: [3, 3], hv: [2, 2], ow: 5 });
    a.end();
    a.motes({ seed: 5, count: 8, box: [150, 230, 250, 300], size: [3, 7], color: "#ffe066", alpha: [0.6, 1] });
    // Gauntleted forearm from the lower right, fingers flung open.
    a.mass(limb([[520, 470], [440, 410], [376, 356]], [70, 58, 48]), { ...M.steel, sv: [8, 8] });
    a.line("M470 452L500 412M430 418L456 380M404 390L424 356", 4, INK, 0.7);
    a.mass(limb([[404, 374], [384, 356]], 64), { ...M.gold, sv: [4, 4], hv: [3, 3], ow: 5 });
    for (const [dx, dy] of [[-44, -40], [-56, -12], [-52, 16], [-38, 34]]) a.mass(limb([[362, 344], [362 + dx * 0.55, 344 + dy * 0.55], [362 + dx, 344 + dy]], [16, 13, 11]), { ...M.steel, ow: 4, sv: [3, 3], hv: [2, 2] });
    a.mass(limb([[376, 336], [354, 304], [336, 300]], [17, 14, 12]), { ...M.steel, ow: 4, sv: [3, 3], hv: [2, 2] });
    a.mass(ellipse(368, 346, 26, 22), { ...M.steel, sv: [5, 5], hv: [3, 3] });
    // The lightning lash from the left, crackling round the wrist.
    const lash = "M30 430C90 400 150 440 210 410C260 386 300 400 340 366";
    a.line(lash, 22, "#ffe066", 0.2).line(lash, 12).line(lash, 7, "#ffbe0b").line(lash, 3, "#fff8d6");
    zap(a, zigzag([40, 424], [340, 360], { segments: 9, amp: 16, seed: 4 }), 3);
    a.glow(372, 352, 80, "#fff1c1", 0.85);
    a.mass(star(372, 350, 9, 54, 18, -70), { ...P.bolt });
    a.fill(star(372, 350, 4, 30, 7, -45), "#ffffff");
    for (const [x2, y2, s] of [[430, 300, 2], [420, 410, 3], [318, 404, 5]]) zap(a, zigzag([372, 350], [x2, y2], { segments: 3, amp: 8, seed: s }), 3);
    return a;
  },

  /** A tusked brute stunned mid-stride: half of it turned to grey stone, spiral eyes, a crackling daze ring and stars. */
  "stone-sleep"() {
    const a = new Art("stone-sleep");
    a.backdrop("#14102e", "#3a2a5e", "#1a1236", { pool: "#ffe066", poolAt: [256, 180], poolR: 260, poolAlpha: 0.28 });
    a.fill("M0 512V250L60 230L80 512ZM512 512V240L440 220L430 512Z", "#221848");
    // Back of the daze ring.
    a.add(`<path d="M120 150A136 38 0 0 1 392 150" fill="none" stroke="#c77dff" stroke-opacity="0.6" stroke-width="6"/>`);
    // The bust, drawn once in flesh, then again in stone clipped to the right side.
    const body = (paint) => {
      a.mass(smooth([[96, 512], [110, 390], [170, 340], [256, 326], [342, 340], [402, 390], [416, 512]], true, 0.8), { ...paint, sv: [14, 12] });
      a.mass(poly([[150, 236], [116, 200], [168, 228]]), { ...paint, sv: [4, 4], hv: [3, 3], ow: 5 });
      a.mass(poly([[362, 236], [396, 200], [344, 228]]), { ...paint, sv: [4, 4], hv: [3, 3], ow: 5 });
      a.mass(smooth([[162, 250], [176, 180], [256, 152], [336, 180], [350, 250], [330, 330], [256, 360], [182, 330]], true, 0.9), { ...paint, sv: [14, 12] });
      a.mass(smooth([[196, 300], [256, 284], [316, 300], [306, 344], [256, 356], [206, 344]], true, 0.9), { ...paint, sv: [6, 6], hv: [4, 4], ow: 4 });
    };
    body(P.orc);
    const half = a.id("h");
    a.defs.push(`<clipPath id="${half}"><path d="M270 120L258 180L276 240L252 300L272 360L256 420L268 512H512V120Z"/></clipPath>`);
    a.add(`<g clip-path="url(#${half})">`);
    body(M.rock);
    a.line("M300 190L320 220L310 250M330 380L356 420L346 470M290 300L320 316", 4, INK, 0.7);
    a.end();
    a.line("M270 150L258 180L276 240L252 300L272 360L256 420L268 512", 5, "#bdb9d6");
    a.line("M270 150L258 180L276 240L252 300L272 360L256 420L268 512", 2, INK, 0.8);
    // Face: heavy brow, spiral eyes, lolling tongue, tusks.
    a.line("M188 222L238 236M324 222L274 236", 8);
    for (const [x, dir] of [[214, 1], [298, -1]]) {
      a.fill(ellipse(x, 252, 24, 22), "#fff8ea").line(ellipse(x, 252, 24, 22), 5);
      a.line(spiral(x, 252, 18, 2.2, dir), 3.5);
    }
    a.fill("M222 316C240 330 272 330 290 316L284 336C268 344 244 344 228 336Z", "#3a0612").line("M222 316C240 330 272 330 290 316", 4);
    a.mass("M246 332C246 352 254 364 262 362C270 360 268 346 266 334Z", { base: "#ff7a93", shade: "#c94d68", light: "#ffb3c1", sv: [3, 3], hv: [2, 2], ow: 4 });
    for (const s of [-1, 1]) a.mass(limb([[256 + s * 30, 320], [256 + s * 36, 292]], [12, 2], { capEnd: false }), { ...M.bone, ow: 4, sv: [2, 2], hv: [1, 1] });
    // Front of the daze ring: crackling arc + orbiting stars.
    a.add(`<path d="M120 150A136 38 0 0 0 392 150" fill="none" stroke="#ffe066" stroke-width="7"/>`);
    zap(a, zigzag([140, 168], [372, 168], { segments: 10, amp: 10, seed: 9 }), 2);
    for (const [deg, s] of [[200, 24], [250, 18], [300, 20], [20, 26], [70, 22], [130, 26]]) {
      const [x, y] = polar(256, 150, 136, deg);
      const sy = 150 + (y - 150) * 0.28;
      a.mass(star(x, sy, 5, s, s * 0.45), { ...P.bolt, ow: 4 });
    }
    a.motes({ seed: 33, count: 12, box: [100, 100, 420, 220], size: [3, 7], color: ["#ffe066", "#c77dff"], alpha: [0.5, 1] });
    return a;
  },
};

export default RECIPES;
