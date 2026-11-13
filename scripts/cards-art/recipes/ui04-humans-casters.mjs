// UI-04 recipes (humans-casters). See art.mjs / docs/cards/UI_VISUAL_SYSTEM.md §6.
// Humanoid template (squire) varied per key: apprentice-mage, scholar, necromancer, grave-digger, soul-thief.
import { Art, INK, blob, ellipse, limb, poly, shard, smooth, star, zigzag } from "../lib.mjs";
import { GOLD, GOLD_DEEP, GOLD_SHINE, M } from "../materials.mjs";

// Local cel ramps: [base, shade, light].
const R = {
  robeViolet: { base: "#6a48b8", shade: "#4b2f8f", light: "#9a7ae0" },
  hatViolet: { base: "#5a2fa0", shade: "#3a1a6e", light: "#8a5ad0" },
  robeSage: { base: "#5e6e5a", shade: "#3c4a3a", light: "#86967e" },
  robeShadow: { base: "#3a3358", shade: "#221d3a", light: "#5a5080" },
  paleSkin: { base: "#c9c4b8", shade: "#8f897e", light: "#e6e2d8" },
  oldSkin: { base: "#e8b993", shade: "#b98864", light: "#fbd6b6" },
  white: { base: "#e9ecef", shade: "#aab2bd", light: "#ffffff" },
  coat: { base: "#5a4a3a", shade: "#3a2e24", light: "#7e6a52" },
  wood: { base: "#7a5230", shade: "#4e321c", light: "#a2743f" },
  page: { base: "#f4ead2", shade: "#c9b892", light: "#fffaf0" },
  rogue: { base: "#2f4a5a", shade: "#1c2e3a", light: "#4a6e80" },
  dirt: { base: "#4a3a5a", shade: "#2c2238", light: "#6a5680" },
};
const sm = (o, sv = [4, 4], hv = [3, 3], ow = 5) => ({ ...o, sv, hv, ow });

const RECIPES = {
  /** Humanoid — a young apprentice, oversized hat slipping over the eyes, zaps a small wobbly bolt from a stubby wand. */
  "apprentice-mage"() {
    const a = new Art("apprentice-mage");
    a.backdrop("#140a2e", "#2f1f62", "#1b1036", { pool: "#c77dff", poolAt: [250, 230], poolR: 250, poolAlpha: 0.3 });
    // Tower: stone wall, arched night window with stars and a crescent, a low shelf of books.
    a.fill("M0 0H512V340H0Z", "#24164c");
    a.line("M0 60H512M0 130H512M0 200H512M0 270H512M60 0V60M180 0V60M120 60V130M240 60V130M60 130V200M180 200V270M90 270V340M470 130V200M440 200V270", 3, "#1b1036", 0.8);
    a.fill("M330 290V150C330 104 370 84 400 84C430 84 470 104 470 150V290Z", "#3d2a7c");
    a.fill("M344 280V154C344 118 376 98 400 98C424 98 456 118 456 154V280Z", "#0e1a3a");
    a.fill("M432 128A22 22 0 1 0 446 160A17 17 0 1 1 432 128Z", "#e6f6ff", 0.85);
    a.motes({ seed: 5, count: 9, box: [352, 110, 448, 270], size: [2, 5], color: "#e6f6ff", alpha: [0.4, 0.9] });
    a.line("M400 98V280M344 200H456", 6, "#3d2a7c");
    a.fill("M40 250H190V262H40Z", "#4e321c");
    [[44, 18, "#3d6fc4"], [62, 14, "#b5179e"], [76, 20, "#5f9a4a"], [96, 12, "#a8742a"], [108, 18, "#3d6fc4"]].forEach(([x, w, c], i) =>
      a.fill(`M${x} 250V${200 + (i % 2) * 10}H${x + w}V250Z`, c, 0.55),
    );
    a.fill(poly([[130, 250], [140, 206], [160, 210], [150, 250]]), "#b5179e", 0.5);
    a.ground(340, "#1b1036", "#3b2a6b", { spot: "#c77dff", spotAt: [276, 404], spotR: 160 });
    a.shadow(276, 402, 96, 14);

    // Robe (long, a bit too big), shoes peeking out.
    a.mass(ellipse(246, 402, 20, 11), sm(M.leather));
    a.mass(ellipse(302, 404, 20, 11), sm(M.leather));
    a.mass(smooth([[244, 238], [312, 238], [336, 330], [348, 398], [276, 408], [210, 400], [222, 330]], true, 0.7), { ...R.robeViolet, sv: [12, 10] });
    a.line("M276 260V404", 4, INK, 0.35);
    a.fill(smooth([[214, 384], [276, 394], [342, 384], [346, 400], [276, 410], [210, 400]], true, 0.6), GOLD, 0.8);
    a.mass("M236 300L320 300L322 316L234 316Z", sm(M.leather, [3, 3], [2, 2], 4));
    // Book tucked under the far arm (viewer's right).
    a.mass(poly([[318, 276], [356, 266], [366, 318], [328, 328]]), sm({ base: "#3d6fc4", shade: "#24418a", light: "#6a95e0" }));
    a.fill(poly([[326, 282], [352, 275], [358, 306]]), GOLD, 0.6);
    a.mass(limb([[308, 252], [330, 290], [312, 310]], [28, 26, 24]), { ...R.robeViolet, sv: [6, 6] });
    // Casting arm reaching left: flared sleeve, hand, stubby wand.
    a.mass(limb([[250, 256], [214, 276], [184, 262]], [30, 30, 40]), { ...R.robeViolet, sv: [8, 8] });
    a.mass(limb([[174, 258], [140, 236]], [10, 8]), sm(R.wood, [3, 3], [2, 2], 4));
    a.mass(ellipse(176, 260, 13, 12), sm(M.skin));
    // Head: face, ear, hat brim slipping over the eyes, cone flopping over.
    a.mass(smooth([[248, 206], [262, 182], [300, 176], [324, 196], [322, 230], [300, 246], [268, 246], [250, 230]], true, 0.9), { ...M.skin, sv: [10, 8] });
    a.mass(ellipse(320, 216, 7, 10), sm(M.skin, [3, 3], [2, 2], 4));
    a.mass(smooth([[262, 180], [286, 150], [314, 120], [340, 112], [366, 124], [372, 142], [352, 136], [334, 150], [318, 186]], true, 0.8), { ...R.hatViolet, sv: [10, 8] });
    a.mass(ellipse(372, 140, 11), sm(M.gold));
    a.mass(smooth([[218, 210], [252, 186], [302, 178], [348, 190], [356, 206], [306, 204], [258, 214], [226, 222]], true, 0.8), { ...R.hatViolet, sv: [6, 6] });
    a.fill(star(298, 160, 5, 10, 4, -80), GOLD, 0.9).fill(star(330, 134, 5, 7, 3, -70), GOLD, 0.9);
    a.fill(ellipse(262, 226, 4, 3), INK, 0.6);
    a.fill(ellipse(274, 236, 6, 5), INK).fill(ellipse(250, 226, 8, 5), "#ff4d6d", 0.3).fill(ellipse(302, 228, 8, 5), "#ff4d6d", 0.3);
    a.line("M246 214C254 220 266 222 276 220", 3, INK, 0.5);
    // The bolt: small, wobbly, violet.
    a.glow(136, 230, 46, "#c77dff", 0.7);
    a.fill(star(136, 232, 6, 18, 7, -20), "#f0d8ff");
    const arc = zigzag([132, 226], [112, 150], { segments: 5, amp: 9, seed: 4 });
    a.line(arc, 13).line(arc, 7, "#c77dff").line(arc, 2.5, "#ffffff");
    a.glow(112, 146, 34, "#f0d8ff", 0.8);
    a.mass(star(112, 146, 5, 18, 7, -90), { base: "#ffffff", shade: "#e0b8ff", ow: 4, sv: [2, 2] });
    a.motes({ seed: 8, count: 8, box: [100, 130, 210, 270], size: [3, 6], color: ["#f0d8ff", "#c77dff"], alpha: [0.5, 1] });
    return a;
  },

  /** Humanoid — an old bearded archivist with round spectacles; a card floats up out of his glowing open tome. */
  scholar() {
    const a = new Art("scholar");
    a.backdrop("#1b1036", "#33245e", "#1b1036", { pool: "#ffd98a", poolAt: [210, 240], poolR: 260, poolAlpha: 0.25 });
    // Tall bookshelves with low-contrast spines.
    a.fill("M0 0H512V350H0Z", "#2a1c4e");
    const sp = ["#4b2f8f", "#3d6fc4", "#7a3456", "#5f9a4a", "#a8742a"];
    for (const [y, seed] of [[30, 1], [120, 2], [210, 3]]) {
      a.fill(`M0 ${y + 76}H512V${y + 88}H0Z`, "#1b1036");
      let x = 4, i = seed;
      while (x < 506) {
        const w = 12 + ((i * 7) % 11), h = 54 + ((i * 13) % 20);
        a.fill(`M${x} ${y + 76}V${y + 76 - h}H${x + w}V${y + 76}Z`, sp[i % 5], 0.42);
        x += w + 2;
        i++;
      }
    }
    for (const x of [0, 170, 340, 508]) a.fill(`M${x - 8} 0H${x + 8}V350H${x - 8}Z`, "#1b1036");
    a.ground(350, "#1b1036", "#3b2a6b", { spot: "#ffd98a", spotAt: [256, 408], spotR: 170 });
    // Candle on a book stack (left).
    a.mass(poly([[64, 360], [150, 360], [150, 378], [64, 378]]), sm({ base: "#7a3456", shade: "#4a1a3a", light: "#a8547a" }));
    a.mass(poly([[72, 342], [142, 342], [142, 360], [72, 360]]), sm({ base: "#3d6fc4", shade: "#24418a", light: "#6a95e0" }));
    a.mass(poly([[96, 290], [118, 290], [118, 342], [96, 342]]), sm(R.page));
    a.glow(107, 268, 60, "#ffbe0b", 0.6);
    a.mass(smooth([[107, 250], [116, 270], [107, 286], [98, 270]], true, 0.9), { base: "#ffe066", shade: "#ff7b00", light: "#fff8d6", ow: 3, sv: [2, 2], hv: [2, 2] });
    a.shadow(278, 404, 110, 16);

    // Robe (sage green), sleeves.
    a.mass(smooth([[232, 232], [330, 232], [362, 330], [374, 400], [278, 410], [196, 400], [206, 330]], true, 0.7), { ...R.robeSage, sv: [14, 10] });
    a.line("M282 250V404M244 330L226 400M322 330L340 400", 4, INK, 0.35);
    a.mass(limb([[226, 252], [190, 300], [204, 330]], [36, 34, 32]), { ...R.robeSage, sv: [8, 8] });
    a.mass(limb([[336, 252], [356, 300], [330, 326]], [36, 34, 32]), { ...R.robeSage, sv: [8, 8] });
    // Head: bald crown, white tufts, long beard, spectacles.
    a.mass(blob(236, 186, 22, 20, { seed: 3, n: 7, jitter: 0.25 }), sm(R.white, [5, 5], [3, 3], 5));
    a.mass(blob(334, 184, 22, 20, { seed: 4, n: 7, jitter: 0.25 }), sm(R.white, [5, 5], [3, 3], 5));
    a.mass(smooth([[244, 176], [258, 132], [290, 120], [322, 134], [330, 176], [318, 214], [286, 226], [254, 214]], true, 0.9), { ...R.oldSkin, sv: [12, 10] });
    a.line("M262 140C276 132 296 132 310 140", 3, INK, 0.3);
    a.mass(smooth([[248, 200], [270, 212], [300, 212], [324, 200], [330, 240], [312, 282], [286, 306], [262, 280], [246, 240]], true, 0.85), { ...R.white, sv: [10, 8] });
    a.line("M268 236L274 270M286 230V292M304 236L298 270", 3, "#aab2bd");
    a.mass(smooth([[262, 206], [286, 196], [310, 206], [296, 214], [286, 210], [276, 214]], true, 0.8), sm(R.white, [3, 3], [2, 2], 4));
    a.line("M254 168L272 162M300 162L318 168", 5, "#e9ecef");
    a.line("M254 168L272 162M300 162L318 168", 2, INK, 0.5);
    a.fill(ellipse(266, 180, 3.5), INK).fill(ellipse(306, 180, 3.5), INK);
    a.line(`${ellipse(266, 180, 13)}${ellipse(306, 180, 13)}M279 180H293`, 3.5, GOLD_DEEP);
    a.fill(ellipse(262, 176, 4, 3), "#ffffff", 0.7).fill(ellipse(302, 176, 4, 3), "#ffffff", 0.7);
    a.mass(ellipse(286, 196, 7, 6), sm(R.oldSkin, [2, 2], [2, 2], 4));
    // Big open tome, glowing, held in both hands.
    a.glow(226, 300, 110, "#ffd98a", 0.55);
    a.mass(poly([[150, 310], [228, 290], [306, 310], [300, 334], [228, 318], [156, 334]]), sm({ base: "#7a3456", shade: "#4a1a3a", light: "#a8547a" }, [5, 5], [3, 3], 6));
    a.mass(poly([[156, 304], [226, 274], [230, 308], [162, 324]]), sm(R.page, [4, 4], [3, 3], 4));
    a.mass(poly([[230, 308], [226, 274], [298, 302], [294, 322]]), sm(R.page, [4, 4], [3, 3], 4));
    a.line("M172 306L214 290M174 314L212 300M244 296L282 310M244 304L280 316", 3, "#c9b892");
    a.mass(ellipse(160, 324, 14, 12), sm(R.oldSkin));
    a.mass(ellipse(298, 326, 14, 12), sm(R.oldSkin));
    // The drawn card rising out of the tome.
    a.line("M226 280C214 250 206 230 196 208", 12, "#ffe066", 0.35);
    a.glow(190, 178, 70, "#ffe066", 0.6);
    a.begin("rotate(-16 190 178)");
    a.mass(poly([[164, 140], [216, 140], [216, 216], [164, 216]]), { base: "#4b2f8f", shade: "#2f1f62", light: "#6a48b8", sv: [6, 6], hv: [4, 4], ow: 5 });
    a.line("M172 148H208V208H172Z", 3, GOLD);
    a.fill(star(190, 178, 4, 18, 6, -90), GOLD_SHINE);
    a.end();
    a.motes({ seed: 12, count: 12, box: [140, 120, 320, 300], size: [3, 7], color: ["#ffe066", GOLD_SHINE, "#c77dff"], alpha: [0.5, 1] });
    return a;
  },

  /** Humanoid — a gaunt, upright necromancer: skull staff in one hand, the other raised; small skeletons claw up. */
  necromancer() {
    const a = new Art("necromancer");
    a.backdrop("#0b0418", "#241446", "#120624", { pool: "#7bd389", poolAt: [256, 200], poolR: 240, poolAlpha: 0.14 });
    a.glow(256, 210, 230, "#8e5bd8", 0.35);
    // Graveyard: tombstones, crooked fence, mist.
    a.fill("M0 340V300L40 296L48 340Z", "#1b0d38");
    for (let x = 0; x < 512; x += 34) a.fill(poly([[x, 340], [x, 262 + (x % 3) * 6], [x + 6, 252 + (x % 3) * 6], [x + 12, 262 + (x % 3) * 6], [x + 12, 340]]), "#140a2c");
    a.fill("M0 282H512V290H0Z", "#140a2c");
    a.fill("M60 340V262C60 238 110 238 110 262V340Z", "#2a1a4a").fill("M408 340V250C408 222 460 222 460 250V340Z", "#2a1a4a");
    a.fill("M430 256H438V272H450V280H438V310H430V280H418V272H430Z", "#1b0d38");
    a.ground(340, "#120624", "#2a1458", { spot: "#c77dff", spotAt: [256, 396], spotR: 200 });
    a.fill(blob(120, 360, 140, 18, { seed: 2, n: 8 }), "#8e5bd8", 0.2).fill(blob(400, 352, 140, 16, { seed: 6, n: 8 }), "#8e5bd8", 0.2);
    a.shadow(262, 398, 80, 12);

    const robe = { ...R.robeShadow, rim: "#c77dff", rv: 4 };
    // Skull-topped staff (viewer's right), planted.
    a.mass(limb([[336, 404], [334, 260], [332, 150]], [14, 12, 12]), sm({ base: "#4a3a5a", shade: "#2a1f3a", light: "#7a6a94" }, [4, 4], [3, 3], 5));
    // Long narrow robe, upright (no flare), sash.
    a.mass(smooth([[240, 196], [292, 196], [306, 300], [312, 402], [258, 410], [210, 402], [222, 300]], true, 0.6), { ...robe, sv: [12, 10] });
    a.line("M262 230V404M238 300L230 400M290 300L296 400", 4, INK, 0.5);
    a.fill("M228 286L300 278L302 292L228 300Z", "#7a2a6a");
    a.mass(poly([[254, 296], [270, 294], [278, 340], [262, 344]]), sm({ base: "#7a2a6a", shade: "#4a1a3a", light: "#a8547a" }, [3, 3], [2, 2], 4));
    // Staff arm: sleeve to the staff, pale hand.
    a.mass(limb([[284, 214], [312, 250], [330, 258]], [26, 24, 30]), { ...robe, sv: [6, 6] });
    a.mass(ellipse(334, 256, 12, 13), sm(R.paleSkin));
    // Skull + glow atop the staff.
    a.glow(332, 136, 56, "#c77dff", 0.7);
    a.mass(smooth([[316, 138], [318, 116], [332, 106], [348, 116], [350, 138], [342, 150], [322, 150]], true, 0.95), sm(M.bone, [5, 5], [3, 3], 5));
    a.fill(ellipse(326, 130, 5, 6), INK).fill(ellipse(340, 130, 5, 6), INK);
    a.fill(ellipse(326, 130, 2.5), "#e9c8ff").fill(ellipse(340, 130, 2.5), "#e9c8ff");
    a.line("M326 146V152M333 146V153M340 146V152", 3);
    // Commanding arm raised high (viewer's left), splayed bony fingers, violet sigil.
    a.mass(limb([[242, 214], [206, 192], [186, 150]], [26, 22, 26]), { ...robe, sv: [6, 6] });
    a.mass(ellipse(184, 138, 12, 14), sm(R.paleSkin));
    for (const [dx, dy] of [[-14, -16], [-4, -22], [8, -20], [14, -8]]) a.mass(limb([[184, 132], [184 + dx, 132 + dy]], [7, 4], { capEnd: false }), sm(R.paleSkin, [2, 2], [1, 1], 3));
    a.glow(182, 112, 46, "#c77dff", 0.8);
    a.line(`${ellipse(182, 104, 20)}M182 84V124M162 104H202`, 3, "#e0b8ff", 0.8);
    // Head: hood (narrow), gaunt pale face, glowing eyes, goatee.
    a.mass("M234 196C226 160 236 126 264 112C292 126 302 160 296 196C286 206 276 210 264 210C252 210 242 206 234 196Z", { ...robe, sv: [10, 8] });
    a.mass(smooth([[246, 150], [264, 132], [284, 150], [284, 180], [272, 202], [258, 202], [246, 180]], true, 0.9), { ...R.paleSkin, sv: [6, 5], hv: [4, 4] });
    a.fill("M246 132C254 128 276 128 284 134L284 148C276 142 254 142 246 148Z", "#160b2e");
    a.line("M250 158L262 162M282 158L270 162", 4);
    a.glow(256, 166, 12, "#e0b8ff", 0.9).glow(276, 166, 12, "#e0b8ff", 0.9);
    a.fill(ellipse(256, 166, 3.5, 2.5), "#ffffff").fill(ellipse(276, 166, 3.5, 2.5), "#ffffff");
    a.line("M252 178L256 186M280 178L276 186", 2.5, INK, 0.5);
    a.mass(poly([[260, 192], [272, 192], [266, 214]]), sm({ base: "#2a2448", shade: "#160b2e" }, [2, 2], [1, 1], 3));
    a.line("M260 190H272", 2.5);
    // Two little skeletons rising from the lit earth.
    const bone = { ...M.bone, rim: "#c77dff", rv: 3 };
    for (const [x, y, s, flip] of [[140, 392, 1, 1], [390, 396, 0.85, -1]]) {
      a.glow(x, y - 10, 50 * s, "#c77dff", 0.45);
      a.mass(smooth([[x - 22 * s, y - 32 * s], [x - 16 * s, y - 58 * s], [x, y - 66 * s], [x + 16 * s, y - 58 * s], [x + 22 * s, y - 32 * s], [x + 10 * s, y - 20 * s], [x - 10 * s, y - 20 * s]], true, 0.95), sm(bone, [4, 4], [3, 3], 5));
      a.fill(ellipse(x - 8 * s, y - 42 * s, 5 * s, 6 * s), INK).fill(ellipse(x + 8 * s, y - 42 * s, 5 * s, 6 * s), INK);
      a.fill(ellipse(x - 8 * s, y - 42 * s, 2 * s), "#e9c8ff").fill(ellipse(x + 8 * s, y - 42 * s, 2 * s), "#e9c8ff");
      const hx = x + flip * 40 * s;
      a.mass(limb([[hx, y + 4], [hx + flip * 4, y - 30 * s]], [9, 8]), sm(bone, [2, 2], [1, 1], 4));
      for (const dx of [-10, 0, 10]) a.mass(limb([[hx + flip * 4, y - 30 * s], [hx + flip * 4 + dx * s, y - 46 * s]], [6, 3], { capEnd: false }), sm(bone, [1, 1], [1, 1], 3));
      a.mass(blob(x + flip * 14 * s, y + 2, 56 * s, 12 * s, { seed: x, n: 8 }), sm(R.dirt, [6, 6], [3, 3], 5));
    }
    a.motes({ seed: 17, count: 14, box: [90, 100, 430, 390], size: [3, 7], color: ["#c77dff", "#e9e2cf"], alpha: [0.35, 0.9], shape: "circle" });
    return a;
  },

  /** Humanoid — a hunched gravedigger in a wide-brim hat leaning on his shovel; a bony hand pokes out of the new grave. */
  "grave-digger"() {
    const a = new Art("grave-digger");
    a.backdrop("#0e1430", "#262a5a", "#141030", { pool: "#9aa6d8", poolAt: [300, 200], poolR: 240, poolAlpha: 0.22 });
    // Night cemetery: hill, leaning crosses, a chapel silhouette.
    a.fill("M0 300C120 260 240 270 340 250C420 236 470 250 512 260V350H0Z", "#1b1840");
    a.fill("M392 252V176L420 146L448 176V252Z", "#151236").fill("M416 120H424V146H416Z", "#151236").fill("M410 130H430V136H410Z", "#151236");
    a.fill(ellipse(420, 196, 6, 9), "#ffd98a", 0.6);
    for (const [x, y, r] of [[40, 300, -8], [92, 290, 6], [480, 268, 10]]) {
      a.begin(`rotate(${r} ${x} ${y})`);
      a.fill(`M${x - 4} ${y}V${y - 46}H${x + 4}V${y}ZM${x - 16} ${y - 34}H${x + 16}V${y - 26}H${x - 16}Z`, "#2a2558");
      a.end();
    }
    a.ground(338, "#141030", "#2e2860", { spot: "#ffbe0b", spotAt: [330, 404], spotR: 170 });
    // Open grave (left) with dirt pile and a bony hand poking out.
    a.fill(ellipse(140, 394, 70, 17), "#0b0418");
    a.mass(blob(96, 372, 46, 26, { seed: 5, n: 8, jitter: 0.2 }), sm(R.dirt, [6, 6], [4, 4], 5));
    a.mass(shard(70, 348, 10, 8, { seed: 2 }), sm(R.dirt, [2, 2], [2, 2], 3));
    a.glow(126, 360, 40, "#c77dff", 0.5);
    a.mass(limb([[130, 398], [124, 362]], [12, 11]), sm(M.bone, [2, 2], [2, 2], 4));
    a.mass(ellipse(124, 356, 11, 9), sm(M.bone, [2, 2], [2, 2], 4));
    for (const dx of [-14, -5, 5, 14]) a.mass(limb([[124 + dx * 0.4, 352], [124 + dx, 330 + Math.abs(dx)]], [6, 3], { capEnd: false }), sm(M.bone, [1, 1], [1, 1], 3));
    a.shadow(300, 404, 96, 14);

    // Lantern on the ground (right), warm glow.
    a.glow(380, 372, 90, "#ffbe0b", 0.55);
    a.mass(poly([[364, 360], [396, 360], [400, 400], [360, 400]]), sm({ base: "#3a2e24", shade: "#1d1612", light: "#5a4a3a" }, [3, 3], [2, 2], 5));
    a.fill(poly([[368, 366], [392, 366], [394, 394], [366, 394]]), "#ffe066");
    a.fill(ellipse(380, 384, 5, 8), "#fff8d6");
    a.line("M368 360C368 340 392 340 392 360", 4);
    // Legs (bent), boots.
    a.mass(limb([[284, 316], [272, 354], [268, 390]], [30, 26, 24]), sm(R.coat, [6, 6], [4, 4], 6));
    a.mass(limb([[318, 316], [328, 356], [326, 390]], [30, 26, 24]), sm(R.coat, [6, 6], [4, 4], 6));
    a.mass("M240 406C240 392 252 386 266 386L282 386V406Z", sm(M.leather));
    a.mass("M312 406V386L330 386C344 388 350 398 348 406Z", sm(M.leather));
    // Hunched long coat, leaning forward-left.
    a.mass(smooth([[250, 236], [296, 214], [340, 230], [352, 300], [344, 340], [300, 350], [262, 340], [246, 290]], true, 0.8), { ...R.coat, sv: [12, 10] });
    a.line("M296 240L300 340", 4, INK, 0.4);
    a.mass(blob(296, 232, 40, 18, { seed: 9, n: 8, jitter: 0.15 }), sm({ base: "#7a3456", shade: "#4a1a3a", light: "#a8547a" }, [5, 5], [3, 3], 5));
    // The shovel: handle angled, blade dug into the dirt pile.
    a.mass(limb([[214, 220], [196, 300], [178, 352]], [12, 12, 10]), sm(R.wood, [3, 3], [2, 2], 5));
    a.mass(poly([[160, 346], [200, 358], [190, 392], [166, 396], [150, 384]]), sm(M.steel, [5, 5], [3, 3], 5));
    a.mass(limb([[204, 214], [226, 222]], 10), sm(R.wood, [2, 2], [2, 2], 4));
    // Arms: both hands stacked on the handle top.
    a.mass(limb([[274, 236], [244, 256], [222, 236]], [28, 26, 26]), { ...R.coat, sv: [6, 6] });
    a.mass(limb([[318, 244], [270, 262], [228, 248]], [28, 26, 26]), { ...R.coat, sv: [6, 6] });
    a.mass(ellipse(218, 230, 13, 12), sm(R.oldSkin));
    a.mass(ellipse(222, 250, 13, 11), sm(R.oldSkin));
    // Head forward-left: long nose, stubble, wide-brim hat.
    a.mass(smooth([[218, 200], [226, 172], [258, 162], [284, 176], [286, 208], [266, 228], [236, 228]], true, 0.9), { ...R.oldSkin, sv: [10, 8] });
    a.mass(smooth([[218, 196], [204, 206], [212, 214], [228, 210]], true, 0.8), sm(R.oldSkin, [3, 3], [2, 2], 4));
    a.fill(smooth([[222, 214], [250, 226], [274, 220], [270, 230], [246, 234], [226, 226]], true, 0.8), "#5a4a3a", 0.6);
    a.fill(ellipse(240, 192, 4, 4.5), INK).fill(ellipse(239, 190, 1.5), "#ffffff");
    a.line("M230 182L248 186", 4);
    a.line("M234 216C240 218 246 218 250 216", 3);
    a.mass(smooth([[180, 172], [230, 156], [296, 156], [324, 170], [300, 178], [232, 178], [190, 184]], true, 0.7), sm({ base: "#3a2e24", shade: "#1d1612", light: "#5a4a3a" }, [5, 5], [3, 3], 5));
    a.mass(smooth([[226, 162], [234, 124], [266, 116], [290, 124], [292, 162]], true, 0.6), { base: "#3a2e24", shade: "#1d1612", light: "#5a4a3a", sv: [8, 6], hv: [4, 4] });
    a.fill("M228 148H292V158H228Z", "#7a3456");
    a.motes({ seed: 22, count: 6, box: [340, 330, 420, 380], size: [2, 4], color: "#ffe066", alpha: [0.4, 0.9] });
    return a;
  },

  /** Humanoid — a hooded, masked thief crouched on a rooftop, dagger back, plucking a ghostly card toward her hand. */
  "soul-thief"() {
    const a = new Art("soul-thief");
    a.backdrop("#0b0b22", "#1e2a50", "#120a26", { pool: "#4ee6d0", poolAt: [170, 200], poolR: 220, poolAlpha: 0.22 });
    a.fill(blob(380, 140, 200, 60, { seed: 3, n: 9, jitter: 0.3 }), "#8e5bd8", 0.12);
    // Distant town skyline + crescent.
    a.fill("M410 70A30 30 0 1 0 440 112A22 22 0 1 1 410 70Z", "#e6f6ff", 0.75);
    a.fill("M0 300V220H40V190H70V230H110V170L130 150L150 170V240H200V210H240V260H300V200H330V180H350V240H400V190L420 170L440 190V230H480V210H512V300Z", "#141432");
    for (const [x, y] of [[54, 206], [124, 186], [212, 226], [316, 214], [424, 204], [490, 226]]) a.fill(`M${x} ${y}h8v10h-8Z`, "#ffbe0b", 0.5);
    // Rooftop: slanted tiles, chimney.
    a.mass("M0 352L512 300V512H0Z", { base: "#3a2a5a", shade: "#22163a", light: "#54407a", ow: 5, sv: [0, 10], hv: [0, 4] });
    a.line("M0 392L512 340M0 436L512 384M0 480L512 428M60 346V512M150 336V512M240 328V512M330 318V512M420 308V512", 3, INK, 0.35);
    a.mass(poly([[430, 250], [478, 250], [478, 312], [430, 316]]), sm({ base: "#5a3a3a", shade: "#3a2424", light: "#7a5050" }, [6, 6], [3, 3], 5));
    a.fill(blob(450, 220, 30, 20, { seed: 7 }), "#8e5bd8", 0.2);
    a.shadow(290, 372, 100, 14);

    const cloak = { ...R.rogue, rim: "#4ee6d0", rv: 4 };
    // Cloak sweeping back behind her.
    a.mass(smooth([[288, 196], [350, 220], [410, 270], [436, 330], [380, 316], [340, 340], [300, 300]], true, 0.85), { ...cloak, sv: [12, 10] });
    // Back leg kneeling, front leg bent.
    a.mass(limb([[318, 300], [356, 340], [328, 362], [300, 364]], [34, 30, 26, 22]), sm({ base: "#2a2448", shade: "#160b2e", light: "#44406a" }, [6, 6], [4, 4], 6));
    a.mass(limb([[270, 302], [240, 330], [250, 368]], [34, 30, 26]), sm({ base: "#2a2448", shade: "#160b2e", light: "#44406a" }, [6, 6], [4, 4], 6));
    a.mass("M222 376C222 362 234 356 248 356L266 358V376Z", sm(M.leather));
    // Leaning torso.
    a.mass(smooth([[248, 230], [290, 208], [330, 230], [328, 290], [300, 314], [258, 310], [244, 270]], true, 0.8), { ...cloak, sv: [12, 10] });
    a.mass("M250 286L326 278L328 294L252 302Z", sm(M.leather, [3, 3], [2, 2], 4));
    // Dagger arm drawn back (viewer's right).
    a.mass(limb([[318, 244], [354, 270], [376, 262]], [24, 22, 20]), { ...cloak, sv: [6, 6] });
    a.mass(ellipse(380, 262, 11, 10), sm(M.skin));
    a.mass(limb([[384, 266], [404, 296], [412, 320]], [12, 10, 2], { capEnd: false }), sm(M.steel, [3, 3], [2, 2], 4));
    a.line("M388 272L406 304", 2, "#ffffff", 0.7);
    a.mass(limb([[372, 258], [392, 276]], 7), sm(M.gold, [2, 2], [1, 1], 4));
    // Reaching arm (viewer's left), open hand.
    a.mass(limb([[256, 240], [214, 236], [180, 222]], [26, 22, 20]), { ...cloak, sv: [6, 6] });
    a.mass(ellipse(172, 220, 12, 11), sm(M.skin));
    for (const [dx, dy] of [[-14, -10], [-16, 0], [-12, 9]]) a.mass(limb([[166, 220], [166 + dx, 220 + dy]], [6, 5]), sm(M.skin, [1, 1], [1, 1], 3));
    // The stolen card: ghostly, teal, trailing soul wisps.
    a.glow(132, 176, 80, "#4ee6d0", 0.6);
    a.fill(smooth([[160, 210], [136, 196], [118, 200], [142, 186], [168, 200]], true, 0.9), "#4ee6d0", 0.4);
    a.begin("rotate(18 128 166)");
    a.mass(poly([[104, 132], [152, 132], [152, 200], [104, 200]]), { base: "#9ff5e8", shade: "#4ee6d0", light: "#e6fffb", sv: [5, 5], hv: [3, 3], ow: 5 });
    a.line("M111 139H145V193H111Z", 3, "#1c8a80");
    a.fill(star(128, 166, 4, 16, 5, -90), "#1c8a80");
    a.end();
    a.line("M110 230C90 214 92 196 104 186M150 236C140 226 146 212 156 208", 4, "#9ff5e8", 0.6);
    // Head: deep hood, masked lower face, sharp eyes.
    a.mass("M238 210C226 172 238 136 270 124C300 128 318 156 314 196C306 214 290 222 270 222C254 222 244 218 238 210Z", { ...cloak, sv: [10, 8] });
    a.mass(smooth([[248, 168], [270, 152], [294, 162], [298, 190], [282, 210], [258, 206], [246, 188]], true, 0.9), { ...M.skin, sv: [6, 5], hv: [4, 4] });
    a.mass("M246 186C260 194 284 194 300 186L298 208C284 216 260 216 248 206Z", sm({ base: "#2a2448", shade: "#160b2e", light: "#44406a" }, [3, 3], [2, 2], 4));
    a.fill("M244 160C256 150 284 148 300 160L300 166C284 158 258 160 246 168Z", "#160b2e");
    a.fill(poly([[254, 176], [270, 172], [268, 180]]), "#4ee6d0").fill(poly([[278, 172], [294, 176], [280, 180]]), "#4ee6d0");
    a.fill(ellipse(263, 176, 2.5), INK).fill(ellipse(285, 176, 2.5), INK);
    a.line("M252 170L268 168M282 168L296 172", 3.5);
    a.motes({ seed: 31, count: 12, box: [90, 120, 260, 280], size: [3, 7], color: ["#9ff5e8", "#4ee6d0", "#c77dff"], alpha: [0.4, 1], shape: "circle" });
    return a;
  },
};

export default RECIPES;
