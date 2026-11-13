// UI-04 recipes (canines-bears). See art.mjs / docs/cards/UI_VISUAL_SYSTEM.md §6.
// Quadruped template (wolf-pup) with per-card body plan, pose, prop and scene:
// wolf (token, trotting profile) · alpha-wolf (sitting howl on a moonlit crag) · blood-hound (lean tracker, nose down)
// bear-cub (token, sitting) · berserker-bear (rearing roar, rage glow) · ursaria (Legendary matriarch over two cubs).
import { Art, INK, blob, ellipse, f, limb, poly, smooth, star } from "../lib.mjs";
import { GOLD, LEGENDARY, M } from "../materials.mjs";

// Local ramps.
const GREY = { base: "#9aa3b5", shade: "#5f6880", light: "#d0d6e2" };
const GREY_FAR = { ...GREY, base: "#7a8399" };
const CHAR = { base: "#4a4e66", shade: "#2a2c40", light: "#7a7f9c" };
const CHAR_FAR = { ...CHAR, base: "#3a3d54" };
const HOUND = { base: "#b0683a", shade: "#6e3620", light: "#e09460" };
const HOUND_FAR = { ...HOUND, base: "#8e5030" };
const BROWN = { base: "#8a5a34", shade: "#5c3a1f", light: "#b8804e" };
const TAN = { base: "#d8b080", shade: "#a8804e", light: "#f2d4a8" };
const WOOD = { base: "#6b4a2f", shade: "#3f2a1a", light: "#9a7048" };
const PINK = { base: "#ff7a93", shade: "#c94d68", light: "#ffb3c1", sv: [3, 3], hv: [2, 2], ow: 4 };

/** Grass tufts on the ground. */
function tufts(a, list, color, alpha = 0.8) {
  for (const [x, y, s] of list) {
    a.fill(`M${f(x - 14 * s)} ${y}L${f(x - 8 * s)} ${f(y - 22 * s)}L${f(x - 2 * s)} ${f(y - 4 * s)}L${f(x + 4 * s)} ${f(y - 28 * s)}L${f(x + 8 * s)} ${f(y - 2 * s)}L${f(x + 16 * s)} ${f(y - 18 * s)}L${f(x + 16 * s)} ${y}Z`, color, alpha);
  }
}
/** Almond eye looking left with a coloured iris and a catch-light. */
function eye(a, x, y, rx, ry, iris = "#ffbe0b") {
  a.fill(ellipse(x, y, rx, ry), INK).fill(ellipse(x - rx * 0.15, y, rx * 0.6, ry * 0.8), iris).fill(ellipse(x - rx * 0.25, y, rx * 0.28, ry * 0.5), INK);
  return a.fill(ellipse(x - rx * 0.45, y - ry * 0.4, Math.max(1.5, rx * 0.22)), "#ffffff", 0.9);
}
/** Claws (sharp bone tips) fanning from a point. */
function claws(a, x, y, dirs, len = 1, w = 8) {
  for (const [dx, dy] of dirs) a.mass(limb([[x, y], [x + dx * len, y + dy * len]], [w, 2], { capEnd: false }), { ...M.bone, ow: 3, sv: [2, 2], hv: [1, 1] });
}

const RECIPES = {
  /** Token — a plain grey wolf trotting left in profile, ears up; simple dusk hillside. */
  wolf() {
    const a = new Art("wolf");
    a.backdrop("#1c2a3a", "#2e4a4a", "#1a2a24", { pool: "#c3e8c0", poolAt: [250, 230], poolR: 240, poolAlpha: 0.28 });
    a.fill("M0 300Q120 250 240 290T512 270V512H0Z", "#1e3a30");
    a.ground(350, "#1c3424", "#35603a", { spot: "#c3e8c0", spotAt: [256, 396], spotR: 180 });
    tufts(a, [[70, 400, 1], [430, 410, 1.1], [300, 460, 0.9]], "#4f8a3c");
    a.shadow(262, 394, 140, 14);
    const fur = { ...GREY, rim: "#7bd389", rv: 4 };
    // Bushy tail, far legs, body, near legs (trotting: one front leg forward, one back).
    a.mass(limb([[352, 262], [388, 280], [404, 318], [396, 350]], [24, 32, 26, 8]), { ...fur, sv: [7, 7] });
    a.line("M392 300L398 330", 4, INK, 0.35);
    a.mass(limb([[214, 300], [228, 346], [246, 384]], [28, 20, 16]), { ...GREY_FAR, sv: [6, 6] });
    a.mass(limb([[330, 300], [314, 344], [300, 386]], [30, 20, 16]), { ...GREY_FAR, sv: [6, 6] });
    a.mass(ellipse(240, 388, 16, 8), { ...M.cream, sv: [4, 4], hv: [2, 2], ow: 4 }).mass(ellipse(294, 390, 16, 8), { ...M.cream, sv: [4, 4], hv: [2, 2], ow: 4 });
    a.mass(smooth([[184, 252], [222, 232], [290, 236], [344, 244], [368, 276], [348, 312], [292, 316], [228, 316], [190, 300]], true, 0.9), { ...fur, sv: [12, 12] });
    a.mass(smooth([[206, 300], [250, 310], [300, 312], [260, 318], [214, 312]], true, 0.9), { ...M.cream, sv: [3, 3], hv: [2, 2], ow: 0 });
    a.mass(limb([[212, 300], [190, 346], [168, 382]], [32, 22, 18]), { ...fur, sv: [7, 7] });
    a.mass(limb([[344, 296], [362, 340], [350, 388]], [40, 24, 18]), { ...fur, sv: [7, 7] });
    a.mass(ellipse(160, 386, 17, 8), { ...M.cream, sv: [4, 4], hv: [2, 2], ow: 4 }).mass(ellipse(344, 392, 17, 8), { ...M.cream, sv: [4, 4], hv: [2, 2], ow: 4 });
    // Neck ruff + head in profile, ears up, muzzle left.
    a.mass(blob(206, 254, 42, 44, { seed: 3, n: 9, jitter: 0.12 }), { ...fur, sv: [8, 8] });
    a.mass(poly([[196, 196], [210, 146], [228, 200]]), { ...GREY_FAR, sv: [5, 5] });
    a.mass(smooth([[150, 196], [182, 182], [214, 192], [230, 222], [218, 256], [188, 266], [158, 256], [120, 248], [104, 236], [110, 222], [132, 212]], true, 0.9), { ...fur, sv: [12, 10] });
    a.mass(poly([[170, 196], [180, 142], [204, 192]]), { ...fur, sv: [5, 5] });
    a.fill(poly([[178, 190], [182, 160], [196, 190]]), "#ff9aad", 0.7);
    a.mass("M106 238C118 232 150 238 176 246C170 258 150 262 128 256C116 252 108 246 106 238Z", { ...M.cream, sv: [3, 3], hv: [2, 2], ow: 0 });
    a.fill(ellipse(106, 232, 8, 6), INK).fill(ellipse(103, 229, 3, 2), "#ffffff", 0.7);
    a.line("M112 244C128 250 146 250 162 246", 3.5);
    eye(a, 164, 214, 9, 6);
    a.line("M152 206L176 206", 3.5, INK, 0.8);
    return a;
  },

  /** Rare — a heavy charcoal alpha with a thick ruff and scarred eye, sitting on a crag and howling at a huge moon. */
  "alpha-wolf"() {
    const a = new Art("alpha-wolf");
    a.backdrop("#0c1430", "#1e2c58", "#121a30", { pool: "#bfe4ff", poolAt: [214, 170], poolR: 260, poolAlpha: 0.3 });
    // Huge moon behind the head, faint craters; distant pine ridge.
    a.glow(214, 160, 190, "#dff2ff", 0.45);
    a.fill(ellipse(214, 160, 104), "#e6f2ff", 0.95).fill(ellipse(180, 130, 18), "#c8d8ee", 0.7).fill(ellipse(250, 196, 24), "#c8d8ee", 0.6).fill(ellipse(262, 120, 10), "#c8d8ee", 0.7);
    let ridge = "M0 330";
    for (let x = 0; x <= 512; x += 32) ridge += `L${x + 16} ${300 - ((x * 7) % 30)}L${x + 32} 330`;
    a.fill(ridge + "V512H0Z", "#14203c");
    // Rock outcrop under the wolf (extends off the bottom).
    a.mass(poly([[118, 512], [138, 392], [180, 362], [270, 354], [380, 358], [432, 392], [454, 512]]), { base: "#4a4e72", shade: "#2a2c48", light: "#7a80a8", rim: "#bfe4ff", rv: 4, sv: [14, 12], hv: [10, 8] });
    a.line("M180 362L200 410L186 470M380 358L360 420L380 490M276 354L282 392", 4, INK, 0.6);
    a.shadow(290, 360, 120, 12, 0.5);
    const fur = { ...CHAR, rim: "#bfe4ff", rv: 6 };
    // Sitting body: far foreleg, torso, haunch, near foreleg, paws.
    a.mass(limb([[254, 290], [256, 326], [258, 356]], [30, 26, 24]), { ...CHAR_FAR, sv: [6, 6] });
    a.mass(smooth([[214, 256], [244, 210], [300, 226], [352, 262], [376, 310], [352, 350], [290, 354], [240, 342], [214, 300]], true, 0.9), { ...fur, sv: [14, 12] });
    a.mass(blob(338, 316, 54, 46, { seed: 5, n: 9, jitter: 0.06 }), { ...fur, sv: [10, 10] });
    a.mass(ellipse(306, 358, 26, 10), { ...CHAR, sv: [4, 4], hv: [3, 3], ow: 5 });
    a.mass(limb([[226, 280], [222, 320], [220, 354]], [36, 28, 26]), { ...fur, sv: [7, 7] });
    a.mass(ellipse(214, 358, 22, 10), { ...CHAR, sv: [4, 4], hv: [3, 3], ow: 5 }).mass(ellipse(258, 358, 18, 9), { ...CHAR_FAR, sv: [4, 4], hv: [3, 3], ow: 5 });
    // Bushy tail wrapped along the rock in front.
    a.mass(limb([[378, 340], [336, 364], [282, 370], [240, 364]], [28, 34, 28, 10]), { ...fur, sv: [6, 6] });
    // Neck + thick silver ruff with a jagged hem.
    a.mass(limb([[238, 260], [228, 206], [218, 168]], [62, 54, 46]), { ...fur, sv: [10, 8] });
    a.mass("M196 172C174 200 178 240 194 268L208 254L214 286L228 260L240 292L250 262L264 288L270 256L286 272L284 232C288 200 274 178 252 166Z", { base: "#8a90ac", shade: "#4a4e66", light: "#c3cee2", rim: "#bfe4ff", rv: 5, sv: [10, 10] });
    a.line("M204 206L210 236M226 200L232 240M248 196L256 236", 3, INK, 0.35);
    // Head thrown back, muzzle up-left, jaws open in a howl.
    a.mass(poly([[226, 146], [262, 118], [250, 160]]), { ...fur, sv: [5, 5] });
    a.fill(poly([[236, 144], [254, 128], [248, 152]]), "#3a0e22", 0.6);
    a.mass(limb([[208, 168], [186, 144], [170, 130]], [24, 16, 10]), { ...CHAR_FAR, sv: [4, 4] });
    a.fill("M200 152L176 128L170 116L196 136Z", "#3a0e22");
    a.mass(smooth([[248, 172], [242, 138], [214, 122], [188, 108], [164, 92], [154, 98], [166, 116], [192, 136], [206, 162], [226, 182]], true, 0.9), { ...fur, sv: [10, 8] });
    a.fill(poly([[172, 120], [178, 122], [174, 130]]), "#fff8ea").fill(poly([[180, 126], [186, 132], [178, 134]]), "#fff8ea");
    a.fill(ellipse(158, 96, 8, 6), INK);
    eye(a, 206, 132, 7, 4.5, "#9be7ff");
    a.line("M196 124L216 130", 4);
    a.line("M198 116L216 150", 3.5, "#ff4d6d", 0.9);
    // Howl rings.
    a.line("M140 92C126 104 120 120 122 136M120 76C98 96 90 124 96 152", 4, "#dff2ff", 0.45);
    a.motes({ seed: 17, count: 16, box: [40, 30, 480, 280], size: [2, 5], color: "#dff2ff", alpha: [0.4, 0.9], shape: "circle" });
    return a;
  },

  /** Rare — a lean rust hound with drooping ears and a spiked collar, nose to the ground tracking a trail of blood. */
  "blood-hound"() {
    const a = new Art("blood-hound");
    a.backdrop("#2a0a1e", "#6a1a2a", "#2a0e18", { pool: "#ff7b5a", poolAt: [300, 220], poolR: 250, poolAlpha: 0.35 });
    a.glow(380, 210, 80, "#ffbe0b", 0.4).fill(ellipse(380, 210, 40), "#ffb070", 0.55);
    // Dead reeds + far hills.
    a.fill("M0 320Q140 270 280 310T512 290V512H0Z", "#3a0e1e");
    for (const [x, h] of [[40, 120], [60, 90], [462, 110], [480, 140]]) a.line(`M${x} 360Q${x + 6} ${360 - h / 2} ${x - 4} ${360 - h}`, 4, "#2a0612", 0.9);
    a.ground(352, "#24080f", "#4a1424", { spot: "#ff7b5a", spotAt: [250, 396], spotR: 180 });
    // Trail of blood drops leading off to the lower left.
    for (const [x, y, s] of [[96, 418, 1.1], [130, 400, 0.9], [74, 448, 1], [150, 430, 0.7], [118, 470, 0.8]]) {
      a.mass(`M${x} ${f(y - 14 * s)}C${f(x + 8 * s)} ${f(y - 2 * s)} ${f(x + 8 * s)} ${f(y + 8 * s)} ${x} ${f(y + 8 * s)}C${f(x - 8 * s)} ${f(y + 8 * s)} ${f(x - 8 * s)} ${f(y - 2 * s)} ${x} ${f(y - 14 * s)}Z`, { base: "#ff4d6d", shade: "#b0203a", light: "#ff9aad", ow: 3, sv: [2, 2], hv: [2, 2] });
    }
    a.shadow(270, 394, 140, 12);
    const fur = { ...HOUND, rim: "#ff7b5a", rv: 4 };
    // Whip tail raised, far legs, body (deep chest, tucked waist), near legs — long and thin.
    a.mass(limb([[368, 254], [398, 228], [410, 196]], [16, 11, 4]), { ...fur, sv: [4, 4], hv: [3, 3] });
    a.mass(limb([[234, 290], [240, 340], [244, 388]], [24, 15, 12]), { ...HOUND_FAR, sv: [4, 4], hv: [3, 3] });
    a.mass(limb([[352, 280], [384, 322], [372, 388]], [26, 14, 11]), { ...HOUND_FAR, sv: [4, 4], hv: [3, 3] });
    a.mass(smooth([[206, 262], [250, 236], [320, 232], [370, 244], [384, 270], [364, 290], [316, 284], [264, 300], [214, 300]], true, 0.9), { ...fur, sv: [10, 10] });
    a.mass(smooth([[210, 280], [242, 296], [266, 300], [236, 304], [212, 296]], true, 0.9), { ...TAN, sv: [3, 3], hv: [2, 2], ow: 0 });
    a.line("M262 262C276 270 290 270 300 262M268 278C280 284 292 284 300 278", 3, INK, 0.4);
    a.mass(limb([[216, 288], [210, 340], [200, 390]], [26, 16, 12]), { ...fur, sv: [4, 4], hv: [3, 3] });
    a.mass(limb([[364, 272], [400, 318], [390, 390]], [30, 15, 11]), { ...fur, sv: [4, 4], hv: [3, 3] });
    for (const [x, y] of [[198, 392], [246, 391], [388, 392], [370, 391]]) a.mass(ellipse(x - 4, y, 12, 6), { ...HOUND, sv: [3, 3], hv: [2, 2], ow: 4 });
    // Neck dropping forward, long narrow head with nose to the ground.
    a.mass(limb([[230, 262], [200, 288], [172, 314]], [52, 44, 38]), { ...fur, sv: [8, 8] });
    a.mass(smooth([[186, 298], [198, 322], [180, 346], [150, 362], [118, 378], [96, 384], [90, 374], [104, 358], [132, 330], [158, 302]], true, 0.9), { ...fur, sv: [8, 8] });
    a.mass("M92 376C108 372 130 366 150 356C140 372 116 384 98 386Z", { ...TAN, sv: [2, 2], hv: [2, 2], ow: 0 });
    a.fill(ellipse(94, 378, 9, 7), INK).fill(ellipse(90, 375, 3, 2), "#ffffff", 0.6);
    a.line("M104 384C122 380 140 372 156 362", 3);
    a.fill("M114 382L120 390L124 380ZM132 376L138 384L142 372Z", "#fff8ea");
    eye(a, 146, 334, 8, 5, "#ff4d6d");
    a.line("M134 326L158 332", 4);
    // Long drooping ear hanging beside the head.
    a.mass(smooth([[164, 300], [188, 300], [200, 330], [196, 370], [180, 378], [168, 348]], true, 0.9), { ...HOUND_FAR, base: "#7a3a22", sv: [5, 5] });
    // Spiked iron collar round the neck.
    a.mass(limb([[188, 262], [222, 300]], 15), { ...M.leather, sv: [3, 3], hv: [2, 2], ow: 5 });
    a.mass(limb([[190, 264], [176, 246]], [11, 2], { capEnd: false }), { ...M.steel, ow: 3, sv: [2, 2], hv: [1, 1] });
    a.mass(limb([[218, 296], [232, 312]], [11, 2], { capEnd: false }), { ...M.steel, ow: 3, sv: [2, 2], hv: [1, 1] });
    for (const [x, y] of [[198, 274], [210, 286]]) a.fill(ellipse(x, y, 4), "#e2ecf5").line(ellipse(x, y, 4), 2);
    a.motes({ seed: 23, count: 8, box: [80, 80, 460, 260], size: [3, 6], color: ["#ffbe0b", "#ff7b5a"], alpha: [0.3, 0.7], shape: "circle" });
    return a;
  },

  /** Token — a chubby brown bear cub sitting in a clearing, round face, paws out. */
  "bear-cub"() {
    const a = new Art("bear-cub");
    a.backdrop("#1c3020", "#2f5a34", "#1a2c1c", { pool: "#f2e2a8", poolAt: [250, 230], poolR: 240, poolAlpha: 0.32 });
    a.fill(blob(60, 260, 110, 90, { seed: 3 }), "#1e3e26").fill(blob(460, 250, 110, 100, { seed: 4 }), "#1e3e26");
    a.ground(340, "#203e22", "#3e7238", { spot: "#f2e2a8", spotAt: [256, 396], spotR: 170 });
    tufts(a, [[80, 400, 1], [440, 392, 1], [140, 460, 0.9]], "#4f8a3c");
    for (const [x, y] of [[110, 380], [410, 430], [380, 372]]) a.fill(star(x, y, 5, 8, 4), "#fff1c1", 0.9).fill(ellipse(x, y, 3), "#ffbe0b");
    a.shadow(256, 396, 110, 14);
    const fur = { ...BROWN, rim: "#7bd389", rv: 4 };
    // Round body, legs splayed forward with pads, arms, big head.
    a.mass(ellipse(256, 320, 84, 76), { ...fur, sv: [14, 14] });
    a.mass(ellipse(250, 334, 46, 44), { ...TAN, sv: [5, 5], hv: [4, 4], ow: 0 });
    a.mass(ellipse(200, 382, 34, 22), { ...fur, sv: [6, 6] });
    a.mass(ellipse(312, 382, 34, 22), { ...fur, sv: [6, 6] });
    a.mass(ellipse(190, 384, 14, 12), { ...TAN, sv: [3, 3], hv: [2, 2], ow: 4 }).mass(ellipse(322, 384, 14, 12), { ...TAN, sv: [3, 3], hv: [2, 2], ow: 4 });
    a.mass(limb([[200, 290], [190, 330], [204, 352]], [34, 30, 28]), { ...fur, sv: [6, 6] });
    a.mass(limb([[312, 290], [324, 330], [310, 352]], [34, 30, 28]), { ...fur, sv: [6, 6] });
    // Head (slightly left), round ears, muzzle.
    a.mass(ellipse(196, 170, 22), { ...fur, sv: [5, 5] }).mass(ellipse(300, 170, 22), { ...fur, sv: [5, 5] });
    a.fill(ellipse(196, 172, 11), "#c99070").fill(ellipse(300, 172, 11), "#c99070");
    a.mass(smooth([[184, 214], [196, 176], [248, 160], [300, 176], [312, 216], [296, 254], [248, 268], [200, 254]], true, 0.95), { ...fur, sv: [12, 10] });
    a.mass(ellipse(240, 236, 34, 24), { ...TAN, sv: [5, 5], hv: [4, 4], ow: 4 });
    a.fill(ellipse(240, 222, 12, 8), INK).fill(ellipse(236, 219, 4, 2.5), "#ffffff", 0.8);
    a.line("M240 230V240M226 244C234 250 246 250 254 244", 3.5);
    a.fill(ellipse(214, 208, 7, 8), INK).fill(ellipse(268, 208, 7, 8), INK);
    a.fill(ellipse(211, 205, 2.5), "#ffffff").fill(ellipse(265, 205, 2.5), "#ffffff");
    a.fill(ellipse(206, 234, 8, 4), "#ff4d6d", 0.25).fill(ellipse(278, 234, 8, 4), "#ff4d6d", 0.25);
    return a;
  },

  /** Common (Furia) — a huge brown bear rearing on its hind legs, roaring, claws out; scars, war paint, red rage glow. */
  "berserker-bear"() {
    const a = new Art("berserker-bear");
    a.backdrop("#1a0a14", "#4a1a20", "#1e0e12", { pool: "#ff4d6d", poolAt: [256, 220], poolR: 270, poolAlpha: 0.45 });
    a.fill(limb([[30, 520], [40, 200], [20, -10]], [70, 56, 50]), "#140610").fill(limb([[486, 520], [476, 240], [492, -10]], [74, 60, 54]), "#140610");
    a.ground(360, "#1a0a10", "#3e1a1c", { spot: "#ff7b5a", spotAt: [256, 400], spotR: 180 });
    a.glow(256, 230, 200, "#ff4d6d", 0.5);
    a.shadow(256, 398, 130, 16);
    const fur = { ...BROWN, rim: "#ff4d6d", rv: 6, ow: 7 };
    // Hind legs + feet.
    a.mass(limb([[214, 340], [204, 370], [196, 392]], [60, 56, 50]), { ...fur, sv: [8, 8] });
    a.mass(limb([[300, 340], [312, 370], [320, 392]], [60, 56, 50]), { ...fur, sv: [8, 8] });
    // Upright pear body with a tan belly.
    a.mass(smooth([[190, 220], [224, 178], [290, 178], [330, 220], [340, 300], [322, 362], [256, 380], [190, 362], [172, 300]], true, 0.9), { ...fur, sv: [18, 16], hv: [10, 10] });
    a.mass(smooth([[220, 250], [256, 236], [296, 252], [306, 320], [256, 364], [208, 320]], true, 0.9), { ...TAN, sv: [8, 8], hv: [5, 5], ow: 0 });
    // Raised arms with claws spread.
    a.mass(limb([[204, 210], [160, 180], [130, 140]], [54, 44, 40]), { ...fur, sv: [8, 8] });
    a.mass(limb([[310, 210], [354, 182], [384, 146]], [54, 44, 40]), { ...fur, sv: [8, 8] });
    a.mass(ellipse(128, 136, 26, 22), { ...fur, sv: [5, 5] }).mass(ellipse(388, 142, 26, 22), { ...fur, sv: [5, 5] });
    claws(a, 118, 124, [[-22, -10], [-14, -22], [0, -28], [14, -24]], 1, 10);
    claws(a, 398, 130, [[22, -8], [14, -22], [0, -28], [-14, -24]], 1, 10);
    // War paint: red stripes on the shoulders and belly scars.
    a.line("M222 200L238 226M236 194L252 222M292 200L278 226", 7, "#ff4d6d", 0.9);
    a.line("M236 290L268 314M244 278L262 326", 4, "#7a3a22", 0.9);
    // Head, roaring up-left: ears, open jaws with fangs.
    a.mass(ellipse(206, 136, 20), { ...fur, sv: [5, 5] }).mass(ellipse(280, 128, 20), { ...fur, sv: [5, 5] });
    a.mass(smooth([[186, 174], [198, 140], [242, 122], [290, 136], [302, 172], [286, 206], [244, 218], [200, 206]], true, 0.95), { ...fur, sv: [12, 10] });
    a.mass("M182 168C190 150 214 148 232 156L250 186C242 210 210 214 190 204C180 194 178 180 182 168Z", { ...TAN, sv: [5, 5], hv: [4, 4], ow: 5 });
    a.mass("M190 176C200 170 220 172 232 182C226 200 206 206 194 198Z", { base: "#4a0a1a", shade: "#2a0610", ow: 3, sv: [2, 2] });
    a.fill(poly([[196, 176], [204, 177], [199, 188]]), "#fff8ea").fill(poly([[218, 176], [226, 179], [220, 190]]), "#fff8ea");
    a.fill(poly([[200, 200], [208, 199], [205, 190]]), "#fff8ea");
    a.mass("M196 194C204 192 214 194 220 198C214 202 202 202 196 194Z", PINK);
    a.fill(ellipse(186, 160, 10, 7), INK);
    // Angry eyes glowing red, brows down, scar.
    a.glow(232, 152, 18, "#ff4d6d", 0.9).glow(266, 150, 18, "#ff4d6d", 0.9);
    a.fill(ellipse(232, 154, 6, 5), "#ffe066").fill(ellipse(266, 152, 6, 5), "#ffe066");
    a.line("M218 142L242 150M280 138L258 148", 5);
    a.line("M258 132L276 170", 4, "#ffb3c1", 0.85);
    a.line("M226 132L232 148M246 128L248 144", 5, "#ff4d6d", 0.9);
    // Roar lines.
    a.line("M160 196L130 212M156 214L132 238M170 226L156 252", 5, "#ffbe0b", 0.7);
    a.motes({ seed: 29, count: 14, box: [60, 60, 460, 380], size: [3, 7], color: ["#ff4d6d", "#ffbe0b"], alpha: [0.4, 0.9] });
    return a;
  },

  /**
   * Legendary — Ursaria, the forest matriarch: a massive ancient she-bear with branch antlers and a moss mantle,
   * standing four-square over two cubs in an old grove under a leaf/aurora arc. Gold (Legendaria) rim on every mass.
   */
  ursaria() {
    const a = new Art("ursaria");
    a.backdrop("#081e1c", "#14463a", "#0e2a1e", { pool: "#c8f7a0", poolAt: [256, 190], poolR: 290, poolAlpha: 0.4 });
    // Aurora / leaf arc behind her.
    a.line("M40 330C70 120 190 50 256 50C322 50 442 120 472 330", 34, "#7bd389", 0.18);
    a.line("M56 330C86 140 196 74 256 74C316 74 426 140 456 330", 14, "#9be7ff", 0.22);
    a.line("M72 330C102 160 202 98 256 98C310 98 410 160 440 330", 6, "#ffe066", 0.35);
    for (let i = 0; i <= 14; i++) {
      const t = (190 + i * 11.4) * (Math.PI / 180);
      const x = 256 + Math.cos(t) * 206, y = 300 + Math.sin(t) * 236;
      const ang = (i * 11.4 + 100).toFixed(0);
      a.add(`<path d="M${f(x)} ${f(y - 12)}C${f(x + 8)} ${f(y - 4)} ${f(x + 8)} ${f(y + 4)} ${f(x)} ${f(y + 12)}C${f(x - 8)} ${f(y + 4)} ${f(x - 8)} ${f(y - 4)} ${f(x)} ${f(y - 12)}Z" transform="rotate(${ang} ${f(x)} ${f(y)})" fill="${i % 3 ? "#7bd389" : GOLD}" fill-opacity="0.85"/>`);
    }
    // Ancient trunks framing the grove, light shafts.
    a.fill(limb([[20, 520], [36, 300], [18, 120], [40, -20]], [90, 72, 64, 60]), "#0a1a14").fill(limb([[492, 520], [476, 280], [496, -20]], [96, 76, 70]), "#0a1a14");
    a.fill(limb([[60, 250], [110, 210], [150, 214]], [18, 10, 4]), "#0a1a14").fill(limb([[452, 220], [400, 190], [368, 196]], [18, 10, 4]), "#0a1a14");
    a.fill(poly([[150, 0], [210, 0], [300, 420], [220, 420]]), "#fff3b0", 0.07).fill(poly([[300, 0], [330, 0], [380, 400], [340, 400]]), "#fff3b0", 0.05);
    a.ground(370, "#10301e", "#2a5a30", { spot: "#ffe066", spotAt: [256, 414], spotR: 210 });
    tufts(a, [[70, 430, 1.1], [450, 440, 1], [120, 480, 0.9], [400, 486, 1]], "#4f8a3c");
    for (const [x, y] of [[96, 410], [420, 420], [150, 456], [370, 470]]) a.fill(star(x, y, 5, 9, 4), "#ffd6e8", 0.9).fill(ellipse(x, y, 3), GOLD);
    const rim = { rim: LEGENDARY, rv: 5 };
    const fur = { base: "#7a5238", shade: "#46301e", light: "#a8784e", ...rim, ow: 7 };
    const furFar = { ...fur, base: "#5e3e2a" };
    const moss = { ...M.moss, ...rim, rv: 4 };
    const wood = { ...WOOD, ...rim, rv: 3, ow: 5 };
    const gold = { ...M.gold, rim: LEGENDARY, rv: 3, ow: 4, sv: [3, 3], hv: [2, 2] };
    a.begin("translate(256 400) scale(0.92) translate(-256 -400)");
    a.glow(256, 250, 200, "#ffe066", 0.3);
    a.shadow(256, 400, 190, 20, 0.55);
    // Branch antlers growing from her shoulders, leaf tufts at the tips.
    for (const [pts, tip] of [
      [[[196, 186], [170, 140], [150, 104]], [150, 100]],
      [[[178, 150], [140, 132], [118, 136]], [116, 134]],
      [[[316, 186], [344, 140], [366, 104]], [366, 100]],
      [[[336, 152], [372, 132], [396, 136]], [398, 134]],
    ]) {
      a.mass(limb(pts, [16, 11, 6]), wood);
      a.mass(blob(tip[0], tip[1], 20, 14, { seed: tip[0], n: 7, jitter: 0.25 }), { ...moss, ow: 4, sv: [4, 4], hv: [3, 3] });
    }
    // Hind quarters (far), body mass, front legs as pillars.
    a.mass(blob(360, 300, 62, 64, { seed: 8, n: 9, jitter: 0.06 }), { ...furFar, sv: [12, 12] });
    a.mass(limb([[372, 330], [378, 370], [376, 394]], [52, 46, 44]), { ...furFar, sv: [8, 8] });
    a.mass(smooth([[140, 252], [168, 196], [256, 168], [344, 196], [386, 256], [372, 320], [300, 340], [212, 340], [150, 316]], true, 0.9), { ...fur, sv: [18, 16], hv: [10, 10] });
    // Moss mantle with flowers over the shoulder hump.
    a.mass(smooth([[150, 228], [176, 186], [256, 168], [340, 188], [372, 230], [340, 232], [300, 214], [256, 220], [210, 214], [176, 234]], true, 0.9), { ...moss, sv: [8, 8], hv: [5, 5], ow: 5 });
    for (const [x, y, c] of [[176, 208, "#ffd6e8"], [216, 192, "#fff1c1"], [300, 192, "#ffd6e8"], [344, 210, "#fff1c1"], [258, 182, "#ffd6e8"]]) a.fill(star(x, y, 5, 8, 4), c).fill(ellipse(x, y, 2.5), GOLD);
    a.mass(limb([[196, 300], [190, 350], [188, 394]], [62, 56, 58]), { ...fur, sv: [10, 10] });
    a.mass(limb([[316, 300], [322, 350], [324, 394]], [62, 56, 58]), { ...fur, sv: [10, 10] });
    a.line("M170 396V408M182 398V410M194 398V410M206 396V408M306 396V408M318 398V410M330 398V410M342 396V408", 5, "#fff8ea");
    // Head lowered and forward (drawn 1.15× for presence), gold leaf circlet, calm guarding eyes.
    a.begin("translate(252 244) scale(1.15) translate(-252 -244)");
    a.mass(ellipse(200, 196, 22), { ...fur, sv: [5, 5] }).mass(ellipse(304, 196, 22), { ...fur, sv: [5, 5] });
    a.fill(ellipse(200, 198, 11), "#c99070").fill(ellipse(304, 198, 11), "#c99070");
    a.mass(smooth([[192, 238], [204, 204], [252, 188], [300, 204], [314, 240], [298, 276], [252, 292], [206, 276]], true, 0.95), { ...fur, sv: [12, 10] });
    a.mass(ellipse(250, 262, 34, 24), { base: "#c8a070", shade: "#94704a", light: "#e8c898", ow: 4, sv: [5, 5], hv: [4, 4] });
    a.fill(ellipse(250, 248, 12, 8), INK).fill(ellipse(246, 245, 4, 2.5), "#ffffff", 0.8);
    a.line("M250 256V266M236 272C244 276 256 276 264 272", 3.5);
    eye(a, 224, 232, 7, 6, "#7bd389");
    eye(a, 278, 232, 7, 6, "#7bd389");
    a.line("M212 222L234 226M290 222L268 226", 4);
    a.mass("M206 214C226 200 278 200 298 214L292 222C274 212 230 212 212 222Z", gold);
    a.mass("M252 196C262 204 262 216 252 224C242 216 242 204 252 196Z", { ...gold, base: "#7bd389", shade: "#3d6b30", light: "#c8f7a0" });
    a.end();
    // Two cubs sheltering under her: one between her forelegs, one beside her hind leg.
    const cub = { base: BROWN.base, shade: BROWN.shade, ...rim, rv: 3, ow: 5 };
    for (const [x, y, s] of [[256, 372, 1], [428, 376, 0.82]]) {
      a.mass(ellipse(x, y + 8 * s, 34 * s, 26 * s), { ...cub, sv: [6, 6] });
      a.mass(ellipse(x - 20 * s, y - 26 * s, 9 * s), { ...cub, sv: [3, 3] }).mass(ellipse(x + 20 * s, y - 26 * s, 9 * s), { ...cub, sv: [3, 3] });
      a.mass(ellipse(x, y - 12 * s, 26 * s, 22 * s), { ...cub, sv: [6, 6] });
      a.fill(ellipse(x - 2 * s, y - 4 * s, 12 * s, 8 * s), TAN.base);
      a.fill(ellipse(x - 2 * s, y - 9 * s, 4 * s, 3 * s), INK);
      a.fill(ellipse(x - 11 * s, y - 18 * s, 3.5 * s, 4 * s), INK).fill(ellipse(x + 9 * s, y - 18 * s, 3.5 * s, 4 * s), INK);
      a.fill(ellipse(x - 12 * s, y - 20 * s, 1.3 * s), "#ffffff").fill(ellipse(x + 8 * s, y - 20 * s, 1.3 * s), "#ffffff");
    }
    a.end();
    a.motes({ seed: 61, count: 16, box: [60, 60, 450, 360], size: [3, 7], color: ["#ffe066", "#7bd389", "#c8f7a0"], alpha: [0.4, 0.95], shape: "circle" });
    return a;
  },
};

export default RECIPES;
