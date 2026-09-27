// Records play events for word difficulty (see difficulty.ts).
// Events are batched, sent in the background and kept in localStorage if the phone is
// offline, so nothing is lost and the game never waits on the network.

type Kind = "shown" | "guessed" | "failed";
type Event = [id: number, kind: Kind];

const QUEUE_KEY = "pikaboom.stats.queue.v1";
const MAX_QUEUE = 2000;
const BATCH = 200;

let queue: Event[] = [];
let loaded = false;
let timer: ReturnType<typeof setTimeout> | null = null;
let sending = false;

function persist() {
  try {
    localStorage.setItem(QUEUE_KEY, JSON.stringify(queue.slice(-MAX_QUEUE)));
  } catch {
    /* ignore */
  }
}

function ensureLoaded() {
  if (loaded || typeof window === "undefined") return;
  loaded = true;
  try {
    const saved = JSON.parse(localStorage.getItem(QUEUE_KEY) ?? "[]");
    if (Array.isArray(saved)) queue = [...saved, ...queue];
  } catch {
    /* ignore */
  }
  window.addEventListener("online", () => void flush());
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") void flush(true);
  });
}

export async function flush(leaving = false) {
  ensureLoaded();
  if (timer) clearTimeout(timer);
  timer = null;
  if (sending || !queue.length) return;
  sending = true;
  const batch = queue.slice(0, BATCH);
  try {
    const res = await fetch("/api/words/stats", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ events: batch }),
      keepalive: leaving,
    });
    if (res.ok || res.status === 400) {
      queue = queue.slice(batch.length); // 400 = bad data: drop it instead of retrying forever
      persist();
    }
  } catch {
    /* offline — keep for later */
  } finally {
    sending = false;
  }
  if (queue.length && !leaving) schedule();
}

function schedule() {
  if (!timer) timer = setTimeout(() => void flush(), 1500);
}

function record(ids: (number | undefined)[], kind: Kind) {
  ensureLoaded();
  for (const id of ids) if (typeof id === "number") queue.push([id, kind]);
  persist();
  schedule();
}

/** The 4 options a team was offered. */
export const recordShown = (ids: (number | undefined)[]) => record(ids, "shown");
/** The chosen word when "Siguiente equipo" was pressed. */
export const recordGuessed = (id: number | undefined) => record([id], "guessed");
/** The chosen word when the bomb exploded. */
export const recordFailed = (id: number | undefined) => record([id], "failed");
