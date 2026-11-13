"use client";

// Effects toolkit (§18.4, Phase 13): WAAPI animations on transform-family properties (`transform`, `translate`,
// `scale`) and `opacity` only, DOM floaters (numbers, flying cards, banner) inside the FX layer, and one pooled
// <canvas> for particles. Every effect is tracked so a skip can finish all of them at once (`finishAll`).
// Durations are passed in already scaled for speed / reduced motion (handlers use `env.ms`).
import type { CardId } from "../../catalog/types";
import type { EntityId } from "../../engine/types";

export type FloatKind = "damage" | "heal" | "buff" | "info";
export type FlashKind = "damage" | "heal" | "glow" | "buff";
export type ParticleKind = "fire" | "ice" | "arcane" | "lightning" | "heal" | "dust";
export type FxAnchor = "foe-hand" | "foe-deck" | "my-hand" | "my-deck" | "center";
export type RevealMode = "played" | "burned";

export interface AnimateOptions {
  easing?: string;
  /** Keep the end state until the element is removed (e.g. a dying unit faded out before the apply removes it). */
  persist?: boolean;
  /** Lift the element above its neighbours while it moves (inline z-index, not animated). */
  raise?: boolean;
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
  projectile(from: Element, to: Element, kind: ParticleKind, ms: number): Promise<void>;
  floatNumber(el: Element, text: string, kind: FloatKind, ms: number): Promise<void>;
  shake(intensity: number, ms: number): Promise<void>;
  flash(el: Element, kind: FlashKind, ms: number): Promise<void>;
  burst(el: Element, kind: ParticleKind, count?: number): void;
  slam(el: Element, ms: number): Promise<void>;
  chain(els: Element[], kind: FlashKind, ms: number): Promise<void>;
  banner(text: string, tone: "mine" | "foe", ms: number): Promise<void>;
  /** Shows a card face in the centre (rendered by the FX layer). */
  reveal(defId: CardId, mode: RevealMode, ms: number): Promise<void>;
  /** Skip: every running effect jumps to its end, floaters and particles disappear. */
  finishAll(): void;
  /** After a reconcile: drops `persist` end states (their elements are normally gone by then). */
  settle(): void;
}

// ── Particles ───────────────────────────────────────────────────────────────────────────────────────────────
export const MAX_PARTICLES = 300;
const MAX_DPR = 2;

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
}

/**
 * Pooled particles on one canvas (§18.6): at most 300 alive, DPR capped at 2, the rAF loop runs only while
 * particles are alive and stops when the page is hidden. Colors come from `--cg-fx-<kind>` tokens.
 */
export class ParticleSystem {
  private readonly pool: Particle[] = [];
  private alive = 0;
  private raf = 0;
  private last = 0;
  private readonly colors = new Map<ParticleKind, string>();
  private readonly ctx: CanvasRenderingContext2D | null;
  private readonly onVisibility = () => {
    if (document.visibilityState === "hidden") this.clear();
  };

  constructor(private readonly canvas: HTMLCanvasElement) {
    this.ctx = canvas.getContext("2d");
    document.addEventListener("visibilitychange", this.onVisibility);
  }

  dispose(): void {
    this.clear();
    document.removeEventListener("visibilitychange", this.onVisibility);
  }

  get count(): number {
    return this.alive;
  }

  private color(kind: ParticleKind): string {
    let c = this.colors.get(kind);
    if (!c) {
      c = getComputedStyle(this.canvas).getPropertyValue(`--cg-fx-${kind}`).trim() || "currentColor";
      this.colors.set(kind, c);
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

  /** `x`/`y` in canvas CSS pixels. */
  burst(x: number, y: number, kind: ParticleKind, count: number): void {
    if (!this.ctx || document.visibilityState === "hidden") return;
    if (this.alive === 0) this.fit();
    const color = this.color(kind);
    const n = Math.min(count, MAX_PARTICLES - this.alive);
    for (let i = 0; i < n; i++) {
      const p = this.pool[this.alive] ?? (this.pool[this.alive] = { x: 0, y: 0, vx: 0, vy: 0, life: 0, total: 0, size: 0, color, gravity: 0 });
      const angle = Math.random() * Math.PI * 2;
      const speed = 0.04 + Math.random() * 0.16; // px per ms
      p.x = x;
      p.y = y;
      p.vx = Math.cos(angle) * speed;
      p.vy = Math.sin(angle) * speed - (kind === "heal" ? 0.08 : 0);
      p.total = p.life = 380 + Math.random() * 420;
      p.size = 2 + Math.random() * 3.5;
      p.color = color;
      p.gravity = kind === "dust" ? 0.00035 : kind === "heal" ? -0.0001 : 0.0002;
      this.alive += 1;
    }
    if (!this.raf) {
      this.last = performance.now();
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
    const dt = Math.min(48, now - this.last);
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
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
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
  showReveal: (reveal: { defId: CardId; mode: RevealMode; ms: number; key: number } | null) => void;
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

  async projectile(from: Element, to: Element, kind: ParticleKind, ms: number): Promise<void> {
    const a = centerOf(from.getBoundingClientRect());
    const b = centerOf(to.getBoundingClientRect());
    const node = this.floater(`cg-fx-projectile cg-fx-projectile--${kind}`, { x: a.x, y: a.y });
    await this.animate(node, [{ transform: "translate(-50%, -50%)" }, { transform: `translate(calc(${b.x - a.x}px - 50%), calc(${b.y - a.y}px - 50%))` }], ms, { easing: "ease-in" });
    this.drop(node);
    this.burst(to, kind, 14);
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

  burst(el: Element, kind: ParticleKind, count = 16): void {
    const p = this.o.particles;
    if (!p) return;
    const c = centerOf(el.getBoundingClientRect());
    const layer = this.o.layer.getBoundingClientRect();
    p.burst(c.x - layer.left, c.y - layer.top, kind, count);
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

  async reveal(defId: CardId, mode: RevealMode, ms: number): Promise<void> {
    const key = ++this.revealKey;
    this.o.showReveal({ defId, mode, ms, key });
    await this.wait(ms);
    if (this.revealKey === key) this.o.showReveal(null);
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
