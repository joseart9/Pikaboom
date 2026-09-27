// Keeps the screen on while the bomb is ticking (Screen Wake Lock API, iOS 16.4+).
let sentinel: WakeLockSentinel | null = null;
let wanted = false;

async function acquire() {
  if (!wanted || sentinel || !("wakeLock" in navigator) || document.visibilityState !== "visible") return;
  try {
    sentinel = await navigator.wakeLock.request("screen");
    sentinel.addEventListener("release", () => (sentinel = null));
  } catch {
    /* denied / unsupported — not critical */
  }
}

if (typeof document !== "undefined") {
  document.addEventListener("visibilitychange", () => void acquire());
}

export function keepAwake(on: boolean) {
  wanted = on;
  if (on) void acquire();
  else {
    void sentinel?.release();
    sentinel = null;
  }
}
