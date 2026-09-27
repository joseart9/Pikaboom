"use client";

import { useSyncExternalStore } from "react";

const KEY = "pikaboom.adult.v1";
const listeners = new Set<() => void>();

export function getAdultMode() {
  try {
    return localStorage.getItem(KEY) === "1";
  } catch {
    return false;
  }
}

export function setAdultMode(on: boolean) {
  try {
    localStorage.setItem(KEY, on ? "1" : "0");
  } catch {
    /* ignore */
  }
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  window.addEventListener("storage", listener);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", listener);
  };
}

/** +18 mode, persisted on this device. */
export function useAdultMode() {
  return useSyncExternalStore(subscribe, getAdultMode, () => false);
}
