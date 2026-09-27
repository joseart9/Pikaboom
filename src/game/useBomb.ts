"use client";

import { useCallback, useEffect, useRef } from "react";
import { playTick, startFuse, stopFuse } from "./audio";

/** Tick spacing in ms. Steady tick-tock, speeding up only in the final seconds. */
function tickInterval(remainingMs: number) {
  if (remainingMs < 3000) return 110;
  if (remainingMs < 7000) return 220;
  if (remainingMs < 12000) return 350;
  return 500;
}

/**
 * Hidden bomb timer. The remaining time lives only in a ref — it is never rendered —
 * and is deadline based, so it stays accurate even if the tab is throttled.
 */
export function useBomb(onExplode: () => void) {
  const deadline = useRef<number | null>(null);
  const pausedRemaining = useRef<number | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tickHigh = useRef(true);
  const explodeRef = useRef(onExplode);

  useEffect(() => {
    explodeRef.current = onExplode;
  }, [onExplode]);

  const clear = () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
  };

  const loop = useCallback(function tickLoop() {
    if (deadline.current === null) return;
    const remaining = deadline.current - performance.now();
    if (remaining <= 0) {
      deadline.current = null;
      if (timer.current) clearTimeout(timer.current);
      timer.current = null;
      stopFuse();
      explodeRef.current();
      return;
    }
    playTick(tickHigh.current);
    tickHigh.current = !tickHigh.current;
    timer.current = setTimeout(tickLoop, Math.min(tickInterval(remaining), remaining));
  }, []);

  const start = useCallback(
    (seconds: number) => {
      clear();
      pausedRemaining.current = null;
      deadline.current = performance.now() + seconds * 1000;
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
    pausedRemaining.current = deadline.current - performance.now();
    deadline.current = null;
    clear();
    stopFuse();
  }, []);

  const resume = useCallback(() => {
    if (pausedRemaining.current === null) return;
    deadline.current = performance.now() + pausedRemaining.current;
    pausedRemaining.current = null;
    startFuse();
    loop();
  }, [loop]);

  const stop = useCallback(() => {
    deadline.current = null;
    pausedRemaining.current = null;
    clear();
    stopFuse();
  }, []);

  useEffect(() => stop, [stop]);

  return { start, addTime, pause, resume, stop };
}
