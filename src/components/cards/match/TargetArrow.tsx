"use client";

// The targeting arrow (§17.4, §21 Phase 12 G.4): an SVG cubic curve from the source (attacker, placed ghost, parked
// spell or selected hand card) to the pointer, with an arrowhead. Geometry is written straight to the SVG nodes from
// the drag controller's frame listener; React only toggles visibility and the valid/invalid color.
import { useEffect, useRef } from "react";
import type { DragController } from "@/game/cards/client/drag";

export interface TargetArrowProps {
  controller: DragController;
  /** CSS selector of the arrow's source element; null hides the arrow. */
  source: string | null;
  /** The pointer is over a legal target (arrow turns `--cg-valid`). */
  valid: boolean;
  visible: boolean;
}

const MIN_LENGTH = 14;

export function TargetArrow({ controller, source, valid, visible }: TargetArrowProps) {
  const pathRef = useRef<SVGPathElement>(null);
  const headRef = useRef<SVGPathElement>(null);

  useEffect(() => {
    if (!visible || !source) return;
    let el: Element | null = null;
    const draw = (x: number, y: number) => {
      const path = pathRef.current;
      const head = headRef.current;
      if (!el || !el.isConnected) el = document.querySelector(source);
      if (!el || !path || !head) return;
      const r = el.getBoundingClientRect();
      const sx = r.left + r.width / 2;
      const sy = r.top + r.height / 2;
      const dx = x - sx;
      const dy = y - sy;
      const dist = Math.hypot(dx, dy);
      if (dist < MIN_LENGTH) {
        path.setAttribute("d", "");
        head.setAttribute("visibility", "hidden");
        return;
      }
      // Bow the curve sideways (always upwards on screen), proportional to its length.
      const k = Math.min(90, dist * 0.22);
      let nx = (-dy / dist) * k;
      let ny = (dx / dist) * k;
      if (ny > 0) {
        nx = -nx;
        ny = -ny;
      }
      const c1x = sx + dx * 0.25 + nx;
      const c1y = sy + dy * 0.25 + ny;
      const c2x = sx + dx * 0.75 + nx;
      const c2y = sy + dy * 0.75 + ny;
      path.setAttribute("d", `M ${sx} ${sy} C ${c1x} ${c1y} ${c2x} ${c2y} ${x} ${y}`);
      const angle = (Math.atan2(y - c2y, x - c2x) * 180) / Math.PI;
      head.setAttribute("transform", `translate(${x} ${y}) rotate(${angle})`);
      head.setAttribute("visibility", "visible");
    };
    const p = controller.pointer();
    draw(p.x, p.y);
    return controller.addFrameListener(draw);
  }, [controller, source, visible]);

  return (
    <svg className={`cg-arrow${valid ? " cg-arrow--valid" : ""}`} style={{ display: visible && source ? undefined : "none" }} aria-hidden>
      <path ref={pathRef} className="cg-arrow-path" d="" />
      <path ref={headRef} className="cg-arrow-head" d="M 2 0 L -20 -13 L -14 0 L -20 13 Z" visibility="hidden" />
    </svg>
  );
}
