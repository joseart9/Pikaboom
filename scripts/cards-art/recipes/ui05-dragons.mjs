// UI-05 recipes (dragons). See art.mjs / docs/cards/UI_VISUAL_SYSTEM.md §6.
// Dragon template (ignis) split into distinct silhouettes: curled larva, wingless coiled wyrm, side-on flying ash
// drake, frontal diving storm drake, and the perched swan-necked ice queen Vaelra.
import { Art, INK, blob, ellipse, f, limb, poly, polar, shard, smooth, star, bolt } from "../lib.mjs";
import { LEGENDARY, M } from "../materials.mjs";
import { wing } from "./ui05-parts.mjs";

const R = {
  fire: { base: "#ff7b00", shade: "#c2410c", light: "#ffbe0b" },
  core: { base: "#ffe066", shade: "#ffbe0b", light: "#fff8d6" },
  belly: { base: "#ffbe0b", shade: "#d97a00", light: "#ffe8a0" },
  larva: { base: "#c0502e", shade: "#7a2414", light: "#ee8048", rim: "#ffbe0b", rv: 4 },
  wyrm: { base: "#c8301e", shade: "#7a1410", light: "#f05a3a", rim: "#ffbe0b", rv: 4 },
  ash: { base: "#6e6874", shade: "#3c3644", light: "#a29ca8", rim: "#ff7b00", rv: 4 },
  ashWing: { base: "#4e4656", shade: "#2c2634", light: "#6e6676" },
  storm: { base: "#3a6ab8", shade: "#1e3a7a", light: "#6a9ae0", rim: "#ffe066", rv: 4 },
  stormWing: { base: "#2a4a8a", shade: "#16285a", light: "#4a72b8" },
  ice: { base: "#cfe8ff", shade: "#7aa6d6", light: "#ffffff", rim: LEGENDARY, rv: 4 },
  iceWing: { base: "#5e94d4", shade: "#36609e", light: "#a8d0f5", rim: LEGENDARY, rv: 3 },
  crystal: { base: "#bfe6ff", shade: "#5a9ad6", light: "#ffffff" },
  horn: { base: "#3a2a2a", shade: "#1e1414", light: "#6a5050" },
  rock: { base: "#3a2430", shade: "#1e1018", light: "#5a3a48" },
};
const claw = (pts) => pts.map(([x, y, dx, dy]) => limb([[x, y], [x + dx, y + dy]], [8, 2], { capEnd: false })).join("");

const RECIPES = {
  /** Larva — a chubby curled dragon grub in a cracked egg on coals; the shadow of the drake it becomes on the wall. */
  "larval-drake"() {
    const a = new Art("larval-drake");
    a.backdrop("#200a10", "#4a1a1a", "#1a0808", { pool: "#ff7b00", poolAt: [256, 300], poolR: 240, poolAlpha: 0.35 });
    // The future: a winged drake's shadow cast on the cave wall.
    a.fill("M256 200L200 120L120 70L150 130L90 120L140 170L80 190L180 200L230 230ZM256 200L312 120L392 70L362 130L422 120L372 170L432 190L332 200L282 230Z" + ellipse(256, 210, 34, 50) + limb([[256, 170], [256, 120], [240, 96]], [26, 18, 14]), INK, 0.35);
    a.ground(350, "#1e0a0a", "#4a1e14", { spot: "#ffbe0b", spotAt: [256, 390], spotR: 190 });
    // Nest of coals.
    for (let i = 0; i < 11; i++) {
      const [x, y] = polar(256, 384, 1, 180 + i * 18);
      a.mass(shard(256 + (x - 256) * 160, 384 + (y - 384) * 30 + 6, 20, 13, { seed: i + 1, n: 6 }), { ...R.rock, ow: 4, sv: [3, 3], hv: [2, 2] });
    }
    a.glow(256, 390, 120, "#ff7b00", 0.6);
    // Egg shell: back half behind the larva.
    a.mass("M150 380C140 300 176 240 232 232L250 260L268 236L290 270L312 240C352 260 370 320 362 380Z", { ...M.cream, sv: [12, 10] });
    a.fill(blob(200, 300, 10, 7, { seed: 2 }), "#c98f6a", 0.6).fill(blob(332, 320, 8, 6, { seed: 3 }), "#c98f6a", 0.6);
    // Curled body (C-shape), belly plates, back nubs, wing buds.
    const spine = [[320, 380], [354, 344], [348, 296], [312, 262], [262, 258]];
    a.mass(limb(spine, [36, 52, 64, 66, 62]), { ...R.larva, sv: [10, 10] });
    a.mass(limb([[310, 376], [334, 346], [330, 306], [304, 282]], [16, 24, 28, 26]), { ...R.belly, ow: 0, sv: [4, 4], hv: [3, 3] });
    a.line("M300 360L326 368M316 334L342 330M314 306L338 296", 4, "#a85400", 0.8);
    let nubs = "";
    for (const [x, y, dx, dy] of [[356, 316, 14, -2], [350, 290, 12, -10], [334, 268, 6, -14], [310, 254, 0, -16]]) nubs += limb([[x - 2, y + 2], [x + dx, y + dy]], [12, 2], { capEnd: false });
    a.mass(nubs, { ...R.horn, ow: 3, sv: [2, 2], hv: [1, 1] });
    a.mass("M318 250C326 222 350 210 366 216C356 230 352 244 340 262Z", { ...R.fire, ow: 4, sv: [3, 3], hv: [2, 2] });
    // Stubby front legs.
    a.mass(limb([[240, 300], [224, 330], [226, 352]], [20, 16, 14]) + limb([[276, 304], [272, 336], [278, 356]], [20, 16, 14]), { ...R.larva, sv: [4, 4], hv: [3, 3] });
    // Big round head, horn nubs, huge eyes, smoke puff.
    a.mass(limb([[226, 232], [218, 210]], [16, 4], { capEnd: false }) + limb([[250, 224], [256, 200]], [16, 4], { capEnd: false }), { ...R.horn, ow: 4, sv: [2, 2], hv: [1, 1] });
    a.mass(smooth([[184, 268], [190, 236], [222, 220], [262, 230], [278, 266], [262, 300], [214, 306], [188, 292]], true, 0.9), { ...R.larva, sv: [10, 8] });
    a.mass(smooth([[170, 278], [186, 262], [214, 268], [218, 290], [196, 302], [172, 296]], true, 0.9), { ...R.larva, sv: [5, 5], hv: [3, 3] });
    a.fill(ellipse(184, 278, 3, 4) + ellipse(196, 276, 3, 4), INK);
    for (const [x, r] of [[222, 17], [254, 15]]) {
      a.fill(ellipse(x, 256, r, r + 2), "#fff8ea").line(ellipse(x, 256, r, r + 2), 4);
      a.fill(ellipse(x - 3, 258, r * 0.6, r * 0.7), INK).fill(ellipse(x - 7, 251, r * 0.25), "#ffffff");
    }
    a.line("M200 292C206 298 214 298 220 292", 3);
    for (const [x, y, r, o] of [[160, 250, 12, 0.7], [146, 230, 16, 0.55], [140, 202, 20, 0.4]]) a.fill(ellipse(x, y, r), "#8a7a80", o);
    // Front shell shards.
    a.mass("M150 380C152 352 160 340 176 336L188 352L204 340L214 366L232 360L238 392Z", { ...M.cream, sv: [8, 6], hv: [5, 5] });
    a.mass(shard(390, 384, 18, 10, { seed: 9, n: 5 }), { ...M.cream, ow: 4, sv: [3, 3], hv: [2, 2] });
    a.motes({ seed: 47, count: 12, box: [100, 200, 420, 400], size: [3, 7], color: ["#ffbe0b", "#ff7b00"], alpha: [0.5, 1] });
    return a;
  },

  /** Wingless serpent — a flame wyrm coiled in a lava cavern, finned spine, spitting a jet of fire (Quemadura 2). */
  "flame-wyrm"() {
    const a = new Art("flame-wyrm");
    a.backdrop("#1e0610", "#5a1018", "#1a0408", { pool: "#ff7b00", poolAt: [300, 320], poolR: 260, poolAlpha: 0.4 });
    a.fill("M0 200L40 150L70 190L110 120L150 200L0 260ZM512 180L470 120L440 170L400 110L380 180L512 240Z", "#2a0810");
    a.ground(360, "#2a0808", "#4a1010", {});
    a.fill(blob(256, 430, 260, 40, { seed: 4, n: 10 }), "#ff7b00", 0.85).fill(blob(256, 430, 200, 24, { seed: 5, n: 10 }), "#ffe066", 0.7);
    a.shadow(300, 400, 160, 16);
    // Coiled body with a dorsal fin.
    const spine = [[460, 396], [404, 388], [344, 404], [282, 394], [240, 356], [256, 310], [318, 296], [358, 254], [342, 202], [292, 176], [236, 176]];
    const W = [6, 18, 30, 40, 46, 48, 48, 48, 46, 44, 42];
    let fin = "";
    for (let i = 1; i < spine.length - 1; i++) {
      const p = spine[i - 1], q = spine[i + 1], dx = q[0] - p[0], dy = q[1] - p[1], l = Math.hypot(dx, dy);
      const nx = dy / l, ny = -dx / l, [x, y] = spine[i], w = W[i] / 2;
      fin += poly([[x + nx * (w - 6) - dx / l * 12, y + ny * (w - 6) - dy / l * 12], [x + nx * (w + 22) + dx / l * 6, y + ny * (w + 22) + dy / l * 6], [x + nx * (w - 6) + dx / l * 14, y + ny * (w - 6) + dy / l * 14]]);
    }
    a.mass(fin, { ...R.fire, ow: 4, sv: [3, 3], hv: [2, 2] });
    a.mass(limb(spine, W, { capEnd: false }), { ...R.wyrm, sv: [12, 10] });
    a.mass(limb(spine.slice(2), W.slice(2).map((w) => w * 0.36)), { ...R.belly, ow: 0, sv: [3, 3], hv: [2, 2] });
    for (let i = 2; i < spine.length - 1; i++) {
      const [x, y] = spine[i], [qx, qy] = spine[i + 1], l = Math.hypot(qx - x, qy - y), w = W[i] * 0.2;
      a.line(`M${f(x - ((qy - y) / l) * w)} ${f(y + ((qx - x) / l) * w)}L${f(x + ((qy - y) / l) * w)} ${f(y - ((qx - x) / l) * w)}`, 3, "#a85400", 0.8);
    }
    // Head facing left: frill, horns, open jaws, fire jet.
    let frill = "";
    for (const d of [-150, -120, -90, -60]) frill += limb([[248, 168], polar(248, 168, 54, d)], [16, 2], { capEnd: false });
    a.mass(frill, { ...R.fire, ow: 4, sv: [3, 3], hv: [2, 2] });
    a.mass(limb([[232, 154], [262, 132], [292, 130]], [14, 8, 2], { capEnd: false }), { ...R.horn, ow: 4, sv: [2, 2], hv: [1, 1] });
    a.mass("M256 160C246 140 214 138 190 148L148 160C140 166 142 174 150 176L196 178L252 192C262 184 262 170 256 160Z", { ...R.wyrm, sv: [8, 6] });
    a.mass("M244 192L198 192L156 206C150 212 154 220 162 220L204 216L246 206Z", { ...R.wyrm, sv: [5, 5] });
    a.fill("M196 178L244 190L246 204L204 214L160 216L192 190Z", "#3a0612");
    a.glow(200, 152, 14, "#ffe066", 0.9).fill("M190 150L212 150L206 158L192 158Z", "#ffe066").fill(ellipse(201, 154, 2, 4), INK);
    for (const [x, y] of [[160, 176], [174, 177], [188, 178], [170, 214], [184, 213]]) a.fill(poly([[x - 4, y], [x + 4, y], [x, y + (y < 190 ? 8 : -8)]]), "#fff1c1");
    a.glow(140, 210, 70, "#ffbe0b", 0.8);
    a.mass(smooth([[166, 196], [130, 186], [96, 200], [62, 210], [40, 240], [70, 250], [52, 280], [96, 270], [120, 240], [160, 214]], true, 0.8), { ...R.fire, ow: 5, sv: [6, 6], hv: [4, 4] });
    a.mass(smooth([[162, 202], [128, 200], [96, 218], [100, 240], [130, 230], [160, 210]], true, 0.9), { ...R.core, ow: 0, sv: [3, 3], hv: [2, 2] });
    a.motes({ seed: 53, count: 16, box: [30, 120, 480, 420], size: [3, 8], color: ["#ffbe0b", "#ff7b00", "#ffe066"], alpha: [0.5, 1] });
    return a;
  },

  /** Wyvern in flight — a grey ash drake gliding left over a burnt forest, wings mid-beat, ember-cracked hide (Vuelo). */
  "ash-drake"() {
    const a = new Art("ash-drake");
    a.backdrop("#2a1a24", "#6a3e36", "#1e1418", { pool: "#ff9a4a", poolAt: [300, 300], poolR: 260, poolAlpha: 0.3 });
    // Smoke banks and a burnt treeline far below.
    for (const [x, y, rx, ry, s] of [[90, 110, 120, 40, 1], [420, 80, 130, 36, 2], [380, 230, 100, 30, 3]]) a.fill(blob(x, y, rx, ry, { seed: s, n: 10 }), "#4a3a40", 0.55);
    let trees = "M0 512V430";
    for (let x = 0; x <= 512; x += 32) trees += `L${x + 8} ${420 - (x % 3) * 10}L${x + 12} ${372 - ((x * 7) % 5) * 10}L${x + 16} ${420 - (x % 2) * 10}`;
    a.fill(trees + "L512 430V512Z", "#160c10");
    a.fill(blob(256, 440, 280, 20, { seed: 6, n: 9 }), "#ff7b00", 0.35);
    // The drake (scaled about its body so the raised wing stays near the crops).
    a.begin("translate(270 250) scale(0.86) translate(-270 -230)");
    // Far wing (behind, lowered).
    wing(a, { root: [232, 246], rootLow: [262, 266], wrist: [168, 300], tips: [[86, 352], [124, 380], [176, 384], [226, 352]], mem: R.ashWing, bone: R.horn, sag: 0.28, boneW: 12 });
    // Tail.
    a.mass(limb([[330, 264], [392, 290], [440, 280], [480, 304]], [42, 28, 16, 6], { capEnd: false }), { ...R.ash, sv: [6, 6] });
    a.mass(poly([[470, 296], [500, 290], [490, 316]]), { ...R.horn, ow: 4, sv: [2, 2], hv: [1, 1] });
    // Tucked hind leg with claws.
    a.mass(limb([[316, 274], [334, 312], [316, 334]], [34, 24, 18]), { ...R.ash, sv: [5, 5] });
    a.mass(claw([[312, 336, -10, 10], [320, 338, -2, 14], [328, 336, 6, 12]]), { ...M.bone, ow: 3, sv: [1, 1], hv: [1, 1] });
    // Body.
    a.mass(smooth([[196, 240], [250, 218], [318, 226], [350, 256], [330, 286], [262, 290], [210, 272]], true, 0.9), { ...R.ash, sv: [12, 10] });
    a.mass(smooth([[210, 262], [262, 280], [324, 278], [312, 290], [256, 292], [214, 278]], true, 0.9), { base: "#b8aca0", shade: "#7a6e64", light: "#e0d6cc", ow: 0, sv: [3, 3], hv: [2, 2] });
    a.line("M240 236L252 254L246 270M286 230L298 248L292 262M322 240L314 258", 3, "#ff7b00", 0.85);
    // Near wing (raised).
    wing(a, { root: [244, 234], rootLow: [312, 246], wrist: [296, 124], tips: [[230, 42], [330, 40], [404, 84], [420, 156], [380, 214]], mem: { ...R.ashWing, base: "#5e5666", light: "#827a8a" }, bone: R.ash, sag: 0.3, boneW: 16 });
    a.line("M300 130L360 84M304 150L390 150", 3, "#ff7b00", 0.5);
    // Neck + head facing left, ember eye, swept horns, smoke from the nostril.
    a.mass(limb([[220, 244], [182, 224], [150, 206]], [46, 36, 30]), { ...R.ash, sv: [6, 6] });
    a.mass(limb([[150, 186], [176, 170], [204, 168]], [14, 8, 2], { capEnd: false }) + limb([[144, 196], [174, 192], [200, 198]], [10, 6, 2], { capEnd: false }), { ...R.horn, ow: 4, sv: [2, 2], hv: [1, 1] });
    a.mass("M162 190C150 180 126 180 108 188L74 204C68 210 72 218 80 218L118 220L158 222C168 214 170 200 162 190Z", { ...R.ash, sv: [7, 6] });
    a.glow(136, 196, 14, "#ff7b00", 0.9).fill("M126 194L146 192L142 200L128 200Z", "#ffbe0b");
    a.line("M84 212L120 214", 3);
    a.fill(ellipse(82, 204, 3, 2), INK);
    for (const [x, y, r, o] of [[62, 196, 10, 0.6], [44, 184, 14, 0.45], [32, 164, 18, 0.3]]) a.fill(ellipse(x, y, r), "#9a8a90", o);
    a.end();
    a.motes({ seed: 59, count: 18, box: [40, 60, 490, 440], size: [3, 7], color: ["#ff7b00", "#ffbe0b", "#8a7a80"], alpha: [0.5, 1] });
    return a;
  },

  /** Frontal diving storm drake, wings flung wide in a thunderhead, lightning arcing between its horns and striking down (Aturdir). */
  "storm-drake"() {
    const a = new Art("storm-drake");
    a.backdrop("#0a1020", "#1e3050", "#0a0e1a", { pool: "#ffe066", poolAt: [256, 240], poolR: 240, poolAlpha: 0.18 });
    for (const [x, y, rx, ry, s] of [[80, 60, 150, 60, 1], [430, 50, 150, 60, 2], [256, 10, 200, 50, 3]]) a.fill(blob(x, y, rx, ry, { seed: s, n: 10 }), "#2a3a5a", 0.9);
    let rain = "";
    for (let i = 0; i < 18; i++) rain += `M${(i * 61) % 512} ${(i * 97) % 300 + 120}l-14 34`;
    a.line(rain, 2, "#9ec8ff", 0.35);
    a.ground(410, "#0a1020", "#1a2840", {});
    // Strike: a bolt from the cloud to the ground, impact star.
    a.glow(420, 404, 70, "#ffe066", 0.8);
    a.fill(bolt([452, 30], [420, 400], { segments: 7, amp: 22, width: 16, seed: 4 }), "#ffe066").fill(bolt([452, 30], [420, 400], { segments: 7, amp: 22, width: 6, seed: 4 }), "#ffffff");
    a.mass(star(420, 400, 8, 34, 12), { base: "#fff8d6", shade: "#ffe066", ow: 4, sv: [3, 3] });
    // Wings flung wide (slightly asymmetric: dive banks left).
    wing(a, { root: [224, 224], rootLow: [232, 286], wrist: [132, 128], tips: [[36, 92], [30, 196], [66, 270], [134, 300], [196, 300]], mem: R.stormWing, bone: R.storm, sag: 0.3, boneW: 16 });
    wing(a, { root: [288, 224], rootLow: [280, 286], wrist: [372, 140], tips: [[470, 116], [478, 210], [440, 274], [376, 300], [316, 300]], mem: R.stormWing, bone: R.storm, sag: 0.3, boneW: 16 });
    // Tail sweeping under, hind claws reaching down.
    a.mass(limb([[256, 330], [210, 380], [150, 392], [110, 370]], [36, 24, 14, 4], { capEnd: false }), { ...R.storm, sv: [5, 5] });
    for (const s of [-1, 1]) a.mass(limb([[256 + s * 30, 320], [256 + s * 42, 356], [256 + s * 36, 380]], [28, 20, 14]), { ...R.storm, sv: [4, 4], hv: [3, 3] });
    a.mass(claw([[214, 384, -8, 12], [222, 386, 0, 14], [290, 386, 0, 14], [298, 384, 8, 12]]), { ...M.bone, ow: 3, sv: [1, 1], hv: [1, 1] });
    // Chest + belly plates.
    a.mass(smooth([[212, 230], [256, 214], [300, 230], [312, 290], [290, 340], [256, 352], [222, 340], [200, 290]], true, 0.9), { ...R.storm, sv: [12, 10] });
    a.mass(smooth([[236, 236], [276, 236], [284, 296], [256, 340], [228, 296]], true, 0.9), { base: "#cfe0f5", shade: "#8aa6cc", light: "#ffffff", ow: 4, sv: [4, 4], hv: [3, 3] });
    a.line("M238 258H274M234 280H278M238 302H274M246 322H266", 3, "#5a7aa8");
    // Head frontal, jaws open, horns with an arc of lightning between them.
    for (const s of [-1, 1]) a.mass(limb([[256 + s * 22, 166], [256 + s * 52, 136], [256 + s * 66, 96]], [18, 12, 2], { capEnd: false }), { ...R.horn, base: "#2a3048", ow: 4, sv: [3, 3], hv: [2, 2] });
    a.mass(poly([[214, 170], [180, 150], [222, 196]]) + poly([[298, 170], [332, 150], [290, 196]]), { ...R.storm, ow: 4, sv: [3, 3], hv: [2, 2] });
    a.mass(smooth([[220, 186], [232, 160], [256, 152], [280, 160], [292, 186], [282, 214], [256, 224], [230, 214]], true, 0.9), { ...R.storm, sv: [8, 8] });
    a.mass("M232 210L280 210L274 244L256 252L238 244Z", { ...R.storm, sv: [4, 4], hv: [3, 3] });
    a.fill("M238 214L274 214L268 236L256 242L244 236Z", "#0a1030");
    a.fill("M240 214l4 8l4-8zM264 214l4 8l4-8zM246 238l4-7l4 7zM258 238l4-7l4 7z", "#ffffff");
    for (const s of [-1, 1]) a.glow(256 + s * 16, 188, 12, "#ffe066", 0.9).fill(`M${256 + s * 6} 188L${256 + s * 26} 182L${256 + s * 22} 194Z`, "#ffe066");
    a.glow(256, 100, 60, "#ffe066", 0.5);
    a.fill(bolt([190, 96], [322, 96], { segments: 6, amp: 14, width: 8, seed: 2 }), "#ffe066").fill(bolt([190, 96], [322, 96], { segments: 6, amp: 14, width: 3, seed: 2 }), "#ffffff");
    a.motes({ seed: 67, count: 10, box: [60, 80, 460, 380], size: [3, 7], color: ["#ffe066", "#ffffff"], alpha: [0.5, 1] });
    return a;
  },

  /** Legendary — Vaelra, frost queen: swan-necked ice dragon perched on a glacier spire, crystal crown, frost breath, aurora. */
  vaelra() {
    const a = new Art("vaelra");
    a.backdrop("#081428", "#183c6c", "#0a1830", { pool: "#bfe6ff", poolAt: [256, 200], poolR: 270, poolAlpha: 0.35 });
    // Aurora ribbons.
    for (const [y, c, o] of [[80, "#6fe0ff", 0.22], [120, "#b388ff", 0.18], [60, "#7bd389", 0.14]]) a.fill(`M-10 ${y + 40}C120 ${y - 40} 240 ${y + 60} 360 ${y}C420 ${y - 30} 480 ${y - 10} 520 ${y}V${y + 50}C460 ${y + 30} 420 ${y + 20} 360 ${y + 50}C240 ${y + 110} 120 ${y + 10} -10 ${y + 90}Z`, c, o);
    a.motes({ seed: 73, count: 26, box: [10, 10, 502, 500], size: [2, 6], color: "#ffffff", alpha: [0.5, 1], shape: "circle" });
    // Glacier: distant peaks + the spire she grips.
    a.fill("M0 380L70 300L120 340L180 280L230 340L512 330V512H0Z", "#14305a");
    a.mass("M150 512L196 400L244 352L300 340L360 352L404 410L440 512Z", { ...R.crystal, base: "#6e9ed0", shade: "#3e6aa0", light: "#b8dcf8", sv: [14, 12], hv: [8, 8] });
    a.line("M244 352L270 440L250 512M300 340L320 420M360 352L340 450", 4, "#5a9ad6", 0.7);
    a.begin("translate(300 470) scale(0.92) translate(-300 -470)");
    // Wings: crystalline, half-open like a cape.
    wing(a, { root: [276, 274], rootLow: [292, 332], wrist: [196, 162], tips: [[100, 112], [76, 200], [104, 272], [166, 312], [230, 330]], mem: R.iceWing, bone: R.ice, sag: 0.18, boneW: 14 });
    wing(a, { root: [318, 268], rootLow: [336, 330], wrist: [404, 150], tips: [[476, 104], [490, 198], [462, 270], [408, 312]], mem: R.iceWing, bone: R.ice, sag: 0.18, boneW: 14 });
    let tips = "";
    for (const [x, y] of [[76, 200], [104, 272], [166, 312], [490, 198], [462, 270]]) tips += poly([[x - 7, y], [x, y + 18], [x + 7, y]]);
    a.fill(tips, "#ffffff", 0.9);
    // Tail coiling down the spire.
    a.mass(limb([[340, 350], [392, 380], [400, 430], [360, 460], [320, 450]], [40, 30, 20, 12, 4], { capEnd: false }), { ...R.ice, sv: [6, 6] });
    // Body + forelegs gripping the ice.
    a.mass(smooth([[262, 290], [304, 270], [350, 290], [362, 340], [326, 368], [276, 362], [252, 330]], true, 0.9), { ...R.ice, sv: [12, 10] });
    for (const [x, y] of [[270, 352], [318, 360]]) a.mass(limb([[x, y - 20], [x - 8, y + 6], [x - 4, y + 18]], [24, 18, 14]), { ...R.ice, sv: [4, 4], hv: [3, 3] });
    a.mass(claw([[256, 370, -6, 10], [264, 372, 0, 12], [306, 378, -6, 10], [314, 380, 0, 12]]), { ...R.crystal, ow: 3, sv: [1, 1], hv: [1, 1] });
    // Swan neck curving up and left, chest plates.
    const neck = [[290, 296], [262, 252], [242, 204], [244, 160], [226, 130]];
    a.mass(limb(neck, [56, 46, 38, 32, 28]), { ...R.ice, sv: [10, 8] });
    a.line("M276 290L254 254M262 296L240 258M250 230L236 206M246 214L230 194", 3, "#7aa6d6", 0.9);
    let spines = "";
    for (const [x, y, dx, dy] of [[282, 262, 18, -8], [264, 222, 18, -10], [258, 182, 18, -6], [250, 152, 16, -4]]) spines += poly([[x - 2, y - 8], [x + dx, y + dy], [x - 2, y + 8]]);
    a.mass(spines, { ...R.crystal, ow: 3, sv: [2, 2], hv: [1, 1] });
    // Head in profile facing left, ice crown with a gold band, cyan eye, frost breath.
    let crown = "";
    for (const [d, l] of [[-150, 44], [-125, 58], [-100, 52], [-75, 40], [-50, 30]]) {
      const [x, y] = polar(236, 120, l, d);
      crown += poly([[236 + (x - 236) * 0.3 - 4, 120 + (y - 120) * 0.3], [x, y], [236 + (x - 236) * 0.3 + 4, 120 + (y - 120) * 0.3 + 4]]);
    }
    a.mass(crown, { ...R.crystal, ow: 4, sv: [3, 3], hv: [2, 2] });
    a.mass("M250 126C244 108 220 102 200 108L162 122C154 128 156 136 164 138L204 142L248 146C256 140 256 132 250 126Z", { ...R.ice, sv: [7, 6] });
    a.mass("M244 146L204 144L170 152C164 158 168 164 176 164L208 162L242 156Z", { ...R.ice, sv: [4, 4], hv: [3, 3] });
    a.mass("M210 108C222 98 242 100 252 114L248 122C238 112 224 110 212 116Z", { ...M.gold, ow: 4, sv: [3, 3], hv: [2, 2] });
    a.glow(222, 122, 14, "#6fe0ff", 0.9).fill("M212 120L232 118L228 126L214 126Z", "#6fe0ff");
    a.fill(ellipse(168, 128, 3, 2), INK);
    a.line("M172 146L206 146", 3);
    a.glow(130, 160, 70, "#e0f2ff", 0.7);
    a.fill(smooth([[166, 152], [130, 144], [96, 158], [70, 154], [56, 180], [86, 182], [110, 198], [140, 178], [166, 160]], true, 0.8), "#e0f2ff", 0.8);
    a.fill(star(84, 170, 6, 18, 5) + star(118, 186, 6, 12, 4), "#ffffff");
    a.end();
    return a;
  },
};

export default RECIPES;
