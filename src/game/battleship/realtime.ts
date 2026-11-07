"use client";

// Optional instant "something changed" pushes over Supabase Realtime (Broadcast).
// The game never depends on it: polling keeps everything in sync on its own, this just makes the
// other phone react right away. Uses the public Supabase URL/key already in the app's env, if set.

import type { RealtimeChannel } from "@supabase/supabase-js";

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export type Nudger = { send(version: number): void; isLive(): boolean; close(): void };

const NOOP: Nudger = { send() {}, isLive: () => false, close() {} };

export function connectNudger(code: string, onNudge: (version: number) => void): Nudger {
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
        .channel(`pikaboom-bs-${code}`, { config: { broadcast: { self: false, ack: false } } })
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
