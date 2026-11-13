import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// The real audio module, with the synth functions stubbed so the test can see whether a sound would play.
vi.mock("../../audio", async (orig) => {
  const real = await orig<typeof import("../../audio")>();
  const stub = () => vi.fn();
  return {
    ...real,
    playClick: stub(),
    playCoin: stub(),
    playError: stub(),
    playFanfare: stub(),
    playHit: stub(),
    playLaunch: stub(),
    playLifeLost: stub(),
    playPick: stub(),
    playPowerUp: stub(),
    playSplash: stub(),
    playTick: stub(),
    playWhoosh: stub(),
    unlockAudio: stub(),
  };
});

import * as audio from "../../audio";
import { animationSpeed, MUTED_KEY, parseSpeed, resetSettingsForTests, restoreSoundSetting, setAnimationSpeed, setSoundMuted, soundMuted, SPEED_KEY, subscribeSettings } from "./settings";
import { playCardSound } from "./sounds";

function fakeStorage(): Storage {
  const m = new Map<string, string>();
  return {
    getItem: (k) => m.get(k) ?? null,
    setItem: (k, v) => void m.set(k, String(v)),
    removeItem: (k) => void m.delete(k),
    clear: () => m.clear(),
    key: (i) => [...m.keys()][i] ?? null,
    get length() {
      return m.size;
    },
  };
}

beforeEach(() => {
  vi.stubGlobal("localStorage", fakeStorage());
  resetSettingsForTests();
  audio.setMuted(false);
});
afterEach(() => {
  vi.unstubAllGlobals();
  audio.setMuted(false);
});

describe("in-match settings (Phase 20)", () => {
  it("animation speed: 1× by default, persisted, unknown values fall back to 1×", () => {
    expect(animationSpeed()).toBe(1);
    const seen: number[] = [];
    const off = subscribeSettings(() => seen.push(animationSpeed()));
    setAnimationSpeed(2);
    expect(animationSpeed()).toBe(2);
    expect(localStorage.getItem(SPEED_KEY)).toBe("2");
    setAnimationSpeed(1.5);
    resetSettingsForTests(); // a reload
    expect(animationSpeed()).toBe(1.5);
    setAnimationSpeed(1);
    expect(localStorage.getItem(SPEED_KEY)).toBeNull();
    off();
    expect(seen).toEqual([2, 1.5, 1]);
    expect([parseSpeed("3"), parseSpeed(null), parseSpeed("abc"), parseSpeed("1.5")]).toEqual([1, 1, 1, 1.5]);
  });

  it("sound off is the global mute, persisted and restored after a reload", () => {
    setSoundMuted(true);
    expect(audio.isMuted()).toBe(true);
    expect(soundMuted()).toBe(true);
    expect(localStorage.getItem(MUTED_KEY)).toBe("1");
    audio.setMuted(false); // a reload resets the in-memory switch…
    resetSettingsForTests();
    restoreSoundSetting(); // …the card screens restore it on mount
    expect(audio.isMuted()).toBe(true);
    setSoundMuted(false);
    expect(localStorage.getItem(MUTED_KEY)).toBeNull();
  });

  it("muted: no card sound plays (shared synth and Phase 20 synth alike)", () => {
    vi.mocked(audio.playHit).mockClear();
    setSoundMuted(true);
    playCardSound("hit");
    playCardSound("cinematic"); // Phase 20 synth: would need an AudioContext if it tried to play
    expect(audio.playHit).not.toHaveBeenCalled();
    setSoundMuted(false);
    playCardSound("hit");
    expect(audio.playHit).toHaveBeenCalledTimes(1);
  });

  it("storage failures keep the setting for the session", () => {
    vi.stubGlobal("localStorage", {
      getItem: () => {
        throw new Error("denied");
      },
      setItem: () => {
        throw new Error("denied");
      },
      removeItem: () => {
        throw new Error("denied");
      },
    });
    resetSettingsForTests();
    expect(animationSpeed()).toBe(1);
    setAnimationSpeed(2);
    expect(animationSpeed()).toBe(2);
    setSoundMuted(true);
    expect(audio.isMuted()).toBe(true);
  });
});
