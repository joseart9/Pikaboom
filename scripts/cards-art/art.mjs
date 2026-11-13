// Offline recipe compiler for Duelo Arcano card illustrations (UI-03; grammar in docs/cards/UI_VISUAL_SYSTEM.md §6).
// Each recipe composes the shared primitives of lib.mjs (cel-shaded `mass`, tapered `limb`, `blob`, glows, motes) into
// ONE self-contained static file per art key at public/cards/art/<key>.svg (committed; never imported by the app).
// Usage: node scripts/cards-art/art.mjs [key …]   (no keys = every recipe), then `npm test` (skin/assets.test.ts).
import { mkdirSync, writeFileSync } from "node:fs";
import { Art, INK, blob, ellipse, f, limb, poly, polar, shard, smooth, star, zigzag } from "./lib.mjs";

const OUT = "public/cards/art";

// ── Palette (docs/cards/UI_VISUAL_SYSTEM.md §2.1) and per-material cel ramps: [base, shade, light] ─────────────────
const GOLD = "#f2c14e", GOLD_DEEP = "#a8742a", GOLD_SHINE = "#fff1c1";
const LEGENDARY = "#ff9f1c", UNIQUE = "#ff006e";
const M = {
  skin: { base: "#f2c29b", shade: "#c98f6a", light: "#ffe0c4" },
  hair: { base: "#6b3f1f", shade: "#3f2412", light: "#9a6235" },
  steel: { base: "#9fb3c8", shade: "#5e6f8a", light: "#e2ecf5" },
  leather: { base: "#8a5a2b", shade: "#5c3a1c", light: "#b07a40" },
  cloth: { base: "#6b4a2f", shade: "#46301e", light: "#8e6a45" },
  tabard: { base: "#3d6fc4", shade: "#24418a", light: "#6a95e0" },
  gold: { base: GOLD, shade: GOLD_DEEP, light: GOLD_SHINE },
  rock: { base: "#8a86a8", shade: "#575275", light: "#bdb9d6" },
  moss: { base: "#5f9a4a", shade: "#3d6b30", light: "#7bd389" },
  fur: { base: "#8d9cb8", shade: "#5a6788", light: "#c3cee2" },
  cream: { base: "#eadfc8", shade: "#b9a98a", light: "#fff8ea" },
  bone: { base: "#e9e2cf", shade: "#a89f8a", light: "#fffaf0" },
};

// ── Recipes ──────────────────────────────────────────────────────────────────────────────────────────────────────
const RECIPES = {
  /** Humanoid template — a young squire, 3/4 facing left: big round shield forward, short sword raised. */
  squire() {
    const a = new Art("squire");
    a.backdrop("#22144a", "#3b2a6b", "#2a1a52", { pool: "#c9b2ff", poolAt: [236, 210], poolR: 250, poolAlpha: 0.32 });
    // Courtyard wall with crenellations + a hanging banner (quiet, low contrast).
    const cren = [];
    for (let x = 0; x <= 512; x += 64) cren.push([x, 262], [x, 236], [x + 34, 236], [x + 34, 262]);
    a.fill(`M0 340L0 262${cren.map(([x, y]) => `L${x} ${y}`).join("")}L512 262L512 340Z`, "#2f1f62");
    a.line("M0 296H512M40 262V296M120 296V340M200 262V296M330 262V296M420 296V340M480 262V296", 3, "#22144a", 0.8);
    a.fill(poly([[52, 96], [112, 96], [112, 250], [82, 230], [52, 250]]), "#4b2f8f");
    a.fill(poly([[66, 120], [98, 120], [82, 160]]), GOLD_DEEP, 0.7);
    a.ground(340, "#22144a", "#3d2a7c", { spot: "#c9b2ff", spotAt: [256, 404], spotR: 170 });
    a.line("M40 380L120 368M150 420L230 404M330 412L420 396M380 470L470 452", 3, "#22144a", 0.6);
    a.shadow(262, 404, 118, 18);

    // Legs + boots (toes pointing left).
    a.mass(limb([[244, 316], [238, 356], [234, 388]], [34, 28, 26]), { ...M.cloth, sv: [8, 6] });
    a.mass(limb([[284, 316], [292, 356], [298, 388]], [34, 28, 26]), { ...M.cloth, sv: [8, 6] });
    a.mass("M206 408C204 392 214 382 228 380L250 378L252 408Z", { ...M.leather, sv: [6, 6], hv: [4, 4] });
    a.mass("M276 408L278 380L300 381C314 384 322 396 320 408Z", { ...M.leather, sv: [6, 6], hv: [4, 4] });

    // Sword arm (viewer's right): mail sleeve, blade raised, hand on the grip.
    a.mass(limb([[300, 238], [334, 268], [348, 232]], [34, 30, 28]), { ...M.steel, sv: [8, 8] });
    a.mass(limb([[352, 200], [368, 160], [386, 116]], [18, 15, 4], { capEnd: false }), { ...M.steel, sv: [5, 4], hv: [3, 3] });
    a.line("M354 196L380 128", 2.5, "#ffffff", 0.7);
    a.mass(limb([[326, 214], [374, 196]], 11), { ...M.gold, sv: [4, 4], hv: [3, 3] });
    a.mass(ellipse(344, 244, 8), { ...M.gold, sv: [3, 3], hv: [2, 2], ow: 5 });
    a.mass(ellipse(348, 222, 15, 14), { ...M.skin, sv: [6, 6], hv: [4, 4] });

    // Torso: mail shirt, blue tabard, belt.
    a.mass(smooth([[214, 232], [258, 216], [304, 232], [318, 300], [258, 310], [206, 300]], true, 0.6), { ...M.steel });
    a.mass("M228 228L292 228L304 336L272 346L262 334L252 346L220 336Z", { ...M.tabard, sv: [12, 8] });
    a.fill("M244 252L262 276L280 252L280 266L262 290L244 266Z", GOLD, 0.9);
    a.mass("M214 296L312 296L313 312L213 312Z", { ...M.leather, sv: [4, 4], hv: [3, 3], ow: 5 });
    a.mass(poly([[252, 294], [270, 294], [270, 314], [252, 314]]), { ...M.gold, sv: [3, 3], hv: [2, 2], ow: 4 });

    // Head: neck, face, bowl-cut hair, ear, face details (looking left).
    a.mass(poly([[248, 204], [274, 204], [276, 226], [246, 226]]), { ...M.skin, sv: [6, 0] });
    a.mass(smooth([[222, 176], [232, 140], [266, 132], [298, 152], [300, 190], [284, 216], [254, 222], [228, 206]], true, 0.9), { ...M.skin, sv: [12, 8] });
    a.mass(ellipse(298, 184, 9, 12), { ...M.skin, sv: [4, 4], hv: [3, 3], ow: 5 });
    a.mass("M216 178C210 138 238 120 266 120C296 120 312 142 306 178C300 164 290 156 280 156C270 168 248 172 228 166C224 170 220 174 216 178Z", { ...M.hair, sv: [8, 8] });
    a.fill(ellipse(238, 184, 5, 7), INK).fill(ellipse(266, 184, 5, 7), INK);
    a.fill(ellipse(236.5, 181.5, 1.8), "#ffffff").fill(ellipse(264.5, 181.5, 1.8), "#ffffff");
    a.line("M228 170L246 174M258 174L276 170", 4);
    a.line("M240 204C248 208 256 208 262 204", 3.5);
    a.fill(ellipse(232, 198, 7, 4), "#ff4d6d", 0.25).fill(ellipse(278, 198, 7, 4), "#ff4d6d", 0.25);

    // Round shield in front (viewer's left): steel rim, plank wood, painted chevron, boss + rivets.
    a.mass(ellipse(186, 282, 78), { ...M.steel, sv: [10, 10] });
    a.mass(ellipse(186, 282, 64), { ...M.leather, sv: [12, 12], hv: [8, 8], ow: 4 });
    a.line("M150 224V340M186 218V346M222 224V340", 3, INK, 0.45);
    a.fill("M130 292L186 252L242 292L242 316L186 276L130 316Z", "#3d6fc4", 0.95);
    a.mass(ellipse(186, 282, 17), { ...M.steel, sv: [5, 5], hv: [4, 4], ow: 5 });
    for (let i = 0; i < 8; i++) {
      const [x, y] = polar(186, 282, 71, i * 45 + 22.5);
      a.fill(ellipse(x, y, 3.5), "#e2ecf5");
    }
    a.add(`<path d="M126 248A72 72 0 0 1 176 206" fill="none" stroke="#ffffff" stroke-opacity="0.5" stroke-width="5" stroke-linecap="round"/>`);
    return a;
  },

  /** Construct template — hulking boulder golem, frontal, fists on the ground, glowing rune. */
  "stone-golem"() {
    const a = new Art("stone-golem");
    a.backdrop("#1b1036", "#2f1f62", "#22144a", { pool: "#9aa6d8", poolAt: [256, 230], poolR: 260, poolAlpha: 0.32 });
    a.fill(shard(40, 300, 90, 150, { seed: 3, n: 6 }), "#22154a").fill(shard(470, 290, 90, 170, { seed: 8, n: 6 }), "#22154a");
    a.fill(shard(110, 330, 60, 70, { seed: 5, n: 6 }), "#2f1f62").fill(shard(420, 340, 60, 60, { seed: 9, n: 6 }), "#2f1f62");
    a.ground(352, "#1b1036", "#3d2a7c", { spot: "#9aa6d8", spotAt: [256, 404], spotR: 190 });
    a.fill(shard(80, 430, 26, 14, { seed: 2 }), "#3d2a7c").fill(shard(440, 446, 30, 14, { seed: 4 }), "#3d2a7c");
    a.shadow(256, 404, 170, 22, 0.55);

    // Stubby legs.
    a.mass(shard(208, 372, 40, 36, { seed: 11, n: 6, jitter: 0.12 }), { ...M.rock });
    a.mass(shard(304, 372, 40, 36, { seed: 12, n: 6, jitter: 0.12 }), { ...M.rock });
    // Arms hanging to the ground.
    a.mass(limb([[164, 228], [136, 290], [140, 340]], [70, 60, 54]), { ...M.rock, sv: [12, 10] });
    a.mass(limb([[348, 228], [376, 290], [372, 340]], [70, 60, 54]), { ...M.rock, sv: [12, 10] });
    // Boulder torso.
    const torso = smooth([[156, 246], [176, 192], [232, 170], [292, 172], [344, 194], [362, 248], [344, 318], [292, 346], [222, 346], [170, 318]], true, 0.85);
    a.mass(torso, { ...M.rock, sv: [18, 16], hv: [10, 10], ow: 7 });
    a.line("M196 220L214 248L204 280M318 214L304 238L322 262M226 318L250 300L280 322", 4, INK, 0.75);
    // Chest rune (cyan, glowing).
    a.glow(256, 258, 70, "#3fa9ff", 0.55);
    a.line(`${ellipse(256, 258, 30)}M256 216V300M232 240L256 258L280 240`, 7, INK);
    a.line(`${ellipse(256, 258, 30)}M256 216V300M232 240L256 258L280 240`, 4, "#9be7ff");
    // Head sunk between the shoulders, glowing visor slit.
    a.mass(poly([[222, 160], [246, 136], [284, 138], [298, 164], [290, 194], [228, 196]]), { ...M.rock, sv: [10, 8] });
    a.glow(258, 168, 46, "#3fa9ff", 0.6);
    a.fill(poly([[234, 164], [282, 160], [280, 172], [236, 175]]), INK);
    a.fill(poly([[238, 166], [278, 163], [277, 169], [240, 172]]), "#e6f6ff");
    // Shoulder boulders with moss.
    a.mass(blob(162, 214, 50, 42, { seed: 21, n: 8 }), { ...M.rock, sv: [12, 12] });
    a.mass(blob(350, 214, 50, 42, { seed: 22, n: 8 }), { ...M.rock, sv: [12, 12] });
    a.mass(blob(150, 186, 30, 12, { seed: 23, n: 7, jitter: 0.25 }), { ...M.moss, sv: [4, 5], hv: [3, 3], ow: 4 });
    a.mass(blob(362, 188, 26, 11, { seed: 24, n: 7, jitter: 0.25 }), { ...M.moss, sv: [4, 5], hv: [3, 3], ow: 4 });
    // Huge fists planted on the ground.
    a.mass(shard(140, 366, 50, 40, { seed: 31, n: 7, jitter: 0.12 }), { ...M.rock, sv: [12, 12], hv: [8, 8] });
    a.mass(shard(372, 366, 50, 40, { seed: 32, n: 7, jitter: 0.12, rot: 20 }), { ...M.rock, sv: [12, 12], hv: [8, 8] });
    a.line("M114 360L140 352L166 360M346 360L372 352L398 360", 4, INK, 0.7);
    a.motes({ seed: 7, count: 10, box: [90, 380, 420, 420], size: [3, 7], color: "#bdb9d6", alpha: [0.3, 0.7] });
    return a;
  },

  /** Quadruped template — a playful wolf pup in a play-bow (Embestida: about to pounce), facing left. */
  "wolf-pup"() {
    const a = new Art("wolf-pup");
    a.backdrop("#142a20", "#24503a", "#16281e", { pool: "#d8f5a2", poolAt: [210, 190], poolR: 250, poolAlpha: 0.3 });
    // Forest: dark trunks, canopy, light shafts.
    a.fill(limb([[36, 520], [44, 300], [30, 60], [40, -20]], [70, 60, 56, 56]), "#10201a");
    a.fill(limb([[476, 520], [468, 260], [482, -20]], [80, 64, 60]), "#10201a");
    a.fill(limb([[420, 520], [414, 300], [424, 140]], [34, 30, 26]), "#163024", 0.9);
    a.fill(blob(120, 30, 170, 80, { seed: 4, n: 10, jitter: 0.25 }), "#1c4430").fill(blob(420, 20, 170, 80, { seed: 6, n: 10, jitter: 0.25 }), "#1c4430");
    a.fill(poly([[120, 0], [200, 0], [330, 400], [240, 400]]), "#fff3b0", 0.07).fill(poly([[230, 0], [270, 0], [380, 360], [330, 360]]), "#fff3b0", 0.05);
    a.ground(338, "#203e22", "#3a6a32", { spot: "#d8f5a2", spotAt: [250, 398], spotR: 190 });
    for (const [x, y, s] of [[60, 380, 1], [110, 440, 1.2], [400, 420, 1.1], [462, 372, 0.9], [300, 470, 1]]) {
      a.fill(`M${x - 14 * s} ${y}L${x - 8 * s} ${y - 24 * s}L${x - 2 * s} ${y - 4 * s}L${x + 4 * s} ${y - 30 * s}L${x + 8 * s} ${y - 2 * s}L${x + 16 * s} ${y - 20 * s}L${x + 16 * s} ${y}Z`, "#4f8a3c", 0.8);
    }
    a.motes({ seed: 13, count: 9, box: [70, 60, 450, 230], size: [5, 9], color: ["#7bd389", "#a8742a", "#5f9a4a"], alpha: [0.5, 0.9] });
    a.shadow(250, 396, 140, 16);

    const fur = { ...M.fur, rim: "#7bd389", rv: 4 };
    // Wagging tail, far hind leg, body, near hind leg.
    a.mass(limb([[346, 286], [380, 250], [396, 210], [384, 184]], [26, 24, 20, 8]), { ...fur, sv: [7, 7] });
    a.line("M378 196L392 214", 4, INK, 0.4);
    a.mass(limb([[318, 312], [326, 352], [318, 386]], [30, 24, 20]), { ...M.fur, base: "#74829f", sv: [6, 6] });
    a.mass(smooth([[206, 296], [244, 272], [302, 258], [350, 264], [372, 296], [356, 334], [316, 346], [252, 340], [212, 330]], true, 0.9), { ...fur, sv: [12, 12] });
    a.mass(smooth([[214, 318], [250, 322], [300, 334], [262, 344], [222, 336]], true, 0.9), { ...M.cream, sv: [4, 4], hv: [3, 3], ow: 0 });
    a.mass(limb([[344, 312], [356, 352], [348, 386]], [42, 30, 24]), { ...fur, sv: [8, 6] });
    a.mass(ellipse(344, 390, 22, 12), { ...M.cream, sv: [5, 5], hv: [3, 3] });
    // Front legs stretched forward, low (the bow).
    a.mass(limb([[222, 322], [192, 360], [160, 380]], [32, 26, 24]), { ...M.fur, base: "#74829f", sv: [6, 6] });
    a.mass(ellipse(150, 384, 22, 12), { ...M.cream, sv: [5, 5], hv: [3, 3] });
    a.mass(limb([[238, 326], [214, 366], [188, 388]], [34, 28, 26]), { ...fur, sv: [7, 7] });
    a.mass(ellipse(176, 392, 24, 13), { ...M.cream, sv: [5, 5], hv: [3, 3] });
    a.line("M168 388V398M178 389V400", 3, INK, 0.6);
    // Big head: ears, skull, cream muzzle, nose, eyes, tongue.
    a.mass("M166 212L144 132L206 196Z", { ...fur, sv: [8, 6] });
    a.fill("M166 200L154 152L192 194Z", "#ff9aad", 0.85);
    a.mass("M214 200L254 136L250 218Z", { ...fur, sv: [8, 6] });
    a.fill("M222 200L248 158L246 210Z", "#ff9aad", 0.85);
    a.mass(smooth([[146, 238], [166, 206], [210, 194], [246, 212], [258, 250], [246, 290], [210, 308], [168, 306], [132, 294], [118, 274], [128, 252]], true, 0.95), { ...fur, sv: [14, 12] });
    a.mass("M122 272C126 254 150 250 172 258C186 268 186 296 172 306C150 314 124 302 122 290Z", { ...M.cream, sv: [6, 6], hv: [4, 4], ow: 4 });
    a.mass("M150 300C150 316 158 326 166 326C174 326 176 314 172 302Z", { base: "#ff7a93", shade: "#c94d68", light: "#ffb3c1", sv: [3, 3], hv: [2, 2], ow: 4 });
    a.fill(ellipse(124, 268, 12, 9), INK).fill(ellipse(120, 264, 4, 2.5), "#ffffff", 0.8);
    a.line("M126 278C132 292 146 296 158 290", 3.5);
    a.fill(ellipse(170, 244, 13, 15), INK).fill(ellipse(214, 240, 12, 14), INK);
    a.fill(ellipse(166, 238, 5), "#ffffff").fill(ellipse(210, 234, 4.5), "#ffffff").fill(ellipse(174, 250, 2.2), "#ffffff").fill(ellipse(218, 246, 2), "#ffffff");
    a.line("M184 210C190 222 196 222 200 210", 4, INK, 0.45);
    return a;
  },

  /** Undead template — a skeleton clawing out of its grave, rusty notched sword raised. */
  "restless-skeleton"() {
    const a = new Art("restless-skeleton");
    a.backdrop("#0e0620", "#2a1458", "#160b2e", { pool: "#8e5bd8", poolAt: [256, 230], poolR: 250, poolAlpha: 0.45 });
    a.glow(170, 96, 70, "#e6dcff", 0.35).fill(ellipse(170, 96, 30), "#d9ccff", 0.5);
    // Dead tree + tombstone (cross carved), fog.
    a.fill(limb([[70, 520], [76, 300], [60, 200], [30, 150]], [36, 26, 16, 6]), "#140a2c");
    a.fill(limb([[74, 250], [120, 210], [150, 214]], [12, 8, 4]), "#140a2c").fill(limb([[64, 210], [30, 190], [10, 196]], [10, 6, 3]), "#140a2c");
    a.mass("M330 340L330 196C330 160 410 160 410 196L410 340Z", { base: "#4a3d6e", shade: "#2f2650", light: "#6a5a94", sv: [10, 8], ow: 5 });
    a.fill("M362 206H378V232H396V246H378V290H362V246H344V232H362Z", "#2f2650");
    a.line("M392 180L384 204L396 226", 3, INK, 0.6);
    a.ground(340, "#1b1036", "#2f1f62", { spot: "#c77dff", spotAt: [256, 400], spotR: 180 });
    a.fill(blob(140, 350, 120, 18, { seed: 3, n: 8 }), "#8e5bd8", 0.18).fill(blob(390, 360, 130, 16, { seed: 5, n: 8 }), "#8e5bd8", 0.16);
    // Grave mound (front) — drawn after the skeleton's buried half.
    const bone = { ...M.bone, rim: "#c77dff", rv: 4, ow: 5 };
    // Spine + ribcage.
    a.mass(limb([[254, 360], [258, 300], [262, 246]], 16), { ...bone, sv: [5, 4] });
    a.mass(smooth([[224, 262], [262, 244], [302, 262], [306, 302], [290, 328], [262, 334], [234, 328], [218, 302]], true, 0.9), { ...bone, sv: [10, 8] });
    a.line("M232 280C248 272 276 272 292 280M230 298C248 290 276 290 296 298M236 316C250 308 274 308 290 316", 6);
    a.line("M262 252V330", 6);
    // Sword arm (viewer's right): rusty notched blade raised high.
    a.mass(limb([[296, 262], [330, 244], [340, 202]], [15, 13, 12]), { ...bone, sv: [4, 4], hv: [3, 3] });
    a.mass(poly([[336, 194], [392, 104], [416, 88], [410, 114], [398, 126], [404, 134], [386, 158], [390, 166], [364, 208]]), { base: "#8a8fa8", shade: "#4a4e68", light: "#c8cce0", sv: [7, 6], hv: [4, 4] });
    a.fill(blob(392, 124, 9, 6, { seed: 3 }), "#b0603a", 0.9).fill(blob(366, 178, 8, 6, { seed: 5 }), "#b0603a", 0.9).fill(blob(378, 150, 5, 4, { seed: 6 }), "#8a4a30", 0.9);
    a.line("M350 196L404 104", 3, "#e2ecf5", 0.6);
    a.mass(limb([[326, 196], [366, 216]], 11), { base: "#5a5274", shade: "#363050", light: "#8a82a8", sv: [3, 3], hv: [2, 2], ow: 5 });
    a.mass(ellipse(344, 204, 12, 11), { ...bone, sv: [4, 4], hv: [3, 3] });
    // Skull: tilted, glowing violet sockets, broken jaw.
    a.mass(smooth([[222, 194], [232, 156], [266, 142], [300, 156], [306, 192], [292, 214], [236, 216]], true, 0.95), { ...bone, sv: [12, 10] });
    a.mass("M240 210L292 210L290 236L246 238Z", { ...bone, sv: [5, 5], hv: [3, 3] });
    a.line("M252 214V232M264 214V234M276 214V233", 4);
    a.glow(250, 190, 26, "#c77dff", 0.8).glow(284, 188, 24, "#c77dff", 0.8);
    a.fill(smooth([[236, 182], [254, 174], [266, 186], [256, 200], [240, 198]], true, 0.9), INK).fill(smooth([[272, 184], [288, 174], [300, 184], [294, 198], [278, 198]], true, 0.9), INK);
    a.fill(ellipse(251, 188, 5), "#e9c8ff").fill(ellipse(286, 187, 4.5), "#e9c8ff");
    a.fill("M266 200L272 210L260 210Z", INK);
    a.line("M282 150L276 164L284 172", 3.5, INK, 0.7);
    // Mound over the buried hips, dirt clods.
    a.mass(smooth([[110, 392], [150, 352], [220, 340], [300, 344], [372, 356], [408, 394], [256, 410]], true, 0.8), { base: "#4a3466", shade: "#2c1d44", light: "#6a4f8f", sv: [12, 12], ow: 5 });
    a.mass(shard(124, 340, 12, 9, { seed: 4 }), { base: "#4a3466", shade: "#2c1d44", ow: 4, sv: [3, 3] });
    a.mass(shard(398, 330, 10, 8, { seed: 7 }), { base: "#4a3466", shade: "#2c1d44", ow: 4, sv: [3, 3] });
    a.mass(shard(340, 300, 7, 6, { seed: 9 }), { base: "#4a3466", shade: "#2c1d44", ow: 3, sv: [2, 2] });
    a.fill(blob(256, 400, 190, 20, { seed: 8, n: 9 }), "#8e5bd8", 0.22);
    // Clawing arm (viewer's left), fingers dug into the mound.
    a.mass(limb([[230, 262], [192, 300], [166, 344]], [15, 13, 12]), { ...bone, sv: [4, 4], hv: [3, 3] });
    a.fill(ellipse(192, 300, 9), M.bone.base).line(ellipse(192, 300, 9), 4);
    a.mass(ellipse(164, 348, 13, 10), { ...bone, sv: [4, 4], hv: [3, 3] });
    for (const [dx, dy] of [[-34, 8], [-26, 20], [-10, 26], [8, 22]]) a.mass(limb([[164, 350], [164 + dx * 0.6, 350 + dy * 0.5], [164 + dx, 350 + dy]], [9, 7, 5], { capEnd: false }), { ...bone, sv: [3, 3], hv: [2, 2], ow: 4 });
    a.motes({ seed: 11, count: 10, box: [100, 120, 420, 360], size: [3, 7], color: "#c77dff", alpha: [0.4, 0.9], shape: "circle" });
    return a;
  },

  /** Spell burst template — a crystal-tipped wand looses a crackling violet spark that zaps its target. */
  "arcane-spark"() {
    const a = new Art("arcane-spark");
    a.backdrop("#140a2e", "#3c1a78", "#1b1036", { pool: "#c77dff", poolAt: [300, 220], poolR: 270, poolAlpha: 0.4 });
    // Faint rune circle behind the action.
    a.line(`${ellipse(296, 216, 150)}${ellipse(296, 216, 124)}`, 3, "#c77dff", 0.22);
    for (let i = 0; i < 24; i++) {
      const [x1, y1] = polar(296, 216, 126, i * 15), [x2, y2] = polar(296, 216, i % 3 ? 138 : 148, i * 15);
      a.line(`M${f(x1)} ${f(y1)}L${f(x2)} ${f(y2)}`, 3, "#c77dff", 0.25);
    }
    a.fill(star(296, 216, 6, 112, 60, -90), "#c77dff", 0.07);
    // Target: a cracked arcane ward plate being struck (upper right).
    a.mass(shard(376, 158, 46, 44, { seed: 5, n: 6, jitter: 0.08, rot: 10 }), { base: "#4b2f8f", shade: "#2f1f62", light: "#6a48b8", sv: [8, 8], ow: 5 });
    a.line("M352 140L374 160L364 186M374 160L400 152", 4, INK, 0.8);
    // Wand from the lower left: wood shaft, gold bands, crystal tip.
    a.mass(limb([[100, 452], [168, 370], [226, 304]], [26, 20, 16]), { base: "#6b4a2f", shade: "#46301e", light: "#9a6a45", sv: [6, 6], hv: [4, 4] });
    a.mass(limb([[150, 398], [164, 382]], 26), { ...M.gold, sv: [4, 4], hv: [3, 3], ow: 5 });
    a.mass(limb([[210, 326], [222, 312]], 22), { ...M.gold, sv: [4, 4], hv: [3, 3], ow: 5 });
    a.glow(244, 282, 120, "#c77dff", 0.75);
    a.mass(poly([[226, 300], [234, 270], [262, 258], [254, 292]]), { base: "#c77dff", shade: "#7b2fd0", light: "#f0d8ff", sv: [5, 5], hv: [3, 3] });
    // The spark: burst at the tip, crackling arcs to the target, impact star.
    a.mass(star(252, 270, 4, 64, 13, -45), { base: "#f0d8ff", shade: "#c77dff", ow: 4, sv: [4, 4] });
    a.fill(star(252, 270, 4, 40, 8, 0), "#ffffff", 0.9);
    for (const [seed, w, amp] of [[3, 12, 20], [9, 7, 26]]) {
      const arc = zigzag([262, 258], [364, 168], { segments: 5, amp, seed });
      a.line(arc, w + 8).line(arc, w, "#c77dff").line(arc, w * 0.35, "#ffffff");
    }
    a.glow(366, 166, 70, "#f0d8ff", 0.8);
    a.mass(star(366, 166, 8, 40, 14, -10), { base: "#ffffff", shade: "#e0b8ff", ow: 4, sv: [3, 3] });
    a.mass(shard(410, 120, 10, 7, { seed: 2 }), { base: "#6a48b8", shade: "#2f1f62", ow: 3, sv: [2, 2] });
    a.mass(shard(420, 196, 8, 6, { seed: 3 }), { base: "#6a48b8", shade: "#2f1f62", ow: 3, sv: [2, 2] });
    a.motes({ seed: 21, count: 16, box: [120, 110, 440, 380], size: [3, 8], color: ["#f0d8ff", "#c77dff"], alpha: [0.5, 1] });
    return a;
  },

  /** Spell beam template — a lance of fire streaks down and impales the ground in a burst (5 damage). */
  "flame-lance"() {
    const a = new Art("flame-lance");
    a.backdrop("#2a0820", "#6a1424", "#200818", { pool: "#ff7b00", poolAt: [340, 340], poolR: 260, poolAlpha: 0.5 });
    a.fill("M0 330L60 250L100 290L150 220L200 300L230 280L262 330Z", "#3a0c22").fill("M300 330L360 240L400 280L440 210L512 300L512 330Z", "#3a0c22");
    a.ground(330, "#1a0612", "#4a1424", { spot: "#ff7b00", spotAt: [356, 372], spotR: 200 });
    // Impact crater + flying rock shards.
    a.fill(ellipse(356, 374, 110, 26), INK, 0.55);
    a.glow(356, 360, 150, "#ffbe0b", 0.65);
    a.mass(star(356, 356, 11, 96, 42, -80), { base: "#ff7b00", shade: "#c2410c", light: "#ffbe0b", ow: 5, sv: [8, 8], hv: [6, 6] });
    a.mass(star(356, 356, 9, 56, 26, -60), { base: "#ffe066", shade: "#ffbe0b", light: "#fff8d6", ow: 0, sv: [5, 5], hv: [4, 4] });
    for (const [x, y, s, seed] of [[268, 330, 14, 1], [442, 320, 16, 2], [300, 270, 9, 3], [420, 268, 11, 4], [470, 380, 10, 5], [236, 392, 12, 6]]) {
      a.mass(shard(x, y, s, s * 0.8, { seed, n: 5 }), { base: "#5a2030", shade: "#2e0c18", light: "#8a3a40", ow: 4, sv: [3, 3], hv: [2, 2] });
    }
    // Trailing flame tongues licking back up the shaft.
    const fire = { base: "#ff7b00", shade: "#c2410c", light: "#ffbe0b", ow: 5, sv: [6, 6], hv: [4, 4] };
    for (const [pts, w] of [
      [[[200, 200], [170, 150], [168, 112]], [30, 18, 2]],
      [[[250, 250], [236, 200], [250, 170]], [28, 16, 2]],
      [[[160, 170], [120, 150], [96, 158]], [24, 14, 2]],
      [[[226, 248], [190, 252], [160, 236]], [24, 14, 2]],
      [[[280, 290], [264, 250], [276, 226]], [22, 12, 2]],
    ]) a.mass(limb(pts, w, { capEnd: false }), fire);
    // The lance: flame envelope, white-gold core, spearhead buried in the burst.
    a.mass(limb([[96, 104], [170, 168], [250, 240], [322, 318]], [16, 50, 56, 40], { capEnd: false }), { ...fire, sv: [10, 10], hv: [7, 7], ow: 6 });
    a.mass(limb([[110, 116], [180, 178], [256, 250], [326, 322]], [6, 22, 24, 16], { capEnd: false }), { base: "#ffe066", shade: "#ffbe0b", light: "#fff8d6", ow: 0, sv: [4, 4], hv: [3, 3] });
    a.mass(poly([[300, 300], [330, 304], [362, 352], [314, 330]]), { ...M.gold, sv: [5, 5], hv: [3, 3], ow: 5 });
    a.motes({ seed: 31, count: 22, box: [60, 80, 480, 420], size: [3, 8], color: ["#ffbe0b", "#ff7b00", "#ffe066"], alpha: [0.5, 1] });
    return a;
  },

  /** Legendary figure template — Morvath, crypt lord: hooded crowned lich in a flared tattered cloak, soul staff. */
  morvath() {
    const a = new Art("morvath");
    a.backdrop("#0b0418", "#2a1458", "#140a2c", { pool: "#b388ff", poolAt: [256, 180], poolR: 280, poolAlpha: 0.55 });
    // Crypt: gothic arch + pillars, tomb-light rays, ritual circle.
    a.fill("M60 512V200C60 90 160 30 256 18C352 30 452 90 452 200V512H408V206C408 118 330 70 256 62C182 70 104 118 104 206V512Z", "#1b0d38");
    a.line("M104 206C104 118 182 70 256 62C330 70 408 118 408 206", 5, "#4b2f8f", 0.6);
    for (const x of [60, 452]) a.fill(poly([[x - 26, 512], [x - 26, 230], [x + 26, 230], [x + 26, 512]]), "#140a2c");
    for (let i = -3; i <= 3; i++) a.fill(poly([[256, 120], [256 + i * 60 - 22, 512], [256 + i * 60 + 22, 512]]), "#c77dff", 0.05);
    a.ground(372, "#120624", "#2a1458", { spot: "#c77dff", spotAt: [256, 420], spotR: 210 });
    a.line(`${ellipse(256, 420, 190, 42)}${ellipse(256, 420, 160, 33)}`, 4, "#c77dff", 0.5);
    for (let i = 0; i < 16; i++) {
      const [x, y] = polar(256, 420, 175, i * 22.5);
      a.fill(poly([[x, y - 6], [x + 4, y], [x, y + 6], [x - 4, y]]), "#e0b8ff", 0.7);
    }
    const cloak = { base: "#3a1f6e", shade: "#22104a", light: "#5a36a0", rim: LEGENDARY, rv: 5, ow: 7 };
    const bone = { ...M.bone, rim: LEGENDARY, rv: 4, ow: 5 };
    // The figure is drawn at full size and scaled about its feet so crown and staff clear the landscape crop.
    a.begin("translate(256 420) scale(0.86) translate(-256 -420)");
    a.glow(256, 150, 170, "#c77dff", 0.45);
    // Soul staff (viewer's left), behind the cloak's sleeve.
    a.mass(limb([[146, 440], [148, 280], [150, 130]], [16, 14, 12]), { base: "#4a3a5a", shade: "#2a1f3a", light: "#7a6a94", sv: [4, 4], hv: [3, 3] });
    a.glow(150, 98, 90, "#c77dff", 0.85);
    a.mass("M120 120C112 90 126 60 150 50C140 70 140 90 150 104C160 90 160 70 150 50C174 60 188 90 180 120C170 108 160 104 150 104C140 104 130 108 120 120Z", { ...M.gold, rim: LEGENDARY, sv: [5, 5], hv: [3, 3] });
    a.mass(ellipse(150, 92, 17), { base: "#e9c8ff", shade: "#c77dff", light: "#ffffff", ow: 4, sv: [5, 5], hv: [3, 3] });
    // Flared tattered cloak.
    const hem = [];
    for (let i = 0; i <= 12; i++) hem.push([420 - i * 27, i % 2 ? 404 : 430 + (i % 4 === 0 ? 8 : 0)]);
    a.mass(`M206 160C170 200 128 300 92 430${hem.reverse().map((p) => `L${f(p[0])} ${f(p[1])}`).join("")}L420 430C386 300 342 200 306 160Z`, { ...cloak, sv: [18, 14], hv: [10, 8] });
    a.line("M204 232L168 404M232 330L214 420M282 330L300 420M310 232L346 404", 5, "#22104a", 0.9);
    // Open robe: dark interior with the ribcage showing.
    a.mass("M228 188L284 188L294 320L256 352L218 320Z", { base: "#160b2e", shade: "#0b0418", ow: 4, sv: [4, 4] });
    a.add(`<path d="M232 224C246 216 266 216 280 224M230 246C246 238 266 238 282 246M232 268C246 260 266 260 280 268M236 290C248 284 264 284 276 290" fill="none" stroke="${M.bone.base}" stroke-width="7" stroke-linecap="round"/>`);
    a.line("M256 200V330", 7, M.bone.shade);
    a.glow(256, 300, 40, "#c77dff", 0.6);
    // Spiked pauldrons.
    a.mass("M178 178C188 150 222 146 236 166L222 196C206 188 190 190 178 178Z", { base: "#4a3a5a", shade: "#2a1f3a", light: "#8a7aa8", rim: LEGENDARY, ow: 5, sv: [6, 6], hv: [4, 4] });
    a.mass("M334 178C324 150 290 146 276 166L290 196C306 188 322 190 334 178Z", { base: "#4a3a5a", shade: "#2a1f3a", light: "#8a7aa8", rim: LEGENDARY, ow: 5, sv: [6, 6], hv: [4, 4] });
    for (const [x, y, dx] of [[184, 166, -22], [198, 156, -14], [328, 166, 22], [314, 156, 14]]) a.mass(limb([[x, y], [x + dx, y - 26]], [12, 2], { capEnd: false }), { ...M.bone, ow: 4, sv: [3, 3], hv: [2, 2] });
    // Staff hand (bony, gripping) and casting arm (viewer's right) with a soul wisp.
    a.mass(limb([[200, 200], [170, 238], [156, 246]], [34, 30, 28]), { ...cloak, sv: [8, 8] });
    a.mass(ellipse(152, 252, 14, 16), { ...bone, sv: [4, 4], hv: [3, 3] });
    a.line("M140 246H164M140 256H164", 3.5);
    a.mass(limb([[312, 196], [346, 228], [364, 230]], [34, 32, 36]), { ...cloak, sv: [8, 8] });
    for (const [dx, dy] of [[14, -30], [26, -18], [30, -2], [22, 10]]) a.mass(limb([[368, 226], [368 + dx * 0.5, 226 + dy * 0.5], [368 + dx, 226 + dy]], [9, 7, 4], { capEnd: false }), { ...bone, sv: [3, 3], hv: [2, 2], ow: 4 });
    a.glow(392, 192, 60, "#c77dff", 0.8);
    a.mass(smooth([[384, 210], [374, 186], [388, 160], [396, 176], [408, 168], [404, 198]], true, 0.9), { base: "#e9c8ff", shade: "#b5179e", light: "#ffffff", ow: 4, sv: [4, 4], hv: [3, 3] });
    // Hood, crowned, skull face with burning eyes.
    a.mass("M196 178C190 130 214 82 256 62C298 82 322 130 316 178C300 196 282 202 256 202C230 202 212 196 196 178Z", { ...cloak, sv: [12, 10] });
    a.mass(smooth([[226, 140], [256, 114], [286, 140], [284, 182], [256, 196], [228, 182]], true, 0.9), { base: "#0b0418", shade: "#0b0418", ow: 0, sv: [0, 0] });
    a.mass(smooth([[232, 140], [256, 122], [280, 140], [278, 170], [266, 188], [246, 188], [234, 170]], true, 0.95), { ...bone, sv: [8, 6], hv: [5, 5] });
    a.fill("M232 140L254 150L250 162L236 160Z", INK).fill("M280 140L258 150L262 162L276 160Z", INK);
    a.line("M230 138L254 148M282 138L258 148", 5);
    a.glow(244, 154, 14, "#e0b8ff", 0.9).glow(268, 154, 14, "#e0b8ff", 0.9);
    a.fill(ellipse(244, 155, 3.5), "#ffffff").fill(ellipse(268, 155, 3.5), "#ffffff");
    a.fill("M256 160L261 170H251Z", INK);
    a.line("M244 178H268M249 174V184M256 174V185M263 174V184", 3);
    a.mass(`M210 112L222 76L234 104L246 64L256 98L266 64L278 104L290 76L302 112C278 104 234 104 210 112Z`, { ...M.gold, rim: LEGENDARY, rv: 4, sv: [5, 5], hv: [3, 3], ow: 5 });
    a.fill(ellipse(256, 104, 6), UNIQUE);
    a.end();
    a.motes({ seed: 41, count: 14, box: [90, 70, 430, 400], size: [3, 7], color: ["#e9e2cf", "#c77dff"], alpha: [0.35, 0.85] });
    return a;
  },

  /**
   * Dragon template — Ignis, the eternal dragon: an obsidian ancient dragon split by molten veins, rearing with both
   * wings raised high, a golden horn crown swept back like flames, roaring fire to the left. Magenta (Única) rim.
   */
  ignis() {
    const a = new Art("ignis");
    a.backdrop("#1b0a2e", "#7a1a2a", "#e0541a", { pool: "#ffbe0b", poolAt: [250, 250], poolR: 300, poolAlpha: 0.42 });
    a.fill("M0 384L50 300L90 340L140 270L180 330L210 310L250 384Z", "#2a0a1e").fill("M262 384L320 300L350 330L410 250L450 300L512 270V384Z", "#2a0a1e");
    a.line("M140 272L150 300L140 330M410 252L404 286L416 320", 4, "#ff7b00", 0.7);
    a.ground(384, "#3a0c18", "#2a0a1e", { spot: "#ffbe0b", spotAt: [262, 432], spotR: 220 });
    a.line("M30 452C90 432 120 472 180 446M330 472C380 442 420 478 490 452", 5, "#ff7b00", 0.7);
    a.glow(256, 210, 230, "#ffe066", 0.3);
    a.begin("translate(256 410) scale(0.9) translate(-256 -410)");
    const scale = { base: "#4a1a3a", shade: "#240a1e", light: "#7a3456", rim: UNIQUE, rv: 6, ow: 7 };
    const membrane = { base: "#b02a3a", shade: "#6a1028", light: "#e05a3a", rim: UNIQUE, rv: 4, ow: 6 };
    const horn = { base: GOLD, shade: "#c2410c", light: GOLD_SHINE, rim: UNIQUE, rv: 3, ow: 5 };
    const fire = { base: "#ff7b00", shade: "#c2410c", light: "#ffe066", ow: 4, sv: [4, 4], hv: [3, 3] };
    const vein = (d, w = 4) => a.line(d, w + 6, "#ff7b00", 0.35).line(d, w, "#ffbe0b");
    // Wings raised high (asymmetric), scalloped membranes with molten veins and finger bones.
    a.mass("M238 236C222 172 200 112 176 64L66 84Q104 118 40 168Q100 186 88 236Q160 232 214 300Z", { ...membrane, sv: [12, 12] });
    a.mass("M296 228C318 166 344 104 372 52L470 74Q420 112 488 160Q420 184 440 236Q360 236 318 298Z", { ...membrane, sv: [12, 12] });
    vein("M170 90L110 120M164 120L104 196M180 150L140 236", 3);
    vein("M378 80L440 104M386 112L446 176M372 150L412 230", 3);
    for (const [pts, w] of [
      [[[234, 232], [204, 150], [176, 64]], [18, 14, 10]],
      [[[176, 66], [66, 84]], [10, 3]],
      [[[176, 66], [40, 168]], [10, 3]],
      [[[176, 66], [88, 236]], [10, 3]],
      [[[300, 224], [334, 140], [372, 52]], [18, 14, 10]],
      [[[372, 54], [470, 74]], [10, 3]],
      [[[372, 54], [488, 160]], [10, 3]],
      [[[372, 54], [440, 236]], [10, 3]],
    ]) a.mass(limb(pts, w, { capEnd: pts.length === 3 }), { ...scale, rim: undefined, ow: 4, sv: [3, 3], hv: [2, 2] });
    a.mass(limb([[176, 64], [168, 44]], [12, 2], { capEnd: false }), { ...horn, ow: 4, sv: [2, 2], hv: [1, 1] });
    a.mass(limb([[372, 52], [378, 30]], [12, 2], { capEnd: false }), { ...horn, ow: 4, sv: [2, 2], hv: [1, 1] });
    // Tail curling forward with a spade tip.
    a.mass(limb([[310, 384], [380, 406], [432, 382], [446, 342], [430, 318]], [48, 38, 28, 18, 10]), { ...scale, sv: [8, 8] });
    vein("M340 396L372 404L400 396", 3);
    a.mass(poly([[430, 326], [452, 290], [446, 320], [472, 314]]), horn);
    // Haunches, feet with claws.
    a.mass(blob(222, 364, 52, 40, { seed: 2, n: 8, jitter: 0.08 }), { ...scale, sv: [10, 10] });
    a.mass(blob(318, 364, 52, 40, { seed: 3, n: 8, jitter: 0.08 }), { ...scale, sv: [10, 10] });
    vein("M196 346L214 362L206 384M344 346L326 362L334 384", 3);
    for (const [x, d] of [[184, -1], [198, -1], [212, -1], [328, 1], [342, 1], [356, 1]]) a.mass(limb([[x, 394], [x + d * 6, 408]], [10, 2], { capEnd: false }), { ...M.bone, ow: 3, sv: [2, 2], hv: [1, 1] });
    // Chest + molten belly plates.
    a.mass(smooth([[218, 260], [262, 226], [312, 240], [334, 300], [318, 368], [266, 392], [214, 370], [204, 310]], true, 0.9), { ...scale, sv: [16, 14], hv: [10, 10] });
    a.glow(266, 320, 90, "#ffbe0b", 0.5);
    a.mass(smooth([[244, 250], [282, 248], [296, 300], [290, 360], [266, 380], [240, 360], [234, 300]], true, 0.9), { base: "#ffbe0b", shade: "#ff7b00", light: "#fff1c1", ow: 4, sv: [6, 6], hv: [4, 4] });
    a.line("M238 280C256 286 276 286 294 280M236 306C256 312 278 312 296 306M238 332C256 338 276 338 294 332M244 356C256 362 274 362 288 356", 4, "#c2410c");
    vein("M222 272L214 300L226 322M314 262L322 292L310 316", 3);
    // Raised fore-claw.
    a.mass(limb([[226, 278], [190, 300], [176, 270]], [34, 28, 24]), { ...scale, sv: [7, 7] });
    for (const [dx, dy] of [[-16, -18], [-4, -24], [8, -20]]) a.mass(limb([[176, 266], [176 + dx, 266 + dy]], [9, 2], { capEnd: false }), { ...M.bone, ow: 3, sv: [2, 2], hv: [1, 1] });
    // Neck (S-curve to the left) with a mane of flame spines.
    for (const [x, y, dx, dy] of [[292, 220, 30, -4], [284, 190, 30, -18], [266, 164, 22, -28], [244, 146, 10, -32]]) {
      a.mass(limb([[x - 4, y + 2], [x + dx * 0.6, y + dy * 0.5], [x + dx, y + dy]], [22, 12, 2], { capEnd: false }), fire);
    }
    a.mass(limb([[274, 262], [266, 206], [240, 168], [206, 150]], [76, 62, 52, 46]), { ...scale, sv: [12, 10] });
    vein("M262 248L254 214L234 186", 3);
    // Head roaring left: golden horn crown swept back like flames, open jaws, fire breath.
    a.mass(limb([[214, 134], [250, 96], [296, 78]], [30, 18, 2], { capEnd: false }), horn);
    a.mass(limb([[200, 126], [206, 78], [232, 40]], [26, 16, 2], { capEnd: false }), horn);
    a.mass(limb([[224, 150], [266, 138], [306, 116]], [22, 12, 2], { capEnd: false }), horn);
    a.mass(limb([[186, 124], [176, 92], [184, 62]], [18, 10, 2], { capEnd: false }), horn);
    a.mass("M228 130C214 112 186 112 166 122L118 136C110 142 112 152 122 154L170 156L226 170C236 158 236 142 228 130Z", { ...scale, sv: [10, 8] });
    a.mass("M216 166L176 168L128 184C122 190 126 198 134 198L180 196L222 184Z", { ...scale, sv: [6, 6] });
    a.fill("M174 156L216 166L222 182L178 194L132 196L170 168Z", "#3a0612");
    a.glow(168, 176, 70, "#ffbe0b", 0.95);
    for (const [x, y] of [[132, 154], [146, 155], [160, 156], [140, 186], [154, 184]]) a.fill(poly([[x - 4, y], [x + 4, y], [x, y + (y < 170 ? 9 : -9)]]), "#fff1c1");
    a.mass(smooth([[132, 166], [104, 142], [74, 124], [58, 146], [36, 152], [50, 174], [30, 198], [62, 204], [74, 226], [100, 204], [132, 188]], true, 0.8), { ...fire, ow: 5, sv: [8, 8], hv: [5, 5] });
    a.mass(smooth([[132, 172], [104, 158], [78, 156], [66, 176], [84, 194], [108, 192], [132, 184]], true, 0.9), { base: "#ffe066", shade: "#ffbe0b", light: "#fff8d6", ow: 0, sv: [4, 4], hv: [3, 3] });
    a.glow(194, 133, 22, "#ffe066", 0.9);
    a.fill("M180 127L208 129L201 140L179 138Z", "#ffe066").fill("M191 128L195 128L194 139L190 139Z", INK);
    a.line("M178 123L208 120", 4);
    vein("M214 128L196 144", 2);
    a.fill(ellipse(124, 140, 3, 2), INK);
    a.end();
    a.motes({ seed: 51, count: 14, box: [30, 40, 490, 470], size: [3, 9], color: ["#ffbe0b", "#ff7b00", "#ffe066"], alpha: [0.5, 1] });
    return a;
  },
};

// ── CLI ──────────────────────────────────────────────────────────────────────────────────────────────────────────
mkdirSync(OUT, { recursive: true });
const want = process.argv.slice(2);
for (const key of want.length ? want : Object.keys(RECIPES)) {
  const recipe = RECIPES[key];
  if (!recipe) throw new Error(`no recipe for ${key}`);
  const text = recipe().toString();
  writeFileSync(`${OUT}/${key}.svg`, text);
  console.log(key.padEnd(20), Buffer.byteLength(text), "B");
}

