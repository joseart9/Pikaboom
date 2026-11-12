"use client";

// Optional instant "something changed" pushes over Supabase Realtime (Broadcast) — a copy of
// src/game/battleship/realtime.ts with the channel `pikaboom-cards-<matchId>` (§13.5, T4).
// The game never depends on it: polling keeps everything in sync on its own, this just makes the opponent poll
// right away. The payload is only the new version number; the channel name is the unguessable match UUID.

import type { RealtimeChannel } from "@supabase/supabase-js";

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export type Nudger = { send(version: number): void; isLive(): boolean; close(): void };

const NOOP: Nudger = { send() {}, isLive: () => false, close() {} };

export function connectNudger(matchId: string, onNudge: (version: number) => void): Nudger {
  if (!URL || !KEY) return NOOP;
  let live = false;
  let closed = false;
  let cleanup = () => {};
  let channel: RealtimeChannel | null = null;

  void import("@supabase/supabase-js")
    .then(({ createClient }) => {
      if (closed) return;
      const supabase = createClient(URL, KEY, {
        auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
        realtime: { params: { eventsPerSecond: 10 } },
      });
      const ch = supabase
        .channel(`pikaboom-cards-${matchId}`, { config: { broadcast: { self: false, ack: false } } })
        .on("broadcast", { event: "v" }, ({ payload }) => onNudge(Number(payload?.v) || 0))
        .subscribe((status) => {
          live = status === "SUBSCRIBED";
        });
      channel = ch;
      cleanup = () => {
        live = false;
        void supabase.removeChannel(ch);
        supabase.realtime.disconnect();
      };
    })
    .catch(() => {
      /* realtime unavailable — polling covers it */
    });

  return {
    send(version) {
      if (!live || !channel) return;
      channel.send({ type: "broadcast", event: "v", payload: { v: version } }).catch(() => {});
    },
    isLive: () => live,
    close() {
      closed = true;
      cleanup();
    },
  };
}
