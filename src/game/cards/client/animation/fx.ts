"use client";

// Effects toolkit (§18.4, Phase 13; extended in Phase 20): WAAPI animations on transform-family properties
// (`transform`, `translate`, `scale`, `rotate`) and `opacity` only, DOM floaters (numbers, flying cards, banners,
// rings, glyphs, the cinematic dim/rays) inside the FX layer, and one pooled <canvas> for particles. Every effect is
// tracked so a skip can finish all of them at once (`finishAll`). Durations are passed in already scaled for speed /
// reduced motion (handlers use `env.ms`).
import type { CardId, Rarity } from "../../catalog/types";
import type { FxElement, SignatureId } from "../../catalog/visuals";
import type { AccentMotion, MoteOrigin } from "./signatures";
import type { EntityId } from "../../engine/types";

export type { FxElement };
export type FloatKind = "damage" | "heal" | "buff" | "info";
export type FlashKind = "damage" | "heal" | "glow" | "buff" | "impact";
/** Every element, the heal sparkle, the neutral kinds (dust, debris, confetti) and UI-09's bone / void motes. */
export type ParticleKind = FxElement | "heal" | "dust" | "debris" | "confetti" | "bone" | "void";
/** `fx.projectile` kinds (§18.4, extended in Phase 20 to every `FxElement`). */
export type ProjectileKind = FxElement | "heal";
export type FxAnchor = "foe-hand" | "foe-deck" | "my-hand" | "my-deck" | "center";
/** played: the opponent's card; burned: hand full; heavy/cinematic: the Phase 20 entrances (CSS slam-in). */
export type RevealMode = "played" | "burned" | "heavy" | "cinematic";

export const PROJECTILE_KINDS: readonly ProjectileKind[] = ["fire", "ice", "arcane", "lightning", "shadow", "nature", "holy", "heal"];

export interface AnimateOptions {
  easing?: string;
  /** Keep the end state until the element is removed (e.g. a dying unit faded out before the apply removes it). */
  persist?: boolean;
  /** Lift the element above its neighbours while it moves (inline z-index, not animated). */
  raise?: boolean;
}

export interface RevealOptions {
  /** Length of the CSS slam-in for `heavy` / `cinematic` (ms). */
  inMs?: number;
  rarity?: Rarity;
  /** A line shown above the card (the opponent's plays: "Tu rival jugó"). */
  caption?: string;
}

export interface FxApi {
  /** Element registry: the live element with `data-entity-id = id` (units, heroes, my hand cards), or null. */
  el(id: EntityId): HTMLElement | null;
  /** Any element inside the battlefield (e.g. the parked spell). */
  query(selector: string): HTMLElement | null;
  /** Fixed points of the layout (`data-cg-anchor`); "center" is a hand-card-sized box in the middle of the board. */
  anchor(name: FxAnchor): DOMRect | null;
  animate(el: Element, keyframes: Keyframe[], ms: number, opts?: AnimateOptions): Promise<void>;
  /** A tracked timer: resolved early by `finishAll`. */
  wait(ms: number): Promise<void>;
  /** A card (back, or a clone of `source`) moving from one box to another. */
  flyCard(from: DOMRect, to: DOMRect, ms: number, opts?: { source?: HTMLElement; fadeOut?: boolean }): Promise<void>;
  /** An elemental orb from an element (or a box, e.g. the centre for a spell) to a target; bursts on arrival. */
  projectile(from: Element | DOMRect, to: Element, kind: ProjectileKind, ms: number): Promise<void>;
  floatNumber(el: Element, text: string, kind: FloatKind, ms: number): Promise<void>;
  shake(intensity: number, ms: number): Promise<void>;
  flash(el: Element, kind: FlashKind, ms: number): Promise<void>;
  burst(el: Element | DOMRect, kind: ParticleKind, count?: number): void;
  /** Particles left along a line (attack trail). */
  streak(from: Element, to: Element, kind: ParticleKind, count?: number): void;
  slam(el: Element, ms: number): Promise<void>;
  chain(els: Element[], kind: FlashKind, ms: number): Promise<void>;
  banner(text: string, tone: "mine" | "foe", ms: number): Promise<void>;
  /** Shows a card face in the centre (rendered by the FX layer). */
  reveal(defId: CardId, mode: RevealMode, ms: number, opts?: RevealOptions): Promise<void>;
  // ── Phase 20 ──
  /** An expanding shockwave ring on an element. */
  ring(el: Element, kind: ParticleKind | "damage", ms: number): Promise<void>;
  /** A symbol rising from an element (ability glyph, status glyph). */
  glyph(el: Element, text: string, kind: ParticleKind, ms: number): Promise<void>;
  /** Darkens the whole board (fades in and out within `ms`). */
  dim(ms: number): Promise<void>;
  /** Rotating light rays behind the centre, in a rarity color. */
  rays(rarity: Rarity, ms: number): Promise<void>;
  /** The card's name on a rarity-colored ribbon under the centre. */
  nameBanner(text: string, rarity: Rarity, ms: number): Promise<void>;
  /** Red edges: my hero was hit. */
  vignette(ms: number): Promise<void>;
  /** A band of light crossing the board (turn start). */
  sweep(tone: "mine" | "foe", ms: number): Promise<void>;
  /** Cracks over an element (a defeated hero's portrait). */
  crack(el: Element, ms: number): Promise<void>;
  // ── UI-09 signatures ──
  /** A premium card's aura behind the centre reveal; `still` (reduced motion) = a static rim that only fades. */
  aura(sig: SignatureId, ms: number, opts: { spin: number; from: number; still?: boolean }): Promise<void>;
  /** A premium card's accent over the centre reveal (glint, sweep, flare, pulse). */
  accent(sig: SignatureId, motion: AccentMotion, ms: number): Promise<void>;
  /** A particle burst from a point of the centre reveal card. */
  motes(kind: ParticleKind, count: number, from: MoteOrigin): void;
  /** Skip: every running effect jumps to its end, floaters and particles disappear. */
  finishAll(): void;
  /** After a reconcile: drops `persist` end states (their elements are normally gone by then). */
  settle(): void;
}

// ── Particles ───────────────────────────────────────────────────────────────────────────────────────────────
export const MAX_PARTICLES = 300;
/** Low-end devices get half the budget and half of every burst (Phase 20 H). */
export const LOW_END_PARTICLE_FACTOR = 0.5;
/** A frame-time average above this over `FRAME_SAMPLE` frames marks the device low-end. */
export const LOW_END_FRAME_MS = 24;
export const FRAME_SAMPLE = 30;
const MAX_DPR = 2;

/** `navigator.hardwareConcurrency <= 4` → low-end from the start (unknown counts as capable). */
export function lowEndByCores(nav: { hardwareConcurrency?: number } | undefined): boolean {
  const n = nav?.hardwareConcurrency;
  return typeof n === "number" && n > 0 && n <= 4;
}

/** Average frame time over consecutive windows of `FRAME_SAMPLE` frames; latches once a window is too slow. */
export class FrameMonitor {
  private sum = 0;
  private n = 0;
  private slow = false;

  get lowEnd(): boolean {
    return this.slow;
  }

  /** Feeds one frame time; returns true once the device is considered low-end. */
  push(frameMs: number): boolean {
    if (this.slow) return true;
    this.sum += frameMs;
    this.n += 1;
    if (this.n >= FRAME_SAMPLE) {
      if (this.sum / this.n > LOW_END_FRAME_MS) this.slow = true;
      this.sum = 0;
      this.n = 0;
    }
    return this.slow;
  }

  /** A pause (idle canvas, hidden page) must not count as a slow frame. */
  restart(): void {
    this.sum = 0;
    this.n = 0;
  }
}

/** Particle budget and burst size for the current device class. */
export function particleBudget(lowEnd: boolean): number {
  return lowEnd ? Math.floor(MAX_PARTICLES * LOW_END_PARTICLE_FACTOR) : MAX_PARTICLES;
}
export function scaledCount(count: number, lowEnd: boolean): number {
  return lowEnd ? Math.max(1, Math.round(count * LOW_END_PARTICLE_FACTOR)) : count;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number; // ms left
  total: number;
  size: number;
  color: string;
  gravity: number;
  rect: boolean;
  spin: number;
}

/** Motion per particle kind: speed (px/ms), life (ms), gravity (px/ms²), upward bias, size and shape. */
interface KindStyle {
  speed: [number, number];
  life: [number, number];
  gravity: number;
  lift: number;
  size: [number, number];
  rect?: boolean;
}

const STYLE: Record<ParticleKind, KindStyle> = {
  fire: { speed: [0.05, 0.18], life: [380, 760], gravity: -0.00018, lift: 0.05, size: [2, 5] },
  ice: { speed: [0.06, 0.2], life: [420, 820], gravity: 0.00025, lift: 0, size: [1.5, 4], rect: true },
  arcane: { speed: [0.04, 0.16], life: [400, 800], gravity: 0, lift: 0.02, size: [1.5, 4] },
  lightning: { speed: [0.12, 0.3], life: [200, 420], gravity: 0, lift: 0, size: [1.5, 3], rect: true },
  shadow: { speed: [0.03, 0.12], life: [500, 900], gravity: -0.00008, lift: 0.03, size: [3, 6] },
  nature: { speed: [0.04, 0.15], life: [500, 900], gravity: 0.00012, lift: 0.04, size: [2, 4.5], rect: true },
  holy: { speed: [0.03, 0.12], life: [500, 950], gravity: -0.00012, lift: 0.06, size: [1.5, 3.5] },
  heal: { speed: [0.03, 0.12], life: [450, 850], gravity: -0.0001, lift: 0.08, size: [2, 4.5] },
  dust: { speed: [0.04, 0.16], life: [380, 800], gravity: 0.00035, lift: 0, size: [2, 5.5] },
  debris: { speed: [0.1, 0.28], life: [420, 820], gravity: 0.0006, lift: 0.12, size: [2.5, 6], rect: true },
  confetti: { speed: [0.12, 0.3], life: [900, 1500], gravity: 0.00035, lift: 0.2, size: [3, 6], rect: true },
  // Small bone fragments that drift upward (Morvath, Skeleton King).
  bone: { speed: [0.03, 0.1], life: [600, 1000], gravity: -0.00012, lift: 0.07, size: [1.5, 3.5], rect: true },
  // Magenta void sparks (Nyxara).
  void: { speed: [0.06, 0.2], life: [380, 720], gravity: 0, lift: 0.01, size: [1.5, 3.5] },
};

const CONFETTI_TOKENS = ["fire", "ice", "arcane", "lightning", "heal", "holy"] as const;
const between = (r: [number, number]) => r[0] + Math.random() * (r[1] - r[0]);

/**
 * Pooled particles on one canvas (§18.6): at most 300 alive (150 on low-end devices), DPR capped at 2, the rAF loop
 * runs only while particles are alive and stops when the page is hidden. Colors come from `--cg-fx-<kind>` tokens.
 */
export class ParticleSystem {
  private readonly pool: Particle[] = [];
  private alive = 0;
  private raf = 0;
  private last = 0;
  private readonly colors = new Map<string, string>();
  private readonly ctx: CanvasRenderingContext2D | null;
  private readonly monitor = new FrameMonitor();
  private lowEndCores: boolean;
  private readonly onVisibility = () => {
    if (document.visibilityState === "hidden") this.clear();
  };

  constructor(private readonly canvas: HTMLCanvasElement) {
    this.ctx = canvas.getContext("2d");
    this.lowEndCores = lowEndByCores(typeof navigator === "undefined" ? undefined : navigator);
    document.addEventListener("visibilitychange", this.onVisibility);
  }

  dispose(): void {
    this.clear();
    document.removeEventListener("visibilitychange", this.onVisibility);
  }

  get count(): number {
    return this.alive;
  }

  /** Halved budget: few cores, or slow frames measured while particles were flying. */
  get lowEnd(): boolean {
    return this.lowEndCores || this.monitor.lowEnd;
  }

  get budget(): number {
    return particleBudget(this.lowEnd);
  }

  private color(token: string): string {
    let c = this.colors.get(token);
    if (!c) {
      c = getComputedStyle(this.canvas).getPropertyValue(`--cg-fx-${token}`).trim() || "currentColor";
      this.colors.set(token, c);
    }
    return c;
  }

  private fit(): void {
    const dpr = Math.min(MAX_DPR, window.devicePixelRatio || 1);
    const w = Math.round(this.canvas.clientWidth * dpr);
    const h = Math.round(this.canvas.clientHeight * dpr);
    if (this.canvas.width !== w || this.canvas.height !== h) {
      this.canvas.width = w;
      this.canvas.height = h;
    }
    this.ctx?.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  /** `x`/`y` in canvas CSS pixels; `spread` scatters the origins (a line of particles). */
  burst(x: number, y: number, kind: ParticleKind, count: number, spread?: { dx: number; dy: number }): void {
    if (!this.ctx || document.visibilityState === "hidden") return;
    if (this.alive === 0) this.fit();
    const style = STYLE[kind];
    const n = Math.min(scaledCount(count, this.lowEnd), this.budget - this.alive);
    const fixed = kind === "confetti" ? null : this.color(kind);
    for (let i = 0; i < n; i++) {
      const p =
        this.pool[this.alive] ??
        (this.pool[this.alive] = { x: 0, y: 0, vx: 0, vy: 0, life: 0, total: 0, size: 0, color: "", gravity: 0, rect: false, spin: 0 });
      const angle = Math.random() * Math.PI * 2;
      const speed = between(style.speed) * (spread ? 0.25 : 1);
      const along = spread ? Math.random() : 0;
      p.x = x + (spread ? spread.dx * along : 0);
      p.y = y + (spread ? spread.dy * along : 0);
      p.vx = Math.cos(angle) * speed;
      p.vy = Math.sin(angle) * speed - style.lift;
      p.total = p.life = between(style.life);
      p.size = between(style.size);
      p.color = fixed ?? this.color(CONFETTI_TOKENS[i % CONFETTI_TOKENS.length]);
      p.gravity = style.gravity;
      p.rect = style.rect === true;
      p.spin = Math.random() * Math.PI;
      this.alive += 1;
    }
    if (!this.raf && this.alive > 0) {
      this.last = performance.now();
      this.monitor.restart();
      this.raf = requestAnimationFrame(this.tick);
    }
  }

  clear(): void {
    this.alive = 0;
    if (this.raf) cancelAnimationFrame(this.raf);
    this.raf = 0;
    this.ctx?.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }

  private readonly tick = (now: number) => {
    const ctx = this.ctx;
    if (!ctx) return;
    const frame = now - this.last;
    this.monitor.push(frame);
    const dt = Math.min(48, frame);
    this.last = now;
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    let i = 0;
    while (i < this.alive) {
      const p = this.pool[i];
      p.life -= dt;
      if (p.life <= 0) {
        // Swap with the last alive particle (the pool never shrinks: no allocation per frame).
        this.alive -= 1;
        this.pool[i] = this.pool[this.alive];
        this.pool[this.alive] = p;
        continue;
      }
      p.vy += p.gravity * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      ctx.globalAlpha = p.life / p.total;
      ctx.fillStyle = p.color;
      if (p.rect) {
        // A flat flake that "tumbles": its height oscillates with its life (no rotation transform per particle).
        const h = p.size * (0.35 + 0.65 * Math.abs(Math.cos(p.spin + p.life / 90)));
        ctx.fillRect(p.x - p.size / 2, p.y - h / 2, p.size, h);
      } else {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      }
      i += 1;
    }
    ctx.globalAlpha = 1;
    this.raf = this.alive > 0 ? requestAnimationFrame(this.tick) : 0;
  };
}

// ── DOM implementation ──────────────────────────────────────────────────────────────────────────────────────
interface Waiter {
  timer: ReturnType<typeof setTimeout>;
  resolve: () => void;
}

const rectOf = (x: Element | DOMRect): DOMRect => (x instanceof Element ? x.getBoundingClientRect() : x);
const centerOf = (r: DOMRect) => ({ x: r.left + r.width / 2, y: r.top + r.height / 2 });

/** Removes ids and data-* attributes from a clone so hit-testing and the element registry never find it. */
function scrubClone(node: Element): void {
  for (const el of [node, ...Array.from(node.querySelectorAll("*"))]) {
    el.removeAttribute("id");
    for (const name of el.getAttributeNames()) if (name.startsWith("data-")) el.removeAttribute(name);
  }
  node.setAttribute("aria-hidden", "true");
}

export interface DomFxOptions {
  /** The battlefield root (element registry, anchors, shake). */
  root: HTMLElement;
  /** Absolutely positioned layer covering the battlefield, where floaters go. */
  layer: HTMLElement;
  particles: ParticleSystem | null;
  /** Renders a card face in the centre (FX layer React state); null hides it. */
  showReveal: (reveal: { defId: CardId; mode: RevealMode; ms: number; key: number; inMs?: number; rarity?: Rarity; caption?: string } | null) => void;
}

export class DomFx implements FxApi {
  private readonly running = new Set<Animation>();
  private readonly persistent = new Set<Animation>();
  private readonly waiters = new Set<Waiter>();
  private readonly floaters = new Set<HTMLElement>();
  private revealKey = 0;

  constructor(private readonly o: DomFxOptions) {}

  el(id: EntityId): HTMLElement | null {
    return this.o.root.querySelector<HTMLElement>(`[data-entity-id="${CSS.escape(id)}"]`);
  }

  query(selector: string): HTMLElement | null {
    return this.o.root.querySelector<HTMLElement>(selector);
  }

  anchor(name: FxAnchor): DOMRect | null {
    if (name === "center") {
      const r = this.o.layer.getBoundingClientRect();
      const h = Math.min(r.height * 0.42, r.width * 0.22);
      const w = h * 0.72;
      return new DOMRect(r.left + (r.width - w) / 2, r.top + (r.height - h) / 2, w, h);
    }
    const el = this.o.root.querySelector(`[data-cg-anchor="${name}"]`);
    return el ? el.getBoundingClientRect() : null;
  }

  animate(el: Element, keyframes: Keyframe[], ms: number, opts: AnimateOptions = {}): Promise<void> {
    if (typeof (el as HTMLElement).animate !== "function" || !el.isConnected || ms <= 0) return Promise.resolve();
    const html = el as HTMLElement;
    if (opts.raise) html.style.zIndex = "6";
    const anim = html.animate(keyframes, { duration: ms, easing: opts.easing ?? "cubic-bezier(0.2, 0.9, 0.3, 1)", fill: opts.persist ? "forwards" : "none" });
    this.running.add(anim);
    if (opts.persist) this.persistent.add(anim);
    return new Promise<void>((resolve) => {
      const done = () => {
        this.running.delete(anim);
        if (opts.raise) html.style.zIndex = "";
        resolve();
      };
      anim.onfinish = done;
      anim.oncancel = done;
    });
  }

  wait(ms: number): Promise<void> {
    if (ms <= 0) return Promise.resolve();
    return new Promise<void>((resolve) => {
      const w: Waiter = {
        resolve: () => {
          clearTimeout(w.timer);
          this.waiters.delete(w);
          resolve();
        },
        timer: setTimeout(() => w.resolve(), ms),
      };
      this.waiters.add(w);
    });
  }

  /** Adds a floater at a viewport box (static left/top/size; only transform/opacity animate). */
  private floater(className: string, box: { x: number; y: number; w?: number; h?: number }): HTMLElement {
    const layer = this.o.layer.getBoundingClientRect();
    const node = document.createElement("div");
    node.className = className;
    node.setAttribute("aria-hidden", "true");
    node.style.left = `${box.x - layer.left}px`;
    node.style.top = `${box.y - layer.top}px`;
    if (box.w !== undefined) node.style.width = `${box.w}px`;
    if (box.h !== undefined) node.style.height = `${box.h}px`;
    this.o.layer.appendChild(node);
    this.floaters.add(node);
    return node;
  }

  /** A floater covering the whole layer. */
  private cover(className: string): HTMLElement {
    const r = this.o.layer.getBoundingClientRect();
    return this.floater(className, { x: r.left, y: r.top, w: r.width, h: r.height });
  }

  private drop(node: HTMLElement): void {
    this.floaters.delete(node);
    node.remove();
  }

  async flyCard(from: DOMRect, to: DOMRect, ms: number, opts: { source?: HTMLElement; fadeOut?: boolean } = {}): Promise<void> {
    if (ms <= 0) return;
    const node = this.floater("cg-fx-card", { x: to.left, y: to.top, w: to.width, h: to.height });
    if (opts.source) {
      const clone = opts.source.cloneNode(true) as HTMLElement;
      scrubClone(clone);
      clone.className = "cg-fx-card-clone";
      node.appendChild(clone);
    } else {
      node.classList.add("cg-fx-card--back");
    }
    const a = centerOf(from);
    const b = centerOf(to);
    const sx = from.width / Math.max(1, to.width);
    const sy = from.height / Math.max(1, to.height);
    await this.animate(
      node,
      [
        { transform: `translate(${a.x - b.x}px, ${a.y - b.y}px) scale(${sx}, ${sy})`, opacity: 1 },
        { transform: "translate(0, 0) scale(1, 1)", opacity: opts.fadeOut ? 0 : 1 },
      ],
      ms,
    );
    this.drop(node);
  }

  async projectile(from: Element | DOMRect, to: Element, kind: ProjectileKind, ms: number): Promise<void> {
    const a = centerOf(rectOf(from));
    const b = centerOf(to.getBoundingClientRect());
    const node = this.floater(`cg-fx-projectile cg-fx-projectile--${kind}`, { x: a.x, y: a.y });
    this.burst(rectOf(from), kind, 6);
    const angle = (Math.atan2(b.y - a.y, b.x - a.x) * 180) / Math.PI;
    await this.animate(
      node,
      [
        { transform: `translate(-50%, -50%) rotate(${angle}deg) scale(0.6)` },
        { transform: `translate(calc(${b.x - a.x}px - 50%), calc(${b.y - a.y}px - 50%)) rotate(${angle}deg) scale(1)` },
      ],
      ms,
      { easing: "ease-in" },
    );
    this.drop(node);
    this.burst(to, kind, 16);
  }

  async floatNumber(el: Element, text: string, kind: FloatKind, ms: number): Promise<void> {
    const c = centerOf(el.getBoundingClientRect());
    const node = this.floater(`cg-fx-float cg-fx-float--${kind}`, { x: c.x, y: c.y });
    node.textContent = text;
    await this.animate(
      node,
      [
        { transform: "translate(-50%, -50%) scale(0.4)", opacity: 0 },
        { transform: "translate(-50%, -70%) scale(1.25)", opacity: 1, offset: 0.2 },
        { transform: "translate(-50%, -110%) scale(1)", opacity: 1, offset: 0.7 },
        { transform: "translate(-50%, -150%) scale(1)", opacity: 0 },
      ],
      ms,
    );
    this.drop(node);
  }

  shake(intensity: number, ms: number): Promise<void> {
    const d = Math.max(1, Math.min(12, intensity * 2));
    return this.animate(
      this.o.root,
      [{ translate: "0 0" }, { translate: `${-d}px ${d / 2}px` }, { translate: `${d}px ${-d / 2}px` }, { translate: `${-d / 2}px 0` }, { translate: "0 0" }],
      ms,
      { easing: "linear" },
    );
  }

  async flash(el: Element, kind: FlashKind, ms: number): Promise<void> {
    const r = el.getBoundingClientRect();
    if (r.width === 0) return;
    const node = this.floater(`cg-fx-flash cg-fx-flash--${kind}`, { x: r.left, y: r.top, w: r.width, h: r.height });
    await this.animate(node, [{ opacity: 0 }, { opacity: 0.85, offset: 0.3 }, { opacity: 0 }], ms);
    this.drop(node);
  }

  burst(el: Element | DOMRect, kind: ParticleKind, count = 16): void {
    const p = this.o.particles;
    if (!p) return;
    const c = centerOf(rectOf(el));
    const layer = this.o.layer.getBoundingClientRect();
    p.burst(c.x - layer.left, c.y - layer.top, kind, count);
  }

  streak(from: Element, to: Element, kind: ParticleKind, count = 14): void {
    const p = this.o.particles;
    if (!p) return;
    const a = centerOf(from.getBoundingClientRect());
    const b = centerOf(to.getBoundingClientRect());
    const layer = this.o.layer.getBoundingClientRect();
    // From the attacker to 80% of the way (the lunge stops short of the target).
    p.burst(a.x - layer.left, a.y - layer.top, kind, count, { dx: (b.x - a.x) * 0.8, dy: (b.y - a.y) * 0.8 });
  }

  slam(el: Element, ms: number): Promise<void> {
    return this.animate(
      el,
      [
        { scale: "1.6", opacity: 0 },
        { scale: "0.92", opacity: 1, offset: 0.6 },
        { scale: "1", opacity: 1 },
      ],
      ms,
      { easing: "ease-in" },
    );
  }

  async chain(els: Element[], kind: FlashKind, ms: number): Promise<void> {
    const step = ms / Math.max(1, els.length);
    for (const el of els) await this.flash(el, kind, step);
  }

  async banner(text: string, tone: "mine" | "foe", ms: number): Promise<void> {
    const layer = this.o.layer.getBoundingClientRect();
    const wrap = this.floater("cg-turn-banner-wrap", { x: layer.left, y: layer.top + layer.height / 2 });
    wrap.style.left = "0";
    wrap.style.right = "0";
    const inner = document.createElement("div");
    inner.className = `cg-turn-banner cg-turn-banner--${tone}`;
    inner.textContent = text;
    wrap.appendChild(inner);
    // The CSS animation runs on its own (1.7 s; shorter with reduced motion); the queue only waits `ms`.
    inner.addEventListener("animationend", () => this.drop(wrap), { once: true });
    await this.wait(ms);
  }

  async reveal(defId: CardId, mode: RevealMode, ms: number, opts: RevealOptions = {}): Promise<void> {
    const key = ++this.revealKey;
    this.o.showReveal({ defId, mode, ms, key, inMs: opts.inMs, rarity: opts.rarity, caption: opts.caption });
    await this.wait(ms);
    if (this.revealKey === key) this.o.showReveal(null);
  }

  async ring(el: Element, kind: ParticleKind | "damage", ms: number): Promise<void> {
    const r = el.getBoundingClientRect();
    if (r.width === 0) return;
    const size = Math.max(r.width, r.height);
    const c = centerOf(r);
    const node = this.floater(`cg-fx-ring cg-fx-ring--${kind}`, { x: c.x - size / 2, y: c.y - size / 2, w: size, h: size });
    await this.animate(node, [{ transform: "scale(0.3)", opacity: 0.95 }, { transform: "scale(1.5)", opacity: 0 }], ms, { easing: "ease-out" });
    this.drop(node);
  }

  async glyph(el: Element, text: string, kind: ParticleKind, ms: number): Promise<void> {
    const r = el.getBoundingClientRect();
    if (r.width === 0) return;
    const node = this.floater(`cg-fx-glyph cg-fx-glyph--${kind}`, { x: r.left + r.width / 2, y: r.top + r.height * 0.3 });
    node.textContent = text;
    await this.animate(
      node,
      [
        { transform: "translate(-50%, -50%) scale(0.3)", opacity: 0 },
        { transform: "translate(-50%, -60%) scale(1.15)", opacity: 1, offset: 0.25 },
        { transform: "translate(-50%, -80%) scale(1)", opacity: 1, offset: 0.7 },
        { transform: "translate(-50%, -100%) scale(0.9)", opacity: 0 },
      ],
      ms,
    );
    this.drop(node);
  }

  async dim(ms: number): Promise<void> {
    const node = this.cover("cg-fx-dim");
    await this.animate(node, [{ opacity: 0 }, { opacity: 1, offset: 0.12 }, { opacity: 1, offset: 0.82 }, { opacity: 0 }], ms, { easing: "linear" });
    this.drop(node);
  }

  async rays(rarity: Rarity, ms: number): Promise<void> {
    const layer = this.o.layer.getBoundingClientRect();
    const size = Math.hypot(layer.width, layer.height);
    const c = centerOf(layer);
    const node = this.floater(`cg-fx-rays cg-fx-rays--${rarity}`, { x: c.x - size / 2, y: c.y - size / 2, w: size, h: size });
    await this.animate(
      node,
      [
        { transform: "rotate(0deg) scale(0.4)", opacity: 0 },
        { transform: "rotate(25deg) scale(1)", opacity: 1, offset: 0.25 },
        { transform: "rotate(70deg) scale(1.05)", opacity: 0.85, offset: 0.8 },
        { transform: "rotate(90deg) scale(1.1)", opacity: 0 },
      ],
      ms,
      { easing: "linear" },
    );
    this.drop(node);
  }

  async nameBanner(text: string, rarity: Rarity, ms: number): Promise<void> {
    const layer = this.o.layer.getBoundingClientRect();
    const wrap = this.floater("cg-fx-name-wrap", { x: layer.left, y: layer.top + layer.height * 0.8 });
    wrap.style.left = "0";
    wrap.style.right = "0";
    const inner = document.createElement("div");
    inner.className = `cg-fx-name cg-fx-name--${rarity}`;
    inner.textContent = text;
    wrap.appendChild(inner);
    // UI-10: on short screens (568×320) the cinematic card reaches below 80% of the layer; sit the ribbon just under
    // the card instead (layout size, so the card's slam-in transform doesn't matter), never past the layer's edge.
    const card = this.o.layer.querySelector<HTMLElement>(".cg-fx-reveal-card");
    if (card) {
      const half = inner.offsetHeight / 2;
      const below = layer.height / 2 + card.offsetHeight / 2 + half + 4;
      const y = Math.min(Math.max(layer.height * 0.8, below), layer.height - half - 2);
      wrap.style.top = `${y}px`;
    }
    await this.animate(
      inner,
      [
        { transform: "translateY(-50%) scaleX(0.2)", opacity: 0 },
        { transform: "translateY(-50%) scaleX(1.05)", opacity: 1, offset: 0.2 },
        { transform: "translateY(-50%) scaleX(1)", opacity: 1, offset: 0.8 },
        { transform: "translateY(-50%) scaleX(1)", opacity: 0 },
      ],
      ms,
    );
    this.drop(wrap);
  }

  async vignette(ms: number): Promise<void> {
    const node = this.cover("cg-fx-vignette");
    await this.animate(node, [{ opacity: 0 }, { opacity: 1, offset: 0.2 }, { opacity: 0 }], ms, { easing: "ease-out" });
    this.drop(node);
  }

  async sweep(tone: "mine" | "foe", ms: number): Promise<void> {
    const layer = this.o.layer.getBoundingClientRect();
    const w = layer.width * 0.35;
    const node = this.floater(`cg-fx-sweep cg-fx-sweep--${tone}`, { x: layer.left - w, y: layer.top, w, h: layer.height });
    await this.animate(node, [{ transform: "translateX(0) skewX(-18deg)", opacity: 0 }, { transform: `translateX(${(layer.width + w) / 2}px) skewX(-18deg)`, opacity: 1, offset: 0.5 }, { transform: `translateX(${layer.width + w * 2}px) skewX(-18deg)`, opacity: 0 }], ms, { easing: "ease-in-out" });
    this.drop(node);
  }

  async crack(el: Element, ms: number): Promise<void> {
    const r = el.getBoundingClientRect();
    if (r.width === 0) return;
    const node = this.floater("cg-fx-crack", { x: r.left, y: r.top, w: r.width, h: r.height });
    await this.animate(node, [{ opacity: 0, transform: "scale(1.15)" }, { opacity: 1, transform: "scale(1)", offset: 0.15 }, { opacity: 1, transform: "scale(1)" }], ms, { easing: "ease-out" });
    this.drop(node);
  }

  /** The centre reveal card's box (the live card when shown, else its CSS size around the layer centre). */
  private revealBox(): DOMRect {
    const card = this.o.layer.querySelector(".cg-fx-reveal-card");
    if (card) {
      const r = card.getBoundingClientRect();
      if (r.width > 0) return r;
    }
    const layer = this.o.layer.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const w = Math.min(vh * 0.4, vw * 0.21);
    const h = Math.min(vh * 0.56, vw * 0.29);
    const c = centerOf(layer);
    return new DOMRect(c.x - w / 2, c.y - h / 2, w, h);
  }

  async aura(sig: SignatureId, ms: number, opts: { spin: number; from: number; still?: boolean }): Promise<void> {
    const box = this.revealBox();
    const size = box.height * 1.9;
    const c = centerOf(box);
    const node = this.floater(`cg-fx-aura cg-fx-aura--${sig}`, { x: c.x - size / 2, y: c.y - size / 2, w: size, h: size });
    const frames: Keyframe[] = opts.still
      ? [{ opacity: 0 }, { opacity: 0.9, offset: 0.2 }, { opacity: 0.9, offset: 0.8 }, { opacity: 0 }]
      : [
          { transform: `rotate(0deg) scale(${opts.from})`, opacity: 0 },
          { transform: `rotate(${opts.spin * 0.3}deg) scale(1)`, opacity: 1, offset: 0.22 },
          { transform: `rotate(${opts.spin * 0.85}deg) scale(1.03)`, opacity: 0.9, offset: 0.82 },
          { transform: `rotate(${opts.spin}deg) scale(1.06)`, opacity: 0 },
        ];
    await this.animate(node, frames, ms, { easing: opts.still ? "linear" : "cubic-bezier(0.2, 0.7, 0.3, 1)" });
    this.drop(node);
  }

  async accent(sig: SignatureId, motion: AccentMotion, ms: number): Promise<void> {
    const box = this.revealBox();
    const node = this.floater(`cg-fx-accent cg-fx-accent--${sig} cg-fx-accent--${motion}`, { x: box.left, y: box.top, w: box.width, h: box.height });
    const frames: Record<AccentMotion, Keyframe[]> = {
      glint: [
        { transform: "scale(0.2) rotate(-30deg)", opacity: 0 },
        { transform: "scale(1.15) rotate(10deg)", opacity: 1, offset: 0.35 },
        { transform: "scale(0.9) rotate(30deg)", opacity: 0 },
      ],
      sweep: [
        { transform: "translateX(-70%) skewX(-16deg)", opacity: 0 },
        { transform: "translateX(0) skewX(-16deg)", opacity: 1, offset: 0.45 },
        { transform: "translateX(70%) skewX(-16deg)", opacity: 0 },
      ],
      flare: [
        { transform: "scale(0.4)", opacity: 0 },
        { transform: "scale(1.05)", opacity: 1, offset: 0.25 },
        { transform: "scale(1.5)", opacity: 0 },
      ],
      pulse: [
        { transform: "scale(0.92)", opacity: 0 },
        { transform: "scale(1.04)", opacity: 0.95, offset: 0.4 },
        { transform: "scale(1.12)", opacity: 0 },
      ],
    };
    await this.animate(node, frames[motion], ms, { easing: "ease-out" });
    this.drop(node);
  }

  motes(kind: ParticleKind, count: number, from: MoteOrigin): void {
    const p = this.o.particles;
    if (!p) return;
    const box = this.revealBox();
    const layer = this.o.layer.getBoundingClientRect();
    const x = box.left + box.width / 2 - layer.left;
    if (from === "base") {
      // Along the card's lower edge (slow spread; the kind's lift carries them up).
      const half = box.width * 0.4;
      p.burst(x - half, box.bottom - box.height * 0.1 - layer.top, kind, count, { dx: half * 2, dy: 0 });
      return;
    }
    const y = from === "top" ? box.top + box.height * 0.18 : box.top + box.height * 0.4;
    p.burst(x, y - layer.top, kind, count);
  }

  finishAll(): void {
    for (const w of [...this.waiters]) w.resolve();
    for (const a of [...this.running]) {
      try {
        a.finish();
      } catch {
        a.cancel();
      }
    }
    for (const node of [...this.floaters]) this.drop(node);
    this.revealKey += 1;
    this.o.showReveal(null);
    this.o.particles?.clear();
  }

  settle(): void {
    const done = [...this.persistent];
    this.persistent.clear();
    if (done.length === 0) return;
    // One frame later the reconciled board has been committed: the faded-out units are gone.
    requestAnimationFrame(() => {
      for (const a of done) a.cancel();
    });
  }

  dispose(): void {
    this.finishAll();
    for (const a of this.persistent) a.cancel();
    this.persistent.clear();
  }
}
