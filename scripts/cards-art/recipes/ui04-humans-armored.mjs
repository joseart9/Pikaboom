// UI-04 recipes (humans-armored): shield-bearer, iron-guard, dawn-paladin, last-stand-knight, sun-cleric, silence-monk.
// Humanoid template (squire) with different body plan, pose, prop and scene per key. See art.mjs / UI_VISUAL_SYSTEM.md §6.
import { Art, INK, blob, ellipse, f, limb, poly, polar, pt, shard, smooth, star } from "../lib.mjs";
import { GOLD, GOLD_DEEP, M } from "../materials.mjs";

// Local ramps.
const R = {
  maroon: { base: "#a33a4a", shade: "#6e2232", light: "#cf5a64" },
  iron: { base: "#7f8aa3", shade: "#4a5068", light: "#b8c2d6" },
  white: { base: "#e8e4f0", shade: "#a59fbf", light: "#ffffff" },
  blond: { base: "#e8c060", shade: "#a8742a", light: "#fff1c1" },
  crimson: { base: "#c23a4a", shade: "#7a1a2e", light: "#e86070" },
  worn: { base: "#8a96ad", shade: "#4e586e", light: "#c4cede" },
  saffron: { base: "#e08a2e", shade: "#a85a1a", light: "#ffb35c" },
  plum: { base: "#4a2f6e", shade: "#2c1a46", light: "#6a4a94" },
  wood: { base: "#7a5232", shade: "#4e3220", light: "#a8784a" },
};
const sm = (o, sv = [4, 4], hv = [3, 3], ow = 4) => ({ ...o, sv, hv, ow });
const arc = (cx, cy, r, a0, a1) => `M${pt(polar(cx, cy, r, a0))}A${f(r)} ${f(r)} 0 0 1 ${pt(polar(cx, cy, r, a1))}`;

/** Squire-proportioned face looking left, drawn at squire coordinates (centre ≈ 260,178) inside a translate group. */
function face(a, dx, dy, { skin = M.skin, brows = "M228 170L246 174M258 174L276 170", mouth = "M240 204C248 208 256 208 262 204", blush = true, ear = true, s = 1 } = {}) {
  a.begin(`translate(${dx} ${dy})${s !== 1 ? ` translate(260 178) scale(${s}) translate(-260 -178)` : ""}`);
  a.mass(smooth([[222, 176], [232, 140], [266, 132], [298, 152], [300, 190], [284, 216], [254, 222], [228, 206]], true, 0.9), { ...skin, sv: [12, 8] });
  if (ear) a.mass(ellipse(298, 184, 9, 12), { ...skin, sv: [4, 4], hv: [3, 3], ow: 5 });
  a.fill(ellipse(238, 184, 5, 7), INK).fill(ellipse(266, 184, 5, 7), INK);
  a.fill(ellipse(236.5, 181.5, 1.8), "#ffffff").fill(ellipse(264.5, 181.5, 1.8), "#ffffff");
  if (brows) a.line(brows, 4);
  if (mouth) a.line(mouth, 3.5);
  if (blush) a.fill(ellipse(232, 198, 7, 4), "#ff4d6d", 0.25).fill(ellipse(278, 198, 7, 4), "#ff4d6d", 0.25);
  return a.end();
}

const RECIPES = {
  /** Shield wall guard braced behind a huge tower shield, spear levelled over the top; palisade. */
  "shield-bearer"() {
    const a = new Art("shield-bearer");
    a.backdrop("#1b1036", "#35245f", "#22144a", { pool: "#b9a8e8", poolAt: [250, 220], poolR: 250, poolAlpha: 0.3 });
    for (let x = -10; x < 540; x += 46) a.fill(poly([[x, 334], [x, 214], [x + 19, 190], [x + 38, 214], [x + 38, 334]]), "#2a1b55");
    a.line("M0 252H512M0 300H512", 5, "#1f1446", 0.8);
    a.ground(334, "#1e1240", "#3a2874", { spot: "#b9a8e8", spotAt: [250, 404], spotR: 180 });
    a.line("M30 380L110 370M380 410L470 396M150 456L240 444", 3, "#1e1240", 0.6);
    a.shadow(244, 404, 150, 18);

    // Braced back leg (viewer's right) + boot.
    a.mass(limb([[306, 318], [338, 358], [356, 392]], [40, 32, 28]), { ...M.cloth, sv: [8, 6] });
    a.mass("M336 408L340 382L366 380C380 384 388 396 386 408Z", sm(M.leather, [6, 6], [4, 4], 5));
    // Spear shaft behind everything in front.
    a.mass(limb([[386, 336], [300, 240], [234, 168]], 12), sm(R.wood));
    a.mass(limb([[238, 172], [214, 146], [186, 114]], [16, 24, 2], { capEnd: false }), { ...M.steel, sv: [5, 5], hv: [3, 3], ow: 5 });
    a.line("M230 164L196 126", 2.5, "#ffffff", 0.7);
    a.mass(limb([[244, 180], [232, 166]], 16), sm(M.gold, [3, 3], [2, 2], 4));
    // Stocky torso: mail + maroon tabard.
    a.mass(smooth([[236, 226], [292, 208], [348, 226], [362, 300], [300, 326], [240, 312]], true, 0.6), { ...M.steel, sv: [12, 10] });
    a.mass("M286 220L350 228L362 318L300 330Z", { ...R.maroon, sv: [10, 8] });
    // Spear arm (shoulder → elbow → fist on the shaft).
    a.mass(ellipse(338, 222, 30, 22), { ...M.steel, sv: [8, 8] });
    a.mass(limb([[344, 234], [344, 274], [312, 256]], [32, 28, 26]), { ...M.steel, sv: [8, 8] });
    a.mass(ellipse(304, 252, 16, 15), sm(M.skin, [6, 6], [4, 4], 5));
    // Head peering over the shield: kettle helmet.
    face(a, 34, 6, { brows: "M228 166L248 176M256 176L276 168", mouth: "M242 206L262 204" });
    a.mass("M250 160C250 118 342 118 342 160Z", { ...M.steel, sv: [10, 8] });
    a.mass(ellipse(296, 160, 64, 13), { ...M.steel, sv: [6, 6], hv: [4, 4], ow: 5 });
    a.line("M296 122V158", 4, INK, 0.5);
    // Tower shield (front): steel rim, maroon face, gold tower emblem, bands + rivets.
    const outer = "M118 206Q208 172 298 206L298 384Q208 414 118 384Z";
    a.mass(outer, { ...M.steel, sv: [12, 12], ow: 7 });
    a.mass("M132 216Q208 188 284 216L284 374Q208 400 132 374Z", { ...R.maroon, sv: [16, 14], hv: [8, 8], ow: 4 });
    a.line("M132 252Q208 230 284 252M132 342Q208 320 284 342", 8, "#5e6f8a");
    a.line("M132 252Q208 230 284 252M132 342Q208 320 284 342", 4, "#b8c2d6");
    a.mass("M176 330L176 276L186 276L186 266L198 266L198 276L218 276L218 266L230 266L230 276L240 276L240 330Z", sm(M.gold, [5, 5], [3, 3], 4));
    a.fill("M200 330L200 306Q208 296 216 306L216 330Z", INK, 0.8);
    for (const [x, y] of [[126, 222], [290, 222], [126, 300], [290, 300], [126, 372], [290, 372], [208, 200], [208, 392]]) a.fill(ellipse(x, y, 4), "#e2ecf5");
    a.add(`<path d="M128 236Q160 206 196 200" fill="none" stroke="#ffffff" stroke-opacity="0.5" stroke-width="5"/>`);
    // Front boot peeking under the shield.
    a.mass("M100 410C100 396 112 390 126 390L146 390L146 410Z", sm(M.leather, [5, 5], [3, 3], 5));
    return a;
  },

  /** Full-plate halberdier: closed great helm with plume, halberd upright, kite shield on the arm; castle gate. */
  "iron-guard"() {
    const a = new Art("iron-guard");
    a.backdrop("#161430", "#2e2c58", "#1c1a3e", { pool: "#a8b4dc", poolAt: [250, 230], poolR: 250, poolAlpha: 0.28 });
    // Gate arch + portcullis.
    a.fill("M70 360V170C70 80 442 80 442 170V360Z", "#24224a");
    a.fill("M120 360V190C120 120 392 120 392 190V360Z", "#13112a");
    a.line("M150 150V360M190 128V360M230 118V360M270 118V360M310 124V360M350 140V360M120 200H392M120 250H392M120 300H392", 5, "#3a3866", 0.8);
    a.line("M70 170C70 80 442 80 442 170", 4, "#3a3866", 0.6);
    a.ground(352, "#16142c", "#34305e", { spot: "#a8b4dc", spotAt: [250, 404], spotR: 170 });
    a.line("M0 384H512M0 440H512M80 352V384M200 384V440M330 352V384M440 384V440M130 440V512M390 440V512", 3, "#16142c", 0.7);
    a.shadow(252, 402, 130, 16);
    const plate = { ...R.iron, rim: "#c4cede", rv: 4 };

    // Halberd (viewer's right), upright: shaft, crescent axe, spike, hook.
    a.begin("translate(28 0)");
    a.mass(limb([[352, 400], [344, 250], [336, 112]], 11), sm(R.wood));
    a.mass("M342 138C372 132 390 150 392 178C380 168 362 168 344 174Z", { ...M.steel, sv: [6, 6], hv: [4, 4], ow: 5 });
    a.line("M352 142C374 142 386 154 388 170", 2.5, "#ffffff", 0.6);
    a.mass(poly([[332, 152], [314, 140], [334, 144]]), sm(M.steel, [2, 2], [1, 1], 4));
    a.mass(limb([[338, 136], [334, 110], [332, 92]], [14, 10, 2], { capEnd: false }), sm(M.steel, [3, 3], [2, 2], 4));
    a.end();
    // Greaves + sabatons.
    a.mass(limb([[234, 314], [228, 356], [224, 390]], [36, 30, 28]), { ...plate, sv: [8, 6] });
    a.mass(limb([[274, 314], [282, 356], [288, 390]], [36, 30, 28]), { ...plate, sv: [8, 6] });
    a.mass(ellipse(228, 360, 16, 12), sm(R.iron)).mass(ellipse(282, 360, 16, 12), sm(R.iron));
    a.mass("M196 408C196 394 206 388 220 388L240 388L242 408Z", sm(R.iron, [5, 5], [3, 3], 5));
    a.mass("M278 408L280 388L300 388C312 390 318 398 318 408Z", sm(R.iron, [5, 5], [3, 3], 5));
    // Torso: breastplate with ridge, faulds, belt.
    a.mass(smooth([[214, 224], [254, 208], [300, 222], [308, 288], [256, 300], [208, 288]], true, 0.6), { ...plate, sv: [14, 10] });
    a.line("M254 214L258 292", 4, INK, 0.5);
    a.mass("M210 290L304 290L312 330L200 330Z", { ...plate, sv: [8, 8] });
    a.line("M208 306H308M222 290V330M258 292V330M292 290V330", 3, INK, 0.55);
    a.mass("M210 286L306 286L306 298L210 298Z", sm(M.leather, [3, 3], [2, 2], 4));
    // Halberd arm.
    a.mass(blob(296, 222, 26, 20, { seed: 3 }), { ...plate, sv: [8, 8] });
    a.mass(limb([[300, 232], [330, 276], [366, 252]], [28, 24, 22]), { ...plate, sv: [7, 7] });
    a.mass(ellipse(370, 248, 15, 14), sm(R.iron, [5, 5], [3, 3], 5));
    a.line("M359 242H381M359 252H381", 3, INK, 0.6);
    // Closed great helm + red plume.
    a.mass(limb([[262, 130], [290, 104], [318, 108], [330, 132]], [22, 24, 16, 4], { capEnd: false }), { ...R.crimson, sv: [6, 6], hv: [4, 4], ow: 5 });
    a.mass("M224 214L220 156C222 132 242 124 260 124C280 124 298 134 298 158L296 214C284 222 238 222 224 214Z", { ...plate, sv: [12, 8] });
    a.fill("M226 164L282 164L280 176L228 176Z", INK);
    a.fill("M234 168L276 168L275 172L235 172Z", "#ffbe0b", 0.55);
    a.line("M248 178V206M232 190H244M232 200H244", 4, INK, 0.8);
    a.line("M260 128V160", 3, INK, 0.4);
    a.add(`<path d="M228 150C230 136 242 130 252 130" fill="none" stroke="#ffffff" stroke-opacity="0.6" stroke-width="4"/>`);
    // Kite shield on the near arm (viewer's left).
    a.mass("M114 232Q160 214 210 230L212 300Q200 352 160 378Q122 350 112 300Z", { ...M.steel, sv: [10, 10], ow: 7 });
    a.mass("M126 240Q160 228 198 240L200 298Q190 338 160 360Q130 338 124 298Z", { ...R.iron, base: "#4a5068", shade: "#2e3348", light: "#6a7290", sv: [12, 12], hv: [6, 6], ow: 4 });
    a.fill("M126 262L198 300L198 320L126 282Z", R.maroon.base, 0.95);
    a.mass(ellipse(162, 288, 12), sm(M.steel, [4, 4], [3, 3], 4));
    a.add(`<path d="M122 250Q140 236 170 232" fill="none" stroke="#ffffff" stroke-opacity="0.5" stroke-width="4"/>`);
    return a;
  },

  /** Paladin in white-gold plate raising a glowing warhammer to the dawn; sunburst, crimson cape, healing palm. */
  "dawn-paladin"() {
    const a = new Art("dawn-paladin");
    a.backdrop("#241a52", "#a85a7a", "#f2b97a", { pool: "#fff1c1", poolAt: [256, 300], poolR: 270, poolAlpha: 0.6 });
    a.fill(star(256, 318, 16, 380, 160, -90), "#fff1c1", 0.12);
    a.glow(256, 318, 150, "#ffffff", 0.7);
    a.fill(ellipse(256, 330, 74), "#fff8ea", 0.85);
    a.fill("M0 352L60 300L110 330L170 286L230 340L290 300L350 336L420 280L512 330V352Z", "#6a3a6a");
    a.ground(350, "#4a2a5a", "#8a4a6a", { spot: "#fff1c1", spotAt: [250, 404], spotR: 190 });
    a.shadow(248, 404, 130, 16);
    const plate = { ...R.white, rim: "#ffe066", rv: 5 };

    // Crimson cape flaring behind (viewer's left).
    a.mass("M222 214C190 240 150 320 120 396L170 380L196 400L226 380L250 300Z", { ...R.crimson, sv: [12, 10] });
    // Legs striding left.
    a.mass(limb([[232, 314], [214, 352], [196, 388]], [36, 30, 28]), { ...plate, sv: [8, 6] });
    a.mass(limb([[272, 314], [286, 354], [292, 390]], [36, 30, 28]), { ...plate, sv: [8, 6] });
    a.mass("M166 408C166 394 176 386 190 386L212 388L212 408Z", sm(M.gold, [5, 5], [3, 3], 5));
    a.mass("M280 408L282 388L304 388C316 390 322 398 322 408Z", sm(M.gold, [5, 5], [3, 3], 5));
    // Torso: white breastplate, gold sun emblem, tassets.
    a.mass(smooth([[216, 226], [256, 210], [300, 222], [306, 292], [256, 302], [210, 290]], true, 0.6), { ...plate, sv: [14, 10] });
    a.fill(star(258, 252, 8, 22, 10), GOLD).fill(ellipse(258, 252, 8), "#fff1c1");
    a.mass("M212 290L304 290L310 328L278 334L258 322L238 334L206 328Z", { ...plate, sv: [8, 8] });
    a.line("M212 296H304", 5, GOLD_DEEP);
    // Healing palm forward (viewer's left).
    a.mass(blob(216, 224, 22, 18, { seed: 4 }), { ...plate, sv: [6, 6] });
    a.mass(limb([[210, 234], [178, 262], [152, 254]], [26, 22, 20]), { ...plate, sv: [6, 6] });
    a.glow(140, 250, 50, "#ffe066", 0.8);
    a.mass(ellipse(144, 252, 14, 13), sm(M.skin, [4, 4], [3, 3], 5));
    // Raised hammer arm (viewer's right) + warhammer.
    a.mass(blob(298, 220, 26, 20, { seed: 6 }), { ...plate, sv: [8, 8] });
    a.mass(limb([[302, 226], [330, 196], [332, 158]], [28, 24, 22]), { ...plate, sv: [7, 7] });
    a.mass(limb([[326, 196], [338, 120]], 10), sm(R.wood, [3, 3], [2, 2], 4));
    a.glow(340, 124, 80, "#ffe066", 0.85);
    a.mass(poly([[302, 108], [376, 116], [372, 146], [298, 138]]), { ...M.gold, sv: [6, 6], hv: [4, 4], ow: 5 });
    a.mass(poly([[294, 112], [304, 112], [300, 136], [290, 134]]), sm(M.gold, [2, 2], [1, 1], 4));
    a.mass(poly([[372, 118], [384, 118], [382, 146], [370, 146]]), sm(M.gold, [2, 2], [1, 1], 4));
    a.line("M310 116L366 122", 3, "#ffffff", 0.8);
    a.mass(ellipse(332, 160, 15, 14), sm(M.skin, [5, 5], [3, 3], 5));
    // Head: blond hair, gold circlet, determined look upward-left.
    face(a, -2, 6, { brows: "M228 168L246 170M258 170L276 166", mouth: "M240 202C248 208 258 208 264 202" });
    a.mass("M218 180C210 136 238 116 266 116C298 116 312 140 306 180C302 160 290 148 276 148C266 158 246 160 226 156C222 164 220 170 218 180Z", { ...R.blond, sv: [8, 8] });
    a.mass("M220 152C240 140 280 140 304 152L304 160C280 150 240 150 220 160Z", sm(M.gold, [3, 3], [2, 2], 4));
    a.fill(ellipse(262, 148, 5), "#3fa9ff");
    a.motes({ seed: 17, count: 14, box: [90, 90, 430, 380], size: [3, 8], color: ["#fff1c1", "#ffe066"], alpha: [0.5, 1] });
    return a;
  },

  /** Battered knight kneeling on one knee, hands on a planted sword, cracked plate, torn cape; dusk with broken banners. */
  "last-stand-knight"() {
    const a = new Art("last-stand-knight");
    a.backdrop("#1a0e30", "#6a2a4a", "#d0703a", { pool: "#ffe066", poolAt: [256, 250], poolR: 230, poolAlpha: 0.35 });
    // Broken banners + rubble.
    a.fill(limb([[80, 360], [100, 200], [112, 120]], 8), "#2a1028").fill("M110 128L60 140L72 164L50 186L104 182Z", "#3a1430");
    a.fill(limb([[430, 360], [410, 230], [380, 170]], 8), "#2a1028").fill("M386 180L440 168L428 196L452 214L402 220Z", "#3a1430");
    a.fill(limb([[470, 360], [490, 280]], 7), "#2a1028");
    a.ground(350, "#2a1020", "#5a2a34", { spot: "#ffe066", spotAt: [252, 404], spotR: 180 });
    for (const [x, y, s, seed] of [[70, 390, 22, 1], [430, 400, 26, 2], [130, 440, 14, 3], [380, 450, 16, 4]]) a.fill(shard(x, y, s, s * 0.6, { seed, n: 6 }), "#2a1020");
    a.shadow(258, 404, 130, 16);
    const plate = { ...R.worn, rim: "#ffe066", rv: 5 };

    // Torn cape behind.
    a.mass("M272 206C320 220 360 290 384 380L360 372L350 398L326 380L306 400L292 300Z", { ...R.crimson, base: "#9a2a3a", sv: [10, 10] });
    // Back leg: knee on the ground (viewer's right).
    a.mass(limb([[284, 318], [312, 364], [326, 396]], [38, 32, 28]), { ...plate, sv: [8, 6] });
    a.mass(limb([[326, 396], [376, 398]], [26, 18]), { ...plate, sv: [4, 4], hv: [3, 3] });
    // Front leg: knee raised (viewer's left), foot planted.
    a.mass(limb([[248, 318], [214, 330], [212, 394]], [38, 32, 28]), { ...plate, sv: [8, 6] });
    a.mass(ellipse(216, 330, 18, 15), sm(R.worn, [5, 5], [3, 3], 5));
    a.mass("M182 408C182 394 192 388 206 388L228 388L228 408Z", sm(R.worn, [5, 5], [3, 3], 5));
    // Torso (leaning slightly forward), cracked breastplate.
    a.mass(smooth([[226, 222], [264, 208], [306, 220], [308, 290], [262, 312], [222, 296]], true, 0.6), { ...plate, sv: [14, 10] });
    a.line("M246 230L262 252L252 270L266 292M286 228L278 246", 4, INK, 0.75);
    a.mass("M224 290L306 290L310 322L220 322Z", { ...plate, sv: [6, 6] });
    a.line("M224 300H308", 4, GOLD_DEEP);
    // Planted sword (vertical, in front of the knee), blade sunk in the ground.
    a.mass(poly([[160, 268], [178, 268], [176, 398], [168, 410], [162, 398]]), { ...M.steel, sv: [5, 5], hv: [3, 3], ow: 5 });
    a.line("M169 276V396", 2.5, "#ffffff", 0.7);
    a.mass(limb([[138, 262], [200, 262]], 12), sm(M.gold, [3, 3], [2, 2], 4));
    a.mass(limb([[169, 254], [169, 228]], 12), sm(M.leather, [3, 3], [2, 2], 4));
    a.mass(ellipse(169, 222, 9), sm(M.gold, [3, 3], [2, 2], 4));
    // Arms reaching to the hilt.
    a.mass(blob(234, 228, 24, 18, { seed: 2 }), { ...plate, sv: [6, 6] });
    a.mass(limb([[230, 236], [204, 262], [180, 244]], [26, 22, 20]), { ...plate, sv: [6, 6] });
    a.mass(blob(298, 228, 24, 18, { seed: 5 }), { ...plate, sv: [6, 6] });
    a.mass(limb([[296, 240], [250, 268], [184, 240]], [26, 22, 20]), { ...plate, sv: [6, 6] });
    a.mass(ellipse(172, 240, 16, 14), sm(R.worn, [5, 5], [3, 3], 5));
    // Head: open bascinet, scratched defiant face.
    face(a, 6, 6, { brows: "M226 166L248 176M256 176L278 166", mouth: "M242 206L262 204", blush: false });
    a.line("M276 186L286 200", 3, "#ff4d6d", 0.8);
    a.mass("M216 196C208 148 232 118 264 118C300 118 316 146 310 196L300 196C300 170 290 158 266 158C244 158 232 166 228 196Z", { ...plate, sv: [10, 8] });
    a.line("M264 120V156M222 172L230 160", 4, INK, 0.5);
    a.mass(limb([[264, 122], [270, 104], [288, 98]], [10, 8, 4]), { ...R.crimson, sv: [3, 3], hv: [2, 2], ow: 4 });
    a.motes({ seed: 23, count: 12, box: [100, 100, 420, 360], size: [3, 7], color: ["#ffe066", "#ff9f1c"], alpha: [0.4, 0.9] });
    return a;
  },

  /** Cleric in white-gold robes with a sun-disc staff, inside a translucent golden dome (Escudo Divino). */
  "sun-cleric"() {
    const a = new Art("sun-cleric");
    a.backdrop("#241a4e", "#5a3f8a", "#34265f", { pool: "#ffe9a8", poolAt: [256, 250], poolR: 240, poolAlpha: 0.4 });
    for (let i = -3; i <= 3; i++) a.fill(poly([[256, 40], [256 + i * 70 - 18, 512], [256 + i * 70 + 18, 512]]), "#fff1c1", 0.05);
    a.ground(360, "#241a4e", "#4a3478", { spot: "#ffe9a8", spotAt: [256, 404], spotR: 170 });
    a.shadow(256, 404, 110, 14);
    // Dome back half (behind the figure).
    a.add(`<ellipse cx="256" cy="270" rx="150" ry="146" fill="${a.radU(256, 250, 160, [[0, "#fff1c1", 0.05], [0.8, "#ffe066", 0.14], [1, "#ffbe0b", 0.35]])}"/>`);
    // Robe (bell shape) + gold hem.
    a.mass("M228 220L284 220C302 270 320 340 334 396L178 396C192 340 210 270 228 220Z", { ...R.white, sv: [14, 10] });
    a.line("M184 384L328 384", 6, GOLD);
    a.line("M256 232V396", 3, R.white.shade);
    a.mass("M222 268L290 268L292 282L220 282Z", sm(M.gold, [3, 3], [2, 2], 4));
    a.fill("M244 282L250 330L256 282Z", GOLD_DEEP, 0.9);
    // Sun-disc staff (viewer's right).
    a.mass(limb([[340, 398], [334, 260], [330, 168]], 10), sm(M.gold, [3, 3], [2, 2], 4));
    a.glow(330, 146, 70, "#ffe066", 0.85);
    a.mass(star(330, 146, 12, 42, 24, -90), { ...M.gold, sv: [4, 4], hv: [3, 3], ow: 4 });
    a.mass(ellipse(330, 146, 18), { base: "#fff8d6", shade: "#ffbe0b", light: "#ffffff", sv: [4, 4], hv: [3, 3], ow: 4 });
    // Arms: one holds the staff, the other at the heart.
    a.mass(limb([[284, 232], [310, 262], [328, 246]], [24, 22, 26]), { ...R.white, sv: [6, 6] });
    a.mass(ellipse(332, 240, 12, 11), sm(M.skin, [4, 4], [3, 3], 5));
    a.mass(limb([[230, 232], [214, 270], [246, 262]], [24, 22, 26]), { ...R.white, sv: [6, 6] });
    a.mass(ellipse(250, 258, 11, 10), sm(M.skin, [4, 4], [3, 3], 5));
    // Long hair behind, face, gold diadem.
    a.mass("M224 176C214 230 220 262 236 270L230 220Z", { ...M.hair, sv: [4, 4] });
    a.mass("M294 176C306 220 302 250 284 262L292 214Z", { ...M.hair, sv: [4, 4] });
    face(a, -4, 4, { brows: "M228 172L244 172M260 172L276 170", mouth: "M242 204C248 208 256 208 260 204" });
    a.line("M230 186L226 182M258 186L254 182", 3);
    a.mass("M218 182C208 138 236 120 262 120C294 120 312 142 304 186C296 162 286 150 266 146C252 156 236 160 226 158C222 166 220 172 218 182Z", { ...M.hair, sv: [8, 8] });
    a.mass("M226 140C244 130 278 130 298 142L294 150C276 140 246 140 230 148Z", sm(M.gold, [3, 3], [2, 2], 4));
    a.fill(star(262, 136, 4, 10, 4), "#fff8d6");
    // Dome front: rim + highlights.
    a.add(`<ellipse cx="256" cy="270" rx="150" ry="146" fill="none" stroke="#ffe066" stroke-opacity="0.7" stroke-width="5"/>`);
    a.add(`<path d="${arc(256, 270, 132, 200, 250)}" fill="none" stroke="#ffffff" stroke-opacity="0.6" stroke-width="7"/>`);
    a.add(`<path d="${arc(256, 270, 138, 300, 320)}" fill="none" stroke="#ffffff" stroke-opacity="0.35" stroke-width="5"/>`);
    a.motes({ seed: 29, count: 12, box: [120, 130, 390, 390], size: [3, 7], color: ["#fff1c1", "#ffe066"], alpha: [0.5, 1] });
    return a;
  },

  /** Bald monk floating cross-legged, palm raised: a silencing ring wave snuffs out a floating violet rune; temple. */
  "silence-monk"() {
    const a = new Art("silence-monk");
    a.backdrop("#1e1438", "#4a2f5e", "#2a1a40", { pool: "#ffd88a", poolAt: [290, 260], poolR: 230, poolAlpha: 0.3 });
    // Temple: two pillars, lintel, hanging lantern.
    for (const x of [40, 472]) a.fill(poly([[x - 30, 512], [x - 30, 96], [x + 30, 96], [x + 30, 512]]), "#2c1d4a");
    a.fill("M0 70H512V100H0Z", "#2c1d4a").line("M0 100H512", 4, "#3a2a5e");
    a.line("M420 100V140", 3, "#3a2a5e");
    a.glow(420, 160, 34, "#ffbe0b", 0.6);
    a.mass("M408 144L432 144L436 176L404 176Z", sm(R.wood, [3, 3], [2, 2], 4));
    a.fill("M412 150H428V170H412Z", "#ffe066", 0.9);
    a.ground(360, "#1e1438", "#3c2858", { spot: "#ffd88a", spotAt: [290, 404], spotR: 170 });
    a.line("M0 392H512M0 440H512M120 360V392M260 392V440M400 360V392", 3, "#1e1438", 0.7);
    a.shadow(292, 408, 100, 12, 0.4);
    // The silenced rune (upper left), cracked and fading.
    a.glow(136, 164, 50, "#c77dff", 0.45);
    a.mass(shard(136, 164, 28, 30, { seed: 3, n: 6, jitter: 0.06, rot: 30 }), { base: "#7b4fc0", shade: "#4b2f8f", light: "#b08ae8", sv: [5, 5], hv: [3, 3], ow: 5 });
    a.line("M136 146V182M124 156L148 172M124 172L148 156", 4, "#e9c8ff", 0.5);
    a.line("M118 150L134 166L128 182", 4, INK, 0.8);
    a.motes({ seed: 5, count: 7, box: [100, 120, 180, 210], size: [3, 6], color: "#8a82a8", alpha: [0.3, 0.7], shape: "circle" });
    // Silencing wave rings from the palm toward the rune.
    for (const [r, w, o] of [[30, 6, 0.9], [56, 5, 0.7], [84, 4, 0.5]]) {
      a.add(`<path d="${arc(214, 224, r, 160, 260)}" fill="none" stroke="#fff1c1" stroke-opacity="${o}" stroke-width="${w + 4}"/>`);
      a.add(`<path d="${arc(214, 224, r, 160, 260)}" fill="none" stroke="#ffffff" stroke-opacity="${o}" stroke-width="${w - 2}"/>`);
    }
    // Floating lotus body: crossed legs, saffron robe, plum sash.
    a.mass(smooth([[214, 360], [252, 330], [330, 330], [372, 360], [340, 382], [244, 382]], true, 0.8), { ...R.saffron, sv: [10, 8] });
    a.line("M250 362C280 350 310 352 340 364", 4, INK, 0.5);
    a.mass(smooth([[250, 238], [292, 222], [334, 238], [344, 300], [334, 344], [252, 344], [242, 300]], true, 0.7), { ...R.saffron, sv: [14, 10] });
    a.mass("M276 230L312 230L288 344L262 344Z", { ...R.plum, sv: [6, 6] });
    // Cowl/hood lowered around the shoulders.
    a.mass(smooth([[248, 226], [292, 210], [338, 226], [324, 248], [292, 240], [260, 248]], true, 0.8), { ...R.plum, sv: [6, 6] });
    // Prayer-bead hand resting on the knee (viewer's right).
    a.mass(limb([[330, 250], [350, 300], [330, 336]], [26, 22, 20]), { ...R.saffron, sv: [6, 6] });
    a.mass(ellipse(326, 340, 12, 11), sm(M.skin, [4, 4], [3, 3], 5));
    for (let i = 0; i < 9; i++) {
      const [x, y] = polar(320, 352, 22, 20 + i * 18);
      a.mass(ellipse(x, y, 4.5), { base: "#a8742a", shade: "#6b4a2f", ow: 2, sv: [1, 1] });
    }
    a.mass(ellipse(320, 378, 7), sm(M.gold, [2, 2], [1, 1], 3));
    // Raised palm arm (viewer's left).
    a.mass(limb([[256, 246], [228, 280], [216, 238]], [26, 22, 20]), { ...R.saffron, sv: [6, 6] });
    a.mass("M206 252C202 236 204 212 210 204C214 200 218 204 218 210L220 204C222 198 228 200 228 206L228 236C230 248 222 256 214 256Z", sm(M.skin, [4, 4], [3, 3], 5));
    // Bald head, serene closed eyes, forehead mark.
    a.begin("translate(32 20)");
    a.mass(smooth([[222, 176], [232, 140], [266, 128], [298, 148], [300, 190], [284, 216], [254, 222], [228, 206]], true, 0.9), { ...M.skin, sv: [12, 8] });
    a.mass(ellipse(298, 184, 9, 12), { ...M.skin, sv: [4, 4], hv: [3, 3], ow: 5 });
    a.line("M230 184C236 188 242 188 246 184M258 184C264 188 270 188 274 184M228 172L246 174M258 174L276 172", 3.5);
    a.line("M242 204C250 206 256 206 262 204", 3);
    a.fill(ellipse(252, 156, 5), "#ffbe0b");
    a.add(`<path d="M236 146C246 136 262 134 276 138" fill="none" stroke="#ffffff" stroke-opacity="0.6" stroke-width="5"/>`);
    a.end();
    a.motes({ seed: 31, count: 10, box: [160, 120, 420, 360], size: [3, 6], color: "#ffe066", alpha: [0.4, 0.9], shape: "circle" });
    return a;
  },
};

export default RECIPES;
