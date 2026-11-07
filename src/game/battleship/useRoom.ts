"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Action, Mode, View } from "./logic";
import { connectNudger, type Nudger } from "./realtime";

// How the two phones stay in sync:
// - The server (Postgres) holds the one true game. Phones never talk to each other directly.
// - Each phone polls the room ~1×/s ("anything newer than version N?"); the answer is tiny when
//   nothing changed. When Supabase Realtime is available, the other phone is also pinged instantly.
// - Moves carry a unique id and are retried with backoff until the server confirms, so a dropped
//   connection never loses or duplicates a shot.
// - Locking the phone or switching apps pauses polling; coming back syncs immediately.

const POLL_MS = 1000;
const POLL_MS_REALTIME = 2000;
const REQUEST_TIMEOUT_MS = 8000;
const STALE_MS = 6000; // no successful sync for this long → "reconectando"

export type ConnStatus = "connecting" | "online" | "reconnecting";

function storageSuffix() {
  // `?jugador=x` gives a second player identity in the same browser (handy for testing on one device).
  try {
    const p = new URLSearchParams(window.location.search).get("jugador");
    return p ? `.${p.replace(/[^a-z0-9]/gi, "").slice(0, 12)}` : "";
  } catch {
    return "";
  }
}

function randomId() {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

function store(key: string, value?: string | null) {
  try {
    const k = `pikaboom.bs.${key}${storageSuffix()}`;
    if (value === undefined) return localStorage.getItem(k);
    if (value === null) localStorage.removeItem(k);
    else localStorage.setItem(k, value);
  } catch {
    /* private mode etc. */
  }
  return null;
}

/** This device's anonymous player token. */
export function playerId() {
  let id = store("player");
  if (!id) {
    id = randomId();
    store("player", id);
  }
  return id;
}

export const savedName = () => store("name") ?? "";
export const saveName = (name: string) => store("name", name);
export const savedRoom = () => {
  const raw = store("room");
  try {
    const r = raw ? (JSON.parse(raw) as { code: string; at: number }) : null;
    return r && Date.now() - r.at < 1000 * 60 * 60 * 24 ? r.code : null;
  } catch {
    return null;
  }
};
export const saveRoom = (code: string | null) => store("room", code ? JSON.stringify({ code, at: Date.now() }) : null);

type ApiResult = { view?: View; same?: boolean; version?: number; foeOnline?: boolean; error?: string };

async function api(path: string, init?: RequestInit): Promise<{ status: number; body: ApiResult }> {
  const res = await fetch(`/api/battleship${path}`, {
    ...init,
    cache: "no-store",
    headers: { "content-type": "application/json", "x-player": playerId(), ...(init?.headers ?? {}) },
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
  const body = (await res.json().catch(() => ({ error: "Respuesta inválida del servidor." }))) as ApiResult;
  return { status: res.status, body };
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Sends a request, retrying network/server failures with backoff. 4xx answers are returned as-is. */
async function withRetry(path: string, init: RequestInit, attempts = 8) {
  let delay = 400;
  for (let i = 0; ; i++) {
    try {
      const r = await api(path, init);
      if (r.status < 500 || i >= attempts - 1) return r;
    } catch (e) {
      if (i >= attempts - 1) throw e;
    }
    await sleep(delay);
    delay = Math.min(delay * 1.8, 4000);
  }
}

export async function createRoom(name: string, mode: Mode, extraTurn: boolean) {
  const r = await withRetry("", { method: "POST", body: JSON.stringify({ name, mode, extraTurn }) }, 4);
  if (!r.body.view) throw new Error(r.body.error ?? "No se pudo crear la sala.");
  return r.body.view;
}

export async function joinRoom(code: string, name: string) {
  const r = await withRetry(`/${code}`, { method: "POST", body: JSON.stringify({ id: randomId(), action: { t: "join", name } }) }, 4);
  if (!r.body.view) throw new Error(r.body.error ?? "No se pudo entrar a la sala.");
  return r.body.view;
}

/** Live connection to a room the player already sits in. */
export function useRoom(initial: View) {
  const code = initial.code;
  const [view, setView] = useState<View>(initial);
  const [status, setStatus] = useState<ConnStatus>("online");
  const [fatal, setFatal] = useState<string | null>(null);
  const [foeOnline, setFoeOnline] = useState(initial.foe?.online ?? false);

  const versionRef = useRef(initial.version);
  const lastOk = useRef(0);
  const wake = useRef<() => void>(() => {});
  const nudger = useRef<Nudger | null>(null);

  const accept = useCallback((v: View | undefined) => {
    if (!v || v.version < versionRef.current) return;
    versionRef.current = v.version;
    setView(v);
    if (v.foe) setFoeOnline(v.foe.online);
  }, []);

  // ── polling loop ──
  useEffect(() => {
    let stopped = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let inFlight = false;
    let failures = 0;
    lastOk.current = Date.now();

    const schedule = (ms: number) => {
      clearTimeout(timer);
      if (!stopped) timer = setTimeout(tick, ms);
    };

    async function tick() {
      if (stopped || inFlight) return;
      if (document.visibilityState === "hidden") return; // resumes on visibilitychange
      inFlight = true;
      try {
        const r = await api(`/${code}?v=${versionRef.current}`);
        if (r.status === 404 || r.status === 403) {
          setFatal(r.body.error ?? "Ya no estás en esta sala.");
          stopped = true;
          return;
        }
        if (r.status >= 500) throw new Error(r.body.error);
        failures = 0;
        lastOk.current = Date.now();
        setStatus("online");
        if (r.body.same) setFoeOnline(!!r.body.foeOnline);
        else accept(r.body.view);
      } catch {
        failures += 1;
        if (Date.now() - lastOk.current > STALE_MS || failures >= 3) setStatus("reconnecting");
      } finally {
        inFlight = false;
      }
      const base = nudger.current?.isLive() ? POLL_MS_REALTIME : POLL_MS;
      schedule(failures ? Math.min(base * 2 ** Math.min(failures, 3), 5000) : base);
    }

    wake.current = () => {
      if (stopped) return;
      clearTimeout(timer);
      void tick();
    };

    const onVisible = () => {
      if (document.visibilityState === "visible") wake.current();
    };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("online", wake.current);
    window.addEventListener("focus", wake.current);
    window.addEventListener("pageshow", wake.current);

    nudger.current = connectNudger(code, (v) => {
      if (v > versionRef.current) wake.current();
    });
    void tick();

    return () => {
      stopped = true;
      clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("online", wake.current);
      window.removeEventListener("focus", wake.current);
      window.removeEventListener("pageshow", wake.current);
      nudger.current?.close();
      nudger.current = null;
    };
  }, [code, accept]);

  // Flag a stale connection even if requests hang instead of failing.
  useEffect(() => {
    const t = setInterval(() => {
      if (Date.now() - lastOk.current > STALE_MS && document.visibilityState === "visible") setStatus("reconnecting");
    }, 1000);
    return () => clearInterval(t);
  }, []);

  /** Performs a move. Resolves with an error message for illegal moves; retries network failures itself. */
  const act = useCallback(
    async (action: Action): Promise<string | null> => {
      const id = randomId();
      try {
        const r = await withRetry(`/${code}`, { method: "POST", body: JSON.stringify({ id, action }) }, 10);
        if (r.body.view) {
          lastOk.current = Date.now();
          setStatus("online");
          accept(r.body.view);
          nudger.current?.send(r.body.view.version);
          return null;
        }
        if (r.status === 404 || r.status === 403) setFatal(r.body.error ?? "Ya no estás en esta sala.");
        return r.body.error ?? "Algo salió mal.";
      } catch {
        setStatus("reconnecting");
        return "Sin conexión. Revisa tu internet e intenta de nuevo.";
      }
    },
    [code, accept],
  );

  return { view, status, foeOnline, fatal, act };
}
