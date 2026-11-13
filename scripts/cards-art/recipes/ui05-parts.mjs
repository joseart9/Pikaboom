// UI-05 shared parts (undead, demons, dragons). Build-time only; see art.mjs / docs/cards/UI_VISUAL_SYSTEM.md §6.
// Reusable *geometry builders*, not finished figures: every recipe still poses, scales and colors them itself.
import { INK, ellipse, f, limb, mix, pt, smooth } from "../lib.mjs";

/**
 * Membrane wing (bat, imp, drake, dragon). `root`/`rootLow` = where the membrane meets the body, `wrist` = the bent
 * joint, `tips` = finger tips from the leading edge back. The trailing edge between tips is scalloped toward the wrist.
 */
export function wing(a, { root, rootLow, wrist, tips, mem, bone, sag = 0.3, boneW = 12, vein = true }) {
  let d = `M${pt(root)}L${pt(wrist)}L${pt(tips[0])}`;
  const edge = [...tips, rootLow];
  for (let i = 1; i < edge.length; i++) {
    const p = edge[i - 1], q = edge[i];
    d += `Q${pt(mix(mix(p, q, 0.5), wrist, sag))} ${pt(q)}`;
  }
  a.mass(d + "Z", { ...mem, ow: 5, sv: [8, 8], hv: [5, 5] });
  if (vein) for (const t of tips.slice(1)) a.line(`M${pt(wrist)}L${pt(mix(wrist, t, 0.94))}`, 3, INK, 0.55);
  a.mass(limb([root, wrist], [boneW, boneW * 0.8]), { ...bone, ow: 4, sv: [3, 3], hv: [2, 2] });
  a.mass(limb([wrist, mix(wrist, tips[0], 0.97)], [boneW * 0.8, boneW * 0.3]), { ...bone, ow: 4, sv: [3, 3], hv: [2, 2] });
  return a;
}

/** Small skull (front view) at (x, y) with size s (≈ cranium radius). `eye` = socket glow color or null. */
export function skull(a, x, y, s, paint, eye) {
  a.mass(smooth([[x - s, y], [x - s * 0.8, y - s * 0.75], [x, y - s], [x + s * 0.8, y - s * 0.75], [x + s, y], [x + s * 0.6, y + s * 0.62], [x - s * 0.6, y + s * 0.62]], true, 0.9), { ...paint, ow: Math.max(3, s / 5), sv: [s / 4, s / 4], hv: [s / 6, s / 6] });
  a.add(`<path d="M${f(x - s * 0.42)} ${f(y + s * 0.6)}h${f(s * 0.84)}v${f(s * 0.32)}h${f(-s * 0.84)}Z" fill="${paint.shade}" stroke-width="${f(Math.max(3, s / 5))}"/>`);
  if (eye) a.glow(x, y - s * 0.05, s * 1.1, eye, 0.55);
  a.fill(ellipse(x - s * 0.4, y, s * 0.28, s * 0.3) + ellipse(x + s * 0.4, y, s * 0.28, s * 0.3) + `M${f(x)} ${f(y + s * 0.22)}l${f(s * 0.12)} ${f(s * 0.22)}h${f(-s * 0.24)}Z`, INK);
  if (eye) a.fill(ellipse(x - s * 0.4, y, s * 0.1) + ellipse(x + s * 0.4, y, s * 0.1), eye);
  return a;
}

/** A long bone (femur/arm) between p and q with knobbed ends — one mass (shaft + four knobs as subpaths). */
export function bone(a, p, q, w, paint) {
  const n = [q[1] - p[1], p[0] - q[0]], l = Math.hypot(...n) || 1;
  let d = limb([p, q], [w * 0.7, w * 0.7]);
  for (const e of [p, q]) for (const s of [-1, 1]) d += ellipse(e[0] + (n[0] / l) * w * 0.32 * s, e[1] + (n[1] / l) * w * 0.32 * s, w * 0.42);
  return a.mass(d, { ...paint, ow: 4, sv: [3, 3], hv: [2, 2] });
}

/** A blood / venom / water drop pointing up, bottom at (x, y). */
export const drop = (x, y, s) => `M${f(x)} ${f(y - s * 2.1)}C${f(x + s * 0.4)} ${f(y - s * 1.2)} ${f(x + s)} ${f(y - s * 0.8)} ${f(x + s)} ${f(y - s * 0.1)}A${f(s)} ${f(s)} 0 0 1 ${f(x - s)} ${f(y - s * 0.1)}C${f(x - s)} ${f(y - s * 0.8)} ${f(x - s * 0.4)} ${f(y - s * 1.2)} ${f(x)} ${f(y - s * 2.1)}Z`;
