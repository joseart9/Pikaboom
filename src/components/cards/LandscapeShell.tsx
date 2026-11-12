"use client";

// Full-viewport landscape container for every /cards page (§17.2): safe-area padding, an orientation-lock attempt
// (works in installed PWAs / fullscreen on Android; ignored elsewhere) and the CSS-only rotate overlay.
import { useEffect, type ReactNode } from "react";
import { RotateOverlay } from "./RotateOverlay";

type LockableOrientation = ScreenOrientation & { lock?: (o: string) => Promise<void>; unlock?: () => void };

function tryLock(): Promise<boolean> {
  const o = (typeof screen !== "undefined" ? screen.orientation : undefined) as LockableOrientation | undefined;
  if (!o?.lock) return Promise.resolve(false);
  return o.lock("landscape").then(
    () => true,
    () => false,
  );
}

export function LandscapeShell({ children }: { children: ReactNode }) {
  useEffect(() => {
    let done = false;
    const retry = () => {
      if (done) return;
      void tryLock().then((ok) => {
        done = ok;
      });
    };
    void tryLock().then((ok) => {
      done = ok;
      if (!ok) window.addEventListener("pointerdown", retry, { once: true });
    });
    return () => {
      window.removeEventListener("pointerdown", retry);
      (screen.orientation as LockableOrientation | undefined)?.unlock?.();
    };
  }, []);

  return (
    <div className="cg-root cg-shell">
      <div className="cg-shell-content">{children}</div>
      <RotateOverlay />
    </div>
  );
}
