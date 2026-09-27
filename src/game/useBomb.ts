"use client";

import { useCallback, useEffect, useRef } from "react";
import { playTick, startFuse, stopFuse } from "./audio";

const rand = (min: number, max: number) => min + Math.random() * (max - min);

/** Normal tick-tock spacing. */
const CALM_MS = 500;
/** The real final countdown starts this long before the explosion. */
const FINAL_MS = 20_000;
/** Random "false alarm" bursts of fast ticking. */
const BURST_LEN_MS: [number, number] = [8_000, 12_000];
const FIRST_BURST_AFTER_MS: [number, number] = [15_000, 35_000];
const GAP_BETWEEN_BURSTS_MS: [number, number] = [15_000, 40_000];
/** A false alarm must end at least this long before the explosion (final countdown + 3 s calm). */
const BURST_CLEARANCE_MS = FINAL_MS + 3_000;

/** Final countdown: speeds up smoothly from ~380 ms to ~90 ms between ticks. */
function finalInterval(remainingMs: number) {
  return 90 + (Math.max(0, remainingMs) / FINAL_MS) * 290;
}

/** False alarm: ramps from ~320 ms to ~170 ms over the burst, then drops back to calm. */
function burstInterval(progress: number) {
  return 320 - Math.min(1, progress) * 150;
}

/**
 * Hidden bomb timer. The remaining time lives only in refs — it is never rendered —
 * and is deadline based, so it stays accurate even if the tab is throttled.
 *
 * Besides the real final countdown (last 20 s), it plays random bursts of fast ticking
 * during the round so teams can never tell whether the bomb is actually about to blow.
 */
export function useBomb(onExplode: () => void) {
  const deadline = useRef<number | null>(null);
  const pausedRemaining = useRef<number | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tickHigh = useRef(true);
  const explodeRef = useRef(onExplode);

  // Burst schedule, measured in time actually played (pauses don't count).
  const elapsed = useRef(0);
  const lastLoopAt = useRef(0);
  const nextBurstAt = useRef(0);
  const burst = useRef<{ start: number; end: number } | null>(null);

  useEffect(() => {
    explodeRef.current = onExplode;
  }, [onExplode]);

  const clear = () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
  };

  const loop = useCallback(function tickLoop() {
    if (deadline.current === null) return;
    const now = performance.now();
    elapsed.current += now - lastLoopAt.current;
    lastLoopAt.current = now;

    const remaining = deadline.current - now;
    if (remaining <= 0) {
      deadline.current = null;
      if (timer.current) clearTimeout(timer.current);
      timer.current = null;
      stopFuse();
      explodeRef.current();
      return;
    }

    const t = elapsed.current;
    if (burst.current && t >= burst.current.end) {
      burst.current = null;
      nextBurstAt.current = t + rand(...GAP_BETWEEN_BURSTS_MS);
    }
    if (!burst.current && t >= nextBurstAt.current) {
      const len = rand(...BURST_LEN_MS);
      // Only if it can finish well before the real countdown, so the two never blur together.
      if (remaining > len + BURST_CLEARANCE_MS) {
        burst.current = { start: t, end: t + len };
      } else {
        nextBurstAt.current = t + rand(...GAP_BETWEEN_BURSTS_MS);
      }
    }

    let interval = CALM_MS;
    if (burst.current) {
      const b = burst.current;
      interval = burstInterval((t - b.start) / (b.end - b.start));
    }
    if (remaining < FINAL_MS) interval = Math.min(interval, finalInterval(remaining));

    playTick(tickHigh.current);
    tickHigh.current = !tickHigh.current;
    timer.current = setTimeout(tickLoop, Math.min(interval, remaining));
  }, []);

  const start = useCallback(
    (seconds: number) => {
      clear();
      pausedRemaining.current = null;
      const now = performance.now();
      deadline.current = now + seconds * 1000;
      elapsed.current = 0;
      lastLoopAt.current = now;
      burst.current = null;
      nextBurstAt.current = rand(...FIRST_BURST_AFTER_MS);
      startFuse();
      loop();
    },
    [loop],
  );

  const addTime = useCallback((seconds: number) => {
    if (deadline.current !== null) deadline.current += seconds * 1000;
    else if (pausedRemaining.current !== null) pausedRemaining.current += seconds * 1000;
  }, []);

  const pause = useCallback(() => {
    if (deadline.current === null) return;
    const now = performance.now();
    elapsed.current += now - lastLoopAt.current;
    pausedRemaining.current = deadline.current - now;
    deadline.current = null;
    clear();
    stopFuse();
  }, []);

  const resume = useCallback(() => {
    if (pausedRemaining.current === null) return;
    const now = performance.now();
    deadline.current = now + pausedRemaining.current;
    lastLoopAt.current = now;
    pausedRemaining.current = null;
    startFuse();
    loop();
  }, [loop]);

  const stop = useCallback(() => {
    deadline.current = null;
    pausedRemaining.current = null;
    burst.current = null;
    clear();
    stopFuse();
  }, []);

  useEffect(() => stop, [stop]);

  return { start, addTime, pause, resume, stop };
}
