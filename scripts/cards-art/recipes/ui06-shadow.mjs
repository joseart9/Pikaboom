// UI-06 recipes (shadow spells): drain-life, soul-harvest, bone-storm, shatter-armor, banish, dark-pact, raise-dead.
// See art.mjs / docs/cards/UI_VISUAL_SYSTEM.md §6. Each picture is the spell's action, and the seven vary hue accent
// (crimson, teal, bone-grey, ember, sea-teal, blood-red, necrotic green) so "shadow" never reads as one violet blur.
import { Art, INK, blob, ellipse, f, limb, poly, polar, shard, smooth, star, zigzag } from "../lib.mjs";
import { GOLD, M } from "../materials.mjs";
import { bone, drop, skull } from "./ui05-parts.mjs";

/** Corner-chamfered card rectangle centred on (cx, cy), rotated `deg`. */
function cardPath(cx, cy, w, h, deg, c = 8) {
  const r = (deg * Math.PI) / 180, cos = Math.cos(r), sin = Math.sin(r);
  const pts = [[-w / 2 + c, -h / 2], [w / 2 - c, -h / 2], [w / 2, -h / 2 + c], [w / 2, h / 2 - c], [w / 2 - c, h / 2], [-w / 2 + c, h / 2], [-w / 2, h / 2 - c], [-w / 2, -h / 2 + c]];
  return poly(pts.map(([x, y]) => [cx + x * cos - y * sin, cy + x * sin + y * cos]));
}

/** A face-down card (violet back, gold border, star emblem) — no text. */
function cardBack(a, cx, cy, w, h, deg, rim) {
  a.mass(cardPath(cx, cy, w, h, deg), { base: "#4b2f8f", shade: "#2a1a52", light: "#6a48b8", rim, rv: 4, ow: 5, sv: [6, 6], hv: [4, 4] });
  a.line(cardPath(cx, cy, w * 0.78, h * 0.82, deg, 5), 3, GOLD, 0.9);
  a.fill(star(cx, cy, 4, Math.min(w, h) * 0.24, Math.min(w, h) * 0.08, -90 + deg), GOLD, 0.95);
}

const CRIMSON = { base: "#e0234a", shade: "#8a0f2e", light: "#ff8fa3" };

const RECIPES = {
  /** Drain Life — a clawed caster's hand pulls a crimson ribbon of life out of a withering victim's chest. */
  "drain-life"() {
    const a = new Art("drain-life");
    a.backdrop("#160828", "#3a1450", "#1a0a2a", { pool: "#ff4d6d", poolAt: [270, 250], poolR: 270, poolAlpha: 0.32 });
    a.fill(poly([[16, 512], [16, 150], [66, 128], [66, 512]]), "#22103a").fill(poly([[446, 512], [446, 120], [496, 100], [496, 512]]), "#22103a");
    a.line("M16 200H66M16 300H66M446 180H496M446 290H496", 3, INK, 0.5);
    a.ground(384, "#14061e", "#2a1040", { spot: "#ff4d6d", spotAt: [256, 424], spotR: 210 });
    // Victim (left): a grey husk, head thrown back, hollow eyes, life leaving the chest.
    const husk = { base: "#8a8498", shade: "#524c64", light: "#b4aec2" };
    a.shadow(150, 408, 84, 14);
    a.mass(limb([[112, 292], [94, 350], [96, 400]], [26, 20, 16]), { ...husk, sv: [4, 4], hv: [3, 3] });
    a.mass(smooth([[84, 414], [94, 322], [120, 276], [150, 266], [186, 276], [208, 322], [216, 414]], true, 0.9), { ...husk, sv: [12, 10] });
    a.line("M124 330L140 352L130 380M186 320L174 346L182 372M150 280V300", 3.5, INK, 0.55);
    a.mass(limb([[152, 272], [148, 236]], [32, 28]), { ...husk, sv: [4, 4], hv: [3, 3] });
    a.mass(smooth([[116, 214], [122, 180], [150, 164], [180, 176], [188, 210], [172, 238], [140, 242]], true, 0.9), { ...husk, sv: [8, 8] });
    a.fill(ellipse(140, 204, 8, 10), INK).fill(ellipse(168, 202, 7, 9), INK).fill(ellipse(156, 228, 7, 9), INK);
    a.line("M128 216L134 232M180 212L176 228M130 186C140 180 156 178 170 184", 3, INK, 0.6);
    a.glow(170, 302, 60, "#ff4d6d", 0.85);
    // The ribbon of life arcing across to the caster.
    const flow = [[170, 302], [216, 258], [262, 296], [312, 254], [366, 238]];
    a.glow(266, 276, 120, "#ff4d6d", 0.3);
    a.mass(limb(flow, [26, 30, 24, 18, 12]), { ...CRIMSON, ow: 5, sv: [5, 5], hv: [3, 3] });
    a.line(smooth(flow, false, 1), 4, "#ffd0d8", 0.85);
    for (const [x, y, s] of [[204, 318], [246, 234], [292, 318], [330, 226], [232, 336], [348, 270]].map(([x, y], i) => [x, y, 5 + (i % 3) * 2])) {
      a.mass(drop(x, y, s), { ...CRIMSON, ow: 3, sv: [2, 2], hv: [1, 1] });
    }
    // Caster's arm from the right: dark sleeve, gold cuff, violet clawed hand cupping the stolen life.
    const claw = { base: "#7a48b8", shade: "#422078", light: "#a77ae0", rim: "#ff4d6d", rv: 4 };
    a.mass(limb([[548, 372], [474, 304], [424, 270]], [96, 78, 62]), { base: "#2a1450", shade: "#160a2e", light: "#4a2a7a", sv: [10, 10] });
    a.mass(limb([[444, 284], [428, 270]], [70, 66]), { ...M.gold, ow: 5, sv: [4, 4], hv: [3, 3] });
    a.glow(372, 232, 84, "#ff4d6d", 0.9);
    a.mass(smooth([[422, 252], [400, 226], [372, 222], [354, 240], [362, 264], [394, 278], [420, 274]], true, 0.9), { ...claw, sv: [6, 6] });
    for (const [b, m, t] of [
      [[366, 230], [348, 206], [338, 184]],
      [[382, 222], [372, 192], [360, 168]],
      [[398, 222], [396, 190], [388, 164]],
      [[412, 230], [418, 204], [414, 178]],
    ]) a.mass(limb([b, m, t], [16, 12, 2], { capEnd: false }), { ...claw, ow: 4, sv: [3, 3], hv: [2, 2] });
    a.mass(limb([[364, 258], [336, 258], [322, 240]], [18, 13, 2], { capEnd: false }), { ...claw, ow: 4, sv: [3, 3], hv: [2, 2] });
    a.mass(ellipse(372, 226, 15), { base: "#ff8fa3", shade: "#e0234a", light: "#ffffff", ow: 4, sv: [4, 4], hv: [3, 3] });
    a.motes({ seed: 61, count: 14, box: [100, 130, 440, 380], size: [3, 7], color: ["#ff8fa3", "#ff4d6d"], alpha: [0.4, 0.9] });
    return a;
  },

  /** Soul Harvest — a reaper's scythe sweeps under the moon and reaps a teal soul from a fallen creature. */
  "soul-harvest"() {
    const a = new Art("soul-harvest");
    a.backdrop("#081820", "#17404c", "#0a1a20", { pool: "#9fe8e0", poolAt: [360, 150], poolR: 260, poolAlpha: 0.32 });
    a.glow(380, 132, 120, "#e6fff8", 0.5);
    a.fill(ellipse(380, 132, 58), "#d8f4ee", 0.92).fill(ellipse(360, 118, 11), "#b0d8d0", 0.8).fill(ellipse(398, 152, 8), "#b0d8d0", 0.8).fill(ellipse(404, 112, 5), "#b0d8d0", 0.8);
    a.fill("M0 344Q120 300 240 338T512 318V512H0Z", "#0f2c32");
    a.ground(372, "#081418", "#14343c", { spot: "#7ff5e0", spotAt: [190, 412], spotR: 180 });
    // Harvest stalks (wheat silhouettes) along the bottom.
    for (const [x, h] of [[44, 70], [70, 54], [96, 76], [410, 64], [440, 80], [470, 58], [320, 50]]) {
      a.line(`M${x} 470L${x + 6} ${470 - h}`, 4, "#2a5a5e");
      a.fill(ellipse(x + 8, 470 - h - 8, 6, 14), "#3a7a76");
    }
    // Fallen creature (small horned goblin lying on its side) and its dropped dagger.
    const corpse = { base: "#4f6470", shade: "#2c3c46", light: "#728a96" };
    a.shadow(184, 404, 96, 14);
    a.mass(poly([[262, 404], [306, 380], [312, 386], [270, 410]]), { ...M.steel, ow: 4, sv: [3, 3], hv: [2, 2] });
    a.mass(smooth([[126, 400], [140, 374], [190, 364], [236, 372], [250, 396], [210, 410], [150, 410]], true, 0.9), { ...corpse, sv: [8, 8] });
    a.mass(limb([[230, 386], [258, 400], [276, 398]], [16, 12, 10]), { ...corpse, sv: [3, 3], hv: [2, 2] });
    a.mass(ellipse(110, 386, 26, 22), { ...corpse, sv: [6, 6] });
    a.mass(limb([[100, 370], [86, 346]], [12, 2], { capEnd: false }), { ...M.bone, ow: 3, sv: [2, 2], hv: [1, 1] });
    a.line("M98 386L108 382M114 390L122 384", 3, INK, 0.8);
    // The soul: a teal wisp torn up out of the body toward the blade, with a frightened face.
    const soul = { base: "#7ff5e0", shade: "#2fb8a8", light: "#e6fffa", ow: 4, sv: [5, 5], hv: [3, 3] };
    a.glow(214, 252, 110, "#7ff5e0", 0.55);
    a.mass(limb([[176, 372], [204, 332], [186, 290], [214, 236], [228, 190]], [6, 16, 24, 32, 42]), soul);
    a.fill(ellipse(218, 186, 5, 7), "#0a3a3a").fill(ellipse(238, 184, 5, 7), "#0a3a3a").fill(ellipse(230, 204, 5, 7), "#0a3a3a");
    // Sweep trail of the scythe.
    a.fill("M110 312C150 168 290 92 438 118C318 116 200 176 140 320Z", "#e6fff8", 0.16);
    // Scythe: long snath from the lower right, crescent blade arcing left over the soul.
    a.mass(limb([[440, 470], [390, 300], [336, 116]], [20, 18, 16]), { base: "#5a3e2a", shade: "#33221a", light: "#8a6040", sv: [5, 5], hv: [3, 3] });
    a.mass(limb([[392, 316], [398, 340]], 26), { base: "#2c3c46", shade: "#16222a", light: "#4f6470", ow: 4, sv: [3, 3], hv: [2, 2] });
    a.mass("M346 100C268 46 156 74 112 196C172 134 254 120 334 148Z", { base: "#c2d2e2", shade: "#6a7c96", light: "#f4fbff", rim: "#7ff5e0", rv: 5, sv: [8, 8], hv: [5, 5] });
    a.line("M124 180C176 132 252 122 326 144", 3, "#ffffff", 0.9);
    a.mass(limb([[330, 108], [346, 152]], 24), { ...M.steel, ow: 4, sv: [3, 3], hv: [2, 2] });
    a.glow(150, 166, 40, "#e6fff8", 0.8);
    a.motes({ seed: 62, count: 14, box: [110, 120, 330, 360], size: [3, 7], color: ["#7ff5e0", "#e6fffa"], alpha: [0.4, 0.95], shape: "circle" });
    return a;
  },

  /** Bone Storm — a whirling funnel of bones and skulls rains down on every enemy at once. */
  "bone-storm"() {
    const a = new Art("bone-storm");
    a.backdrop("#1c1828", "#433a58", "#201a2c", { pool: "#e2d8f4", poolAt: [256, 210], poolR: 290, poolAlpha: 0.32 });
    a.fill(blob(90, 40, 170, 70, { seed: 3, n: 9 }), "#2a2238").fill(blob(420, 30, 180, 70, { seed: 4, n: 9 }), "#2a2238");
    a.ground(376, "#16121e", "#2e2840", { spot: "#e2d8f4", spotAt: [256, 420], spotR: 230 });
    // Funnel body + swirling bands (back half faint, front half bright).
    a.fill("M86 116Q256 72 426 116Q386 210 306 290L282 384H232L210 290Q126 210 86 116Z", "#cfc6e2", 0.18);
    const rings = [[256, 122, 170, 26], [266, 170, 138, 22], [248, 216, 106, 18], [262, 260, 76, 14], [252, 302, 50, 10], [258, 340, 30, 7]];
    for (const [cx, cy, rx, ry] of rings) {
      a.add(`<path d="M${cx - rx} ${cy}A${rx} ${ry} 0 0 1 ${cx + rx} ${cy}" fill="none" stroke="#e9e2cf" stroke-opacity="0.25" stroke-width="4"/>`);
    }
    // Enemies along the bottom: three small shielded soldiers, braced under the storm.
    const foe = { base: "#5e4e74", shade: "#382a4c", light: "#82709a" };
    for (const [x, s] of [[118, 0.9], [256, 1], [394, 0.9]]) {
      a.shadow(x, 408, 40 * s, 8);
      a.mass(smooth([[x - 22 * s, 410], [x - 20 * s, 368], [x, 356], [x + 20 * s, 368], [x + 22 * s, 410]], true, 0.8), { ...foe, ow: 5, sv: [5, 5], hv: [3, 3] });
      a.mass(ellipse(x, 340, 14 * s, 15 * s), { ...foe, ow: 5, sv: [4, 4], hv: [3, 3] });
      a.mass(`M${f(x - 18 * s)} 336L${f(x)} ${f(318 - 6 * s)}L${f(x + 18 * s)} 336Z`, { ...M.steel, ow: 4, sv: [3, 3], hv: [2, 2] });
      a.mass(ellipse(x - 20 * s, 380, 20 * s, 24 * s), { base: "#7a4a30", shade: "#4a2a1a", light: "#a06a40", ow: 5, sv: [4, 4], hv: [3, 3] });
      a.line(`M${f(x - 30 * s)} 372L${f(x - 10 * s)} 388`, 3, INK, 0.7);
      a.fill(star(x + 14 * s, 318, 6, 22, 8, -80), "#fffaf0", 0.85);
    }
    for (const [cx, cy, rx, ry] of rings) {
      a.add(`<path d="M${cx + rx} ${cy}A${rx} ${ry} 0 0 1 ${cx - rx} ${cy}" fill="none" stroke="#fffaf0" stroke-opacity="0.6" stroke-width="${f(ry / 3 + 2)}"/>`);
    }
    // Bones and skulls whirling around the funnel, raining toward the soldiers.
    const bn = { ...M.bone, rim: "#b48cff", rv: 3 };
    for (const [p, q, w] of [
      [[96, 128], [146, 108], 14], [[372, 104], [420, 132], 14], [[176, 176], [214, 156], 12], [[318, 156], [352, 186], 12],
      [[150, 236], [170, 206], 12], [[340, 226], [372, 210], 11], [[208, 270], [236, 282], 10], [[290, 266], [306, 296], 10],
      [[140, 290], [158, 318], 9], [[366, 290], [348, 312], 9], [[226, 330], [246, 346], 8],
    ]) bone(a, p, q, w, bn);
    for (const [x, y, d] of [[196, 120, 1], [300, 196, -1], [124, 176, 1]]) {
      a.line(`M${x} ${y}C${x + 20 * d} ${y - 14} ${x + 40 * d} ${y - 10} ${x + 52 * d} ${y + 6}`, 7, "#e9e2cf");
      a.line(`M${x} ${y}C${x + 20 * d} ${y - 14} ${x + 40 * d} ${y - 10} ${x + 52 * d} ${y + 6}`, 2.5, "#fffaf0");
    }
    skull(a, 256, 150, 24, bn, "#b48cff");
    skull(a, 392, 182, 18, bn, "#b48cff");
    skull(a, 120, 228, 17, bn, "#b48cff");
    skull(a, 270, 234, 15, bn, "#b48cff");
    a.motes({ seed: 63, count: 18, box: [90, 110, 430, 380], size: [3, 7], color: ["#fffaf0", "#cfc6e2"], alpha: [0.4, 0.9] });
    return a;
  },

  /** Shatter Armor — a cursed gauntlet punches a breastplate, cracking its rune and spalling plates off. */
  "shatter-armor"() {
    const a = new Art("shatter-armor");
    a.backdrop("#1a0a14", "#4e1c2a", "#1a0810", { pool: "#ff8a4a", poolAt: [276, 270], poolR: 260, poolAlpha: 0.32 });
    a.ground(394, "#14060c", "#2e0e18", { spot: "#ff8a4a", spotAt: [262, 430], spotR: 200 });
    // Armor stand.
    a.mass(limb([[262, 470], [262, 380]], 22), { base: "#5a3e2a", shade: "#33221a", light: "#8a6040", sv: [4, 4], hv: [3, 3] });
    a.mass(poly([[206, 440], [318, 440], [306, 466], [218, 466]]), { base: "#5a3e2a", shade: "#33221a", light: "#8a6040", ow: 5, sv: [4, 4], hv: [3, 3] });
    // Breastplate with pauldrons.
    const plate = { ...M.steel, rim: "#c77dff", rv: 5 };
    a.mass(ellipse(172, 206, 42, 34), { ...plate, sv: [8, 8] });
    a.mass(ellipse(352, 206, 42, 34), { ...plate, sv: [8, 8] });
    a.mass(smooth([[184, 196], [222, 172], [262, 184], [302, 172], [340, 196], [352, 256], [334, 334], [300, 372], [262, 386], [224, 372], [190, 334], [172, 256]], true, 0.9), { ...plate, sv: [14, 12], hv: [8, 8] });
    a.fill("M226 180C240 198 284 198 298 180C290 168 234 168 226 180Z", "#2a1420");
    a.line("M262 196V380M200 250C226 266 298 266 324 250M206 318C232 330 292 330 318 318", 4, INK, 0.5);
    // Rune emblem, split by the cracks.
    a.line(`${ellipse(276, 292, 34)}M276 258V326M248 276L304 308M304 276L248 308`, 6, INK, 0.8);
    a.line(`${ellipse(276, 292, 34)}M276 258V326M248 276L304 308M304 276L248 308`, 3, "#ff8a4a", 0.9);
    // Cracks radiating from the impact point, lit violet from within.
    a.glow(236, 236, 90, "#c77dff", 0.6);
    for (const [to, seed] of [[[340, 220], 2], [[318, 352], 4], [[220, 370], 6], [[180, 300], 8], [[278, 180], 9]]) {
      const z = zigzag([236, 236], to, { segments: 5, amp: 10, seed });
      a.line(z, 10).line(z, 4, "#e0b8ff");
    }
    // Spalling plates flying off.
    for (const [x, y, s, seed] of [[118, 300, 18, 1], [146, 360, 13, 2], [380, 300, 16, 3], [404, 360, 12, 4], [330, 140, 13, 5], [96, 252, 10, 6]]) {
      a.mass(shard(x, y, s, s * 0.7, { seed, n: 5, rot: seed * 30 }), { ...M.steel, ow: 4, sv: [3, 3], hv: [2, 2] });
    }
    // The cursed gauntlet striking from the upper left, spiked knuckles, impact flash.
    a.glow(226, 226, 70, "#f0d8ff", 0.9);
    a.fill(star(226, 228, 10, 74, 30, -60), "#f0d8ff", 0.85);
    const gaunt = { base: "#3a2458", shade: "#1e1032", light: "#5e3e8a", rim: "#c77dff", rv: 4 };
    a.mass(limb([[20, 30], [100, 110], [170, 176]], [80, 66, 56]), { ...gaunt, sv: [10, 10] });
    a.mass(limb([[126, 140], [148, 158]], 72), { ...M.gold, ow: 5, sv: [4, 4], hv: [3, 3] });
    a.mass(smooth([[166, 164], [200, 172], [222, 204], [214, 232], [186, 236], [160, 214]], true, 0.9), { ...gaunt, sv: [8, 8] });
    for (const [x, y] of [[214, 186], [222, 206], [216, 226]]) a.mass(limb([[x - 6, y], [x + 14, y + 6]], [12, 2], { capEnd: false }), { ...M.steel, ow: 3, sv: [2, 2], hv: [1, 1] });
    a.motes({ seed: 64, count: 12, box: [110, 140, 420, 400], size: [3, 7], color: ["#ff8a4a", "#e0b8ff"], alpha: [0.4, 0.9] });
    return a;
  },

  /** Banish — a creature unravels into ribbons that are sucked back into a hovering card's swirling portal. */
  banish() {
    const a = new Art("banish");
    a.backdrop("#081a22", "#174250", "#0a141e", { pool: "#5ae0d0", poolAt: [330, 210], poolR: 250, poolAlpha: 0.38 });
    a.ground(384, "#06121a", "#123440", { spot: "#5ae0d0", spotAt: [170, 420], spotR: 170 });
    // Hovering card: violet frame, swirling portal face.
    const [cx, cy, w, h, rot] = [334, 206, 150, 208, 10];
    a.glow(cx, cy, 150, "#5ae0d0", 0.5);
    a.mass(cardPath(cx, cy, w, h, rot), { base: "#4b2f8f", shade: "#2a1a52", light: "#6a48b8", rim: "#5ae0d0", rv: 5, ow: 6, sv: [8, 8], hv: [5, 5] });
    a.fill(cardPath(cx, cy, w * 0.8, h * 0.84, rot, 6), "#0a0820");
    a.glow(cx, cy, 70, "#5ae0d0", 0.75);
    let sp = "";
    for (let i = 0; i <= 44; i++) {
      const [x, y] = polar(cx, cy, 4 + i * 1.25, i * 26);
      sp += `${i ? "L" : "M"}${f(x)} ${f(y)}`;
    }
    a.line(sp, 4, "#bffaf2", 0.85);
    a.line(cardPath(cx, cy, w * 0.8, h * 0.84, rot, 6), 4, GOLD, 0.9);
    // Return arrow arcing back into the card.
    a.line("M188 120C226 82 290 76 318 96", 14).line("M188 120C226 82 290 76 318 96", 7, "#bffaf2");
    a.mass(poly([[300, 76], [338, 104], [298, 118]]), { base: "#bffaf2", shade: "#5ae0d0", ow: 5, sv: [3, 3], hv: [2, 2] });
    // The creature (a horned brute) being pulled apart, reaching back in vain.
    const ghost = { base: "#5e8492", shade: "#36525e", light: "#90bac6", rim: "#5ae0d0", rv: 4 };
    a.shadow(160, 410, 80, 12);
    a.mass(limb([[136, 336], [124, 376], [118, 404]], [26, 22, 20]), { ...ghost, sv: [5, 5] });
    a.mass(limb([[176, 340], [186, 378], [196, 404]], [26, 22, 20]), { ...ghost, sv: [5, 5] });
    a.mass(smooth([[110, 340], [118, 288], [150, 262], [196, 270], [214, 306], [200, 350], [150, 360]], true, 0.9), { ...ghost, sv: [10, 10] });
    a.mass(limb([[124, 292], [92, 316], [78, 352]], [22, 18, 16]), { ...ghost, sv: [4, 4], hv: [3, 3] });
    a.mass(smooth([[150, 260], [156, 228], [186, 216], [212, 232], [210, 262], [184, 274]], true, 0.9), { ...ghost, sv: [6, 6] });
    a.mass(limb([[162, 230], [140, 206], [142, 186]], [12, 7, 2], { capEnd: false }), { ...M.bone, ow: 3, sv: [2, 2], hv: [1, 1] });
    a.mass(limb([[200, 224], [212, 198], [234, 190]], [12, 7, 2], { capEnd: false }), { ...M.bone, ow: 3, sv: [2, 2], hv: [1, 1] });
    a.fill(ellipse(182, 246, 5), "#e6fffa").fill(ellipse(200, 244, 4), "#e6fffa").fill(ellipse(192, 262, 6, 4), INK);
    // Ribbons peeling off the creature's right side and flowing into the portal.
    const rib = { base: "#7ff5e0", shade: "#2fb8a8", light: "#e6fffa", ow: 4, sv: [4, 4], hv: [2, 2] };
    for (const [pts, ws] of [
      [[[204, 262], [250, 236], [292, 210], [328, 204]], [18, 14, 8, 3]],
      [[[212, 306], [262, 296], [300, 250], [334, 216]], [22, 16, 10, 3]],
      [[[200, 346], [256, 352], [306, 296], [338, 226]], [18, 12, 8, 3]],
    ]) a.mass(limb(pts, ws, { capEnd: false }), rib);
    for (const [x, y, s, seed] of [[236, 270], [262, 326], [286, 238], [300, 336], [246, 228]].map(([x, y], i) => [x, y, 6 + (i % 2) * 3, i + 1])) {
      a.fill(shard(x, y, s, s, { seed, n: 4 }), "#bffaf2", 0.85);
    }
    a.motes({ seed: 65, count: 12, box: [100, 130, 430, 380], size: [3, 7], color: ["#bffaf2", "#5ae0d0"], alpha: [0.4, 0.9], shape: "circle" });
    return a;
  },

  /** Dark Pact — a human and a demon clasp hands over a blood altar; an ally fades to smoke, two cards rise. */
  "dark-pact"() {
    const a = new Art("dark-pact");
    a.backdrop("#14040a", "#520c1e", "#120408", { pool: "#ff2a4a", poolAt: [256, 230], poolR: 260, poolAlpha: 0.36 });
    a.ground(384, "#0e0206", "#2a0610", { spot: "#ff2a4a", spotAt: [256, 430], spotR: 210 });
    // Smoke column with the sacrificed ally's fading silhouette.
    for (const [x, y, rx, ry, seed] of [[256, 312, 70, 30, 1], [240, 262, 60, 34, 2], [272, 210, 64, 36, 3], [250, 160, 70, 34, 4]]) a.fill(blob(x, y, rx, ry, { seed, n: 8 }), "#6a4a5e", 0.35);
    a.fill(smooth([[220, 300], [222, 236], [240, 214], [272, 214], [290, 236], [292, 300]], true, 0.9), "#f0d8e4", 0.28);
    a.fill(ellipse(256, 194, 22, 24), "#f0d8e4", 0.28).fill(`M232 186L256 160L280 186Z`, "#f0d8e4", 0.22);
    // Two cards rising out of the smoke.
    a.glow(170, 160, 70, "#ff2a4a", 0.6).glow(344, 150, 70, "#ff2a4a", 0.6);
    cardBack(a, 168, 168, 76, 106, -16, "#ff2a4a");
    cardBack(a, 346, 158, 76, 106, 14, "#ff2a4a");
    // Altar with a glowing blood rune.
    const stone = { base: "#3e2a34", shade: "#22141c", light: "#5e4450" };
    a.mass(poly([[150, 352], [362, 352], [382, 446], [130, 446]]), { ...stone, sv: [10, 8] });
    a.mass(poly([[124, 334], [388, 334], [394, 360], [118, 360]]), { ...stone, sv: [6, 6], hv: [4, 4] });
    a.glow(256, 402, 52, "#ff2a4a", 0.85);
    a.line(`${ellipse(256, 402, 32)}${star(256, 402, 5, 30, 12, -90)}`, 4, "#ff4d6d");
    a.line("M300 360C304 374 300 384 306 396", 4, "#e0234a");
    // The pact: two forearms meeting in a handshake — human sleeve (left), demon arm (right) with claws over it.
    a.mass(limb([[30, 452], [126, 360], [214, 300]], [70, 58, 46]), { base: "#7a1428", shade: "#46081a", light: "#a8303e", sv: [8, 8] });
    a.mass(limb([[482, 452], [386, 356], [296, 292]], [72, 58, 48]), { base: "#2a1630", shade: "#140816", light: "#4a2a54", rim: "#ff2a4a", rv: 4, sv: [8, 8] });
    a.mass(ellipse(234, 288, 38, 30), { ...M.skin, sv: [6, 6], hv: [4, 4] });
    a.mass(smooth([[306, 268], [280, 252], [250, 256], [240, 284], [260, 310], [302, 304]], true, 0.9), { base: "#5a3060", shade: "#30163a", light: "#8a5094", rim: "#ff2a4a", rv: 3, sv: [5, 5] });
    for (const [b, t] of [[[256, 262], [210, 262]], [[250, 280], [204, 286]], [[256, 298], [212, 310]]]) a.mass(limb([b, [b[0] - 18, b[1] - 6], t], [15, 12, 2], { capEnd: false }), { base: "#5a3060", shade: "#30163a", light: "#8a5094", ow: 4, sv: [2, 2], hv: [1, 1] });
    a.mass(drop(250, 340, 8), { ...CRIMSON, ow: 3, sv: [2, 2], hv: [1, 1] });
    a.line("M250 306V318", 4, "#e0234a");
    a.motes({ seed: 66, count: 12, box: [100, 110, 420, 380], size: [3, 7], color: ["#ff4d6d", "#ffbe0b"], alpha: [0.4, 0.9] });
    return a;
  },

  /** Raise Dead — two skeletal arms burst from two graves around a necrotic green summoning sigil. */
  "raise-dead"() {
    const a = new Art("raise-dead");
    a.backdrop("#04120a", "#164a2c", "#06180e", { pool: "#7dff8a", poolAt: [256, 300], poolR: 270, poolAlpha: 0.32 });
    a.fill(ellipse(96, 92, 34), "#d8ffd8", 0.85).fill(ellipse(110, 82, 30), "#164a2c");
    // Iron graveyard fence.
    let fence = "M0 292H512";
    for (let x = 12; x < 512; x += 30) fence += `M${x} 320V262`;
    a.line(fence, 5, "#0a2414");
    for (let x = 12; x < 512; x += 30) a.fill(poly([[x - 6, 264], [x, 250], [x + 6, 264]]), "#0a2414");
    a.ground(330, "#06140a", "#123a20", { spot: "#7dff8a", spotAt: [256, 392], spotR: 200 });
    // Tombstones.
    const tomb = { base: "#5a6a62", shade: "#36443e", light: "#82948a" };
    a.mass("M86 350V236C86 196 162 196 162 236V350Z", { ...tomb, sv: [8, 8] });
    a.mass("M352 346V226C352 186 432 186 432 226V346Z", { ...tomb, sv: [8, 8] });
    a.line("M124 228V290M108 248H140M392 220V282M376 240H408", 6, "#36443e");
    a.line("M150 220L140 244L152 262", 3, INK, 0.6);
    // Sigil ring on the ground between the graves + a pillar of necrotic light.
    a.fill("M190 392L214 120H298L322 392Z", "#7dff8a", 0.1);
    a.glow(256, 388, 140, "#7dff8a", 0.55);
    a.line(`${ellipse(256, 388, 120, 30)}${ellipse(256, 388, 94, 22)}`, 5, "#7dff8a", 0.9);
    a.line(star(256, 388, 5, 92, 36, -90).replace(/Z$/, ""), 3, "#b8ffc0", 0.7);
    for (let i = 0; i < 12; i++) {
      const [x, y] = polar(256, 388, 1, i * 30);
      const px = 256 + (x - 256) * 107, py = 388 + (y - 388) * 26;
      a.fill(poly([[px, py - 5], [px + 4, py], [px, py + 5], [px - 4, py]]), "#e0ffe4");
    }
    const bn = { ...M.bone, rim: "#7dff8a", rv: 3 };
    // Left grave: skull crown and an arm reaching straight up, fingers splayed.
    skull(a, 108, 356, 22, bn, "#7dff8a");
    bone(a, [168, 370], [186, 262], 16, bn);
    bone(a, [152, 370], [172, 266], 12, bn);
    a.mass(ellipse(182, 252, 16, 13), { ...bn, ow: 4, sv: [3, 3], hv: [2, 2] });
    for (const [dx, dy] of [[-26, -18], [-14, -34], [2, -38], [16, -30], [24, -12]]) {
      a.mass(limb([[182, 248], [182 + dx * 0.6, 248 + dy * 0.6], [182 + dx, 248 + dy]], [8, 7, 4]), { ...bn, ow: 3, sv: [2, 2], hv: [1, 1] });
    }
    // Right grave: an arm clawing out over the mound edge, skull rising beside it.
    skull(a, 404, 352, 24, bn, "#7dff8a");
    bone(a, [348, 372], [326, 286], 16, bn);
    bone(a, [362, 370], [338, 290], 12, bn);
    a.mass(ellipse(326, 274, 16, 13), { ...bn, ow: 4, sv: [3, 3], hv: [2, 2] });
    for (const [dx, dy] of [[-30, -6], [-26, -24], [-12, -34], [4, -32]]) {
      a.mass(limb([[326, 270], [326 + dx * 0.6, 270 + dy * 0.7], [326 + dx, 270 + dy * 0.6 + 6]], [8, 7, 4]), { ...bn, ow: 3, sv: [2, 2], hv: [1, 1] });
    }
    // Grave mounds over the buried ends.
    const soil = { base: "#3a3424", shade: "#201c12", light: "#5a5038" };
    a.mass(smooth([[62, 404], [86, 368], [140, 358], [196, 366], [214, 402], [140, 414]], true, 0.85), { ...soil, sv: [8, 8] });
    a.mass(smooth([[300, 404], [318, 368], [372, 356], [430, 364], [452, 402], [372, 414]], true, 0.85), { ...soil, sv: [8, 8] });
    a.fill(blob(140, 372, 60, 8, { seed: 2 }), "#7dff8a", 0.35).fill(blob(374, 368, 64, 8, { seed: 3 }), "#7dff8a", 0.35);
    a.motes({ seed: 67, count: 16, box: [90, 120, 430, 390], size: [3, 7], color: ["#7dff8a", "#e0ffe4"], alpha: [0.4, 0.95], shape: "circle" });
    return a;
  },
};

export default RECIPES;
