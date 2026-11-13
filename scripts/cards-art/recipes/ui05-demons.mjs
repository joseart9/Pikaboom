// UI-05 recipes (demons). See art.mjs / docs/cards/UI_VISUAL_SYSTEM.md §6.
// Five different body plans: squat imp, prowling shadow beast, four-armed weaver, worm-leech, asymmetric void empress.
import { Art, INK, blob, ellipse, f, limb, poly, polar, shard, smooth, star } from "../lib.mjs";
import { UNIQUE } from "../materials.mjs";
import { wing } from "./ui05-parts.mjs";

const R = {
  imp: { base: "#d9452b", shade: "#8a1f1a", light: "#ff8a5c" },
  impWing: { base: "#6a1a1a", shade: "#3e0c0e", light: "#94302a" },
  horn: { base: "#3a2a2a", shade: "#1e1414", light: "#6a5050" },
  basalt: { base: "#3a2430", shade: "#1e1018", light: "#5a3a48" },
  fire: { base: "#ff7b00", shade: "#c2410c", light: "#ffbe0b" },
  core: { base: "#ffe066", shade: "#ffbe0b", light: "#fff8d6" },
  shadow: { base: "#241a3e", shade: "#120a24", light: "#3e2e66", rim: "#b48cff", rv: 5 },
  weaver: { base: "#9a5aa8", shade: "#5e2e6e", light: "#c48ad0" },
  plum: { base: "#3a1440", shade: "#200826", light: "#5a2a62" },
  leech: { base: "#7a2e7a", shade: "#4a1450", light: "#a8509e", rim: "#3fa9ff", rv: 4 },
  mana: { base: "#3fa9ff", shade: "#1f5fbf", light: "#bfe6ff" },
  void: { base: "#1e1238", shade: "#0e0820", light: "#3a2a5e", rim: UNIQUE, rv: 5 },
  nyxSkin: { base: "#d7c0f0", shade: "#9a7ac0", light: "#f3e8ff" },
};

const RECIPES = {
  /** Imp — a grinning ember imp squatting on a basalt rock, juggling a fireball (Quemadura). */
  "ember-imp"() {
    const a = new Art("ember-imp");
    a.backdrop("#2a0810", "#6a1a14", "#1e0608", { pool: "#ff7b00", poolAt: [256, 300], poolR: 260, poolAlpha: 0.4 });
    // Cavern stalactites + lava glow below.
    a.fill("M0 0H512V60L470 70L452 140L430 74L380 90L360 170L338 84L290 70L256 110L230 66L170 80L150 150L128 76L80 70L60 130L40 64L0 70Z", "#1a0408");
    a.ground(380, "#2a0808", "#4a1010", { spot: "#ffbe0b", spotAt: [256, 450], spotR: 260 });
    a.fill(blob(110, 450, 90, 16, { seed: 3 }), "#ff7b00", 0.6).fill(blob(420, 460, 80, 14, { seed: 5 }), "#ff7b00", 0.6);
    a.mass(shard(256, 392, 120, 40, { seed: 4, n: 9, jitter: 0.12 }), { ...R.basalt, sv: [10, 10] });
    a.line("M180 392L214 380M300 384L336 396", 4, "#ff7b00", 0.7);
    // Wings behind the shoulders.
    for (const s of [-1, 1]) {
      const X = (x) => 256 + s * (x - 256);
      wing(a, { root: [X(234), 262], rootLow: [X(236), 296], wrist: [X(170), 214], tips: [[X(118), 168], [X(112), 236], [X(146), 276], [X(198), 288]], mem: R.impWing, bone: R.horn, sag: 0.28, boneW: 10, vein: false });
    }
    // Tail with an arrow tip.
    a.mass(limb([[290, 350], [356, 364], [392, 330], [376, 300]], [18, 14, 10, 8]), { ...R.imp, sv: [4, 4], hv: [3, 3] });
    a.mass(poly([[376, 306], [358, 282], [384, 286], [392, 262], [396, 296]]), { ...R.horn, ow: 4, sv: [3, 3], hv: [2, 2] });
    // Crouched legs, clawed feet.
    for (const s of [-1, 1]) {
      a.mass(limb([[256 + s * 24, 330], [256 + s * 54, 344], [256 + s * 44, 372]], [30, 24, 18]), { ...R.imp, sv: [5, 5] });
      a.mass(`M${256 + s * 28} 380L${256 + s * 30} 366L${256 + s * 58} 366L${256 + s * 66} 380Z`, { ...R.horn, ow: 4, sv: [2, 2], hv: [1, 1] });
    }
    // Round belly + chest.
    a.mass(ellipse(256, 316, 44, 42), { ...R.imp, sv: [10, 10] });
    a.fill(ellipse(250, 324, 26, 24), "#ff8a5c", 0.5);
    // Arm on the knee; arm raised with the fireball.
    a.mass(limb([[222, 296], [196, 320], [216, 344]], [18, 15, 12]), { ...R.imp, sv: [4, 4], hv: [3, 3] });
    a.mass(limb([[290, 290], [330, 270], [344, 230]], [18, 15, 12]), { ...R.imp, sv: [4, 4], hv: [3, 3] });
    a.glow(352, 192, 90, "#ffbe0b", 0.8);
    a.mass(smooth([[322, 204], [326, 176], [340, 160], [346, 132], [362, 150], [376, 146], [378, 174], [384, 204], [352, 222]], true, 0.9), { ...R.fire, ow: 5, sv: [6, 6], hv: [4, 4] });
    a.mass(ellipse(352, 196, 18), { ...R.core, ow: 0, sv: [4, 4], hv: [3, 3] });
    a.mass(ellipse(344, 226, 12, 10), { ...R.imp, ow: 4, sv: [3, 3], hv: [2, 2] });
    // Head: big, curved horns, pointed ears, wide grin.
    for (const s of [-1, 1]) {
      a.mass(poly([[256 + s * 40, 210], [256 + s * 92, 186], [256 + s * 46, 236]]), { ...R.imp, sv: [4, 4], hv: [3, 3] });
      a.mass(limb([[256 + s * 22, 176], [256 + s * 46, 150], [256 + s * 40, 118]], [20, 12, 2], { capEnd: false }), { ...R.horn, ow: 4, sv: [3, 3], hv: [2, 2] });
    }
    a.mass(smooth([[206, 212], [216, 180], [256, 166], [296, 180], [306, 212], [292, 248], [256, 260], [220, 248]], true, 0.9), { ...R.imp, sv: [10, 8] });
    a.fill("M222 222C236 252 276 252 290 222C276 232 236 232 222 222Z", "#3a0612");
    a.fill("M230 228L236 238L242 230L248 240L254 231L260 240L266 230L272 240L278 228Z", "#fff8ea");
    for (const s of [-1, 1]) {
      a.fill(`M${256 + s * 10} 206L${256 + s * 38} 196L${256 + s * 34} 212Z`, "#ffe066");
      a.fill(ellipse(256 + s * 26, 205, 2.5, 5), INK);
      a.line(`M${256 + s * 8} 196L${256 + s * 40} 184`, 5);
    }
    a.motes({ seed: 13, count: 16, box: [60, 90, 460, 420], size: [3, 8], color: ["#ffbe0b", "#ff7b00", "#ffe066"], alpha: [0.5, 1] });
    return a;
  },

  /** Stealth beast — a gaunt horned shadow demon prowling left, blade claws out, hind half dissolving into smoke (Sigilo). */
  "shadow-stalker"() {
    const a = new Art("shadow-stalker");
    a.backdrop("#06040e", "#1a0e32", "#08040e", { pool: "#9d6bff", poolAt: [280, 210], poolR: 250, poolAlpha: 0.35 });
    a.fill("M372 70A56 56 0 1 0 412 166A44 44 0 1 1 372 70Z", "#e0d0ff", 0.85);
    // Dead trees and fog.
    a.fill(limb([[40, 520], [50, 260], [30, 120], [10, 60]], [40, 28, 14, 4]), "#05030a").fill(limb([[50, 230], [100, 190], [120, 150]], [14, 8, 2]), "#05030a");
    a.fill(limb([[470, 520], [462, 280], [480, 160], [500, 110]], [44, 30, 14, 4]), "#05030a").fill(limb([[466, 260], [420, 220], [404, 180]], [14, 8, 2]), "#05030a");
    a.ground(352, "#0a0618", "#20143e", { spot: "#9d6bff", spotAt: [250, 392], spotR: 200 });
    a.shadow(240, 390, 150, 12, 0.6);
    // Smoke the hind half dissolves into.
    for (const [x, y, rx, ry, s, o] of [[380, 300, 70, 46, 1, 0.75], [430, 250, 50, 34, 2, 0.55], [350, 360, 80, 28, 3, 0.7], [460, 200, 34, 24, 4, 0.4]]) a.fill(blob(x, y, rx, ry, { seed: s }), "#1a1030", o);
    // Far arm.
    a.mass(limb([[226, 256], [196, 296], [156, 316]], [22, 18, 14]), { ...R.shadow, base: "#1a1230", sv: [4, 4] });
    // Hind leg (digitigrade), body with spine spikes, smoke edge.
    a.mass(limb([[330, 270], [372, 306], [350, 350], [378, 382]], [40, 30, 20, 14]), { ...R.shadow, sv: [6, 6] });
    let spikes = "";
    for (let i = 0; i < 6; i++) {
      const x = 220 + i * 24, y = 222 - Math.sin(((i + 1) / 7) * Math.PI) * 30;
      spikes += limb([[x, y + 10], [x + 14, y - 18 - (i % 2) * 8]], [16, 2], { capEnd: false });
    }
    a.mass(spikes, { ...R.shadow, ow: 4, sv: [3, 3], hv: [2, 2] });
    a.mass(smooth([[196, 254], [230, 214], [290, 196], [350, 214], [380, 260], [356, 296], [290, 296], [222, 288]], true, 0.9), { ...R.shadow, sv: [12, 12] });
    a.line("M250 250C260 266 262 280 258 290M276 246C286 262 288 280 284 292", 4, "#b48cff", 0.35);
    for (const [x, y, rx, ry, s] of [[372, 266, 34, 30, 5], [396, 236, 24, 20, 6], [350, 300, 30, 18, 7]]) a.fill(blob(x, y, rx, ry, { seed: s }), "#2e2050", 0.8);
    a.motes({ seed: 17, count: 12, box: [360, 180, 480, 330], size: [4, 10], color: "#3e2e66", alpha: [0.5, 0.9], shape: "circle" });
    // Near arm reaching, three blade claws.
    a.mass(limb([[222, 268], [178, 304], [138, 334]], [28, 22, 16]), { ...R.shadow, sv: [5, 5] });
    let claws = "";
    for (const [dx, dy] of [[-56, -2], [-50, 18], [-36, 34]]) claws += limb([[136, 334], [136 + dx * 0.5, 334 + dy * 0.5 - 4], [136 + dx, 334 + dy]], [10, 7, 2], { capEnd: false });
    a.mass(claws, { base: "#d6c8ff", shade: "#7a5ac8", light: "#ffffff", ow: 3, sv: [2, 2], hv: [1, 1] });
    // Head low and forward: long swept horns, no face but slit eyes and a thin grin.
    a.mass(limb([[206, 222], [256, 190], [320, 178], [370, 186]], [20, 16, 10, 2], { capEnd: false }), { ...R.shadow, ow: 5, sv: [4, 4], hv: [3, 3] });
    a.mass(limb([[196, 230], [232, 210], [282, 206]], [14, 10, 2], { capEnd: false }), { ...R.shadow, base: "#1a1230", ow: 4, sv: [3, 3], hv: [2, 2] });
    a.mass("M132 252C140 226 176 210 212 218C232 226 236 252 222 270C196 280 160 278 132 262Z", { ...R.shadow, sv: [8, 8] });
    a.glow(170, 240, 46, "#ff4dd2", 0.6);
    a.fill("M150 240L184 232L178 242Z", "#ff9fe6").fill("M190 236L212 234L206 242Z", "#ff9fe6");
    a.line("M140 260C160 266 184 266 206 258", 3, "#ff9fe6", 0.8);
    a.fill("M150 262l4 8l4-8zM164 264l4 8l4-8zM178 264l4 8l4-8z", "#ff9fe6", 0.9);
    return a;
  },

  /** Four-armed demoness weaving a cat's-cradle of glowing curse threads around an evil-eye sigil (Maldición, Debilidad). */
  "curse-weaver"() {
    const a = new Art("curse-weaver");
    a.backdrop("#120820", "#30124a", "#100818", { pool: "#b5e48c", poolAt: [256, 260], poolR: 240, poolAlpha: 0.22 });
    // Lair: hanging charms on strings, candles.
    for (const [x, l] of [[70, 150], [120, 90], [400, 110], [450, 170]]) {
      a.line(`M${x} 0V${l}`, 2, "#5a2a62");
      a.mass(shard(x, l + 10, 12, 14, { seed: x, n: 5 }), { ...R.plum, ow: 3, sv: [2, 2], hv: [1, 1] });
    }
    a.ground(400, "#140820", "#2a1240", {});
    for (const x of [80, 432]) {
      a.mass(`M${x - 12} 420V372h24v48Z`, { base: "#e9e2cf", shade: "#a89f8a", light: "#fffaf0", ow: 4, sv: [4, 4], hv: [3, 3] });
      a.glow(x, 354, 40, "#b5e48c", 0.8).fill(smooth([[x - 7, 368], [x, 344], [x + 7, 368]], true, 0.9), "#d8f5a2");
    }
    // Hair mass behind, ram horns.
    a.mass(smooth([[200, 150], [256, 112], [312, 150], [330, 260], [352, 360], [256, 330], [160, 360], [182, 260]], true, 0.9), { base: "#1e0e26", shade: "#0e0612", light: "#3a1e46", sv: [10, 10] });
    for (const s of [-1, 1]) a.mass(limb([[256 + s * 26, 140], [256 + s * 60, 110], [256 + s * 84, 130], [256 + s * 74, 166], [256 + s * 54, 160]], [22, 20, 16, 10, 4], { capEnd: false }), { base: "#4a3a3a", shade: "#241a1a", light: "#7a6262", ow: 4, sv: [4, 4], hv: [3, 3] });
    // Robe + torso.
    a.mass("M196 240C220 222 292 222 316 240L360 420H152Z", { ...R.plum, sv: [12, 10] });
    a.mass("M228 230L256 290L284 230C272 222 240 222 228 230Z", { ...R.weaver, sv: [6, 6], hv: [4, 4] });
    a.line("M188 300C220 320 292 320 324 300", 4, "#b5e48c", 0.6);
    // Four arms: upper pair raised, lower pair spread — hands hold the threads.
    const H = [[124, 132], [388, 132], [140, 318], [372, 318]];
    a.mass(limb([[214, 240], [166, 200], [130, 142]], [24, 20, 16]), R.weaver);
    a.mass(limb([[298, 240], [346, 200], [382, 142]], [24, 20, 16]), R.weaver);
    a.mass(limb([[214, 262], [176, 300], [146, 314]], [22, 18, 14]), R.weaver);
    a.mass(limb([[298, 262], [336, 300], [366, 314]], [22, 18, 14]), R.weaver);
    for (const [x, y] of H) a.mass(ellipse(x, y, 13, 12), { ...R.weaver, ow: 4, sv: [3, 3], hv: [2, 2] });
    // Curse threads: a cat's-cradle between the hands, crossing at the sigil.
    const web = `M${H[0]}L${H[3]}M${H[1]}L${H[2]}M${H[0]}Q256 190 ${H[1]}M${H[2]}Q256 360 ${H[3]}M${H[0]}L${H[2]}M${H[1]}L${H[3]}`.replace(/,/g, " ");
    a.line(web, 10, "#b5e48c", 0.35).line(web, 4, "#b5e48c").line(web, 1.5, "#f4ffe0");
    a.glow(256, 262, 70, "#b5e48c", 0.8);
    a.mass("M216 262C236 238 276 238 296 262C276 286 236 286 216 262Z", { base: "#1e0e26", shade: "#0e0612", light: "#3a1e46", ow: 4, sv: [3, 3], hv: [2, 2] });
    a.fill(ellipse(256, 262, 12), "#b5e48c").fill(ellipse(256, 262, 4, 10), INK);
    // Neck + face: sharp chin, glowing green eyes, dark lips.
    a.mass(poly([[244, 206], [268, 206], [270, 230], [242, 230]]), { ...R.weaver, sv: [4, 0] });
    a.mass(smooth([[226, 168], [236, 138], [256, 130], [276, 138], [286, 168], [274, 200], [256, 216], [238, 200]], true, 0.9), { ...R.weaver, sv: [8, 8] });
    a.mass("M222 160C230 126 282 126 290 160C280 146 262 140 256 152C250 140 232 146 222 160Z", { base: "#1e0e26", shade: "#0e0612", light: "#3a1e46", ow: 4, sv: [3, 3], hv: [2, 2] });
    for (const s of [-1, 1]) {
      a.glow(256 + s * 14, 172, 14, "#b5e48c", 0.9);
      a.fill(`M${256 + s * 4} 172L${256 + s * 24} 166L${256 + s * 20} 178Z`, "#d8f5a2");
    }
    a.fill("M246 196C252 200 260 200 266 196C260 204 252 204 246 196Z", "#200826");
    a.motes({ seed: 23, count: 12, box: [100, 100, 412, 380], size: [3, 7], color: "#b5e48c", alpha: [0.4, 0.9] });
    return a;
  },

  /** Worm demon — a segmented mana leech arched over a mana crystal, lamprey mouth clamped on, draining it (−1 maná). */
  "mana-leech"() {
    const a = new Art("mana-leech");
    a.backdrop("#0a0a24", "#1c1a4e", "#0a0a1e", { pool: "#3fa9ff", poolAt: [350, 320], poolR: 230, poolAlpha: 0.32 });
    a.ground(370, "#0c0c26", "#22225a", { spot: "#3fa9ff", spotAt: [300, 410], spotR: 200 });
    // Small dimmed crystals around.
    for (const [x, y, h] of [[70, 400, 50], [110, 390, 34], [450, 396, 56], [420, 410, 30]]) a.mass(poly([[x - h * 0.25, y], [x - h * 0.2, y - h * 0.7], [x, y - h], [x + h * 0.2, y - h * 0.7], [x + h * 0.25, y]]), { base: "#2a5a9a", shade: "#163a6a", light: "#5a8ac8", ow: 4, sv: [3, 3], hv: [2, 2] });
    // Big crystal being drained (right), cracked.
    a.glow(352, 320, 110, "#3fa9ff", 0.7);
    a.mass(poly([[312, 400], [306, 300], [340, 236], [380, 250], [402, 320], [396, 400]]), { ...R.mana, sv: [12, 10], hv: [8, 8] });
    a.line("M340 236L350 400M306 300L398 316", 3, "#1f5fbf", 0.7);
    a.line("M330 270L346 296L338 318L356 340", 4, INK, 0.8);
    a.fill(poly([[320, 340], [340, 330], [350, 400], [318, 400]]), "#163a6a", 0.6);
    // Leech body: arch from the ground (left) over to the crystal.
    const spine = [[120, 404], [124, 330], [152, 262], [210, 210], [276, 196], [320, 222], [336, 258]];
    const W = [76, 76, 72, 66, 58, 52, 50];
    a.mass(limb(spine, W), { ...R.leech, sv: [14, 12] });
    // Segment rings + glowing mana veins in the body.
    for (let i = 0; i < spine.length - 1; i++) {
      for (const t of [0.35, 0.8]) {
        const p = spine[i], q = spine[i + 1], x = p[0] + (q[0] - p[0]) * t, y = p[1] + (q[1] - p[1]) * t;
        const dx = q[0] - p[0], dy = q[1] - p[1], l = Math.hypot(dx, dy), w = (W[i] + (W[i + 1] - W[i]) * t) / 2 - 4;
        a.line(`M${f(x - (dy / l) * w)} ${f(y + (dx / l) * w)}Q${f(x + (dx / l) * 8)} ${f(y + (dy / l) * 8)} ${f(x + (dy / l) * w)} ${f(y - (dx / l) * w)}`, 3.5, INK, 0.5);
      }
    }
    const vein = smooth(spine.slice(1).map(([x, y], i) => [x + 4, y + (i % 2 ? 8 : -6)]), false, 1);
    a.line(vein, 12, "#3fa9ff", 0.3).line(vein, 4, "#bfe6ff", 0.9);
    // Head: lamprey mouth disc clamped on the crystal, toothed rings, three eye spots.
    a.mass(ellipse(338, 266, 40, 30), { base: "#c46a9a", shade: "#8a3a6a", light: "#f0a0c8", ow: 5, sv: [6, 6], hv: [4, 4] });
    a.fill(ellipse(338, 268, 28, 20), "#2a0a24");
    for (const [rx, ry, n] of [[26, 18, 14], [16, 11, 9]]) {
      let d = "";
      for (let i = 0; i < n; i++) {
        const [x, y] = polar(338, 268, 1, (i * 360) / n);
        const bx = 338 + (x - 338) * rx, by = 268 + (y - 268) * ry;
        d += `M${f(bx)} ${f(by)}L${f(bx + (338 - bx) * 0.3 + 2)} ${f(by + (268 - by) * 0.3)}L${f(bx + (338 - bx) * 0.3 - 2)} ${f(by + (268 - by) * 0.3 + 2)}Z`;
      }
      a.fill(d, "#fff4f8");
    }
    a.glow(338, 268, 14, "#3fa9ff", 0.9);
    for (const [x, y] of [[300, 220], [314, 210], [328, 214]]) a.fill(ellipse(x, y, 4), "#bfe6ff");
    // Mana motes streaming from the crystal into the mouth.
    a.motes({ seed: 29, count: 18, box: [310, 240, 420, 380], size: [3, 8], color: ["#bfe6ff", "#3fa9ff"], alpha: [0.6, 1] });
    return a;
  },

  /** Unique — Nyxara, void empress: asymmetric (one great wing vs void tendrils + shattered halo, one horn broken), eclipse. */
  nyxara() {
    const a = new Art("nyxara");
    a.backdrop("#05020c", "#1a0830", "#08030f", { pool: UNIQUE, poolAt: [300, 150], poolR: 240, poolAlpha: 0.3 });
    // Eclipse: black disc, magenta corona.
    a.glow(304, 144, 150, "#ff4dd2", 0.6);
    a.fill(star(304, 144, 14, 130, 84, -80), UNIQUE, 0.18);
    a.add(`<circle cx="304" cy="144" r="80" fill="#05020c" stroke="#ff4dd2" stroke-width="6"/>`);
    a.line("M240 96A80 80 0 0 1 344 74", 3, "#ffd6f0", 0.8);
    a.motes({ seed: 37, count: 22, box: [20, 20, 492, 300], size: [2, 5], color: ["#ffffff", "#ff9fe6"], alpha: [0.4, 0.9], shape: "circle" });
    a.ground(400, "#0a0418", "#1e0c34", { spot: UNIQUE, spotAt: [250, 430], spotR: 190 });
    // One great wing (viewer's left).
    wing(a, { root: [222, 214], rootLow: [222, 290], wrist: [130, 132], tips: [[56, 84], [34, 188], [64, 278], [124, 324], [182, 312]], mem: { base: "#3a1858", shade: "#1c0a2e", light: "#5a2a7e", rim: UNIQUE, rv: 4 }, bone: R.void, sag: 0.3, boneW: 14 });
    // Void tendrils + shattered halo (viewer's right).
    for (const [pts, w] of [
      [[[290, 230], [346, 196], [392, 214], [430, 176]], [22, 16, 10, 2]],
      [[[294, 252], [356, 262], [404, 300], [452, 286]], [20, 14, 8, 2]],
      [[[286, 212], [318, 160], [370, 128], [404, 90]], [16, 12, 6, 2]],
    ]) a.mass(limb(pts, w, { capEnd: false }), { ...R.void, ow: 5, sv: [4, 4], hv: [3, 3] });
    for (const [a0, a1] of [[-150, -110], [-95, -60], [-45, -15]]) {
      const [x0, y0] = polar(256, 160, 76, a0), [x1, y1] = polar(256, 160, 76, a1);
      a.line(`M${f(x0)} ${f(y0)}A76 76 0 0 1 ${f(x1)} ${f(y1)}`, 9, UNIQUE).line(`M${f(x0)} ${f(y0)}A76 76 0 0 1 ${f(x1)} ${f(y1)}`, 3, "#ffd6f0");
    }
    // Hair streaming to the right behind the body.
    a.mass(smooth([[226, 150], [262, 120], [296, 140], [340, 200], [372, 270], [330, 262], [298, 230], [276, 250], [250, 200]], true, 0.9), { base: "#1a0e2e", shade: "#0a0416", light: "#3a2456", rim: UNIQUE, rv: 4, sv: [8, 8] });
    // Gown flaring into tatters.
    a.mass("M222 270C230 262 282 262 290 270L370 420L342 404L320 428L296 406L272 430L248 406L224 428L204 404L176 424L150 404Z", { ...R.void, sv: [14, 10] });
    a.line("M240 290L210 400M256 290L256 410M272 290L300 400", 3, UNIQUE, 0.5);
    a.motes({ seed: 43, count: 12, box: [200, 300, 320, 400], size: [2, 5], color: ["#ffffff", "#ff9fe6"], alpha: [0.5, 1] });
    // Bodice + magenta heart gem.
    a.mass("M226 214C242 206 270 206 286 214L292 276C276 284 236 284 220 276Z", { ...R.void, sv: [8, 8] });
    a.mass(poly([[256, 230], [268, 244], [256, 262], [244, 244]]), { base: UNIQUE, shade: "#9a0042", light: "#ff9fe6", ow: 4, sv: [3, 3], hv: [2, 2] });
    // Arms: left lowered with long claws, right extended loosing a silencing void flare.
    a.mass(limb([[226, 222], [204, 262], [196, 300]], [16, 13, 11]), { ...R.nyxSkin, rim: UNIQUE, rv: 3, sv: [4, 4], hv: [3, 3] });
    a.mass(limb([[196, 300], [190, 322]], [6, 2], { capEnd: false }) + limb([[198, 300], [200, 324]], [6, 2], { capEnd: false }) + ellipse(197, 302, 9, 8), { ...R.nyxSkin, ow: 3, sv: [2, 2], hv: [1, 1] });
    a.mass(limb([[286, 222], [330, 246], [370, 232]], [16, 13, 11]), { ...R.nyxSkin, rim: UNIQUE, rv: 3, sv: [4, 4], hv: [3, 3] });
    a.glow(400, 224, 64, "#ff4dd2", 0.85);
    a.mass(star(400, 224, 6, 36, 10, -90), { base: "#ffd6f0", shade: UNIQUE, ow: 4, sv: [3, 3] });
    a.line(`${ellipse(400, 224, 46)}`, 3, "#ffd6f0", 0.6);
    // Head: one great swept horn, one broken stub; diadem, glowing eyes.
    a.mass(limb([[238, 144], [214, 100], [224, 50]], [20, 12, 2], { capEnd: false }), { ...R.horn, base: "#2a2030", rim: UNIQUE, rv: 3, ow: 4, sv: [3, 3], hv: [2, 2] });
    a.mass(limb([[272, 144], [286, 124], [290, 116]], [18, 12, 10]), { ...R.horn, base: "#2a2030", ow: 4, sv: [3, 3], hv: [2, 2] });
    a.line("M282 116L298 120", 3, UNIQUE);
    a.mass(poly([[248, 196], [264, 196], [266, 214], [246, 214]]), { ...R.nyxSkin, sv: [4, 0] });
    a.mass(smooth([[232, 164], [240, 136], [256, 128], [274, 136], [282, 164], [272, 192], [256, 202], [240, 192]], true, 0.9), { ...R.nyxSkin, rim: UNIQUE, rv: 3, sv: [8, 8] });
    a.mass("M230 150C236 126 276 126 284 150L256 140Z", { base: "#1a0e2e", shade: "#0a0416", light: "#3a2456", ow: 4, sv: [3, 3], hv: [2, 2] });
    a.mass(poly([[256, 132], [262, 142], [256, 152], [250, 142]]), { base: UNIQUE, shade: "#9a0042", light: "#ff9fe6", ow: 3, sv: [2, 2], hv: [1, 1] });
    for (const s of [-1, 1]) {
      a.glow(256 + s * 12, 168, 12, "#ff4dd2", 0.9);
      a.fill(`M${256 + s * 4} 168L${256 + s * 22} 162L${256 + s * 18} 172Z`, "#ffd6f0");
    }
    a.fill("M248 186C252 190 260 190 264 186C260 192 252 192 248 186Z", "#5a0a3a");
    return a;
  },
};

export default RECIPES;
