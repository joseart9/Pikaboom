"use client";

import { useEffect } from "react";
import { haptic } from "@/lib/haptic";

const TAPPABLE = 'button, a[href], [role="switch"], [role="tab"], summary';

/** Android vibration length per `data-haptic` strength (iOS always plays its fixed tick). */
const PATTERN: Record<string, number | number[]> = { light: 15, medium: 30, heavy: [40, 30, 40] };

/** Gives every button, link and switch in the app a haptic tick on tap. */
export function Haptics() {
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      const el = e.target instanceof Element ? e.target.closest(TAPPABLE) : null;
      if (!el || (el as HTMLButtonElement).disabled || el.getAttribute("aria-disabled") === "true") return;
      const strength = el.getAttribute("data-haptic") ?? "light";
      haptic(PATTERN[strength] ?? PATTERN.light);
    };
    // Capture phase so it fires even if a handler stops propagation.
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, []);
  return null;
}
