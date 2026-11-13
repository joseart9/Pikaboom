"use client";

// Card-game sounds and haptics (Phase 11 G.7): a small map onto the existing synthesized sounds in src/game/audio.ts.
// No new audio code. Sounds never throw (no AudioContext, autoplay policies): the game must work silently.
import { playClick, playCoin, playError, playFanfare, playHit, playLaunch, playLifeLost, playPick, playPowerUp, playSplash, playTick, playWhoosh, unlockAudio } from "../../audio";
import { haptic } from "../../../lib/haptic";

export type CardSound =
  | "tick"
  | "myTurn"
  | "error"
  | "victory"
  | "defeat"
  | "draw"
  | "foeJoined"
  | "matchStart"
  | "select"
  // Event playback (Phase 13)
  | "play"
  | "hit"
  | "heal"
  | "death"
  | "burn"
  // Match reward paid (Phase 16)
  | "coin";

const SOUNDS: Record<CardSound, () => void> = {
  tick: () => playTick(true),
  myTurn: playPick,
  error: playError,
  victory: playFanfare,
  defeat: playLifeLost,
  draw: playClick,
  foeJoined: playCoin,
  matchStart: playWhoosh,
  select: playClick,
  play: playWhoosh,
  hit: playHit,
  heal: playPowerUp,
  death: playSplash,
  burn: playLaunch,
  coin: playCoin,
};

const HAPTICS: Partial<Record<CardSound, number | number[]>> = {
  myTurn: [40, 30, 40],
  error: 30,
  victory: [60, 40, 60],
  defeat: 120,
  foeJoined: 30,
};

export function playCardSound(kind: CardSound): void {
  try {
    SOUNDS[kind]();
  } catch {
    /* audio unavailable — silent is fine */
  }
  const pattern = HAPTICS[kind];
  if (pattern !== undefined) haptic(pattern);
}

let armed = false;

/** Browsers (iOS especially) only start audio from a user gesture: unlock on the first tap anywhere. */
export function armAudioUnlock(): void {
  if (armed || typeof window === "undefined") return;
  armed = true;
  window.addEventListener(
    "pointerdown",
    () => {
      try {
        unlockAudio();
      } catch {
        /* ignore */
      }
    },
    { once: true, capture: true },
  );
}
