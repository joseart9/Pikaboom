// Security regression guards (Phase 21, §19.2 / §12.3 / §13.8): static checks over the source tree and an
// executable check of the service worker's cache exclusions. DB-level privileges live in
// `server/security.db.test.ts` (PGlite).
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { runInNewContext } from "node:vm";
import { describe, expect, it } from "vitest";

const ROOT = process.cwd();
const SRC = join(ROOT, "src");

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else out.push(p);
  }
  return out;
}

const rel = (p: string) => relative(ROOT, p).split(sep).join("/");
const read = (p: string) => readFileSync(p, "utf8");
/** Source without comments (good enough for our files: no `//` inside strings that matter here). */
const code = (p: string) =>
  read(p)
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|[^:"'`])\/\/.*$/gm, "$1");
const isTest = (p: string) => /\.(test|bench)\.tsx?$/.test(p) || p.includes(`${sep}testing${sep}`);

const SOURCES = walk(SRC).filter((p) => /\.(ts|tsx)$/.test(p) && !isTest(p));

const ACCOUNT_AWARE_ROUTES = SOURCES.filter((p) => {
  const r = rel(p);
  return (r.startsWith("src/app/api/cards/") || r.startsWith("src/app/api/account/")) && r.endsWith("/route.ts");
});
/** The one route that must work signed out (§13.2): sign-up checks a name before the account exists. */
const PUBLIC_ROUTES = ["src/app/api/account/username-available/route.ts"];

describe("§19.2 — every /api/cards/* and /api/account/* handler authenticates first", () => {
  it("finds the routes", () => {
    expect(ACCOUNT_AWARE_ROUTES.length).toBeGreaterThanOrEqual(13);
    for (const r of PUBLIC_ROUTES) expect(ACCOUNT_AWARE_ROUTES.map(rel)).toContain(r);
  });

  for (const file of ACCOUNT_AWARE_ROUTES) {
    const r = rel(file);
    if (PUBLIC_ROUTES.includes(r)) continue;
    it(`${r}: the first awaited call of each handler is requireUser()/requirePlayer()`, () => {
      const src = code(file);
      const handlers = [...src.matchAll(/export async function (GET|POST|PUT|PATCH|DELETE)\b/g)];
      expect(handlers.length).toBeGreaterThan(0);
      for (let i = 0; i < handlers.length; i++) {
        const body = src.slice(handlers[i].index, handlers[i + 1]?.index ?? src.length);
        const firstAwait = body.match(/await\s+([A-Za-z_$][\w$.]*)\s*\(/);
        expect(firstAwait?.[1], `${handlers[i][1]} in ${r}`).toMatch(/^(requireUser|requirePlayer)$/);
      }
    });

    it(`${r}: never takes a user id or seat from the request`, () => {
      expect(code(file)).not.toMatch(/\b(userId|user_id|hostId|guestId|seat)\b/);
    });
  }
});

describe("§19.2 / §12.3 — secrets stay on the server", () => {
  const ALLOWED_PUBLIC = ["NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "NEXT_PUBLIC_SUPABASE_ANON_KEY"];

  it("only the Supabase URL and publishable (anon) key are NEXT_PUBLIC_", () => {
    const used = new Set<string>();
    for (const f of SOURCES) for (const m of read(f).matchAll(/NEXT_PUBLIC_[A-Z0-9_]+/g)) used.add(m[0]);
    expect([...used].filter((v) => !ALLOWED_PUBLIC.includes(v))).toEqual([]);
  });

  it("no service_role key anywhere in the app", () => {
    for (const f of SOURCES) expect(read(f), rel(f)).not.toMatch(/service_role|SERVICE_ROLE/);
  });

  it("the DB credentials are read only by server-only modules (or server components of /admin)", () => {
    const readers = SOURCES.filter((f) => /process\.env\.SUPABASE_DB_(PASSWORD|URL)/.test(read(f))).map(rel);
    expect(readers.length).toBeGreaterThan(0);
    for (const r of readers) expect(read(join(ROOT, r)), r).toMatch(/^import "server-only";/m);
  });

  it("every card-game / auth module that talks to Postgres starts with import \"server-only\"", () => {
    const scoped = SOURCES.filter((f) => /^src\/(game\/cards|lib|app\/api\/cards|app\/api\/account)\//.test(rel(f)));
    const dbModules = scoped.filter((f) => /from "pg"|from "@\/lib\/db"|\bQueryable\b|\bpublic\.(cards_|profiles\b)/.test(code(f)));
    expect(dbModules.map(rel)).toEqual(expect.arrayContaining(["src/lib/db.ts", "src/game/cards/server/pgStore.ts"]));
    for (const f of dbModules) expect(read(f), rel(f)).toMatch(/^import "server-only";/m);
  });

  it("client code never imports a server-only module (type-only imports are erased and allowed)", () => {
    const serverOnly = SOURCES.filter((f) => /^import "server-only";/m.test(read(f))).map((f) => "@/" + rel(f).replace(/^src\//, "").replace(/\.tsx?$/, ""));
    expect(serverOnly).toEqual(expect.arrayContaining(["@/lib/db", "@/lib/auth", "@/game/cards/server/pgStore"]));
    const clientFiles = SOURCES.filter((f) => /^"use client";/.test(read(f).trimStart()));
    expect(clientFiles.length).toBeGreaterThan(10);
    for (const f of clientFiles) {
      const valueImports = [...code(f).matchAll(/^import\s+(?!type)[^;]*?from\s+"([^"]+)"/gm)].map((m) => m[1]);
      const bad = valueImports.filter((m) => serverOnly.includes(m) || m === "pg" || m === "server-only");
      expect(bad, rel(f)).toEqual([]);
    }
  });
});

describe("§19.2 / T4 — realtime carries only a version number", () => {
  it("the nudge payload is { v } on a channel named by the match UUID", () => {
    const src = code(join(SRC, "game", "cards", "client", "realtime.ts"));
    const payloads = [...src.matchAll(/payload:\s*(\{[^}]*\})/g)].map((m) => m[1].replace(/\s+/g, ""));
    expect(payloads).toEqual(["{v:version}"]);
    expect(src).toMatch(/channel\(`pikaboom-cards-\$\{matchId\}`/);
  });
});

// ---------------------------------------------------------------------------------------------------------------
// Service worker: execute public/sw.js in a sandbox and dispatch fetch events.

type FetchEvent = { request: { method: string; url: string; mode: string }; respondWith: (r: unknown) => void };

function loadServiceWorker() {
  const listeners: Record<string, (e: unknown) => void> = {};
  const self = {
    location: { origin: "https://pikaboom.example" },
    addEventListener: (type: string, fn: (e: unknown) => void) => {
      listeners[type] = fn;
    },
    skipWaiting: () => Promise.resolve(),
    clients: { claim: () => Promise.resolve() },
  };
  const caches = { open: async () => ({ put() {}, match: async () => undefined, addAll: async () => {} }), match: async () => undefined, keys: async () => [] };
  const source = read(join(ROOT, "public", "sw.js"));
  runInNewContext(source, { self, caches, fetch: async () => ({ ok: true, clone() {} }), URL, Response: { error: () => null }, Promise });
  const version = source.match(/const VERSION = "([^"]+)"/)?.[1];
  return {
    version,
    handles(path: string, mode = "navigate", method = "GET"): boolean {
      let responded = false;
      const event: FetchEvent = {
        request: { method, url: `https://pikaboom.example${path}`, mode },
        respondWith: () => {
          responded = true;
        },
      };
      listeners.fetch(event);
      return responded;
    },
  };
}

describe("§19.2 — the service worker never caches account-aware routes", () => {
  const sw = loadServiceWorker();

  it.each([
    ["/cards", "navigate"],
    ["/cards/match/00000000-0000-4000-8000-000000000001", "navigate"],
    ["/cards/collection", "navigate"],
    ["/cards/store?_rsc=abc123", "cors"],
    ["/cards/art/ignis.svg", "no-cors"],
    ["/auth/login?next=%2Fcards", "navigate"],
    ["/auth/confirm?token_hash=x&type=email", "navigate"],
    ["/account", "navigate"],
    ["/api/cards/matches/current", "cors"],
    ["/api/cards/matches/00000000-0000-4000-8000-000000000001?v=3", "cors"],
    ["/api/cards/wallet", "cors"],
    ["/api/account/profile", "cors"],
    ["/api/account/username-available?u=ana", "cors"],
    ["/admin", "navigate"],
  ])("%s (%s) goes straight to the network", (path, mode) => {
    expect(sw.handles(path, mode)).toBe(false);
  });

  it("non-GET requests are never intercepted", () => {
    expect(sw.handles("/api/cards/store/purchase", "cors", "POST")).toBe(false);
    expect(sw.handles("/", "navigate", "POST")).toBe(false);
  });

  it("the offline shell still works for the public games (control: the handler does run)", () => {
    expect(sw.handles("/", "navigate")).toBe(true);
    expect(sw.handles("/charades", "navigate")).toBe(true);
    expect(sw.handles("/_next/static/chunks/app.js", "no-cors")).toBe(true);
    expect(sw.handles("/api/words", "cors")).toBe(true);
  });

  it("prefix matching does not over-exclude look-alike public paths", () => {
    expect(sw.handles("/cardsharp", "navigate")).toBe(true);
  });

  it("has a cache VERSION (bump it whenever caching rules change so installed PWAs drop old caches)", () => {
    expect(sw.version).toMatch(/^v\d+$/);
  });
});
