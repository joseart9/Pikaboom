// Pikaboom service worker — lets the game open and play offline.
const VERSION = "v1";
const SHELL = `pikaboom-shell-${VERSION}`;
const RUNTIME = `pikaboom-runtime-${VERSION}`;
const PRECACHE = ["/", "/charades", "/manifest.webmanifest", "/icons/icon-192.png", "/icons/icon-512.png", "/apple-icon.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(SHELL).then((c) => c.addAll(PRECACHE)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => ![SHELL, RUNTIME].includes(k)).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

async function networkFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  try {
    const res = await fetch(request);
    if (res.ok) cache.put(request, res.clone());
    return res;
  } catch {
    const cached = (await cache.match(request)) ?? (await caches.match(request, { ignoreSearch: request.mode === "navigate" }));
    if (cached) return cached;
    if (request.mode === "navigate") return (await caches.match("/")) ?? Response.error();
    return Response.error();
  }
}

async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;
  const res = await fetch(request);
  if (res.ok) (await caches.open(RUNTIME)).put(request, res.clone());
  return res;
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/admin")) return; // always live

  // Hashed build assets and fonts never change: cache first.
  if (url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/icons/")) {
    event.respondWith(cacheFirst(request));
    return;
  }
  // Pages, RSC payloads and the word bank: fresh when online, cached when offline.
  if (request.mode === "navigate" || url.pathname.startsWith("/api/words") || url.searchParams.has("_rsc")) {
    event.respondWith(networkFirst(request, request.mode === "navigate" ? SHELL : RUNTIME));
  }
});
