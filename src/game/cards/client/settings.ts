// In-match settings (Phase 20): sound on/off and animation speed 1× / 1.5× / 2×. Reduced motion lives in
// `animation/motion.ts` (Phase 13). A tiny external store (React subscribes with useSyncExternalStore; the animation
// code reads it synchronously), persisted in localStorage; storage failures (private mode) keep the setting for the
// session only. Mute is the GLOBAL mute of src/game/audio.ts (the same switch Batalla Naval and Charades use).
import { isMuted, setMuted } from "../../audio";

export const ANIMATION_SPEEDS = [1, 1.5, 2] as const;
export type AnimationSpeed = (typeof ANIMATION_SPEEDS)[number];

export const SPEED_KEY = "pikaboom.cards.animSpeed";
export const MUTED_KEY = "pikaboom.cards.muted";

const listeners = new Set<() => void>();
let speed: AnimationSpeed | null = null;
let restored = false;

function storage(): Storage | null {
  try {
    return typeof localStorage === "undefined" ? null : localStorage;
  } catch {
    return null;
  }
}

function notify(): void {
  for (const l of listeners) l();
}

export function parseSpeed(raw: string | null | undefined): AnimationSpeed {
  const n = Number(raw);
  return (ANIMATION_SPEEDS as readonly number[]).includes(n) ? (n as AnimationSpeed) : 1;
}

export function animationSpeed(): AnimationSpeed {
  if (speed !== null) return speed;
  try {
    speed = parseSpeed(storage()?.getItem(SPEED_KEY));
  } catch {
    speed = 1;
  }
  return speed;
}

export function setAnimationSpeed(next: AnimationSpeed): void {
  speed = parseSpeed(String(next));
  try {
    const s = storage();
    if (speed === 1) s?.removeItem(SPEED_KEY);
    else s?.setItem(SPEED_KEY, String(speed));
  } catch {
    /* session only */
  }
  notify();
}

/** Applies a stored "muted" choice once per page load (the card screens call this on mount). */
export function restoreSoundSetting(): void {
  if (restored) return;
  restored = true;
  try {
    if (storage()?.getItem(MUTED_KEY) === "1" && !isMuted()) setMuted(true);
  } catch {
    /* nothing stored */
  }
  notify();
}

export function soundMuted(): boolean {
  return isMuted();
}

export function setSoundMuted(muted: boolean): void {
  setMuted(muted);
  try {
    const s = storage();
    if (muted) s?.setItem(MUTED_KEY, "1");
    else s?.removeItem(MUTED_KEY);
  } catch {
    /* session only */
  }
  notify();
}

export function subscribeSettings(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Tests only. */
export function resetSettingsForTests(): void {
  speed = null;
  restored = false;
}
