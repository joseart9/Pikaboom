// UI-05 recipes (undead). See art.mjs / docs/cards/UI_VISUAL_SYSTEM.md §6.
// Undead template (restless-skeleton) varied by body plan: standing guard, bat, wall, crouching ghoul, ghost, throne.
import { Art, INK, blob, ellipse, f, limb, poly, polar, smooth, star } from "../lib.mjs";
import { GOLD, LEGENDARY, M } from "../materials.mjs";
import { bone, drop, skull, wing } from "./ui05-parts.mjs";

const R = {
  bone: { ...M.bone, rim: "#c77dff", rv: 4 },
  oldBone: { base: "#d8cba6", shade: "#9a8a66", light: "#f5ecd0" },
  wood: { base: "#6b4a2f", shade: "#46301e", light: "#9a6a45" },
  iron: { base: "#6a6e88", shade: "#3e4058", light: "#9ea2bc" },
  batFur: { base: "#4a2a4a", shade: "#2a1430", light: "#6e4a6e" },
  batWing: { base: "#5a1a3a", shade: "#360c24", light: "#7a2e52" },
  batBone: { base: "#3a1430", shade: "#22081c", light: "#5a2a4a" },
  ghoul: { base: "#8fa38a", shade: "#5a6e5a", light: "#bccfb2" },
  rag: { base: "#4a3d3a", shade: "#2a2220", light: "#6a5a54" },
  ghost: { base: "#bff3ff", shade: "#6fb8d0", light: "#ffffff" },
  robe: { base: "#a3172f", shade: "#640c1e", light: "#d6304c", rim: LEGENDARY, rv: 5 },
  ermine: { base: "#f4efe6", shade: "#bdb3a2", light: "#ffffff" },
  crypt: { base: "#4a3d6e", shade: "#2f2650", light: "#6a5a94" },
};

const RECIPES = {
  /** Token — a plain skeleton conscript standing guard: whole body visible, round buckler, planted spear, torchlit. */
  skeleton() {
    const a = new Art("skeleton");
    a.backdrop("#140a2c", "#2a1a52", "#160b2e", { pool: "#ffbe0b", poolAt: [110, 190], poolR: 220, poolAlpha: 0.22 });
    // Dungeon wall: brick courses, a wall torch on the left.
    for (let y = 40, r = 0; y < 360; y += 44, r++) {
      a.line(`M0 ${y}H512`, 4, "#120826", 0.8);
      for (let x = (r % 2) * 48; x < 512; x += 96) a.line(`M${x} ${y}V${y + 44}`, 4, "#120826", 0.8);
    }
    a.fill(poly([[96, 200], [118, 200], [112, 250], [102, 250]]), "#46301e");
    a.glow(107, 176, 90, "#ffbe0b", 0.7);
    a.mass(smooth([[96, 196], [100, 170], [108, 146], [114, 170], [120, 196]], true, 0.9), { base: "#ff7b00", shade: "#c2410c", light: "#ffe066", ow: 4, sv: [3, 3], hv: [2, 2] });
    a.ground(360, "#160b2e", "#2f1f62", { spot: "#c9b2ff", spotAt: [256, 400], spotR: 160 });
    a.shadow(256, 398, 100, 14);
    const b = { ...R.oldBone, rim: "#c77dff", rv: 3 };
    // Spear planted (viewer's right), behind the hand.
    a.mass(limb([[340, 400], [338, 140]], 10), { ...R.wood, ow: 4, sv: [3, 3], hv: [2, 2] });
    a.mass(poly([[338, 92], [354, 136], [338, 148], [322, 136]]), { ...M.steel, ow: 4, sv: [4, 4], hv: [3, 3] });
    // Legs: femur, tibia, feet.
    for (const s of [-1, 1]) {
      bone(a, [256 + s * 18, 322], [256 + s * 26, 358], 16, b);
      bone(a, [256 + s * 26, 362], [256 + s * 28, 392], 14, b);
      a.mass(`M${256 + s * 22} 388L${256 + s * 50} 392L${256 + s * 50} 402L${256 + s * 20} 402Z`, { ...b, ow: 4, sv: [2, 2], hv: [1, 1] });
    }
    // Pelvis, spine, ribcage.
    a.mass("M226 306C236 296 276 296 286 306L292 326L272 334L256 322L240 334L220 326Z", { ...b, sv: [6, 6] });
    a.mass(limb([[256, 310], [256, 228]], 12), { ...b, sv: [3, 3], hv: [2, 2] });
    a.mass(smooth([[222, 236], [256, 222], [290, 236], [294, 270], [278, 290], [234, 290], [218, 270]], true, 0.9), { ...b, sv: [9, 8] });
    a.line("M228 250C244 244 268 244 284 250M226 266C244 260 268 260 286 266M232 281C246 276 266 276 280 281", 5);
    a.line("M256 230V290", 5);
    // Arms: buckler arm (viewer's left), spear arm (right) gripping the shaft.
    bone(a, [224, 238], [204, 276], 14, b);
    bone(a, [204, 278], [212, 306], 12, b);
    a.mass(ellipse(186, 294, 40), { ...R.iron, sv: [7, 7], hv: [5, 5] });
    a.mass(ellipse(186, 294, 30), { ...R.wood, ow: 3, sv: [8, 8], hv: [5, 5] });
    a.line("M168 268V320M186 264V324M204 268V320", 3, INK, 0.45);
    a.mass(ellipse(186, 294, 9), { ...R.iron, ow: 4, sv: [3, 3], hv: [2, 2] });
    bone(a, [288, 238], [312, 268], 14, b);
    bone(a, [312, 270], [334, 252], 12, b);
    a.mass(ellipse(338, 250, 10, 12), { ...b, ow: 4, sv: [3, 3], hv: [2, 2] });
    // Skull with a cracked dome and a dented iron cap.
    a.mass(limb([[256, 226], [256, 206]], 10), { ...b, sv: [2, 2], hv: [1, 1] });
    skull(a, 256, 172, 34, b, "#c77dff");
    a.mass("M218 162C220 126 292 126 294 162C276 152 236 152 218 162Z", { ...R.iron, sv: [6, 6], hv: [4, 4] });
    a.line("M278 170L272 182L280 190", 3, INK, 0.7);
    return a;
  },

  /** Bat — a vampire bat spread before the moon, fangs bared, blood drops spiralling up into its mouth (Robo de Vida). */
  "vampire-bat"() {
    const a = new Art("vampire-bat");
    a.backdrop("#1a0618", "#4a1030", "#16061a", { pool: "#ff4d6d", poolAt: [256, 220], poolR: 280, poolAlpha: 0.3 });
    a.glow(256, 206, 190, "#ffd6e0", 0.35);
    a.mass(ellipse(256, 206, 128), { base: "#f5d8e0", shade: "#d6a8b8", light: "#fff4f8", ow: 0, sv: [16, 16], hv: [10, 10] });
    a.fill(blob(220, 180, 22, 16, { seed: 2 }), "#d6a8b8", 0.6).fill(blob(296, 240, 30, 18, { seed: 4 }), "#d6a8b8", 0.6);
    // Castle spires on a crag.
    a.fill("M0 512V420L60 400L84 330L96 300L108 330L116 380L150 370L170 300L184 260L198 300L208 360L300 380L330 320L346 290L362 320L374 380L430 390L512 410V512Z", "#12040e");
    a.fill(poly([[180, 300], [188, 300], [188, 314], [180, 314]]), "#ffbe0b", 0.8).fill(poly([[344, 330], [350, 330], [350, 342], [344, 342]]), "#ffbe0b", 0.8);
    // Wings (mirrored), body, feet.
    for (const s of [-1, 1]) {
      const X = (x) => 256 + s * (x - 256);
      wing(a, {
        root: [X(232), 226], rootLow: [X(240), 300], wrist: [X(150), 168],
        tips: [[X(64), 140], [X(52), 228], [X(82), 300], [X(150), 330], [X(206), 330]],
        mem: R.batWing, bone: R.batBone, sag: 0.32, boneW: 14,
      });
      a.mass(limb([[X(152), 168], [X(140), 150]], [8, 2], { capEnd: false }), { ...M.bone, ow: 3, sv: [2, 2], hv: [1, 1] });
    }
    for (const s of [-1, 1]) a.mass(limb([[256 + s * 14, 300], [256 + s * 22, 330], [256 + s * 18, 346]], [12, 8, 6]), { ...R.batBone, ow: 4, sv: [3, 3], hv: [2, 2] });
    a.mass(smooth([[256, 206], [292, 226], [300, 270], [284, 310], [256, 320], [228, 310], [212, 270], [220, 226]], true, 0.9), { ...R.batFur, rim: "#ff4d6d", rv: 4, sv: [10, 10] });
    a.line("M240 250L248 262M268 250L262 264M244 282L252 292M268 280L262 294", 3, INK, 0.5);
    // Head: tall ears, red eyes, open mouth with fangs.
    for (const s of [-1, 1]) {
      a.mass(poly([[256 + s * 8, 180], [256 + s * 36, 112], [256 + s * 40, 190]]), { ...R.batFur, sv: [5, 5], hv: [3, 3] });
      a.fill(poly([[256 + s * 18, 178], [256 + s * 34, 130], [256 + s * 34, 182]]), "#a8466a");
    }
    a.mass(smooth([[220, 196], [236, 172], [276, 172], [292, 196], [282, 222], [256, 232], [230, 222]], true, 0.9), { ...R.batFur, sv: [8, 8] });
    a.glow(240, 194, 18, "#ff4d6d", 0.9).glow(272, 194, 18, "#ff4d6d", 0.9);
    a.fill("M230 192L250 186L246 200Z", "#ffbe0b").fill("M282 192L262 186L266 200Z", "#ffbe0b");
    a.fill("M246 168L256 176L266 168L262 182H250Z", "#2a1430");
    a.fill("M240 210C246 230 266 230 272 210Z", "#3a0612");
    a.fill("M244 210L249 226L253 210ZM259 210L263 226L268 210Z", "#ffffff");
    a.fill(drop(249, 242, 4), "#ff4d6d");
    // Two streams of blood drops curling up into its mouth (Robo de Vida).
    for (const s of [-1, 1]) for (let i = 0; i < 6; i++) {
      const t = i / 6, u = 1 - t;
      const x = 256 + s * (u * u * 120 + 2 * u * t * 96 + t * t * 18), y = u * u * 404 + 2 * u * t * 300 + t * t * 238;
      a.mass(drop(x, y, 8 - t * 4), { base: "#ff4d6d", shade: "#a8102c", light: "#ff9fb0", ow: 3, sv: [2, 2], hv: [1, 1] });
    }
    return a;
  },

  /** Wall — a rampart of mortared skulls and femurs, a horned ox skull crest, a double ward dome (Provocar, Escudo 2). */
  "bone-wall"() {
    const a = new Art("bone-wall");
    a.backdrop("#0e0a20", "#22184a", "#100a22", { pool: "#8e5bd8", poolAt: [256, 250], poolR: 280, poolAlpha: 0.35 });
    a.ground(370, "#140c2c", "#2a1a52", { spot: "#c77dff", spotAt: [256, 410], spotR: 220 });
    // Double ward dome (two shield layers).
    for (const [r, o] of [[226, 0.12], [196, 0.14]]) {
      a.add(`<path d="M${256 - r} 400A${r} ${f(r * 1.2)} 0 0 1 ${256 + r} 400Z" fill="#c77dff" fill-opacity="${o}"/>`);
      a.line(`M${256 - r} 400A${r} ${f(r * 1.2)} 0 0 1 ${256 + r} 400`, 5, "#e0b8ff", 0.7);
    }
    for (let i = 1; i < 6; i++) {
      const [x, y] = polar(256, 400, 210, 180 + i * 30);
      a.line(`M256 400L${f(x)} ${f(400 - (400 - y) * 1.2)}`, 2, "#e0b8ff", 0.25);
    }
    a.shadow(256, 396, 200, 18, 0.6);
    // Rampart body: dark mortar with an uneven top.
    a.mass("M64 396L70 262L120 250L170 258L214 240L298 240L342 258L392 250L442 262L448 396Z", { base: "#3a2e52", shade: "#221a36", light: "#52466e", sv: [10, 10] });
    // Rib palisade along the top.
    for (let i = 0; i < 8; i++) {
      const x = 92 + i * 47, h = i === 3 || i === 4 ? 0 : 60 + (i % 3) * 12;
      if (h) a.mass(limb([[x, 262], [x - 6, 262 - h * 0.6], [x + 6, 262 - h]], [14, 11, 2], { capEnd: false }), { ...R.oldBone, ow: 4, sv: [3, 3], hv: [2, 2] });
    }
    // Courses of femurs and skulls.
    const ob = R.oldBone;
    for (const [p, q] of [[[80, 300], [170, 292]], [[342, 292], [432, 300]], [[96, 364], [196, 372]], [[316, 372], [416, 364]], [[200, 384], [312, 384]]]) bone(a, p, q, 20, ob);
    for (const [x, y, s] of [[118, 336, 22], [172, 334, 20], [226, 340, 22], [286, 340, 22], [340, 334, 20], [394, 336, 22], [100, 276, 16], [412, 276, 16]]) skull(a, x, y, s, ob, null);
    // Crest: horned ox skull over the gate with glowing sockets.
    for (const s of [-1, 1]) a.mass(limb([[256 + s * 30, 210], [256 + s * 76, 196], [256 + s * 92, 150]], [22, 14, 2], { capEnd: false }), { ...ob, sv: [4, 4], hv: [3, 3] });
    a.mass("M216 196C222 168 290 168 296 196L286 238L272 270L240 270L226 238Z", { ...R.bone, sv: [10, 10] });
    a.glow(240, 214, 22, "#c77dff", 0.9).glow(272, 214, 22, "#c77dff", 0.9);
    a.fill(smooth([[228, 206], [248, 204], [250, 222], [234, 226]], true, 0.9), INK).fill(smooth([[284, 206], [264, 204], [262, 222], [278, 226]], true, 0.9), INK);
    a.fill(ellipse(241, 214, 4), "#e9c8ff").fill(ellipse(271, 214, 4), "#e9c8ff");
    a.fill("M248 246L256 236L264 246L262 258H250Z", INK);
    a.line("M240 180L252 194L246 204", 3, INK, 0.6);
    a.motes({ seed: 41, count: 14, box: [60, 120, 452, 380], size: [3, 7], color: "#e0b8ff", alpha: [0.4, 0.9], shape: "circle" });
    return a;
  },

  /** Crouching ghoul lunging left on all fours (Embestida), jaw wide, a gnawed bone left behind. */
  "hungry-ghoul"() {
    const a = new Art("hungry-ghoul");
    a.backdrop("#0c1410", "#1e2e26", "#0e1612", { pool: "#b5e48c", poolAt: [220, 240], poolR: 250, poolAlpha: 0.22 });
    // Broken coffin and iron fence.
    a.mass("M352 330L392 190L452 196L470 336Z", { ...R.wood, base: "#3a2a22", shade: "#22160e", light: "#5a4436", sv: [8, 8] });
    a.line("M372 250L452 256M364 290L460 296", 4, INK, 0.6);
    for (let x = 20; x < 512; x += 34) a.line(`M${x} 340V${232 + (x % 3) * 6}`, 5, "#08100c");
    a.line("M0 260H512M0 300H512", 4, "#08100c");
    a.ground(340, "#0e1a14", "#2a3a2e", { spot: "#b5e48c", spotAt: [240, 392], spotR: 200 });
    a.shadow(250, 392, 170, 16);
    bone(a, [370, 396], [430, 380], 16, R.oldBone);
    // Speed streaks + kicked dirt behind (charge).
    a.line("M430 250H500M440 280H512M420 220H480", 5, "#b5e48c", 0.3);
    a.motes({ seed: 9, count: 10, box: [350, 350, 470, 396], size: [4, 9], color: "#3a2a22", alpha: [0.7, 1] });
    const g = { ...R.ghoul, rim: "#b5e48c", rv: 4 };
    // Far limbs.
    a.mass(limb([[330, 300], [372, 340], [340, 380], [376, 394]], [34, 26, 18, 14]), { ...g, base: "#748a70", sv: [6, 6] });
    a.mass(limb([[230, 270], [186, 320], [150, 360]], [24, 20, 16]), { ...g, base: "#748a70", sv: [5, 5] });
    // Ragged loincloth, hunched body with spine knobs and ribs.
    a.mass(poly([[300, 300], [356, 296], [352, 340], [338, 326], [326, 346], [312, 324], [298, 338]]), { ...R.rag, sv: [5, 5], hv: [3, 3] });
    a.mass(smooth([[196, 262], [238, 214], [300, 196], [352, 230], [360, 290], [320, 316], [250, 306], [206, 292]], true, 0.9), { ...g, sv: [14, 12] });
    for (let i = 0; i < 6; i++) a.mass(ellipse(240 + i * 20, 212 - Math.sin((i / 5) * Math.PI) * 12, 7), { ...g, ow: 3, sv: [2, 2], hv: [1, 1] });
    a.line("M262 252C270 270 268 290 262 300M282 248C290 268 290 290 284 304M302 252C310 270 310 292 304 306", 4, INK, 0.55);
    // Near hind leg (crouched spring) and near arm reaching, long claws.
    a.mass(limb([[340, 290], [388, 320], [356, 368], [394, 390]], [44, 32, 22, 16]), { ...g, sv: [7, 7] });
    for (const dy of [-6, 4]) a.mass(limb([[394, 390 + dy], [414, 392 + dy]], [7, 2], { capEnd: false }), { ...M.bone, ow: 3, sv: [1, 1], hv: [1, 1] });
    a.mass(limb([[222, 278], [172, 300], [120, 314]], [32, 24, 18]), { ...g, sv: [6, 6] });
    for (const [dx, dy] of [[-30, -16], [-34, 2], [-28, 18]]) a.mass(limb([[118, 314], [118 + dx * 0.5, 314 + dy * 0.6], [118 + dx, 314 + dy]], [9, 6, 2], { capEnd: false }), { ...M.bone, ow: 3, sv: [2, 2], hv: [1, 1] });
    // Head low and forward: bald skull, pointed ear, wide jaw.
    a.mass(poly([[206, 212], [240, 196], [222, 232]]), { ...g, sv: [4, 4], hv: [3, 3] });
    a.mass(smooth([[150, 228], [168, 200], [210, 196], [232, 222], [226, 252], [196, 262], [160, 256]], true, 0.9), { ...g, sv: [10, 8] });
    a.mass("M148 244L196 252L226 250L214 282L176 290L146 270Z", { ...g, sv: [6, 6] });
    a.fill("M154 250L208 256L196 276L166 280Z", "#2a0a14");
    for (let i = 0; i < 6; i++) {
      const x = 158 + i * 8;
      a.fill(poly([[x, 250 + i], [x + 6, 251 + i], [x + 3, 262 + i]]), "#f0ead2").fill(poly([[x + 2, 280 - i * 0.5], [x + 8, 279 - i * 0.5], [x + 5, 270 - i * 0.5]]), "#f0ead2");
    }
    a.glow(176, 226, 20, "#ffe066", 0.9);
    a.fill("M164 222L190 216L186 232L168 232Z", "#ffe066").fill(ellipse(178, 225, 3.5, 5), INK);
    a.line("M160 214L196 206", 5);
    a.fill(drop(184, 300, 4), "#b5e48c", 0.9);
    a.line("M186 172C190 180 200 186 214 186", 4, INK, 0.5);
    for (const [x, y] of [[180, 196], [196, 190], [210, 194]]) a.line(`M${x} ${y}l${-6} ${-14}`, 3, "#2a2220");
    return a;
  },

  /** Ghost — a screaming banshee rising over the sarcophagi, hair streaming up, wail rings, wisps instead of legs. */
  "crypt-banshee"() {
    const a = new Art("crypt-banshee");
    a.backdrop("#06141c", "#123a4a", "#0a1a22", { pool: "#6fe0ff", poolAt: [256, 220], poolR: 270, poolAlpha: 0.32 });
    // Crypt vaults + receding sarcophagi.
    for (const [x, w] of [[30, 120], [362, 120]]) a.fill(`M${x} 512V170Q${x + w / 2} 90 ${x + w} 170V512Z`, "#08202a");
    a.ground(330, "#0a1a22", "#1e4a5a", { spot: "#6fe0ff", spotAt: [256, 380], spotR: 210 });
    for (const [x, y, w, h] of [[62, 360, 96, 36], [354, 360, 96, 36], [104, 330, 64, 24], [344, 330, 64, 24]]) {
      a.mass(`M${x} ${y}h${w}v${h}h${-w}Z`, { ...R.crypt, base: "#2a4a5a", shade: "#163040", light: "#3e6a7a", sv: [6, 6], ow: 4 });
      a.mass(`M${x - 6} ${y}l12 ${-12}h${w - 12}l12 12Z`, { base: "#3e6a7a", shade: "#2a4a5a", light: "#5a8a9a", ow: 4, sv: [3, 3], hv: [2, 2] });
    }
    // Wail rings from the mouth.
    for (const r of [70, 110, 150]) a.line(`M${f(256 - r * 0.9)} ${f(176 - r * 0.45)}A${r} ${r} 0 0 0 ${f(256 - r * 0.9)} ${f(176 + r * 0.45)}M${f(256 + r * 0.9)} ${f(176 - r * 0.45)}A${r} ${r} 0 0 1 ${f(256 + r * 0.9)} ${f(176 + r * 0.45)}`, 5, "#bff3ff", 0.55 - r / 400);
    a.glow(256, 240, 170, "#bff3ff", 0.45);
    const gh = { ...R.ghost, rim: "#6fe0ff", rv: 5 };
    // Streaming hair (up and back like cold flame).
    for (const [pts, w] of [
      [[[232, 150], [200, 110], [176, 50]], [34, 22, 2]],
      [[[246, 136], [236, 84], [244, 30]], [30, 18, 2]],
      [[[268, 136], [284, 84], [300, 36]], [30, 18, 2]],
      [[[284, 150], [320, 108], [348, 60]], [34, 22, 2]],
      [[[226, 170], [178, 150], [140, 112]], [26, 14, 2]],
      [[[290, 170], [338, 152], [376, 118]], [26, 14, 2]],
    ]) a.mass(limb(pts, w, { capEnd: false }), { base: "#8adfff", shade: "#3e9ac0", light: "#d6f6ff", ow: 5, sv: [5, 5], hv: [3, 3] });
    // Body tapering into wisps.
    a.mass(smooth([[214, 214], [256, 200], [298, 214], [314, 280], [330, 344], [300, 330], [286, 400], [262, 350], [236, 410], [222, 340], [184, 360], [200, 280]], true, 0.85), { ...gh, sv: [14, 12] });
    a.line("M240 230C236 280 230 320 226 350M272 230C280 280 286 320 290 340", 4, "#3e9ac0", 0.6);
    // Arms flung up and out, long fingers.
    for (const s of [-1, 1]) {
      a.mass(limb([[256 + s * 40, 222], [256 + s * 94, 200], [256 + s * 140, 150]], [24, 18, 12]), { ...gh, sv: [5, 5], hv: [3, 3] });
      for (const k of [-1, 0, 1]) a.mass(limb([[256 + s * 140, 150], [256 + s * (156 + k * 4), 128 + k * 12]], [7, 2], { capEnd: false }), { ...gh, ow: 3, sv: [1, 1], hv: [1, 1] });
      a.mass(poly([[256 + s * 60, 214], [256 + s * 110, 202], [256 + s * 90, 244], [256 + s * 76, 230], [256 + s * 66, 256]]), { ...gh, ow: 4, sv: [4, 4], hv: [3, 3] });
    }
    // Face: gaunt, hollow white eyes, screaming mouth.
    a.mass(smooth([[226, 162], [234, 128], [256, 118], [278, 128], [286, 162], [276, 200], [256, 214], [236, 200]], true, 0.9), { ...gh, sv: [8, 8] });
    a.fill(smooth([[236, 150], [250, 146], [250, 160], [238, 162]], true, 0.9), "#0a2a3a").fill(smooth([[276, 150], [262, 146], [262, 160], [274, 162]], true, 0.9), "#0a2a3a");
    a.fill(ellipse(244, 154, 3), "#ffffff").fill(ellipse(268, 154, 3), "#ffffff");
    a.fill(ellipse(256, 188, 11, 18), "#0a2a3a");
    a.line("M240 140L250 146M272 140L262 146", 3, "#0a2a3a");
    a.motes({ seed: 61, count: 16, box: [60, 60, 452, 420], size: [3, 7], color: ["#bff3ff", "#6fe0ff"], alpha: [0.4, 0.9], shape: "circle" });
    return a;
  },

  /** Legendary — the Skeleton King enthroned: gold crown, crimson ermine cape, skull scepter, four skulls rising at his feet. */
  "skeleton-king"() {
    const a = new Art("skeleton-king");
    a.backdrop("#0e0620", "#2c1250", "#120826", { pool: "#ffbe0b", poolAt: [256, 170], poolR: 260, poolAlpha: 0.3 });
    // Hanging banners and pillars.
    for (const x of [60, 452]) {
      a.fill(poly([[x - 30, 512], [x - 30, 80], [x + 30, 80], [x + 30, 512]]), "#160a2e");
      a.fill(poly([[x - 22, 90], [x + 22, 90], [x + 22, 230], [x, 210], [x - 22, 230]]), "#640c1e");
      a.mass(star(x, 140, 4, 12, 5), { ...M.gold, ow: 3, sv: [2, 2], hv: [1, 1] });
    }
    a.ground(380, "#120826", "#2c1a52", { spot: "#ffbe0b", spotAt: [256, 420], spotR: 200 });
    // Throne of bones: tall back with rib spikes and skull finials (king + throne scaled about the floor so the crown
    // clears the landscape crop).
    a.begin("translate(256 410) scale(0.9) translate(-256 -410)");
    const ob = { ...R.oldBone, rim: LEGENDARY, rv: 3 };
    let spikes = "";
    for (let i = -4; i <= 4; i++) {
      const x = 256 + i * 30, h = 210 - Math.abs(i) * 24;
      spikes += limb([[x, 300], [x + i * 3, 300 - h * 0.6], [x + i * 6, 300 - h]], [18, 14, 2], { capEnd: false });
    }
    a.mass(spikes, { ...ob, ow: 4, sv: [3, 3], hv: [2, 2] });
    a.mass("M150 400L160 250L352 250L362 400Z", { base: "#3a2e52", shade: "#221a36", light: "#52466e", sv: [10, 10] });
    skull(a, 146, 248, 22, ob, "#ffbe0b");
    skull(a, 366, 248, 22, ob, "#ffbe0b");
    a.shadow(256, 410, 150, 14);
    // Cape over the shoulders and lap.
    a.mass("M192 214C170 260 160 340 170 400L342 400C352 340 342 260 320 214L256 230Z", { ...R.robe, sv: [12, 10] });
    a.line("M206 260C200 310 200 360 206 396M306 260C312 310 312 360 306 396", 4, INK, 0.45);
    // Bony legs/feet from under the cape.
    a.mass([-1, 1].map((s) => `M${256 + s * 24} 396L${256 + s * 56} 398L${256 + s * 56} 410L${256 + s * 20} 410Z`).join(""), { ...ob, ow: 4, sv: [2, 2], hv: [1, 1] });
    // Ribcage between the cape's lapels, gold chain medallion.
    a.mass(smooth([[222, 236], [256, 226], [290, 236], [292, 300], [256, 316], [220, 300]], true, 0.9), { ...ob, sv: [8, 8] });
    a.line("M228 252C244 246 268 246 284 252M226 270C244 264 268 264 286 270M230 288C246 282 266 282 282 288M256 232V312", 5);
    a.line("M220 240C236 280 276 280 292 240", 5, GOLD);
    a.mass(ellipse(256, 282, 13), { ...M.gold, ow: 4, sv: [4, 4], hv: [3, 3] });
    a.fill(ellipse(256, 282, 5), "#ff4d6d");
    // Ermine collar.
    a.mass(smooth([[176, 218], [210, 200], [256, 214], [302, 200], [336, 218], [322, 244], [256, 236], [190, 244]], true, 0.8), { ...R.ermine, sv: [6, 6], hv: [4, 4] });
    for (const x of [196, 226, 286, 316]) a.fill(ellipse(x, 222, 3, 5), INK);
    // Arms: left on the armrest skull, right holding the scepter.
    bone(a, [196, 230], [168, 286], 15, ob);
    bone(a, [168, 288], [150, 248], 13, ob);
    a.mass(ellipse(148, 236, 11, 10), { ...ob, ow: 4, sv: [3, 3], hv: [2, 2] });
    a.mass(limb([[376, 404], [370, 160]], 10), { ...M.gold, ow: 4, sv: [3, 3], hv: [2, 2] });
    a.glow(368, 136, 46, "#c77dff", 0.8);
    skull(a, 368, 136, 18, ob, "#c77dff");
    bone(a, [316, 230], [346, 280], 15, ob);
    bone(a, [346, 282], [366, 262], 13, ob);
    a.mass(ellipse(370, 260, 11, 12), { ...ob, ow: 4, sv: [3, 3], hv: [2, 2] });
    // Skull + crown.
    skull(a, 256, 170, 40, { ...R.bone, rim: LEGENDARY }, "#ffbe0b");
    a.line("M282 150L274 166L284 176", 3.5, INK, 0.6);
    a.mass("M206 140L214 76L234 112L256 60L278 112L298 76L306 140C276 130 236 130 206 140Z", { ...M.gold, rim: LEGENDARY, rv: 4, sv: [8, 8], hv: [5, 5] });
    for (const [x, y, c] of [[256, 118, "#ff4d6d"], [228, 126, "#3fa9ff"], [284, 126, "#3fa9ff"]]) a.mass(ellipse(x, y, 7), { base: c, shade: INK, light: "#ffffff", ow: 3, sv: [2, 2], hv: [1, 1] });
    for (const [x, y] of [[214, 76], [256, 60], [298, 76]]) a.fill(ellipse(x, y, 5), "#fff1c1");
    a.end();
    // Four skulls rising at his feet (Grito de Guerra: four Skeletons).
    for (const [x, y, s] of [[104, 392, 19], [176, 410, 16], [336, 410, 16], [408, 392, 19]]) {
      a.glow(x, y, s * 2, "#c77dff", 0.6);
      skull(a, x, y, s, R.bone, "#c77dff");
    }
    return a;
  },
};

export default RECIPES;
