"use client";

import { type PointerEvent, type ReactNode, useEffect, useRef } from "react";

export type Zoom = { s: number; x: number; y: number };
export const NO_ZOOM: Zoom = { s: 1, x: 0, y: 0 };
export const MAX_ZOOM = 3;
/** Finger travel (px) before a touch becomes a pan instead of a tap. */
const SLOP = 8;

/** Keeps the board filling the frame: no zooming out past 1×, no panning off the edge. */
export function clampZoom(z: Zoom, w: number): Zoom {
  const s = Math.min(MAX_ZOOM, Math.max(1, z.s));
  const min = w - w * s;
  return { s, x: Math.min(0, Math.max(min, z.x)), y: Math.min(0, Math.max(min, z.y)) };
}

/** Zoom to `s` with the point (fx, fy) — fractions of the board — in the middle of the frame. */
export function zoomAt(s: number, fx: number, fy: number, w: number): Zoom {
  return clampZoom({ s, x: w / 2 - fx * w * s, y: w / 2 - fy * w * s }, w);
}

type Pt = { x: number; y: number };
type Gesture = { kind: "pan" | "pinch"; z0: Zoom; m0: Pt; d0: number; moved: boolean };

const mid = (a: Pt, b: Pt) => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });
const dist = (a: Pt, b: Pt) => Math.hypot(a.x - b.x, a.y - b.y) || 1;

/**
 * Square frame with pinch-to-zoom and drag-to-pan for the board. Taps still reach the cells;
 * a tap that ended a pan or pinch is swallowed so it never fires by accident.
 */
export function ZoomPan({ zoom, setZoom, children }: { zoom: Zoom; setZoom: (z: Zoom) => void; children: ReactNode }) {
  const box = useRef<HTMLDivElement>(null);
  const inner = useRef<HTMLDivElement>(null);
  const pts = useRef(new Map<number, Pt>());
  const g = useRef<Gesture | null>(null);
  const zref = useRef(zoom);
  const swallowUntil = useRef(0);

  useEffect(() => {
    zref.current = zoom;
  }, [zoom]);

  const local = (e: { clientX: number; clientY: number }): Pt => {
    const r = box.current!.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };
  const width = () => box.current?.clientWidth ?? 1;
  const live = (on: boolean) => {
    if (inner.current) inner.current.style.transition = on ? "none" : "";
  };
  const apply = (z: Zoom) => {
    const c = clampZoom(z, width());
    zref.current = c;
    setZoom(c);
  };

  // Desktop: wheel / trackpad zoom around the cursor. iOS: stop Safari zooming the whole page.
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const p = local(e);
      const z = zref.current;
      const s = z.s * Math.exp(-e.deltaY * (e.ctrlKey ? 0.01 : 0.0025));
      const px = (p.x - z.x) / z.s;
      const py = (p.y - z.y) / z.s;
      apply({ s, x: p.x - px * s, y: p.y - py * s });
    };
    const stop = (e: Event) => e.preventDefault();
    el.addEventListener("wheel", onWheel, { passive: false });
    el.addEventListener("gesturestart", stop);
    el.addEventListener("gesturechange", stop);
    return () => {
      el.removeEventListener("wheel", onWheel);
      el.removeEventListener("gesturestart", stop);
      el.removeEventListener("gesturechange", stop);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- listeners read the latest zoom through zref
  }, []);

  const capture = (id: number) => {
    try {
      box.current?.setPointerCapture(id);
    } catch {
      /* pointer already gone */
    }
  };

  const onPointerDown = (e: PointerEvent) => {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    pts.current.set(e.pointerId, local(e));
    const list = [...pts.current.values()];
    if (list.length >= 2) {
      g.current = { kind: "pinch", z0: zref.current, m0: mid(list[0], list[1]), d0: dist(list[0], list[1]), moved: true };
      [...pts.current.keys()].forEach(capture);
      live(true);
    } else {
      g.current = { kind: "pan", z0: zref.current, m0: list[0], d0: 1, moved: false };
    }
  };

  const onPointerMove = (e: PointerEvent) => {
    if (!pts.current.has(e.pointerId)) return;
    pts.current.set(e.pointerId, local(e));
    const cur = g.current;
    if (!cur) return;
    const list = [...pts.current.values()];
    if (cur.kind === "pinch" && list.length >= 2) {
      const m = mid(list[0], list[1]);
      const s = cur.z0.s * (dist(list[0], list[1]) / cur.d0);
      const px = (cur.m0.x - cur.z0.x) / cur.z0.s;
      const py = (cur.m0.y - cur.z0.y) / cur.z0.s;
      apply({ s, x: m.x - px * s, y: m.y - py * s });
    } else if (cur.kind === "pan") {
      if (cur.z0.s <= 1.01) return; // nothing to pan at 1×: leave the touch as a tap
      const p = list[0];
      const dx = p.x - cur.m0.x;
      const dy = p.y - cur.m0.y;
      if (!cur.moved) {
        if (Math.hypot(dx, dy) < SLOP) return;
        cur.moved = true;
        capture(e.pointerId);
        live(true);
      }
      apply({ s: cur.z0.s, x: cur.z0.x + dx, y: cur.z0.y + dy });
    }
  };

  const onPointerEnd = (e: PointerEvent) => {
    if (!pts.current.delete(e.pointerId)) return;
    const cur = g.current;
    if (cur?.moved) swallowUntil.current = performance.now() + 350;
    const rest = [...pts.current.values()];
    if (cur?.kind === "pinch" && rest.length === 1) {
      g.current = { kind: "pan", z0: zref.current, m0: rest[0], d0: 1, moved: true }; // keep panning with the finger left
    } else if (!rest.length) {
      g.current = null;
      live(false);
    }
  };

  return (
    <div
      ref={box}
      className="relative aspect-square w-full overflow-hidden rounded-2xl"
      style={{ touchAction: "none", WebkitTouchCallout: "none", userSelect: "none" }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerEnd}
      onPointerCancel={onPointerEnd}
      onClickCapture={(e) => {
        if (performance.now() < swallowUntil.current) {
          e.stopPropagation();
          e.preventDefault();
        }
      }}
    >
      <div
        ref={inner}
        className="origin-top-left transition-transform duration-200 ease-out"
        style={{ transform: `translate(${zoom.x}px, ${zoom.y}px) scale(${zoom.s})` }}
      >
        {children}
      </div>
    </div>
  );
}
