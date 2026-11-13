// First-load JS of an App Router route, gzipped, from a production build (Phase 21, §19.1).
// Next 16 no longer prints sizes in `next build`, so this reads the route's client reference manifest:
// the framework's root main files + every JS chunk of the route's layouts and page (what the browser loads before
// the page is interactive). Async chunks (`import()`, e.g. supabase-js for the realtime nudge) are not counted.
//
//   npm run build && node scripts/route-size.mjs /cards/match/[id] /cards /cards/store
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { gzipSync } from "node:zlib";

const NEXT = join(process.cwd(), ".next");
const routes = process.argv.slice(2);
if (routes.length === 0) routes.push("/cards/match/[id]");

const rootMain = JSON.parse(readFileSync(join(NEXT, "build-manifest.json"), "utf8")).rootMainFiles ?? [];
const kb = (n) => `${(n / 1024).toFixed(1)} KB`;
const sizeOf = (file) => {
  const buf = readFileSync(join(NEXT, file));
  return { raw: buf.length, gz: gzipSync(buf, { level: 9 }).length };
};

for (const route of routes) {
  const dir = join(NEXT, "server", "app", ...route.split("/").filter(Boolean));
  const manifestFile = join(dir, "page_client-reference-manifest.js");
  if (!existsSync(manifestFile)) {
    console.log(`${route}: no client reference manifest (run \`npm run build\` first)`);
    continue;
  }
  const g = {};
  new Function("globalThis", readFileSync(manifestFile, "utf8"))(g);
  const manifest = g.__RSC_MANIFEST[`${route}/page`];
  const files = new Set(rootMain);
  for (const list of Object.values(manifest.entryJSFiles)) for (const f of list) files.add(f);
  let raw = 0;
  let gz = 0;
  const rows = [];
  for (const f of files) {
    const s = sizeOf(f);
    raw += s.raw;
    gz += s.gz;
    rows.push(`    ${f.padEnd(40)} ${kb(s.gz).padStart(9)} gz  (${kb(s.raw)} raw)`);
  }
  const css = new Set(Object.values(manifest.entryCSSFiles).flat().map((c) => c.path));
  let cssGz = 0;
  for (const f of css) cssGz += sizeOf(f).gz;
  console.log(`${route}: ${kb(gz)} JS gzipped (${kb(raw)} raw, ${files.size} files) · CSS ${kb(cssGz)} gzipped`);
  if (process.env.VERBOSE) console.log(rows.join("\n"));
}
