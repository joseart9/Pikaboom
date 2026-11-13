// UI-06 recipes (holy + nature spells): healing-touch, blessing-of-light, purify, aegis-ward, savage-strike, pack-call,
// wild-roar. See art.mjs / docs/cards/UI_VISUAL_SYSTEM.md §6. Each piece pictures the spell's action, not an orb.
import { Art, INK, blob, ellipse, f, limb, mix, polar, poly, pt, shard, smooth, star } from "../lib.mjs";
import { GOLD, GOLD_SHINE, M } from "../materials.mjs";

const R = {
  ally: { base: "#d9a07a", shade: "#a0684a", light: "#f2c29b" },
  robe: { base: "#ece6ff", shade: "#a99ed6", light: "#ffffff" },
  holy: { base: "#ffe066", shade: "#ffbe0b", light: "#fff8d6" },
  feather: { base: "#ffe9a8", shade: "#e0a838", light: "#ffffff", ow: 4, sv: [4, 4], hv: [3, 3] },
  backlit: { base: "#4a3d7a", shade: "#2a1f50", light: "#7a6aa8", rim: GOLD, rv: 5 },
  water: { base: "#9bd8ff", shade: "#3f8fd8", light: "#ffffff" },
  taint: "#3a1458",
  bark: { base: "#5a3a24", shade: "#3a2416", light: "#7a5236" },
  paw: { base: "#6a4a32", shade: "#3e2a1a", light: "#9a7050", rim: "#7bd389", rv: 5 },
  slash: { base: "#b8f5a0", shade: "#3d9a4a", light: "#f4ffe8", ow: 4, sv: [5, 5], hv: [3, 3] },
  spirit: { base: "#a8e6c8", shade: "#4f9a86", light: "#e6fff4", rim: "#d8f5a2", rv: 4 },
  ivory: { base: "#efe2c0", shade: "#b39b6a", light: "#fffaf0" },
  wood: { base: "#5f9a4a", shade: "#2f5a24", light: "#a8e07a" },
};

/** Leaf: from its stem (x, y) toward `deg`, `len` long, `wid` control offset (≈ half width × 2). */
const leaf = (x, y, len, wid, deg) => {
  const tip = polar(x, y, len, deg), m = polar(x, y, len / 2, deg);
  return `M${pt([x, y])}Q${pt(polar(m[0], m[1], wid, deg + 90))} ${pt(tip)}Q${pt(polar(m[0], m[1], wid, deg - 90))} ${pt([x, y])}Z`;
};
/** Greek-cross healing sparkle. */
const plus = (x, y, s) => {
  const t = s * 0.32;
  return poly([[x - t, y - s], [x + t, y - s], [x + t, y - t], [x + s, y - t], [x + s, y + t], [x + t, y + t], [x + t, y + s], [x - t, y + s], [x - t, y + t], [x - s, y + t], [x - s, y - t], [x - t, y - t]]);
};
/** Outlined plain fill (cheaper than a `mass` for many small shapes merged into one path). */
const ink = (a, d, color, w = 6, opacity) =>
  a.add(`<path d="${d}" fill="${color}" stroke-width="${w}"${opacity !== undefined ? ` fill-opacity="${opacity}"` : ""}/>`);

const RECIPES = {
  /** Heal — a healer's open hand lays golden light on an ally's wounded forearm; the gash knits shut. */
  "healing-touch"() {
    const a = new Art("healing-touch");
    a.backdrop("#1e0f36", "#4a2a5e", "#1a0c2a", { pool: "#ffbe0b", poolAt: [280, 270], poolR: 290, poolAlpha: 0.35 });
    a.motes({ seed: 3, count: 9, box: [20, 20, 492, 220], size: [14, 28], color: "#ffe066", alpha: [0.08, 0.16], shape: "circle" });
    // Ally's forearm lying across the frame: blue sleeve, gold cuff, bare arm, loose fist.
    a.mass(limb([[-30, 430], [70, 396], [150, 370]], [130, 118, 104]), { ...M.tabard, sv: [10, 10] });
    a.mass(limb([[140, 368], [260, 346], [380, 334]], [96, 86, 76]), { ...R.ally, sv: [10, 12] });
    a.mass(limb([[132, 318], [150, 418]], 22), { ...M.gold, sv: [4, 4], hv: [3, 3], ow: 5 });
    a.mass(blob(410, 330, 46, 42, { seed: 5, n: 8, jitter: 0.08 }), { ...R.ally, sv: [8, 8] });
    a.line("M402 300C414 310 414 330 406 344M422 302C432 314 432 330 426 344", 3.5, INK, 0.55);
    // The gash: red on the right, already sealed in gold on the left.
    a.glow(268, 344, 80, "#ffe066", 0.8);
    a.line("M222 326L314 360", 14).line("M222 326L314 360", 8, "#c0283e").line("M222 326L268 343", 9, "#ffe066").line("M224 327L262 341", 4, "#ffffff");
    // Healer's descending arm (white robe, gold cuff) and open palm, fingers spread toward the wound.
    a.mass(limb([[560, -10], [452, 96], [384, 164]], [124, 108, 94]), { ...R.robe, sv: [12, 12] });
    a.mass(limb([[404, 128], [352, 196]], 22), { ...M.gold, sv: [4, 4], hv: [3, 3], ow: 5 });
    for (const [b, t, w] of [[[300, 214], [262, 244], 20], [[312, 226], [284, 268], 21], [[330, 232], [314, 278], 20], [[348, 230], [344, 270], 18], [[362, 186], [330, 154], 20]]) {
      a.mass(limb([b, mix(b, t, 0.55), t], [w, w * 0.9, w * 0.8]), { ...M.skin, ow: 5, sv: [4, 4], hv: [3, 3] });
    }
    a.mass(blob(334, 202, 44, 34, { seed: 8, n: 8, jitter: 0.06, rot: 30 }), { ...M.skin, sv: [8, 8] });
    // Light pouring from the palm onto the wound.
    a.fill(poly([[270, 236], [350, 246], [318, 352], [232, 330]]), "#fff1c1", 0.28);
    a.glow(300, 262, 90, "#fff8d6", 0.7);
    const sparks = [[220, 240, 13], [196, 300, 9], [338, 300, 11], [250, 170, 10], [380, 270, 8], [176, 210, 7]];
    ink(a, sparks.map(([x, y, s]) => plus(x, y, s)).join(""), "#ffe066", 6);
    a.fill(sparks.map(([x, y, s]) => plus(x - 1, y - 1, s * 0.45)).join(""), "#ffffff");
    a.motes({ seed: 12, count: 16, box: [190, 140, 360, 330], size: [3, 8], color: ["#d8f5a2", "#ffe066", "#7bd389"], alpha: [0.5, 1] });
    return a;
  },

  /** Blessing — a shaft of sunlight falls on a warrior raising a sword; a gold halo and light-wings bloom behind. */
  "blessing-of-light"() {
    const a = new Art("blessing-of-light");
    a.backdrop("#1a1238", "#3b2a6b", "#22144a", { pool: "#ffe066", poolAt: [256, 210], poolR: 290, poolAlpha: 0.38 });
    a.fill(blob(80, 46, 150, 50, { seed: 2, n: 9, jitter: 0.2 }), "#4b3a80").fill(blob(440, 40, 150, 50, { seed: 4, n: 9, jitter: 0.2 }), "#4b3a80");
    a.fill(poly([[190, 0], [322, 0], [410, 512], [102, 512]]), "#fff1c1", 0.13).fill(poly([[226, 0], [286, 0], [334, 512], [178, 512]]), "#fff8d6", 0.16);
    a.glow(256, 30, 130, "#ffffff", 0.7);
    a.ground(382, "#1b1036", "#3b2a6b", { spot: "#ffe066", spotAt: [256, 404], spotR: 200 });
    a.shadow(258, 400, 80, 12);
    // Light-wings: two fans of feathers from the shoulders (upper ones longest, drawn first).
    for (const s of [-1, 1]) {
      for (const [ang, len] of [[252, 170], [234, 176], [214, 166], [196, 150], [178, 128], [162, 104]]) {
        const root = [256 + s * 22, 252], deg = s < 0 ? ang : 180 - ang;
        const tip = polar(root[0], root[1], len, deg);
        a.mass(limb([root, polar(root[0], root[1], len * 0.55, deg + s * 4), tip], [22, 30, 4], { capEnd: false }), R.feather);
      }
    }
    a.glow(256, 196, 80, "#fff1c1", 0.7);
    a.line(ellipse(256, 194, 48, 46), 15).line(ellipse(256, 194, 48, 46), 9, GOLD).line(ellipse(256, 194, 48, 46), 3, GOLD_SHINE);
    // Backlit warrior: cape, legs, torso, helm, sword arm raised to the light.
    a.mass("M224 238L290 238L326 386L258 374L190 388Z", { base: "#8a1f3a", shade: "#561028", light: "#b03050", rim: GOLD, rv: 4, sv: [8, 8] });
    a.mass(limb([[242, 300], [234, 350], [228, 396]], [30, 26, 24]), R.backlit);
    a.mass(limb([[272, 300], [282, 350], [290, 396]], [30, 26, 24]), R.backlit);
    a.mass(smooth([[224, 238], [256, 226], [290, 238], [292, 300], [256, 312], [220, 300]], true, 0.9), { ...R.backlit, sv: [10, 8] });
    a.fill("M244 250L256 270L268 250L268 262L256 282L244 262Z", GOLD, 0.9);
    a.mass(limb([[230, 246], [214, 282], [212, 314]], [20, 18, 16]), R.backlit);
    a.mass(ellipse(256, 204, 22, 25), { ...R.backlit, sv: [6, 6] });
    a.line("M240 204H272", 5, "#fff1c1");
    a.mass(limb([[284, 244], [302, 204], [300, 166]], [22, 18, 16]), R.backlit);
    a.mass(limb([[300, 148], [300, 92]], [16, 4], { capEnd: false }), { ...M.steel, sv: [4, 4], hv: [3, 3] });
    a.mass(limb([[280, 150], [320, 150]], 10), { ...M.gold, ow: 5, sv: [3, 3], hv: [2, 2] });
    a.mass(ellipse(300, 160, 12), { ...R.backlit, sv: [4, 4], hv: [3, 3] });
    a.glow(300, 104, 50, "#ffffff", 0.9);
    a.mass(star(300, 100, 4, 30, 6, -90), { ...R.holy, ow: 3, sv: [2, 2], hv: [1, 1] });
    a.motes({ seed: 9, count: 18, box: [150, 40, 370, 380], size: [3, 8], color: ["#fff1c1", "#ffe066", "#ffffff"], alpha: [0.4, 1] });
    return a;
  },

  /** Purify — a tilted chalice pours holy water over a raised hand, snapping the thorned violet chains on the arm. */
  purify() {
    const a = new Art("purify");
    a.backdrop("#0e1838", "#1f3a6a", "#0c1430", { pool: "#bfe6ff", poolAt: [300, 260], poolR: 280, poolAlpha: 0.38 });
    a.fill(blob(400, 470, 180, 80, { seed: 6, n: 9, jitter: 0.25 }), R.taint, 0.5).fill(blob(470, 380, 90, 60, { seed: 7, n: 8, jitter: 0.3 }), R.taint, 0.35);
    // Raised forearm from the lower right with an open hand.
    a.mass(limb([[420, 540], [404, 450]], [120, 110]), { ...M.cloth, base: "#3a2a5e", shade: "#22184a", light: "#5a4a8a", sv: [10, 10] });
    a.mass(limb([[404, 470], [372, 380], [340, 290]], [92, 82, 72]), { ...M.skin, sv: [10, 10] });
    for (const [b, t, w] of [[[306, 270], [292, 226], 19], [[322, 262], [316, 212], 20], [[340, 262], [344, 214], 19], [[356, 270], [370, 230], 17], [[316, 300], [286, 282], 20]]) {
      a.mass(limb([b, mix(b, t, 0.55), t], [w, w * 0.9, w * 0.8]), { ...M.skin, ow: 5, sv: [4, 4], hv: [3, 3] });
    }
    a.mass(blob(334, 284, 38, 32, { seed: 4, n: 8, jitter: 0.06 }), { ...M.skin, sv: [8, 8] });
    // Thorned taint chain: intact around the forearm below, bursting apart at the wrist.
    const chain = (d) => a.add(`<path d="${d}" fill="none" stroke-width="22" stroke-dasharray="20 10"/>`, `<path d="${d}" fill="none" stroke="#6a2a9a" stroke-width="12" stroke-dasharray="20 10"/>`);
    chain("M318 400C350 384 400 388 440 404");
    chain("M326 436C360 420 410 426 450 440");
    ink(a, [[330, 392], [372, 384], [414, 392], [350, 428], [394, 424], [436, 434]].map(([x, y]) => poly([[x - 7, y], [x, y - 18], [x + 7, y]])).join(""), "#2a0a40", 5);
    for (const [x, y, s, seed, rot] of [[400, 320, 14, 1, 20], [430, 288, 11, 2, 70], [282, 340, 12, 3, 0], [452, 340, 9, 4, 40], [262, 300, 8, 5, 10], [420, 250, 8, 6, 60]]) {
      a.mass(shard(x, y, s, s * 0.6, { seed, n: 5, rot }), { base: "#6a2a9a", shade: R.taint, ow: 4, sv: [3, 3], hv: [2, 2] });
    }
    a.motes({ seed: 17, count: 14, box: [250, 220, 480, 400], size: [4, 9], color: ["#2a0a40", "#6a2a9a"], alpha: [0.6, 1] });
    // Chalice tilted from the upper left, pouring.
    a.begin("rotate(40 150 160)");
    a.mass(limb([[150, 165], [150, 214]], [18, 14]), { ...M.gold, ow: 5, sv: [4, 4], hv: [3, 3] });
    a.mass(ellipse(150, 222, 36, 11), { ...M.gold, ow: 5, sv: [4, 4], hv: [3, 3] });
    a.mass("M98 118C100 186 200 186 202 118Z", { ...M.gold, sv: [8, 8], hv: [5, 5] });
    a.line("M112 142C134 156 166 156 188 142", 4, "#a8742a");
    a.mass(ellipse(150, 118, 52, 11), { ...R.water, ow: 5, sv: [4, 4], hv: [3, 3] });
    a.fill(ellipse(150, 152, 7), "#3fa9ff");
    a.end();
    // The stream, splash on the palm, droplets.
    a.glow(300, 230, 130, "#e6f6ff", 0.55);
    a.mass(limb([[204, 146], [258, 154], [300, 188], [324, 240]], [24, 30, 34, 44]), { ...R.water, ow: 5, sv: [6, 6], hv: [4, 4] });
    a.line("M212 148C252 152 288 176 314 226", 6, "#ffffff", 0.85);
    a.mass(star(318, 232, 9, 40, 18, -80), { base: "#e6f6ff", shade: "#9bd8ff", ow: 4, sv: [4, 4] });
    a.motes({ seed: 23, count: 18, box: [240, 170, 440, 330], size: [4, 9], color: ["#e6f6ff", "#9bd8ff", "#ffffff"], alpha: [0.6, 1], shape: "circle" });
    return a;
  },

  /** Immune — a golden hex-lattice dome with a sun emblem shelters a kneeling ally; arrows and a sword break on it. */
  "aegis-ward"() {
    const a = new Art("aegis-ward");
    a.backdrop("#160c2e", "#3b2a6b", "#1b1036", { pool: "#ffe066", poolAt: [256, 290], poolR: 260, poolAlpha: 0.3 });
    a.ground(382, "#1b1036", "#2f1f62", { spot: "#ffe066", spotAt: [256, 396], spotR: 200 });
    // Kneeling ally (seen through the dome), arm raised over the head.
    const ally = { base: "#3d2a7c", shade: "#22144a", light: "#5a48a0", ow: 5, sv: [5, 5], hv: [3, 3] };
    a.mass(limb([[252, 344], [234, 374], [210, 378]], [24, 20, 16]), ally);
    a.mass(limb([[244, 302], [256, 342]], [36, 32]), ally);
    a.mass(limb([[256, 344], [292, 344], [294, 378]], [24, 22, 18]), ally);
    a.mass(ellipse(238, 290, 15), ally);
    a.mass(limb([[250, 308], [222, 300], [214, 274]], [16, 14, 12]), ally);
    // Dome: translucent gold, hex lattice clipped inside, heavy gold rim, sun emblem.
    const dome = "M96 384C96 200 176 120 256 120C336 120 416 200 416 384Z";
    a.add(`<path d="${dome}" fill="${a.radU(256, 340, 290, [[0, "#ffe066", 0.08], [0.65, "#ffbe0b", 0.24], [1, "#ff9f1c", 0.55]])}"/>`);
    const clip = a.id("c");
    a.defs.push(`<clipPath id="${clip}"><path d="${dome}"/></clipPath>`);
    let hex = "";
    for (let row = 0; row < 9; row++) for (let col = 0; col < 11; col++) {
      const cx = 80 + col * 36 + (row % 2) * 18, cy = 120 + row * 31;
      hex += poly(Array.from({ length: 6 }, (_, i) => polar(cx, cy, 20, i * 60 + 30)));
    }
    a.add(`<g clip-path="url(#${clip})"><path d="${hex}" fill="none" stroke="${GOLD}" stroke-opacity="0.45" stroke-width="3"/></g>`);
    const rim = "M96 384C96 200 176 120 256 120C336 120 416 200 416 384";
    a.line(rim, 16).line(rim, 9, GOLD).line("M104 300C110 210 170 136 256 128", 3, GOLD_SHINE);
    a.glow(256, 184, 60, "#fff1c1", 0.8);
    a.mass(star(256, 184, 12, 40, 26, -90), { ...M.gold, ow: 5, sv: [4, 4], hv: [3, 3] });
    a.mass(ellipse(256, 184, 16), { ...R.holy, ow: 4, sv: [3, 3], hv: [2, 2] });
    // Arrows striking the right flank, one snapped arrow on the ground.
    const arrow = (tail, head) => {
      a.line(`M${pt(tail)}L${pt(head)}`, 10).line(`M${pt(tail)}L${pt(head)}`, 5, "#8a5a2b");
      const dx = head[0] - tail[0], dy = head[1] - tail[1], l = Math.hypot(dx, dy), u = [dx / l, dy / l], n = [-u[1], u[0]];
      const tip = [head[0] + u[0] * 6, head[1] + u[1] * 6], back = [head[0] - u[0] * 20, head[1] - u[1] * 20];
      ink(a, poly([tip, [back[0] + n[0] * 10, back[1] + n[1] * 10], [back[0] - n[0] * 10, back[1] - n[1] * 10]]), "#c8cce0", 4);
      const t2 = [tail[0] + u[0] * 22, tail[1] + u[1] * 22];
      ink(a, poly([tail, [t2[0] + n[0] * 9, t2[1] + n[1] * 9], t2, [t2[0] - n[0] * 9, t2[1] - n[1] * 9]]), "#e9e2cf", 3);
    };
    arrow([500, 214], [396, 232]);
    arrow([512, 330], [414, 304]);
    arrow([488, 120], [376, 178]);
    a.line("M426 392L470 380", 9).line("M426 392L470 380", 4, "#8a5a2b").line("M444 404L488 410", 9).line("M444 404L488 410", 4, "#8a5a2b");
    for (const [x, y, r] of [[392, 232, 30], [410, 304, 26], [372, 180, 24], [146, 198, 40]]) {
      a.glow(x, y, r * 1.8, "#fff1c1", 0.8);
      a.mass(star(x, y, 8, r, r * 0.38, -10), { base: "#ffffff", shade: "#ffe066", ow: 3, sv: [2, 2] });
    }
    // A sword from the upper left breaks on the dome; its tip spins away.
    a.mass(limb([[60, 84], [136, 182]], [24, 10], { capEnd: false }), { ...M.steel, sv: [4, 4], hv: [3, 3] });
    a.mass(limb([[36, 110], [82, 60]], 12), { ...M.gold, ow: 5, sv: [3, 3], hv: [2, 2] });
    a.mass(limb([[50, 74], [28, 50]], 12), { ...M.leather, ow: 5, sv: [3, 3], hv: [2, 2] });
    a.mass(poly([[112, 236], [124, 214], [132, 246]]), { ...M.steel, ow: 4, sv: [2, 2], hv: [1, 1] });
    a.motes({ seed: 33, count: 12, box: [110, 130, 430, 360], size: [3, 7], color: ["#fff1c1", "#ffe066"], alpha: [0.4, 0.9] });
    return a;
  },

  /** +3 attack — four glowing green claw trails rip diagonally through a forest; the furry paw leads, bark flies. */
  "savage-strike"() {
    const a = new Art("savage-strike");
    a.backdrop("#0c1e16", "#1c3a28", "#0e1a12", { pool: "#7bd389", poolAt: [256, 256], poolR: 280, poolAlpha: 0.35 });
    a.fill(limb([[40, 520], [50, 260], [36, -20]], [70, 60, 56]), "#0a160f").fill(limb([[470, 520], [462, 300], [476, -20]], [64, 56, 50]), "#0a160f");
    a.mass(limb([[200, 540], [212, 300], [196, -30]], [140, 128, 120]), { ...R.bark, ow: 5, sv: [12, 10] });
    a.line("M180 40C190 120 176 200 190 280M230 60C222 160 240 240 226 330", 4, INK, 0.45);
    a.ground(410, "#0a160f", "#1c3a28");
    // Claw trails from the upper left to the paw at the lower right.
    const S = [104, 116], E = [380, 342], d = [E[0] - S[0], E[1] - S[1]], l = Math.hypot(...d), n = [-d[1] / l, d[0] / l];
    const tips = [];
    for (const o of [-72, -24, 24, 72]) {
      const s = [S[0] + n[0] * o * 1.1, S[1] + n[1] * o * 1.1], e = [E[0] + n[0] * o * 0.55, E[1] + n[1] * o * 0.55];
      const m = mix(s, e, 0.5), mid = [m[0] + n[0] * 22, m[1] + n[1] * 22];
      tips.push(e);
      a.fill(limb([s, mid, e], [4, 44, 18], { capEnd: false }), "#7bd389", 0.3);
      a.mass(limb([s, mid, e], [2, 24, 10], { capEnd: false }), R.slash);
      a.line(`M${pt(mix(s, mid, 0.3))}Q${pt(mid)} ${pt(mix(mid, e, 0.8))}`, 3, "#ffffff", 0.9);
    }
    // Torn bark chips + leaves blown off the trunk.
    for (const [x, y, s, seed, rot] of [[150, 250, 16, 1, 20], [262, 196, 12, 2, 70], [130, 330, 12, 3, 10], [300, 140, 10, 4, 40], [92, 200, 9, 5, 0]]) {
      a.mass(shard(x, y, s, s * 0.5, { seed, n: 5, rot }), { ...R.bark, ow: 4, sv: [3, 3], hv: [2, 2] });
    }
    ink(a, [[340, 160, 30, 12, -20], [380, 230, 26, 10, 40], [120, 400, 26, 10, 200], [300, 420, 24, 9, 160], [430, 150, 22, 9, 80]].map(([x, y, len, w, deg]) => leaf(x, y, len, w, deg)).join(""), "#5f9a4a", 5);
    // The paw: forearm in from the bottom right, furry pad, ivory claws at the ends of the trails.
    a.glow(352, 316, 120, "#b8f5a0", 0.5);
    a.mass(limb([[300, 540], [318, 430], [346, 330]], [140, 124, 110]), { ...R.paw, sv: [12, 12] });
    a.line("M290 470L312 456M340 480L356 462M300 420L322 412", 4, INK, 0.5);
    a.mass(blob(350, 318, 62, 54, { seed: 6, n: 9, jitter: 0.1, rot: 40 }), { ...R.paw, sv: [10, 10] });
    for (const t of tips) {
      const u = [d[0] / l, d[1] / l];
      const b = [t[0] - u[0] * 14, t[1] - u[1] * 14], c = [t[0] + u[0] * 44, t[1] + u[1] * 44];
      a.mass(limb([b, [mix(b, c, 0.5)[0] - n[0] * 8, mix(b, c, 0.5)[1] - n[1] * 8], c], [18, 12, 2], { capEnd: false }), { ...M.bone, ow: 4, sv: [3, 3], hv: [2, 2] });
    }
    a.motes({ seed: 41, count: 14, box: [90, 100, 440, 400], size: [3, 8], color: ["#b8f5a0", "#7bd389", "#f4ffe8"], alpha: [0.5, 1] });
    return a;
  },

  /** Summon two wolves — a carved horn sounds green rings; two spectral wolves leap down out of the full moon. */
  "pack-call"() {
    const a = new Art("pack-call");
    a.backdrop("#0a1a24", "#16384a", "#0c1a1e", { pool: "#a8e6c8", poolAt: [256, 170], poolR: 270, poolAlpha: 0.35 });
    a.glow(256, 160, 170, "#e6fff4", 0.45);
    a.mass(ellipse(256, 160, 98), { base: "#e6f4ea", shade: "#a8c8b8", light: "#ffffff", ow: 0, sv: [12, 12], hv: [8, 8] });
    a.fill(ellipse(222, 136, 18, 14) + ellipse(290, 196, 24, 16) + ellipse(276, 120, 10), "#a8c8b8", 0.5);
    // Pine ridge and mist.
    let pines = "M0 512V300";
    for (let x = 0; x <= 512; x += 32) pines += `L${x + 8} ${300 - ((x * 7) % 40)}L${x + 16} ${330 - ((x * 3) % 20)}`;
    a.fill(pines + "L512 512Z", "#0a1a1e");
    a.fill(blob(140, 300, 170, 30, { seed: 3, n: 9 }), "#a8e6c8", 0.18).fill(blob(380, 320, 170, 28, { seed: 5, n: 9 }), "#a8e6c8", 0.16);
    // Two spectral wolves, mirrored, leaping down and outward with mist trails.
    const wolf = (cx, cy, dir, rot) => {
      a.fill(blob(cx + dir * 70, cy - 40, 80, 26, { seed: cx, n: 8, jitter: 0.3, rot: dir * 30 }), "#a8e6c8", 0.25);
      a.begin(`translate(${cx} ${cy}) rotate(${rot}) scale(${dir * 0.85} 0.85)`);
      a.mass(limb([[60, -6], [96, -22], [124, -14]], [18, 16, 4], { capEnd: false }), { ...R.spirit, sv: [4, 4], hv: [3, 3] });
      a.mass(limb([[44, 4], [82, 24], [118, 34]], [26, 16, 10]), { ...R.spirit, sv: [5, 5], hv: [3, 3] });
      a.mass(smooth([[-58, -16], [-20, -30], [30, -24], [66, -12], [62, 12], [20, 18], [-30, 16], [-60, 6]], true, 0.9), { ...R.spirit, sv: [8, 8] });
      a.mass(limb([[-40, 6], [-78, 18], [-110, 12]], [22, 15, 11]), { ...R.spirit, sv: [4, 4], hv: [3, 3] });
      a.mass(limb([[-30, 10], [-62, 32], [-94, 34]], [20, 14, 10]), { ...R.spirit, sv: [4, 4], hv: [3, 3] });
      a.mass("M-74 -46L-64 -76L-50 -44Z", { ...R.spirit, ow: 4, sv: [3, 3], hv: [2, 2] });
      a.mass(smooth([[-52, -46], [-84, -52], [-104, -42], [-132, -32], [-128, -18], [-98, -14], [-60, -12]], true, 0.9), { ...R.spirit, sv: [6, 6] });
      a.line("M-128 -24L-100 -24", 3);
      a.fill(ellipse(-130, -30, 4, 3), INK);
      a.glow(-88, -38, 14, "#d8f5a2", 0.9).fill(ellipse(-88, -38, 5, 3), "#ffffff");
      a.end();
    };
    wolf(178, 236, 1, -14);
    wolf(338, 262, -1, 14);
    // Carved horn with gold bands, sounding green rings up toward the moon.
    a.mass(limb([[150, 404], [228, 394], [298, 376], [338, 338]], [16, 28, 42, 60]), { ...R.ivory, sv: [6, 6] });
    a.mass(limb([[200, 386], [204, 410]], 10) + limb([[270, 372], [278, 400]], 12), { ...M.gold, ow: 4, sv: [2, 2], hv: [2, 2] });
    a.line("M226 396L240 390L252 396L266 388", 3, "#3d9a4a");
    a.mass(ellipse(344, 334, 28, 24), { base: "#1d3a2a", shade: "#0a1a12", ow: 5, sv: [3, 3] });
    for (const [r, o] of [[50, 0.9], [80, 0.65], [112, 0.4]]) a.line(`M${f(344 - r * 0.2)} ${f(334 - r * 0.9)}A${r} ${r} 0 0 1 ${f(344 + r * 0.9)} ${f(334 - r * 0.1)}`, 6, "#7bd389", o);
    a.motes({ seed: 51, count: 14, box: [80, 80, 440, 380], size: [3, 7], color: ["#d8f5a2", "#e6fff4"], alpha: [0.4, 0.9] });
    return a;
  },

  /** +1/+1 to allies — a primal beast spirit of leaves roars; a shockwave of rings and leaves lifts three ally runes. */
  "wild-roar"() {
    const a = new Art("wild-roar");
    a.backdrop("#0c1a10", "#1e3a1e", "#0a140c", { pool: "#a8e07a", poolAt: [256, 220], poolR: 280, poolAlpha: 0.42 });
    let rays = "";
    for (let i = 0; i < 18; i++) {
      const [x1, y1] = polar(256, 220, 150, i * 20 + 5), [x2, y2] = polar(256, 220, 360, i * 20 - 2), [x3, y3] = polar(256, 220, 360, i * 20 + 12);
      rays += poly([[x1, y1], [x2, y2], [x3, y3]]);
    }
    a.fill(rays, "#d8f5a2", 0.06);
    for (const [r, o, w] of [[214, 0.25, 6], [184, 0.45, 7], [156, 0.7, 8]]) a.line(ellipse(256, 222, r, r * 0.92), w, "#7bd389", o);
    // Flying leaves on the shockwave.
    const flying = [];
    for (let i = 0; i < 12; i++) {
      const deg = i * 30 + 12, [x, y] = polar(256, 222, 168 + (i % 3) * 22, deg);
      flying.push(leaf(x, y, 24, 9, deg + 30));
    }
    ink(a, flying.join(""), "#7bd389", 4);
    // Mane: two rings of leaves.
    const ring = (n, r, len, wid, off) => Array.from({ length: n }, (_, i) => { const deg = (i * 360) / n + off, [x, y] = polar(256, 214, r, deg); return leaf(x, y, len, wid, deg); }).join("");
    ink(a, ring(18, 62, 86, 30, 0), "#2f5a24", 7);
    ink(a, ring(18, 58, 66, 24, 10), "#5f9a4a", 6);
    ink(a, ring(18, 56, 40, 12, 10), "#a8e07a", 0, 0.7);
    // Leaf ears.
    ink(a, leaf(214, 162, 60, 22, -125) + leaf(298, 162, 60, 22, -55), "#5f9a4a", 6);
    // Face, muzzle, brow, glowing eyes, roaring mouth with fangs.
    a.mass(smooth([[206, 172], [256, 152], [306, 172], [322, 220], [304, 272], [256, 300], [208, 272], [190, 220]], true, 0.95), { ...R.wood, sv: [12, 10] });
    a.mass(ellipse(256, 248, 44, 32), { base: "#a8e07a", shade: "#5f9a4a", light: "#d8f5a2", ow: 5, sv: [6, 6], hv: [4, 4] });
    a.line("M212 196L244 208M300 196L268 208M256 160V196", 6, INK, 0.8);
    a.glow(232, 212, 26, "#fff1a8", 0.9).glow(280, 212, 26, "#fff1a8", 0.9);
    a.fill(poly([[218, 204], [246, 212], [238, 222], [222, 218]]) + poly([[294, 204], [266, 212], [274, 222], [290, 218]]), "#fff1a8");
    a.fill(poly([[240, 228], [272, 228], [256, 244]]), INK);
    a.mass(smooth([[222, 256], [256, 250], [290, 256], [284, 292], [256, 308], [228, 292]], true, 0.9), { base: "#1a2a10", shade: "#0a140a", ow: 5, sv: [3, 3] });
    a.glow(256, 284, 30, "#7bd389", 0.7);
    ink(a, poly([[232, 258], [244, 258], [240, 282]]) + poly([[268, 258], [280, 258], [272, 282]]) + poly([[240, 302], [248, 300], [246, 288]]) + poly([[264, 300], [272, 302], [266, 288]]), "#fffaf0", 4);
    a.line("M150 150C130 190 132 240 156 270M362 150C382 190 380 240 356 270", 5, "#e6fff4", 0.4);
    // Three ally runes lifted by the roar (double up-chevrons on glowing pads).
    for (const [x, y] of [[150, 378], [256, 392], [362, 378]]) {
      a.glow(x, y, 46, "#d8f5a2", 0.7);
      a.fill(ellipse(x, y + 20, 34, 9), "#a8e07a", 0.5);
      const chev = (yy) => poly([[x - 22, yy + 6], [x, yy - 16], [x + 22, yy + 6], [x + 22, yy + 18], [x, yy - 4], [x - 22, yy + 18]]);
      ink(a, chev(y - 18) + chev(y + 2), "#e6ffb0", 5);
    }
    a.motes({ seed: 61, count: 12, box: [100, 100, 420, 400], size: [3, 7], color: ["#d8f5a2", "#ffe066"], alpha: [0.4, 0.9] });
    return a;
  },
};

export default RECIPES;
