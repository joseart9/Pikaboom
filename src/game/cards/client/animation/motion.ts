// Reduced-motion preference (§18.3, Phase 13): the OS setting (`prefers-reduced-motion: reduce`) OR the in-game toggle
// "Animaciones reducidas" (localStorage `pikaboom.cards.reducedMotion` = "1"). A tiny external store so React can
// subscribe and the animation code can read it synchronously. Storage failures (private mode) fall back to the OS.
export const REDUCED_MOTION_KEY = "pikaboom.cards.reducedMotion";

const listeners = new Set<() => void>();
let toggle: boolean | null = null; // cached localStorage value
let media: MediaQueryList | null = null;

function readToggle(): boolean {
  if (toggle !== null) return toggle;
  try {
    toggle = typeof localStorage !== "undefined" && localStorage.getItem(REDUCED_MOTION_KEY) === "1";
  } catch {
    toggle = false;
  }
  return toggle;
}

function mediaQuery(): MediaQueryList | null {
  if (media || typeof window === "undefined" || typeof window.matchMedia !== "function") return media;
  media = window.matchMedia("(prefers-reduced-motion: reduce)");
  media.addEventListener?.("change", () => notify());
  return media;
}

function notify(): void {
  for (const l of listeners) l();
}

/** The OS asks for reduced motion. */
export function osReducedMotion(): boolean {
  return mediaQuery()?.matches ?? false;
}

/** The in-game toggle is on. */
export function reducedMotionToggle(): boolean {
  return readToggle();
}

/** Effective setting: OS or in-game toggle. */
export function isReducedMotion(): boolean {
  return osReducedMotion() || readToggle();
}

export function setReducedMotionToggle(on: boolean): void {
  toggle = on;
  try {
    if (on) localStorage.setItem(REDUCED_MOTION_KEY, "1");
    else localStorage.removeItem(REDUCED_MOTION_KEY);
  } catch {
    /* not persisted: the setting still applies to this session */
  }
  notify();
}

export function subscribeReducedMotion(listener: () => void): () => void {
  listeners.add(listener);
  mediaQuery();
  return () => listeners.delete(listener);
}
