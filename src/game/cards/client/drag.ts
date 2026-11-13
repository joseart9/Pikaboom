// Drag mode (§17.7, Phase 12): a framework-free pointer controller for the battlefield plus the pure geometry and
// drop-decision helpers it uses. The controller never touches React: it publishes a `DragState` only when something
// discrete changes (zone, gap, validity, hovered target), and moves the floating card / arrow through frame
// listeners that write `style.transform` / SVG attributes directly, once per animation frame.
//
// DOM contract (attributes the battlefield components render):
//   [data-cg-drag="hand"|"unit"][data-iid]  a press source: a hand card, or one of my units (attack arrow)
//   [data-cg-inspect="hand"|"unit"][data-iid] long-press / right-click inspects it
//   [data-cg-target][data-iid]              a unit or hero an arrow can point at
//   [data-cg-zone="board"]                  my board row (mob drop zone; my units inside give the gap rects)
//   [data-cg-zone="hand"]                   the bottom strip (release there = cancel)
import type { GameCommand } from "../engine/commands";
import type { EntityId, LegalActions } from "../engine/types";
import { canCast, IDLE, interactionReducer, type Interaction, type InteractionResult } from "./interaction";

export const DRAG_SLOP_PX = 6;
export const LONG_PRESS_MS = 450;

export interface DOMRectLike {
  left: number;
  top: number;
  right: number;
  bottom: number;
  width: number;
  height: number;
}

export type DragSource = { type: "hand"; iid: EntityId } | { type: "unit"; iid: EntityId };
export type DragZone = "board" | "hand" | "none";
export type InspectTarget = { kind: "hand" | "unit"; iid: EntityId };

/**
 * Published drag state (§21 Phase 12 F). `x`/`y` are the pointer position when the state was published, not live:
 * live movement goes through frame listeners only. Aiming states add `tracking`: the arrow follows a pointer right
 * now (a finger/button is down, or a mouse hovers the battlefield).
 */
export type DragState =
  | { kind: "none" }
  | { kind: "pressing"; source: DragSource | null; startX: number; startY: number; t0: number }
  | { kind: "draggingCard"; iid: EntityId; x: number; y: number; zone: DragZone; gapIndex: number | null; valid: boolean }
  | { kind: "aimingCard"; iid: EntityId; position: number | null; x: number; y: number; hover: EntityId | null; tracking: boolean }
  | { kind: "aimingAttack"; attacker: EntityId; x: number; y: number; hover: EntityId | null; tracking: boolean };

export const DRAG_NONE: DragState = { kind: "none" };

// ── Geometry ──────────────────────────────────────────────────────────────────────────────────────────────────────

export function pointIn(r: DOMRectLike | null | undefined, x: number, y: number): boolean {
  return !!r && x >= r.left && x <= r.right && y >= r.top && y <= r.bottom;
}

/**
 * The placement gap nearest to `x` (§17.7): gap i sits before unit i, gap n after the last unit. Choosing by unit
 * centres means "left half of a unit → before it, right half → after it", so the nearest gap always wins.
 */
export function gapIndexAt(x: number, unitRects: readonly DOMRectLike[]): number {
  let i = 0;
  for (const r of unitRects) if (x > r.left + r.width / 2) i += 1;
  return i;
}

export function zoneAt(x: number, y: number, zones: { board: DOMRectLike | null; hand: DOMRectLike | null }): DragZone {
  if (pointIn(zones.hand, x, y)) return "hand";
  if (pointIn(zones.board, x, y)) return "board";
  return "none";
}

/** The arrow target under the pointer, if any. */
export function targetAt(x: number, y: number, targets: readonly { id: EntityId; rect: DOMRectLike }[]): EntityId | null {
  for (const t of targets) if (pointIn(t.rect, x, y)) return t.id;
  return null;
}

/** Whether releasing the dragged card here would do something (the card is tinted red otherwise). */
export function cardDropValid(kind: "mob" | "spell", zone: DragZone, y: number, hand: DOMRectLike | null): boolean {
  if (kind === "mob") return zone === "board";
  return zone !== "hand" && (!hand || y < hand.top);
}

// ── Drop decisions (pure; reuse the tap-mode reducer so drag and tap can never disagree) ───────────────────────────

export type DropDecision =
  | { t: "command"; command: GameCommand }
  | { t: "aim"; interaction: Interaction } // a target is still needed: arrow mode (awaitingTarget)
  | { t: "cancel"; invalid: boolean }; // invalid → the drop pointed at something wrong (invalid haptic)

function fromResult(r: InteractionResult): DropDecision {
  if (r.command) return { t: "command", command: r.command };
  if (r.state.mode === "awaitingTarget") return { t: "aim", interaction: r.state };
  return { t: "cancel", invalid: true };
}

export interface CardDrop {
  iid: EntityId;
  kind: "mob" | "spell";
  zone: DragZone;
  gapIndex: number | null;
  /** The release point is above the hand strip (spells may be released anywhere there). */
  aboveHand: boolean;
}

/** Mob: board zone + gap. Spell: anywhere above the hand. Targeted cards switch to arrow mode. Over the hand: cancel. */
export function decideCardDrop(drop: CardDrop, legal: LegalActions | null): DropDecision {
  if (drop.zone === "hand") return { t: "cancel", invalid: false };
  if (!legal?.play[drop.iid]) return { t: "cancel", invalid: true };
  const selected = interactionReducer(IDLE, { t: "tapHandCard", iid: drop.iid, kind: drop.kind }, legal).state;
  if (drop.kind === "mob") {
    if (drop.zone !== "board" || drop.gapIndex === null || selected.mode !== "cardSelected") return { t: "cancel", invalid: true };
    return fromResult(interactionReducer(selected, { t: "tapSlot", index: drop.gapIndex }, legal));
  }
  if (!drop.aboveHand || selected.mode !== "awaitingTarget") return { t: "cancel", invalid: true };
  if (canCast(selected)) return fromResult(interactionReducer(selected, { t: "tapCast" }, legal));
  return { t: "aim", interaction: selected };
}

/** An attack arrow released over `target` (null = over nothing). */
export function decideAttackDrop(attacker: EntityId, target: EntityId | null, legal: LegalActions | null): DropDecision {
  if (target === null || target === attacker) return { t: "cancel", invalid: false };
  const selected = interactionReducer(IDLE, { t: "tapEntity", id: attacker }, legal).state;
  if (selected.mode !== "attackerSelected") return { t: "cancel", invalid: true };
  const r = interactionReducer(selected, { t: "tapEntity", id: target }, legal);
  return r.command ? { t: "command", command: r.command } : { t: "cancel", invalid: true };
}

/** The second gesture of arrow mode (a drag released over `target`) while `interaction` waits for a target. */
export function decideAimRelease(interaction: Interaction, target: EntityId | null, legal: LegalActions | null): DropDecision {
  if (target === null) return { t: "cancel", invalid: false };
  if (interaction.mode !== "awaitingTarget" && interaction.mode !== "attackerSelected") return { t: "cancel", invalid: false };
  const r = interactionReducer(interaction, { t: "tapEntity", id: target }, legal);
  return r.command ? { t: "command", command: r.command } : { t: "cancel", invalid: true };
}

// ── Press tracking (slop + long-press) ─────────────────────────────────────────────────────────────────────────────

export type PressPhase = "idle" | "pressing" | "dragging" | "longPressed";

/**
 * One pointer press: becomes a drag after moving more than `slop` px, a long-press after `longPressMs` without moving
 * that far, otherwise a tap. Uses setTimeout (fake-timer friendly).
 */
export class PressTracker {
  phase: PressPhase = "idle";
  private timer: ReturnType<typeof setTimeout> | null = null;
  private sx = 0;
  private sy = 0;

  constructor(
    private readonly onLongPress: () => void,
    private readonly slop = DRAG_SLOP_PX,
    private readonly longPressMs = LONG_PRESS_MS,
  ) {}

  down(x: number, y: number, longPress = true): void {
    this.cancel();
    this.phase = "pressing";
    this.sx = x;
    this.sy = y;
    if (longPress) {
      this.timer = setTimeout(() => {
        this.timer = null;
        if (this.phase !== "pressing") return;
        this.phase = "longPressed";
        this.onLongPress();
      }, this.longPressMs);
    }
  }

  /** True exactly once: when this move turns the press into a drag. */
  move(x: number, y: number): boolean {
    if (this.phase !== "pressing") return false;
    if (Math.hypot(x - this.sx, y - this.sy) <= this.slop) return false;
    this.clearTimer();
    this.phase = "dragging";
    return true;
  }

  /** Ends the press and says what it was. */
  up(): "tap" | "drag" | "longPress" | "none" {
    const p = this.phase;
    this.cancel();
    return p === "pressing" ? "tap" : p === "dragging" ? "drag" : p === "longPressed" ? "longPress" : "none";
  }

  cancel(): void {
    this.clearTimer();
    this.phase = "idle";
  }

  private clearTimer(): void {
    if (this.timer !== null) clearTimeout(this.timer);
    this.timer = null;
  }
}

// ── Controller (DOM) ───────────────────────────────────────────────────────────────────────────────────────────────

/** What the battlefield decides for the controller. Every call happens on a discrete event, never per move. */
export interface DragHost {
  /** What a press on `source` becomes once it moves past the slop; null = nothing (not playable / not ready). */
  dragKind(source: DragSource): "mob" | "spell" | "attack" | null;
  /** A press moved past the slop but `dragKind` said no. */
  onDenied(source: DragSource): void;
  onCardDragStart(iid: EntityId): void;
  onCardDrop(drop: CardDrop & { x: number; y: number }): void;
  /** The drag was aborted (pointercancel, second finger, Escape, page hidden, card no longer legal). */
  onCardCancel(iid: EntityId, x: number, y: number): void;
  onAttackStart(attacker: EntityId): void;
  onAttackDrop(attacker: EntityId, target: EntityId | null): void;
  /** Arrow mode: a drag released over `target` (null = nothing). */
  onAimRelease(target: EntityId | null): void;
  onAimCancel(): void;
  onInspect(target: InspectTarget): void;
}

/** The arrow mode the battlefield is in (from the interaction state), with its legal targets. */
export type AimSpec =
  | { kind: "card"; iid: EntityId; position: number | null; targets: readonly EntityId[] }
  | { kind: "attack"; iid: EntityId; targets: readonly EntityId[] };

type Gesture = "none" | "pressing" | "dead" | "dragCard" | "dragAttack" | "aimPress";
export type FrameListener = (x: number, y: number) => void;

function rectOf(el: Element): DOMRectLike {
  const r = el.getBoundingClientRect();
  return { left: r.left, top: r.top, right: r.right, bottom: r.bottom, width: r.width, height: r.height };
}

function sourceOf(el: Element | null): DragSource | null {
  const type = el?.getAttribute("data-cg-drag");
  const iid = el?.getAttribute("data-iid");
  if (!iid || (type !== "hand" && type !== "unit")) return null;
  return { type, iid };
}

function inspectOf(el: Element | null): InspectTarget | null {
  const kind = el?.getAttribute("data-cg-inspect");
  const iid = el?.getAttribute("data-iid");
  if (!iid || (kind !== "hand" && kind !== "unit")) return null;
  return { kind, iid };
}

function sameAim(a: AimSpec | null, b: AimSpec | null): boolean {
  if (a === b) return true;
  if (!a || !b || a.kind !== b.kind || a.iid !== b.iid) return false;
  if (a.kind === "card" && b.kind === "card" && a.position !== b.position) return false;
  return a.targets.length === b.targets.length && a.targets.every((t, i) => t === b.targets[i]);
}

const NO_HOST: DragHost = {
  dragKind: () => null,
  onDenied: () => {},
  onCardDragStart: () => {},
  onCardDrop: () => {},
  onCardCancel: () => {},
  onAttackStart: () => {},
  onAttackDrop: () => {},
  onAimRelease: () => {},
  onAimCancel: () => {},
  onInspect: () => {},
};

/** Contextmenu events this soon after a long-press come from the same touch (Android) and are ignored. */
const CONTEXTMENU_AFTER_LONGPRESS_MS = 1000;

export class DragController {
  private root: HTMLElement | null = null;
  private state: DragState = DRAG_NONE;
  private readonly listeners = new Set<() => void>();
  private readonly frameListeners = new Set<FrameListener>();
  private readonly press: PressTracker;

  private gesture: Gesture = "none";
  private pointerId: number | null = null;
  private captured = false;
  private source: DragSource | null = null;
  private inspectTarget: InspectTarget | null = null;
  private cardKind: "mob" | "spell" = "mob";
  private x = 0;
  private y = 0;
  private t0 = 0;
  private aimMoved = false;
  private aimStart = { x: 0, y: 0 };
  private hovering = false; // a mouse is over the battlefield
  private aim: AimSpec | null = null;
  private zones: { board: DOMRectLike | null; hand: DOMRectLike | null; units: DOMRectLike[] } = { board: null, hand: null, units: [] };
  private targets: { id: EntityId; rect: DOMRectLike }[] = [];
  private targetsDirty = true;
  private raf = 0;
  private suppressClick = false;
  private lastLongPress = -Infinity;
  /** A second pointer that cancelled the gesture: its own press is ignored until it lifts. */
  private ignoredPointer: number | null = null;

  constructor(private host: DragHost = NO_HOST) {
    this.press = new PressTracker(() => this.onLongPress());
  }

  /** Replaces the host (the React binding refreshes it after every commit so callbacks see the latest state). */
  setHost(host: DragHost): void {
    this.host = host;
  }

  // ── store API (useSyncExternalStore) ──
  subscribe = (l: () => void): (() => void) => {
    this.listeners.add(l);
    return () => this.listeners.delete(l);
  };
  getSnapshot = (): DragState => this.state;

  /** Called inside the animation frame with the live pointer position (DragLayer, TargetArrow). */
  addFrameListener(l: FrameListener): () => void {
    this.frameListeners.add(l);
    return () => this.frameListeners.delete(l);
  }

  /** The live pointer position (for a newly mounted overlay's first paint). */
  pointer(): { x: number; y: number } {
    return { x: this.x, y: this.y };
  }

  /** True while a press/drag/arrow gesture owns the pointer. */
  active(): boolean {
    return this.gesture !== "none";
  }

  // ── wiring ──
  attach(root: HTMLElement): () => void {
    this.root = root;
    root.addEventListener("pointerdown", this.onDown);
    root.addEventListener("pointerleave", this.onLeave);
    root.addEventListener("lostpointercapture", this.onLostCapture);
    root.addEventListener("contextmenu", this.onContextMenu);
    root.addEventListener("click", this.onClickCapture, true);
    root.addEventListener("dragstart", this.onNativeDragStart);
    root.addEventListener("touchmove", this.onTouchMove, { passive: false });
    window.addEventListener("pointerdown", this.onAnyDown, true);
    window.addEventListener("pointermove", this.onMove);
    window.addEventListener("pointerup", this.onUp);
    window.addEventListener("pointercancel", this.onPointerCancel);
    document.addEventListener("visibilitychange", this.onVisibility);
    return () => {
      this.abort();
      root.removeEventListener("pointerdown", this.onDown);
      root.removeEventListener("pointerleave", this.onLeave);
      root.removeEventListener("lostpointercapture", this.onLostCapture);
      root.removeEventListener("contextmenu", this.onContextMenu);
      root.removeEventListener("click", this.onClickCapture, true);
      root.removeEventListener("dragstart", this.onNativeDragStart);
      root.removeEventListener("touchmove", this.onTouchMove);
      window.removeEventListener("pointerdown", this.onAnyDown, true);
      window.removeEventListener("pointermove", this.onMove);
      window.removeEventListener("pointerup", this.onUp);
      window.removeEventListener("pointercancel", this.onPointerCancel);
      document.removeEventListener("visibilitychange", this.onVisibility);
      if (this.raf) cancelAnimationFrame(this.raf);
      this.raf = 0;
      this.root = null;
    };
  }

  /** Syncs arrow mode with the battlefield's interaction state (after a drop, or a tap selection). */
  setAim(aim: AimSpec | null): void {
    if (sameAim(this.aim, aim)) return;
    this.aim = aim;
    this.targetsDirty = true;
    if (!aim && this.gesture === "aimPress") this.endGesture();
    if (!aim && this.gesture === "dragAttack") this.endGesture(); // the attack was resolved/invalidated elsewhere
    this.publishCurrent();
    this.requestFrame();
  }

  /** Re-checks an in-progress drag after new legal actions arrived (e.g. a turn timeout): cancels it if illegal now. */
  revalidate(): void {
    if ((this.gesture === "dragCard" || this.gesture === "dragAttack") && this.source && !this.host.dragKind(this.source)) this.cancel();
  }

  /** Cancels the current gesture (Escape, a second finger, pointercancel, page hidden). */
  cancel(): void {
    const g = this.gesture;
    if (g === "none") return;
    const source = this.source;
    this.endGesture();
    if (g === "dragCard" && source) this.host.onCardCancel(source.iid, this.x, this.y);
    else if (g === "dragAttack" || g === "aimPress") this.host.onAimCancel();
    this.publishCurrent();
  }

  requestFrame(): void {
    if (this.raf || typeof requestAnimationFrame === "undefined") return;
    this.raf = requestAnimationFrame(this.frame);
  }

  // ── internals ──
  private abort(): void {
    this.press.cancel();
    this.endGesture();
    this.state = DRAG_NONE;
  }

  private endGesture(): void {
    this.press.cancel();
    if (this.gesture !== "none" && this.gesture !== "pressing") this.suppressClick = true;
    this.releaseCapture();
    this.gesture = "none";
    this.pointerId = null;
    this.source = null;
    this.inspectTarget = null;
    this.aimMoved = false;
  }

  private capture(): void {
    if (!this.root || this.pointerId === null) return;
    try {
      this.root.setPointerCapture(this.pointerId);
      this.captured = true;
    } catch {
      this.captured = false;
    }
  }

  private releaseCapture(): void {
    if (!this.captured) return;
    this.captured = false; // before releasing: releasing fires lostpointercapture
    try {
      if (this.root && this.pointerId !== null && this.root.hasPointerCapture(this.pointerId)) this.root.releasePointerCapture(this.pointerId);
    } catch {
      /* already released */
    }
  }

  private publish(next: DragState): void {
    const cur = this.state;
    if (cur.kind === next.kind) {
      const a = cur as Record<string, unknown>;
      const b = next as Record<string, unknown>;
      const keys = Object.keys(b).filter((k) => k !== "x" && k !== "y" && k !== "t0" && k !== "startX" && k !== "startY");
      if (keys.every((k) => a[k] === b[k])) return;
    }
    this.state = next;
    for (const l of this.listeners) l();
  }

  /** Publishes what the current gesture/aim implies (hover from the last hit-test). */
  private publishCurrent(hoverOverride?: EntityId | null): void {
    const hover = hoverOverride !== undefined ? hoverOverride : "hover" in this.state ? this.state.hover : null;
    switch (this.gesture) {
      case "pressing":
        this.publish({ kind: "pressing", source: this.source, startX: this.x, startY: this.y, t0: this.t0 });
        return;
      case "dragCard": {
        const zone = zoneAt(this.x, this.y, this.zones);
        const gapIndex = zone === "board" && this.cardKind === "mob" ? gapIndexAt(this.x, this.zones.units) : null;
        const valid = cardDropValid(this.cardKind, zone, this.y, this.zones.hand);
        this.publish({ kind: "draggingCard", iid: this.source!.iid, x: this.x, y: this.y, zone, gapIndex, valid });
        return;
      }
      case "dragAttack":
        this.publish({ kind: "aimingAttack", attacker: this.source!.iid, x: this.x, y: this.y, hover, tracking: true });
        return;
    }
    const aim = this.aim;
    if (!aim) {
      this.publish(DRAG_NONE);
      return;
    }
    const tracking = this.gesture === "aimPress" || this.hovering;
    if (aim.kind === "card") this.publish({ kind: "aimingCard", iid: aim.iid, position: aim.position, x: this.x, y: this.y, hover: tracking ? hover : null, tracking });
    else this.publish({ kind: "aimingAttack", attacker: aim.iid, x: this.x, y: this.y, hover: tracking ? hover : null, tracking });
  }

  private collectZones(): void {
    const root = this.root;
    if (!root) return;
    const board = root.querySelector('[data-cg-zone="board"]');
    const hand = root.querySelector('[data-cg-zone="hand"]');
    this.zones = {
      board: board ? rectOf(board) : null,
      hand: hand ? rectOf(hand) : null,
      units: board ? Array.from(board.querySelectorAll('[data-cg-drag="unit"]'), rectOf) : [],
    };
  }

  private collectTargets(): void {
    this.targetsDirty = false;
    const root = this.root;
    if (!root) return;
    this.targets = Array.from(root.querySelectorAll("[data-cg-target][data-iid]"), (el) => ({ id: el.getAttribute("data-iid")!, rect: rectOf(el) }));
  }

  private frame = (): void => {
    this.raf = 0;
    for (const l of this.frameListeners) l(this.x, this.y);
    if (this.gesture === "dragCard") {
      this.publishCurrent();
      return;
    }
    const aiming = this.gesture === "dragAttack" || this.gesture === "aimPress" || (this.gesture === "none" && this.aim && this.hovering);
    if (!aiming) return;
    if (this.targetsDirty) this.collectTargets();
    this.publishCurrent(targetAt(this.x, this.y, this.targets));
  };

  private onLongPress(): void {
    const target = this.inspectTarget;
    this.gesture = "dead";
    this.suppressClick = true;
    this.lastLongPress = performance.now();
    this.publishCurrent();
    if (target) this.host.onInspect(target);
  }

  /** Window capture: a second pointer anywhere cancels the gesture (§17.7 "a second finger"). */
  private onAnyDown = (e: PointerEvent): void => {
    if (this.pointerId === null || e.pointerId === this.pointerId) return;
    this.ignoredPointer = e.pointerId;
    this.cancel();
  };

  private onDown = (e: PointerEvent): void => {
    if (e.pointerId === this.ignoredPointer) return;
    if (this.pointerId !== null) return; // (a second pointer was handled by onAnyDown)
    if (e.button !== 0) return; // right-click → contextmenu (inspect)
    this.suppressClick = false;
    const el = e.target instanceof Element ? e.target : null;
    const source = sourceOf(el?.closest("[data-cg-drag]") ?? null);
    const inspect = inspectOf(el?.closest("[data-cg-inspect]") ?? null);
    this.x = e.clientX;
    this.y = e.clientY;
    this.hovering = e.pointerType === "mouse";

    // Arrow mode: a press on anything but a fresh source (a hand card, or a unit that is not a target) aims.
    const fresh = source && (source.type === "hand" || !this.aim?.targets.includes(source.iid));
    if (this.aim && !fresh) {
      this.gesture = "aimPress";
      this.pointerId = e.pointerId;
      this.inspectTarget = inspect;
      this.aimMoved = false;
      this.aimStart = { x: e.clientX, y: e.clientY };
      this.targetsDirty = true;
      this.press.down(e.clientX, e.clientY, !!inspect);
      this.publishCurrent(null);
      this.requestFrame();
      return;
    }
    if (!source && !inspect) return;
    this.gesture = "pressing";
    this.pointerId = e.pointerId;
    this.source = source;
    this.inspectTarget = inspect;
    this.t0 = performance.now();
    this.press.down(e.clientX, e.clientY, !!inspect);
    this.publishCurrent();
  };

  private onMove = (e: PointerEvent): void => {
    if (e.pointerId !== this.pointerId) {
      // Mouse hover in arrow mode: the arrow follows the cursor.
      if (this.gesture === "none" && this.aim && e.pointerType === "mouse" && this.root?.contains(e.target as Node)) {
        this.x = e.clientX;
        this.y = e.clientY;
        if (!this.hovering) {
          this.hovering = true;
          this.publishCurrent();
        }
        this.requestFrame();
      }
      return;
    }
    this.x = e.clientX;
    this.y = e.clientY;
    switch (this.gesture) {
      case "pressing":
        if (this.press.move(e.clientX, e.clientY)) this.startDrag();
        return;
      case "aimPress":
        if (this.press.move(e.clientX, e.clientY)) {
          this.aimMoved = true;
          this.capture();
        }
        this.requestFrame();
        return;
      case "dragCard":
      case "dragAttack":
        this.requestFrame();
        return;
    }
  };

  private startDrag(): void {
    const source = this.source;
    const kind = source ? this.host.dragKind(source) : null;
    if (!source || !kind) {
      this.gesture = "dead";
      this.publishCurrent();
      if (source) this.host.onDenied(source);
      return;
    }
    this.capture();
    this.suppressClick = true;
    if (kind === "attack") {
      this.gesture = "dragAttack";
      this.collectTargets();
      this.host.onAttackStart(source.iid);
      this.publishCurrent(targetAt(this.x, this.y, this.targets));
    } else {
      this.gesture = "dragCard";
      this.cardKind = kind;
      this.collectZones();
      this.host.onCardDragStart(source.iid);
      this.publishCurrent();
    }
    this.requestFrame();
  }

  private onUp = (e: PointerEvent): void => {
    if (e.pointerId === this.ignoredPointer) this.ignoredPointer = null;
    if (e.pointerId !== this.pointerId) return;
    this.x = e.clientX;
    this.y = e.clientY;
    const g = this.gesture;
    const source = this.source;
    if (g === "dragCard" && source) {
      const zone = zoneAt(this.x, this.y, this.zones);
      const gapIndex = zone === "board" && this.cardKind === "mob" ? gapIndexAt(this.x, this.zones.units) : null;
      const aboveHand = !this.zones.hand || this.y < this.zones.hand.top;
      const kind = this.cardKind;
      this.endGesture();
      this.publishCurrent();
      this.host.onCardDrop({ iid: source.iid, kind, zone, gapIndex, aboveHand, x: this.x, y: this.y });
      return;
    }
    if (g === "dragAttack" && source) {
      const target = targetAt(this.x, this.y, this.targets);
      this.endGesture();
      this.publishCurrent(null);
      this.host.onAttackDrop(source.iid, target);
      return;
    }
    if (g === "aimPress") {
      const moved = this.aimMoved;
      if (this.targetsDirty) this.collectTargets();
      const target = targetAt(this.x, this.y, this.targets);
      this.hovering = e.pointerType === "mouse";
      if (moved) {
        this.endGesture(); // suppresses the click: the release is the action
        this.publishCurrent(null);
        this.host.onAimRelease(target);
        return;
      }
      // A plain tap in arrow mode: let the native click run the tap-mode reducer.
      const longPressed = this.press.phase === "longPressed";
      this.press.cancel();
      this.gesture = "none";
      this.pointerId = null;
      this.inspectTarget = null;
      if (longPressed) this.suppressClick = true;
      this.publishCurrent();
      return;
    }
    // pressing (a tap: the native click does the rest) or dead (denied drag / long-press already handled)
    const wasDead = g === "dead";
    this.press.cancel();
    this.gesture = "none";
    this.pointerId = null;
    this.source = null;
    this.inspectTarget = null;
    if (wasDead) this.suppressClick = true;
    this.publishCurrent();
  };

  private onPointerCancel = (e: PointerEvent): void => {
    if (e.pointerId === this.ignoredPointer) this.ignoredPointer = null;
    if (e.pointerId === this.pointerId) this.cancel();
  };

  private onLostCapture = (e: PointerEvent): void => {
    // Only the root's own capture counts. On touch the pressed card/unit holds an implicit capture; moving it to the
    // root fires `lostpointercapture` on that element, which bubbles here and must not cancel the drag we just began.
    if (e.target !== this.root) return;
    if (this.captured && e.pointerId === this.pointerId) {
      this.captured = false;
      this.cancel();
    }
  };

  private onLeave = (e: PointerEvent): void => {
    if (e.pointerType !== "mouse" || !this.hovering || this.gesture !== "none") return;
    this.hovering = false;
    this.publishCurrent();
  };

  private onVisibility = (): void => {
    if (document.visibilityState === "hidden") this.cancel();
  };

  private onContextMenu = (e: MouseEvent): void => {
    e.preventDefault(); // no browser menu / iOS callout on the battlefield
    if (performance.now() - this.lastLongPress < CONTEXTMENU_AFTER_LONGPRESS_MS) return;
    if (this.gesture === "dragCard" || this.gesture === "dragAttack") return;
    const target = inspectOf(e.target instanceof Element ? e.target.closest("[data-cg-inspect]") : null);
    if (!target) return;
    if (this.gesture !== "none") this.endGesture();
    this.suppressClick = true;
    this.publishCurrent();
    this.host.onInspect(target);
  };

  /**
   * Swallows the click that follows a drag/long-press so it never also runs as a tap. Keyboard activations
   * (`detail === 0`) are never swallowed: a gesture that produced no click must not eat the next Enter.
   */
  private onClickCapture = (e: MouseEvent): void => {
    if (!this.suppressClick || e.detail === 0) return;
    this.suppressClick = false;
    e.stopPropagation();
    e.preventDefault();
  };

  /**
   * iOS Safari: once a press/drag/arrow gesture owns the finger, cancel the native touchmove so WebKit never starts a
   * pan/scroll (which would fire `pointercancel` and abort the drag). Must be a non-passive listener.
   */
  private onTouchMove = (e: TouchEvent): void => {
    if (this.gesture !== "none" && e.cancelable) e.preventDefault();
  };

  private onNativeDragStart = (e: DragEvent): void => {
    e.preventDefault(); // no HTML5 drag ghost of images/links on desktop
  };
}
