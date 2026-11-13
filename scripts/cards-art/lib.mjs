// Shared, offline art grammar for Duelo Arcano card illustrations (UI-03, docs/cards/UI_VISUAL_SYSTEM.md §6).
// Build-time only: recipes in art.mjs import these helpers and write self-contained static SVGs to public/cards/art/.
// Nothing here is imported by the app.
//
// The core primitive is `Art#mass(d, paint)`: one silhouette painted in the house cel style — ink outline, a shadow
// band on the lower right, an optional element/rarity rim on the right edge, a light band on the upper left — built from
// ONE path definition reused through <use> and two clip paths (cheap in bytes, no <filter>).

export const INK = "#1d0842";
/** Coordinates are written as integers (sub-unit detail is invisible at card sizes and costs bytes). */
export const f = (n) => Math.round(+n);
export const pt = ([x, y]) => `${f(x)} ${f(y)}`;
/** Open jagged polyline between two points (arcs, lightning, cracks) — stroke it with `Art#line`. */
export function zigzag(a, b, { segments = 6, amp = 14, seed = 1 } = {}) {
  const r = rng(seed);
  const dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy);
  const pts = [a];
  for (let i = 1; i < segments; i++) {
    const off = (i % 2 ? 1 : -1) * amp * (0.5 + r() * 0.7);
    pts.push([a[0] + (dx * i) / segments + (-dy / l) * off, a[1] + (dy * i) / segments + (dx / l) * off]);
  }
  pts.push(b);
  return "M" + pts.map(pt).join("L");
}
/** Straight-edged closed polygon. */
export const poly = (pts) => "M" + pts.map(pt).join("L") + "Z";
export const polar = (cx, cy, r, deg) => [cx + r * Math.cos((deg * Math.PI) / 180), cy + r * Math.sin((deg * Math.PI) / 180)];
export const lerp = (a, b, t) => a + (b - a) * t;
export const mix = ([ax, ay], [bx, by], t) => [lerp(ax, bx, t), lerp(ay, by, t)];

/** Ellipse / circle as a path (so it can be a `mass`). */
export const ellipse = (cx, cy, rx, ry = rx) =>
  `M${f(cx - rx)} ${f(cy)}A${f(rx)} ${f(ry)} 0 1 0 ${f(cx + rx)} ${f(cy)}A${f(rx)} ${f(ry)} 0 1 0 ${f(cx - rx)} ${f(cy)}Z`;

/** Deterministic PRNG (mulberry32) so regenerating a recipe gives the same file. */
export function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Catmull-Rom spline through the points as cubic Béziers (closed by default). `k` = tension (0 = straight). */
export function smooth(pts, closed = true, k = 1) {
  const n = pts.length;
  const at = (i) => (closed ? pts[(i + n) % n] : pts[Math.max(0, Math.min(n - 1, i))]);
  let d = `M${pt(pts[0])}`;
  const last = closed ? n : n - 1;
  for (let i = 0; i < last; i++) {
    const p0 = at(i - 1), p1 = at(i), p2 = at(i + 1), p3 = at(i + 2);
    const c1 = [p1[0] + ((p2[0] - p0[0]) / 6) * k, p1[1] + ((p2[1] - p0[1]) / 6) * k];
    const c2 = [p2[0] - ((p3[0] - p1[0]) / 6) * k, p2[1] - ((p3[1] - p1[1]) / 6) * k];
    d += `C${pt(c1)} ${pt(c2)} ${pt(p2)}`;
  }
  return closed ? d + "Z" : d;
}

/**
 * A tapered, rounded limb around a polyline (bones, arms, legs, tails, necks, horns, tentacles, flames).
 * `widths` = full width at each point (a number = constant). `capEnd = false` gives a sharp tip (horns, claws).
 */
export function limb(pts, widths, { capStart = true, capEnd = true } = {}) {
  const n = pts.length;
  const w = (i) => (Array.isArray(widths) ? widths[i] : widths) / 2;
  const normal = (i) => {
    const a = pts[Math.max(0, i - 1)], b = pts[Math.min(n - 1, i + 1)];
    const dx = b[0] - a[0], dy = b[1] - a[1];
    const l = Math.hypot(dx, dy) || 1;
    return [-dy / l, dx / l];
  };
  const left = [], right = [];
  for (let i = 0; i < n; i++) {
    const [nx, ny] = normal(i);
    left.push([pts[i][0] + nx * w(i), pts[i][1] + ny * w(i)]);
    right.push([pts[i][0] - nx * w(i), pts[i][1] - ny * w(i)]);
  }
  const dir = (i, j) => {
    const dx = pts[j][0] - pts[i][0], dy = pts[j][1] - pts[i][1];
    const l = Math.hypot(dx, dy) || 1;
    return [dx / l, dy / l];
  };
  const [ex, ey] = dir(n - 2, n - 1), [sx, sy] = dir(1, 0);
  const endTip = [pts[n - 1][0] + ex * w(n - 1) * (capEnd ? 1 : 0), pts[n - 1][1] + ey * w(n - 1) * (capEnd ? 1 : 0)];
  const startTip = [pts[0][0] + sx * w(0) * (capStart ? 1 : 0), pts[0][1] + sy * w(0) * (capStart ? 1 : 0)];
  const ring = [...left, endTip, ...right.reverse(), startTip];
  return smooth(ring, true, 0.9);
}

/** Irregular rounded closed shape (rocks, clouds, smoke, bushes, fur tufts). */
export function blob(cx, cy, rx, ry, { n = 9, jitter = 0.15, seed = 1, rot = 0 } = {}) {
  const r = rng(seed);
  const pts = Array.from({ length: n }, (_, i) => {
    const a = rot + (i * 360) / n;
    const k = 1 - jitter + r() * jitter * 2;
    return [cx + Math.cos((a * Math.PI) / 180) * rx * k, cy + Math.sin((a * Math.PI) / 180) * ry * k];
  });
  return smooth(pts, true, 1);
}

/** Flat-cut faceted rock / crystal: polygon with random radial jitter. */
export function shard(cx, cy, rx, ry, { n = 7, jitter = 0.2, seed = 1, rot = 0 } = {}) {
  const r = rng(seed);
  return poly(
    Array.from({ length: n }, (_, i) => {
      const a = rot + (i * 360) / n;
      const k = 1 - jitter + r() * jitter * 2;
      return [cx + Math.cos((a * Math.PI) / 180) * rx * k, cy + Math.sin((a * Math.PI) / 180) * ry * k];
    }),
  );
}

/** N-point star (sparks, impact bursts). */
export function star(cx, cy, n, ro, ri, start = -90) {
  return poly(Array.from({ length: n * 2 }, (_, i) => polar(cx, cy, i % 2 ? ri : ro, start + (i * 180) / n)));
}

/** Jagged bolt between two points (arcane arcs, lightning). Returns an open polyline as a thin closed ribbon. */
export function bolt(a, b, { segments = 6, amp = 14, width = 6, seed = 1 } = {}) {
  const r = rng(seed);
  const pts = [a];
  for (let i = 1; i < segments; i++) {
    const t = i / segments;
    const [x, y] = mix(a, b, t);
    const dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy);
    const off = (r() * 2 - 1) * amp;
    pts.push([x + (-dy / l) * off, y + (dx / l) * off]);
  }
  pts.push(b);
  const w = pts.map((_, i) => width * (1 - (0.6 * i) / (pts.length - 1)));
  const n = pts.length;
  const left = [], right = [];
  for (let i = 0; i < n; i++) {
    const p = pts[Math.max(0, i - 1)], q = pts[Math.min(n - 1, i + 1)];
    const dx = q[0] - p[0], dy = q[1] - p[1], l = Math.hypot(dx, dy) || 1;
    left.push([pts[i][0] - (dy / l) * w[i] / 2, pts[i][1] + (dx / l) * w[i] / 2]);
    right.push([pts[i][0] + (dy / l) * w[i] / 2, pts[i][1] - (dx / l) * w[i] / 2]);
  }
  return poly([...left, ...right.reverse()]);
}

const stops = (list) =>
  list.map(([o, c, a]) => `<stop offset="${o}" stop-color="${c}"${a !== undefined && a !== 1 ? ` stop-opacity="${a}"` : ""}/>`).join("");

/**
 * One card illustration under construction. Every id is prefixed with the art key (ART_GUIDE §2), every color is a
 * palette hex, and `toString()` returns the final self-contained file for viewBox 0 0 512 512.
 */
export class Art {
  constructor(key) {
    this.key = key;
    this.n = 0;
    this.defs = [];
    this.body = [];
  }
  id(tag) {
    return `${this.key}-${tag}${(this.n++).toString(36)}`;
  }
  /** Linear gradient; returns the `url(#…)` paint. Coordinates are objectBoundingBox fractions. */
  lin(x1, y1, x2, y2, list) {
    const id = this.id("l");
    this.defs.push(`<linearGradient id="${id}" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}">${stops(list)}</linearGradient>`);
    return `url(#${id})`;
  }
  /** Radial gradient in user space (absolute 512 coordinates) — used for glows and backdrops. */
  radU(cx, cy, r, list) {
    const id = this.id("r");
    this.defs.push(`<radialGradient id="${id}" gradientUnits="userSpaceOnUse" cx="${f(cx)}" cy="${f(cy)}" r="${f(r)}">${stops(list)}</radialGradient>`);
    return `url(#${id})`;
  }
  /** Linear gradient in user space. */
  linU(x1, y1, x2, y2, list) {
    const id = this.id("l");
    this.defs.push(`<linearGradient id="${id}" gradientUnits="userSpaceOnUse" x1="${f(x1)}" y1="${f(y1)}" x2="${f(x2)}" y2="${f(y2)}">${stops(list)}</linearGradient>`);
    return `url(#${id})`;
  }
  add(...parts) {
    this.body.push(...parts);
    return this;
  }
  /** Open a group (e.g. `scale(…)` about the feet to fit the safe box); close it with `end()`. */
  begin(transform) {
    return this.add(`<g transform="${transform}">`);
  }
  end() {
    return this.add(`</g>`);
  }
  /** Plain filled path (no outline). */
  fill(d, color, opacity) {
    return this.add(`<path d="${d}" fill="${color}"${opacity !== undefined ? ` fill-opacity="${opacity}"` : ""}/>`);
  }
  /** Ink (or colored) stroke along an open path — interior lines, cracks, ribs, seams. */
  line(d, width, color = INK, opacity) {
    return this.add(
      `<path d="${d}" fill="none"${color !== INK ? ` stroke="${color}"` : ""} stroke-width="${width}"${opacity !== undefined ? ` stroke-opacity="${opacity}"` : ""}/>`,
    );
  }
  /** Soft glow: a translucent radial gradient disc (the ART_GUIDE substitute for blur filters). */
  glow(cx, cy, r, color, alpha = 0.6) {
    return this.add(`<circle cx="${f(cx)}" cy="${f(cy)}" r="${f(r)}" fill="${this.radU(cx, cy, r, [[0, color, alpha], [0.45, color, alpha * 0.45], [1, color, 0]])}"/>`);
  }
  /**
   * A cel-shaded mass. `paint` = { base, shade, light?, rim?, ow (outline half-width, default 6), sv ([dx,dy] shadow
   * band, default [10,10]), hv (light band, default [7,7]), rv (rim width, default 5), clip? (clip whole mass to a d) }.
   */
  mass(d, paint) {
    const { base, shade, light, rim, ow = 6, sv = [10, 10], hv = [7, 7], rv = 5, ink = INK } = paint;
    const p = this.id("p"), c0 = this.id("c"), c1 = this.id("c");
    this.defs.push(`<path id="${p}" d="${d}"/>`, `<clipPath id="${c0}"><use href="#${p}"/></clipPath>`);
    const out = [`<use href="#${p}" fill="${rim ?? shade}"${ow ? `${ink !== INK ? ` stroke="${ink}"` : ""} stroke-width="${ow * 2}"` : ""}/>`];
    out.push(`<g clip-path="url(#${c0})">`);
    if (rim) out.push(`<use href="#${p}" x="${-rv}" fill="${shade}"/>`);
    if (light) {
      this.defs.push(`<clipPath id="${c1}"><use href="#${p}" x="${-sv[0]}" y="${-sv[1]}"/></clipPath>`);
      out.push(`<use href="#${p}" x="${-sv[0]}" y="${-sv[1]}" fill="${light}"/>`);
      out.push(`<g clip-path="url(#${c1})"><use href="#${p}" x="${hv[0]}" y="${hv[1]}" fill="${base}"/></g>`);
    } else {
      out.push(`<use href="#${p}" x="${-sv[0]}" y="${-sv[1]}" fill="${base}"/>`);
    }
    out.push(`</g>`);
    return this.add(...out);
  }
  /** Scatter of small diamonds/circles (embers, motes, sparks) — deterministic. */
  motes({ seed = 1, count = 12, box = [40, 40, 472, 472], size = [3, 8], color, alpha = [0.5, 1], shape = "diamond" }) {
    const r = rng(seed);
    const [x0, y0, x1, y1] = box;
    const parts = [];
    for (let i = 0; i < count; i++) {
      const x = lerp(x0, x1, r()), y = lerp(y0, y1, r()), s = lerp(size[0], size[1], r()), a = +lerp(alpha[0], alpha[1], r()).toFixed(2);
      const fill = Array.isArray(color) ? color[i % color.length] : color;
      parts.push(
        shape === "circle"
          ? `<circle cx="${f(x)}" cy="${f(y)}" r="${f(s / 2)}" fill="${fill}" fill-opacity="${a}"/>`
          : `<path d="${poly([[x, y - s], [x + s * 0.55, y], [x, y + s], [x - s * 0.55, y]])}" fill="${fill}" fill-opacity="${a}"/>`,
      );
    }
    return this.add(...parts);
  }
  /** Full-bleed backdrop: vertical gradient + a soft light pool behind the subject. */
  backdrop(top, mid, bottom, { pool, poolAt = [236, 220], poolR = 260, poolAlpha = 0.55 } = {}) {
    this.add(`<rect width="512" height="512" fill="${this.linU(0, 0, 0, 512, [[0, top], [0.55, mid], [1, bottom]])}"/>`);
    if (pool) this.glow(poolAt[0], poolAt[1], poolR, pool, poolAlpha);
    return this;
  }
  /** Ground plane from `y` down, a slightly curved horizon, with an optional lit spot under the subject. */
  ground(y, near, far, { spot, spotAt = [256, 400], spotR = 150, curve = 18 } = {}) {
    this.add(`<path d="M0 ${y + curve}Q256 ${y - curve} 512 ${y + curve}V512H0Z" fill="${this.linU(0, y - curve, 0, 512, [[0, far], [1, near]])}"/>`);
    if (spot) this.add(`<ellipse cx="${spotAt[0]}" cy="${spotAt[1]}" rx="${spotR}" ry="${f(spotR * 0.28)}" fill="${this.radU(spotAt[0], spotAt[1], spotR, [[0, spot, 0.55], [1, spot, 0]])}"/>`);
    return this;
  }
  /** Contact shadow under a subject. */
  shadow(cx, cy, rx, ry = rx * 0.2, alpha = 0.5) {
    return this.add(`<ellipse cx="${f(cx)}" cy="${f(cy)}" rx="${f(rx)}" ry="${f(ry)}" fill="${INK}" fill-opacity="${alpha}"/>`);
  }
  toString() {
    // Root-level stroke defaults are inherited: every outline is ink, round-joined, painted under its fill (so an
    // outline of width 2w shows w outside the shape); shapes that set no stroke-width draw no outline.
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" stroke="${INK}" stroke-width="0" stroke-linejoin="round" stroke-linecap="round" paint-order="stroke">\n<defs>${this.defs.join("")}</defs>\n${this.body.join("\n")}\n</svg>\n`;
  }
}
