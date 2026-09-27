"use client";

import { useEffect } from "react";
import { haptic, isHapticHelper } from "@/game/haptics";

const TAPPABLE = 'button, a[href], [role="switch"], [role="tab"], summary';

/** Gives every button, link and switch in the app a haptic tick on tap. */
export function Haptics() {
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (isHapticHelper(e.target)) return; // our own hidden switch
      const el = e.target instanceof Element ? e.target.closest(TAPPABLE) : null;
      if (!el || (el as HTMLButtonElement).disabled || el.getAttribute("aria-disabled") === "true") return;
      haptic(el.hasAttribute("data-haptic") ? (el.getAttribute("data-haptic") as "light" | "medium" | "heavy") : "light");
    };
    // Capture phase so it fires even if a handler stops propagation.
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, []);
  return null;
}
