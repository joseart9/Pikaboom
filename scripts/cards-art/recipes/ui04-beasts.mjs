// UI-04 recipes (beasts). See art.mjs / docs/cards/UI_VISUAL_SYSTEM.md §6.
// Quadruped template (wolf-pup) adapted per body plan: boar, rhino, tortoise, panther, minotaur, spider, toad.
import { Art, INK, blob, ellipse, f, limb, poly, polar, shard, smooth } from "../lib.mjs";
import { GOLD, M } from "../materials.mjs";

// Local material ramps (palette-aligned hexes).
const R = {
  boar: { base: "#7a4a2e", shade: "#4a2a18", light: "#a8704a" },
  bristle: { base: "#4a2a18", shade: "#2e180c", light: "#6b3f1f" },
  snout: { base: "#c98f8a", shade: "#9a5a5a", light: "#f2c2b4" },
  hide: { base: "#a39280", shade: "#6b5a4a", light: "#cdbba5" },
  plate: { base: "#8a7a68", shade: "#574a3c", light: "#b0a08a" },
  shell: { base: "#7a6a3a", shade: "#4a3e20", light: "#a8945a" },
  reptile: { base: "#7a9a5a", shade: "#4a6a3a", light: "#a8c47a" },
  panther: { base: "#2c2a5a", shade: "#16143a", light: "#4a4890" },
  bull: { base: "#8a5a3a", shade: "#5a361e", light: "#b07a50" },
  spider: { base: "#3a2a4a", shade: "#1e1430", light: "#5a4670" },
  toad: { base: "#6fae4a", shade: "#457a2e", light: "#a0d46a" },
  pad: { base: "#3d8a4a", shade: "#25602e", light: "#5fb060" },
  wood: { base: "#6b4a2f", shade: "#46301e", light: "#9a6a45" },
};
const tuskPaint = { ...M.bone, ow: 4, sv: [3, 3], hv: [2, 2] };
const hoof = (a, x, y, w = 30) => a.mass(`M${f(x - w / 2)} ${f(y + 6)}L${f(x - w / 2 + 3)} ${f(y - 8)}L${f(x + w / 2 - 3)} ${f(y - 8)}L${f(x + w / 2)} ${f(y + 6)}Z`, { base: "#3a2a2a", shade: "#1e1414", light: "#5a4444", ow: 4, sv: [3, 3], hv: [2, 2] });

const RECIPES = {
  /** Quadruped — a stocky bristle-maned boar, head lowered, tusks up, one fore-hoof pawing the dirt. */
  "forest-boar"() {
    const a = new Art("forest-boar");
    a.backdrop("#142a20", "#2c4a2a", "#18281a", { pool: "#d8f5a2", poolAt: [270, 220], poolR: 250, poolAlpha: 0.25 });
    a.fill(limb([[60, 520], [64, 260], [52, -20]], [64, 56, 52]), "#10201a").fill(limb([[440, 520], [452, 240], [446, -20]], [70, 60, 56]), "#10201a");
    a.fill(blob(256, 20, 300, 90, { seed: 3, n: 11, jitter: 0.2 }), "#1c4430");
    a.ground(352, "#203e22", "#4a5a2a", { spot: "#d8f5a2", spotAt: [260, 400], spotR: 180 });
    for (const [x, y, s] of [[70, 360, 1.3], [440, 350, 1.4], [120, 450, 1], [410, 440, 1.1]]) {
      a.fill(blob(x, y, 50 * s, 26 * s, { seed: x, n: 8, jitter: 0.3 }), "#2f5a2c", 0.9);
    }
    a.shadow(262, 398, 150, 16);
    // Far legs.
    a.mass(limb([[230, 330], [228, 370], [226, 392]], [28, 22, 20]), { ...R.boar, base: "#64391f", sv: [5, 5] });
    a.mass(limb([[352, 330], [358, 368], [356, 392]], [30, 22, 20]), { ...R.boar, base: "#64391f", sv: [5, 5] });
    hoof(a, 226, 394, 24);
    hoof(a, 356, 394, 24);
    // Tail curl.
    a.line("M386 270C404 258 410 276 398 282C390 286 392 296 404 294", 5);
    // Bristle mane along the spine (behind the body top).
    const mane = [];
    for (let i = 0; i <= 10; i++) {
      const x = 200 + i * 17, y = 252 - Math.sin((i / 10) * Math.PI) * 36;
      mane.push([x, y + 6], [x + 8, y - 22 - (i % 2) * 8]);
    }
    a.mass(poly([[198, 270], ...mane, [372, 252], [372, 266]]), { ...R.bristle, sv: [5, 5], hv: [3, 3] });
    // Body.
    a.mass(smooth([[198, 258], [252, 228], [322, 224], [374, 246], [394, 290], [380, 334], [330, 350], [250, 348], [204, 332], [186, 296]], true, 0.9), { ...R.boar, rim: "#7bd389", rv: 4, sv: [14, 12] });
    a.line("M240 270L252 286M300 262L310 280M340 276L348 292M272 300L282 316", 3, INK, 0.45);
    // Near hind leg and pawing near fore-leg.
    a.mass(limb([[364, 318], [376, 362], [370, 392]], [42, 30, 24]), { ...R.boar, sv: [7, 6] });
    hoof(a, 370, 396, 28);
    a.mass(limb([[244, 326], [222, 356], [196, 366]], [38, 28, 24]), { ...R.boar, sv: [7, 6] });
    a.mass(poly([[176, 358], [192, 352], [200, 372], [180, 378]]), { base: "#3a2a2a", shade: "#1e1414", light: "#5a4444", ow: 4, sv: [3, 3], hv: [2, 2] });
    a.motes({ seed: 5, count: 9, box: [150, 370, 220, 396], size: [3, 7], color: "#8a6a45", alpha: [0.6, 1] });
    // Head lowered to the left.
    a.mass("M214 212L222 246L196 258Z", { ...R.boar, sv: [5, 5] });
    a.mass(smooth([[236, 252], [206, 244], [168, 262], [132, 296], [112, 326], [120, 350], [156, 354], [204, 334], [238, 306]], true, 0.9), { ...R.boar, sv: [10, 10] });
    a.mass(ellipse(112, 336, 18, 22), { ...R.snout, sv: [5, 5], hv: [3, 3], ow: 5 });
    a.fill(ellipse(106, 330, 3.5, 5), INK).fill(ellipse(118, 332, 3.5, 5), INK);
    // Tusks curving up.
    a.mass(limb([[140, 350], [124, 346], [112, 312]], [13, 9, 2], { capEnd: false }), tuskPaint);
    a.mass(limb([[156, 350], [148, 340], [142, 316]], [11, 7, 2], { capEnd: false }), tuskPaint);
    // Angry eye + brow.
    a.fill(ellipse(172, 288, 7, 6), INK).fill(ellipse(170, 286, 2.2), "#ffbe0b");
    a.line("M156 276L184 284", 5);
    return a;
  },

  /** Quadruped — armored rhino mid-charge to the left, horn forward, legs at full gallop, dust and speed lines. */
  "charging-rhino"() {
    const a = new Art("charging-rhino");
    a.backdrop("#3a2a1e", "#6a5a2e", "#2a2416", { pool: "#ffe0a0", poolAt: [240, 200], poolR: 260, poolAlpha: 0.3 });
    // Savanna: distant mesa + acacia.
    a.fill("M0 310L40 280L140 276L170 300L512 300V330H0Z", "#4a3e24");
    a.fill(limb([[430, 320], [432, 270], [420, 240]], [12, 10, 8]), "#2a2416");
    a.fill(blob(420, 230, 70, 18, { seed: 7, n: 9, jitter: 0.25 }), "#2a3a1e");
    a.ground(330, "#3a4a22", "#6a6a30", { spot: "#ffe0a0", spotAt: [250, 400], spotR: 180 });
    a.line("M30 400L90 390M300 450L380 438M120 470L190 462", 4, "#2a3a1e", 0.6);
    // Dust cloud + speed lines behind (right).
    for (const [x, y, rx, seed] of [[440, 370, 60, 1], [400, 392, 46, 2], [470, 330, 44, 3], [372, 404, 30, 4]]) a.fill(blob(x, y, rx, rx * 0.7, { seed, n: 8, jitter: 0.2 }), "#cdbba5", 0.55);
    a.line("M400 230H480M410 260H500M396 290H470", 6, "#fff1c1", 0.5);
    a.shadow(250, 400, 150, 14);
    // Far legs: fore stretched forward, hind pushing back.
    a.mass(limb([[226, 320], [198, 350], [170, 360]], [34, 28, 26]), { ...R.hide, base: "#8a7a68", sv: [6, 6] });
    a.mass(limb([[350, 322], [384, 350], [402, 378]], [40, 30, 26]), { ...R.hide, base: "#8a7a68", sv: [6, 6] });
    // Tail.
    a.mass(limb([[392, 252], [414, 246], [424, 258]], [10, 6, 4]), { ...R.hide, ow: 4, sv: [2, 2] });
    // Body.
    a.mass(smooth([[196, 236], [262, 204], [340, 206], [392, 238], [402, 296], [372, 338], [290, 348], [214, 334], [184, 290]], true, 0.9), { ...R.hide, rim: "#7bd389", rv: 4, sv: [16, 14], hv: [10, 10] });
    // Armour plate seams.
    a.line("M246 214C262 260 262 300 244 338M330 210C348 256 348 300 334 344", 5, INK, 0.7);
    a.line("M290 230C300 250 300 270 292 290", 3, INK, 0.35);
    // Near legs.
    a.mass(limb([[244, 326], [212, 362], [188, 384]], [40, 32, 30]), { ...R.hide, sv: [7, 7] });
    a.mass(limb([[364, 324], [392, 362], [410, 394]], [44, 34, 30]), { ...R.hide, sv: [7, 7] });
    a.mass(ellipse(184, 388, 18, 11), { ...R.plate, ow: 4, sv: [3, 3], hv: [2, 2] });
    a.mass(ellipse(412, 398, 18, 11), { ...R.plate, ow: 4, sv: [3, 3], hv: [2, 2] });
    // Head lowered, charging left.
    a.mass("M212 232L222 196L238 236Z", { ...R.hide, sv: [5, 5] });
    a.mass(smooth([[232, 236], [190, 244], [146, 270], [108, 300], [102, 326], [126, 340], [178, 336], [224, 318], [242, 284]], true, 0.9), { ...R.hide, sv: [10, 10] });
    a.line("M204 252C210 280 206 306 194 330", 4, INK, 0.6);
    // Horns.
    a.mass(limb([[118, 302], [102, 262], [98, 220]], [38, 22, 2], { capEnd: false }), { ...M.bone, ow: 5, sv: [5, 5], hv: [3, 3] });
    a.mass(limb([[150, 278], [146, 258], [142, 240]], [20, 12, 2], { capEnd: false }), { ...M.bone, ow: 4, sv: [3, 3], hv: [2, 2] });
    a.fill(ellipse(112, 322, 3, 4), INK);
    a.fill(ellipse(172, 290, 6, 5), INK).fill(ellipse(170, 288, 2), "#ffffff");
    a.line("M160 280L182 286", 4);
    a.motes({ seed: 9, count: 10, box: [340, 340, 500, 420], size: [3, 7], color: "#cdbba5", alpha: [0.5, 0.9], shape: "circle" });
    return a;
  },

  /** Wide defensive quadruped — a massive thornback tortoise, shell bristling with spikes and vines, braced in a swamp. */
  "thornback-tortoise"() {
    const a = new Art("thornback-tortoise");
    a.backdrop("#0e2420", "#1e4a3a", "#10201c", { pool: "#a0e0b0", poolAt: [260, 230], poolR: 260, poolAlpha: 0.28 });
    // Swamp: hanging moss trees, reeds, water.
    a.fill(limb([[40, 520], [50, 240], [20, -10]], [70, 56, 50]), "#0a1a16").fill(limb([[476, 520], [470, 220], [492, -10]], [76, 60, 56]), "#0a1a16");
    for (const x of [70, 100, 430, 460]) a.fill(limb([[x, 120], [x + 4, 190], [x - 2, 240]], [10, 6, 2]), "#2a5a3a", 0.8);
    a.ground(350, "#14302a", "#24503e", { spot: "#a0e0b0", spotAt: [256, 400], spotR: 200 });
    a.line("M30 440H140M360 452H480M180 480H320", 4, "#a0e0b0", 0.3);
    for (const [x, h] of [[60, 70], [80, 50], [440, 80], [462, 56]]) a.fill(limb([[x, 360], [x + 4, 360 - h]], [6, 2], { capEnd: false }), "#3d6b30");
    a.mass(shard(110, 372, 44, 24, { seed: 3, n: 7 }), { ...M.rock, ow: 5, sv: [6, 6] });
    a.fill(blob(110, 356, 36, 10, { seed: 4 }), "#5f9a4a");
    a.shadow(262, 398, 172, 18, 0.55);
    const skin = { ...R.reptile, sv: [8, 8] };
    // Legs: thick stumps.
    for (const [x, y, w] of [[178, 360, 46], [344, 362, 50], [394, 350, 40], [226, 372, 50]]) {
      a.mass(limb([[x, y - 30], [x, y + 20]], [w, w + 4]), skin);
      a.line(`M${x - w / 2 + 6} ${y + 26}V${y + 18}M${x} ${y + 28}V${y + 20}M${x + w / 2 - 6} ${y + 26}V${y + 18}`, 4, INK, 0.7);
    }
    // Thorns behind the dome edge (silhouette spikes).
    const thorn = { base: "#d6c9a0", shade: "#9a8a5a", light: "#fff1c1", ow: 4, sv: [3, 3], hv: [2, 2] };
    for (let i = 0; i < 9; i++) {
      const ang = 190 + i * 20;
      const b = polar(268, 318, 128, ang), t = polar(268, 318, 176, ang - 4);
      a.mass(limb([b, t], [26, 2], { capEnd: false }), thorn);
    }
    // Shell dome + plastron rim.
    a.mass(smooth([[132, 326], [146, 252], [200, 200], [272, 184], [344, 200], [394, 250], [404, 326]], true, 0.75), { ...R.shell, rim: "#7bd389", rv: 5, sv: [16, 14], hv: [10, 10], ow: 7 });
    a.line("M180 248L224 222L272 222L316 222L356 248M224 222L210 276L244 310L300 310L330 276L316 222M210 276L160 290M330 276L388 290M244 310L238 326M300 310L306 326", 5, INK, 0.75);
    a.mass("M124 322C190 340 340 342 412 322L410 344C340 362 190 362 126 344Z", { ...R.shell, base: "#a8945a", shade: "#7a6a3a", light: "#d6c48a", ow: 5, sv: [4, 4], hv: [3, 3] });
    // Short thorns on the plates.
    for (const [x, y, dx, dy] of [[272, 266, 0, -34], [228, 250, -16, -26], [318, 250, 16, -26], [196, 290, -24, -14], [352, 290, 24, -14]]) {
      a.mass(limb([[x, y], [x + dx, y + dy]], [20, 2], { capEnd: false }), thorn);
    }
    // Vine with leaves draped over the shell.
    const vine = "M150 270C190 300 230 250 272 262C320 276 340 240 392 268";
    a.line(vine, 9).line(vine, 5, "#5f9a4a");
    for (const [x, y, r] of [[186, 286, 30], [252, 256, -20], [330, 262, 40], [376, 260, -30]]) {
      const tip = polar(x, y, 20, r - 90);
      a.mass(limb([[x, y], tip], [12, 2], { capEnd: false }), { ...M.moss, ow: 3, sv: [2, 2], hv: [2, 2] });
    }
    // Head (left), stern and braced.
    a.mass(limb([[150, 320], [124, 306], [112, 296]], [40, 36, 34]), skin);
    a.mass(smooth([[86, 286], [100, 264], [128, 260], [146, 280], [140, 306], [114, 318], [90, 310]], true, 0.9), { ...skin, sv: [6, 6] });
    a.line("M90 300C104 304 118 302 128 296", 4);
    a.fill(ellipse(112, 280, 6, 5.5), INK).fill(ellipse(110, 278, 2), "#ffffff");
    a.line("M100 270L122 274", 4);
    a.fill(ellipse(92, 290, 2.5), INK);
    a.motes({ seed: 17, count: 8, box: [80, 140, 440, 260], size: [3, 6], color: "#a0e0b0", alpha: [0.3, 0.7], shape: "circle" });
    return a;
  },

  /** Leaping quadruped — a sleek indigo panther mid-pounce, both fore-paws out, two glowing triple-claw slashes. */
  "twin-claw-panther"() {
    const a = new Art("twin-claw-panther");
    a.backdrop("#0a1420", "#14304a", "#0a1a1a", { pool: "#7bd389", poolAt: [220, 220], poolR: 240, poolAlpha: 0.25 });
    a.glow(400, 110, 60, "#e6f6ff", 0.4).fill(ellipse(400, 110, 26), "#e6f6ff", 0.6);
    // Jungle: big leaves + hanging vines.
    for (const [x, y, r, s] of [[30, 330, -30, 1.2], [480, 380, 200, 1.3], [60, 460, -10, 1], [460, 470, 190, 1]]) {
      const tip = polar(x, y, 120 * s, r);
      a.fill(limb([[x, y], [(x + tip[0]) / 2, (y + tip[1]) / 2 - 10], tip], [10, 60 * s, 2], { capEnd: false }), "#0e3424");
    }
    for (const x of [120, 160, 350]) a.line(`M${x} 0C${x + 14} 60 ${x - 10} 110 ${x + 6} ${x === 160 ? 150 : 90}`, 6, "#14402a");
    a.ground(380, "#0a1a14", "#123024", { spot: "#7bd389", spotAt: [300, 420], spotR: 160 });
    a.shadow(300, 420, 110, 12, 0.4);
    a.begin("translate(0 28)");
    // Two glowing slash trails (triple claw marks).
    for (const [x0, y0, x1, y1] of [[100, 130, 210, 250], [100, 230, 190, 360]]) {
      for (let k = -1; k <= 1; k++) {
        const d = `M${x0 + k * 16} ${y0 - k * 8}Q${(x0 + x1) / 2 + 30 + k * 14} ${(y0 + y1) / 2 - 20 - k * 6} ${x1 + k * 14} ${y1 - k * 6}`;
        a.line(d, 12, "#7bd389", 0.35).line(d, 5, "#b8f5c8").line(d, 2, "#ffffff");
      }
    }
    const pf = { ...R.panther, rim: "#7bd389", rv: 4 };
    // Tail streaming back.
    a.mass(limb([[372, 290], [414, 270], [440, 236], [436, 204]], [22, 18, 14, 8]), { ...pf, sv: [5, 5] });
    // Far hind leg.
    a.mass(limb([[350, 316], [372, 352], [398, 380]], [32, 24, 18]), { ...R.panther, base: "#22204a", sv: [5, 5] });
    // Body: stretched diagonal.
    a.mass(limb([[372, 290], [300, 260], [234, 232]], [84, 92, 78]), { ...pf, sv: [12, 12], hv: [8, 8] });
    a.line("M260 222C300 230 330 248 360 268", 4, "#4a4890", 0.6);
    // Near hind leg kicking back.
    a.mass(limb([[340, 306], [352, 346], [384, 370], [408, 384]], [44, 30, 22, 18]), { ...pf, sv: [6, 6] });
    // Fore-legs reaching forward, claws out.
    const paw = (pts, tip) => {
      a.mass(limb(pts, [34, 26, 22]), { ...pf, sv: [6, 6] });
      for (const [dx, dy] of [[-16, -8], [-18, 4], [-12, 14]]) {
        a.mass(limb([tip, [tip[0] + dx, tip[1] + dy]], [7, 2], { capEnd: false }), { ...M.bone, ow: 3, sv: [2, 2], hv: [1, 1] });
      }
    };
    paw([[236, 252], [190, 286], [148, 300]], [140, 300]);
    // Near fore-leg (under the head).
    paw([[252, 250], [206, 262], [160, 262]], [152, 262]);
    // Head.
    a.mass("M210 190L218 152L240 184Z", { ...pf, sv: [4, 4] });
    a.fill("M216 182L220 164L230 182Z", "#7a5aa0", 0.8);
    a.mass(smooth([[236, 196], [214, 180], [182, 184], [156, 204], [146, 228], [166, 248], [204, 252], [236, 232]], true, 0.9), { ...pf, sv: [8, 8] });
    // Open snarl + fangs.
    a.fill("M150 226L184 230L178 246L156 242Z", "#5a1030");
    a.fill(poly([[160, 228], [166, 228], [163, 240]]), "#ffffff").fill(poly([[172, 230], [178, 230], [175, 242]]), "#ffffff");
    a.fill(ellipse(150, 214, 4, 3), INK);
    a.glow(190, 204, 20, "#7bd389", 0.9);
    a.fill("M178 200L202 198L198 208L180 208Z", "#b8f5c8").fill("M188 199L191 199L190 208L187 208Z", INK);
    a.line("M176 194L204 192", 4);
    a.end();
    a.motes({ seed: 23, count: 10, box: [90, 120, 300, 380], size: [3, 7], color: ["#b8f5c8", "#7bd389"], alpha: [0.5, 1] });
    return a;
  },

  /** Biped beast — a horned minotaur swinging a huge double-bit axe in a wide sweep, broken spears flying. */
  "line-breaker"() {
    const a = new Art("line-breaker");
    a.backdrop("#1e1a10", "#4a3a20", "#1e1a12", { pool: "#ffd08a", poolAt: [260, 230], poolR: 260, poolAlpha: 0.3 });
    // Battlefield: palisade stakes + torn banner, low hills.
    a.fill("M0 330L80 300L180 316L300 296L420 314L512 300V340H0Z", "#2e2614");
    for (let x = 10; x < 512; x += 46) if (x < 140 || x > 380) a.fill(poly([[x, 330], [x + 8, 266], [x + 16, 330]]), "#24200f");
    a.fill(poly([[430, 150], [482, 150], [470, 200], [482, 250], [430, 240]]), "#3d6b30", 0.7);
    a.line("M430 140V300", 5, "#24200f");
    a.ground(340, "#2a2a16", "#4a4426", { spot: "#ffd08a", spotAt: [262, 404], spotR: 180 });
    a.shadow(268, 402, 120, 16);
    // Sweep arc (motion trail) behind the axe.
    a.fill("M130 226C220 160 404 176 418 326L384 312C372 222 250 206 136 250Z", "#fff1c1", 0.28);
    a.line("M150 232C240 184 390 196 404 316", 5, "#ffffff", 0.5);
    // Flying broken spear + shield bits.
    a.mass(limb([[400, 150], [460, 120]], 8), { ...R.wood, ow: 4, sv: [2, 2] });
    a.mass(poly([[456, 110], [476, 112], [470, 126]]), { ...M.steel, ow: 3, sv: [2, 2] });
    a.mass(limb([[60, 160], [100, 190]], 8), { ...R.wood, ow: 4, sv: [2, 2] });
    a.mass(ellipse(80, 380, 28, 20), { ...M.tabard, ow: 4, sv: [4, 4], hv: [3, 3] });
    a.line("M64 372L96 390", 4, INK, 0.7);
    a.mass(shard(440, 380, 16, 10, { seed: 3, n: 5 }), { ...M.steel, ow: 3, sv: [2, 2] });
    const fur = { ...R.bull, rim: "#7bd389", rv: 4 };
    // Legs + hooves.
    a.mass(limb([[240, 316], [230, 356], [226, 390]], [46, 34, 28]), { ...fur, sv: [7, 7] });
    a.mass(limb([[300, 316], [314, 356], [320, 390]], [46, 34, 28]), { ...fur, sv: [7, 7] });
    hoof(a, 222, 396, 34);
    hoof(a, 324, 396, 34);
    // Torso, chest, loincloth.
    a.mass(smooth([[212, 222], [258, 196], [318, 208], [336, 258], [318, 318], [246, 326], [206, 292]], true, 0.85), { ...fur, sv: [14, 12] });
    a.mass(smooth([[232, 226], [270, 216], [304, 230], [300, 266], [266, 276], [236, 264]], true, 0.9), { ...R.bull, base: "#b07a50", shade: "#8a5a3a", light: "#d6a070", ow: 0, sv: [5, 5], hv: [3, 3] });
    a.line("M268 222V270M240 290C256 296 286 296 304 288", 4, INK, 0.5);
    a.mass("M222 304L320 304L328 346L290 336L272 360L252 336L216 346Z", { ...M.leather, ow: 5, sv: [6, 6], hv: [3, 3] });
    a.mass(poly([[262, 300], [282, 300], [282, 316], [262, 316]]), { ...M.gold, ow: 4, sv: [3, 3], hv: [2, 2] });
    // Far arm.
    a.mass(limb([[316, 222], [302, 262], [262, 268]], [40, 32, 28]), { ...fur, sv: [6, 6] });
    // Axe: long haft, double crescent bit on the left.
    a.mass(limb([[344, 270], [120, 254]], 13), { ...R.wood, ow: 5, sv: [3, 3], hv: [2, 2] });
    const bit = { ...M.steel, base: "#8a9ab0", shade: "#4a566e", rim: "#7bd389", rv: 3, ow: 5, sv: [6, 6], hv: [4, 4] };
    a.mass(smooth([[116, 250], [100, 224], [96, 188], [124, 196], [150, 206], [146, 248]], true, 0.5), bit);
    a.mass(smooth([[116, 262], [146, 262], [150, 306], [124, 316], [96, 324], [100, 288]], true, 0.5), bit);
    a.line("M104 196C98 214 100 234 108 246M106 316C98 300 98 282 104 268", 3, "#ffffff", 0.7);
    a.mass(limb([[124, 244], [124, 268]], 18), { ...M.gold, ow: 4, sv: [3, 3], hv: [2, 2] });
    // Near arm gripping the haft.
    a.mass(limb([[216, 222], [190, 250], [190, 262]], [44, 36, 30]), { ...fur, sv: [6, 6] });
    a.mass(ellipse(190, 262, 18, 16), { ...fur, ow: 5, sv: [4, 4], hv: [3, 3] });
    a.mass(ellipse(254, 268, 17, 15), { ...fur, ow: 5, sv: [4, 4], hv: [3, 3] });
    // Bull head with big horns, nose ring.
    a.mass(limb([[238, 140], [204, 124], [184, 108], [190, 94]], [24, 20, 12, 2], { capEnd: false }), { ...M.bone, ow: 5, sv: [4, 4], hv: [3, 3] });
    a.mass(limb([[290, 140], [326, 124], [344, 108], [338, 94]], [24, 20, 12, 2], { capEnd: false }), { ...M.bone, ow: 5, sv: [4, 4], hv: [3, 3] });
    a.mass(poly([[226, 150], [208, 146], [224, 166]]), { ...fur, ow: 4, sv: [3, 3] });
    a.mass(poly([[302, 150], [320, 146], [304, 166]]), { ...fur, ow: 4, sv: [3, 3] });
    a.mass(smooth([[234, 136], [264, 126], [294, 138], [300, 172], [284, 206], [246, 210], [228, 176]], true, 0.9), { ...fur, sv: [10, 8] });
    a.mass(ellipse(262, 196, 26, 18), { ...R.snout, base: "#c98f6a", shade: "#9a5a3a", light: "#e8b48a", ow: 5, sv: [4, 4], hv: [3, 3] });
    a.fill(ellipse(252, 194, 4, 5), INK).fill(ellipse(272, 194, 4, 5), INK);
    a.line(ellipse(262, 210, 9), 4, GOLD);
    a.glow(248, 164, 14, "#ff4d6d", 0.8).glow(278, 164, 14, "#ff4d6d", 0.8);
    a.fill("M238 160L256 164L252 170L240 168Z", "#ffd0a0").fill("M288 160L270 164L274 170L286 168Z", "#ffd0a0");
    a.line("M234 154L256 162M292 154L270 162", 5);
    a.motes({ seed: 31, count: 10, box: [100, 300, 420, 400], size: [3, 7], color: "#cdbba5", alpha: [0.4, 0.8], shape: "circle" });
    return a;
  },

  /** Arachnid — a venomous spider rearing on its web, front legs raised, green fangs dripping poison. */
  "venom-spider"() {
    const a = new Art("venom-spider");
    a.backdrop("#0a140e", "#1a2e1e", "#0c140e", { pool: "#7bd389", poolAt: [256, 240], poolR: 250, poolAlpha: 0.3 });
    // Hollow: dark roots framing, web strands.
    a.fill("M0 0H140C90 80 60 200 70 512H0Z", "#081008").fill("M512 0H380C430 90 460 210 446 512H512Z", "#081008");
    a.line("M120 70C130 120 116 180 96 230M400 60C380 120 410 170 430 210", 10, "#0e1c10");
    const web = "M80 60L256 250L440 70M60 250H460M90 440L256 250L430 440M256 40V250";
    a.line(web, 2, "#d8f0d8", 0.25);
    for (const r of [60, 110, 160]) a.line(`M${256 - r} 250Q256 ${250 - r * 0.6} ${256 + r} 250Q256 ${250 + r * 0.6} ${256 - r} 250`, 2, "#d8f0d8", 0.18);
    a.ground(380, "#0a160c", "#18301c", { spot: "#7bd389", spotAt: [256, 410], spotR: 160 });
    a.shadow(256, 404, 140, 14);
    const sp = { ...R.spider, rim: "#7bd389", rv: 3, ow: 5, sv: [4, 4], hv: [3, 3] };
    const leg = (pts) => {
      a.mass(limb(pts, [16, 13, 6], { capEnd: false }), sp);
      a.fill(ellipse(pts[1][0], pts[1][1], 6), "#5a4670");
    };
    // Back legs (both sides) behind the abdomen.
    leg([[300, 290], [404, 236], [416, 330]]);
    leg([[296, 304], [400, 312], [412, 398]]);
    leg([[212, 290], [110, 240], [98, 330]]);
    leg([[218, 306], [116, 316], [104, 398]]);
    // Abdomen: bulbous, striped chevrons.
    a.mass(ellipse(300, 238, 92, 74), { ...sp, sv: [14, 12], hv: [9, 9], ow: 6 });
    for (const [y, w] of [[196, 40], [226, 56], [258, 60]]) a.fill(`M${300 - w} ${y}L300 ${y + 18}L${300 + w} ${y}L${300 + w - 8} ${y + 12}L300 ${y + 30}L${300 - w + 8} ${y + 12}Z`, "#7bd389", 0.85);
    a.fill(ellipse(276, 196, 16, 10), "#ffffff", 0.15);
    // Middle legs (in front).
    leg([[230, 318], [160, 350], [140, 404]]);
    leg([[282, 318], [352, 350], [372, 404]]);
    // Cephalothorax + head.
    a.mass(ellipse(256, 304, 58, 44), { ...sp, sv: [10, 8], hv: [6, 6], ow: 6 });
    // Eyes (cluster, glowing).
    a.glow(256, 296, 40, "#7bd389", 0.5);
    for (const [x, y, r] of [[240, 292, 9], [272, 292, 9], [226, 280, 5], [286, 280, 5], [248, 278, 4], [264, 278, 4]]) {
      a.fill(ellipse(x, y, r), INK).fill(ellipse(x, y, r * 0.6), "#b8f5c8").fill(ellipse(x - r * 0.3, y - r * 0.3, r * 0.25), "#ffffff");
    }
    // Fangs dripping venom.
    const fang = { base: "#7bd389", shade: "#3d6b30", light: "#d8f5a2", ow: 4, sv: [3, 3], hv: [2, 2] };
    a.mass(limb([[240, 318], [234, 340], [244, 358]], [16, 10, 2], { capEnd: false }), fang);
    a.mass(limb([[272, 318], [278, 340], [268, 358]], [16, 10, 2], { capEnd: false }), fang);
    for (const [x, y, s] of [[244, 376, 7], [268, 384, 6], [256, 402, 5]]) a.mass(`M${x} ${y - s * 1.8}C${x + s} ${y - s * 0.4} ${x + s} ${y + s} ${x} ${y + s}C${x - s} ${y + s} ${x - s} ${y - s * 0.4} ${x} ${y - s * 1.8}Z`, { ...fang, ow: 3, sv: [2, 2], hv: [1, 1] });
    // Raised front legs.
    leg([[236, 286], [170, 196], [140, 150]]);
    leg([[276, 286], [344, 190], [372, 146]]);
    a.motes({ seed: 41, count: 10, box: [120, 140, 400, 380], size: [3, 6], color: "#7bd389", alpha: [0.4, 0.9], shape: "circle" });
    return a;
  },

  /** Token — a chubby toad sitting on a lily pad, big eyes, wide grin (toad-hex result). Simplest of the set. */
  toad() {
    const a = new Art("toad");
    a.backdrop("#10282a", "#1e4a40", "#10282a", { pool: "#d8f5a2", poolAt: [256, 250], poolR: 240, poolAlpha: 0.25 });
    a.ground(320, "#123a3a", "#1e5050");
    a.line("M40 360H130M380 352H480M60 440H180M330 460H460", 4, "#d8f5a2", 0.25);
    a.mass(ellipse(430, 420, 50, 14), { ...R.pad, ow: 4, sv: [3, 3] });
    a.mass(ellipse(80, 470, 40, 12), { ...R.pad, ow: 4, sv: [3, 3] });
    // Lily pad with a notch.
    a.mass("M256 378L180 352C110 356 80 378 92 396C120 420 390 422 420 396C432 378 400 352 330 350Z", { ...R.pad, sv: [8, 8], hv: [5, 5] });
    a.line("M256 378L160 404M256 378L350 404M256 378L256 414", 3, INK, 0.35);
    a.shadow(256, 376, 110, 14, 0.45);
    // Back legs (folded, sides).
    a.mass(ellipse(172, 340, 46, 30), { ...R.toad, sv: [6, 6] });
    a.mass(ellipse(340, 340, 46, 30), { ...R.toad, sv: [6, 6] });
    // Body.
    a.mass(smooth([[256, 206], [330, 222], [366, 280], [350, 352], [256, 370], [162, 352], [146, 280], [182, 222]], true, 0.9), { ...R.toad, sv: [14, 12], hv: [9, 9] });
    a.mass(smooth([[256, 290], [310, 300], [320, 344], [256, 362], [192, 344], [202, 300]], true, 0.9), { ...M.cream, ow: 0, sv: [4, 4], hv: [3, 3] });
    for (const [x, y, r] of [[200, 252, 7], [318, 256, 6], [334, 300, 5], [176, 298, 5]]) a.fill(ellipse(x, y, r), "#457a2e");
    // Front feet.
    for (const x of [214, 298]) {
      a.mass(ellipse(x, 364, 20, 10), { ...R.toad, ow: 4, sv: [3, 3], hv: [2, 2] });
      a.line(`M${x - 10} 362V372M${x} 364V374M${x + 10} 362V372`, 3, INK, 0.6);
    }
    // Bulging eyes.
    for (const x of [208, 304]) {
      a.mass(ellipse(x, 214, 32), { ...R.toad, sv: [6, 6], hv: [4, 4] });
      a.fill(ellipse(x, 214, 20), "#ffe066").fill(ellipse(x, 216, 13, 16), INK).fill(ellipse(x - 6, 208, 5), "#ffffff");
    }
    // Wide grin + nostrils + cheeks.
    a.line("M196 268C226 292 286 292 316 268", 5);
    a.fill(ellipse(246, 252, 3), INK).fill(ellipse(266, 252, 3), INK);
    a.fill(ellipse(190, 276, 10, 6), "#ff4d6d", 0.3).fill(ellipse(322, 276, 10, 6), "#ff4d6d", 0.3);
    a.motes({ seed: 51, count: 6, box: [100, 120, 420, 220], size: [3, 6], color: "#d8f5a2", alpha: [0.4, 0.8], shape: "circle" });
    return a;
  },
};

export default RECIPES;
