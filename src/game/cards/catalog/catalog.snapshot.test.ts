// Version-bump guard (§11). Stores { id: { version, hash } } where hash = FNV-1a of the def without `version`.
// - Changed a card's gameplay? Bump its `version`, then run: UPDATE_CARD_SNAPSHOT=1 npx vitest run catalog.snapshot
// - Added a card? Same command. Removing a shipped card is never allowed (mark it `collectible: false` instead).
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { CATALOG } from "./index";
import type { CardDef } from "./types";

type Snapshot = Record<string, { version: number; hash: string }>;

const FILE = fileURLToPath(new URL("./__snapshots__/catalog-hashes.json", import.meta.url));

/** JSON with object keys sorted at every level (arrays keep their order). */
function stableStringify(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  if (value && typeof value === "object") {
    const entries = Object.keys(value)
      .filter((k) => (value as Record<string, unknown>)[k] !== undefined)
      .sort()
      .map((k) => `${JSON.stringify(k)}:${stableStringify((value as Record<string, unknown>)[k])}`);
    return `{${entries.join(",")}}`;
  }
  return JSON.stringify(value);
}

/** FNV-1a 32-bit over UTF-16 code units, as 8 hex chars. */
function fnv1a(text: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16).padStart(8, "0");
}

function hashDef(def: CardDef): string {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { version, ...rest } = def;
  return fnv1a(stableStringify(rest));
}

function current(): Snapshot {
  const snap: Snapshot = {};
  for (const id of Object.keys(CATALOG).sort()) snap[id] = { version: CATALOG[id].version, hash: hashDef(CATALOG[id]) };
  return snap;
}

function write(snap: Snapshot) {
  mkdirSync(dirname(FILE), { recursive: true });
  writeFileSync(FILE, `${JSON.stringify(snap, null, 2)}\n`, "utf8");
}

describe("catalog snapshot (§11 version guard)", () => {
  it("hashes are stable and ignore `version`", () => {
    const def = CATALOG.squire;
    expect(hashDef(def)).toBe(hashDef({ ...def, version: 99 }));
    expect(hashDef(def)).not.toBe(hashDef({ ...def, cost: def.cost + 1 }));
    expect(stableStringify({ b: 1, a: [2, { d: 3, c: 4 }] })).toBe('{"a":[2,{"c":4,"d":3}],"b":1}');
  });

  it("no card changed without a version bump", () => {
    const now = current();
    if (!existsSync(FILE)) {
      write(now); // first run creates the snapshot (Phase 3 G.7)
      return;
    }
    const stored = JSON.parse(readFileSync(FILE, "utf8")) as Snapshot;
    const problems: string[] = [];
    const stale: string[] = [];

    for (const [id, old] of Object.entries(stored)) {
      const cur = now[id];
      if (!cur) {
        problems.push(`${id}: removed from the catalog (never delete a shipped card; set collectible: false)`);
        continue;
      }
      if (cur.version < old.version) problems.push(`${id}: version went down (${old.version} → ${cur.version})`);
      else if (cur.hash !== old.hash && cur.version === old.version) {
        problems.push(`${id}: definition changed but version is still ${cur.version} — bump it`);
      } else if (cur.hash !== old.hash || cur.version !== old.version) stale.push(id);
    }
    for (const id of Object.keys(now)) if (!stored[id]) stale.push(id);

    expect(problems, problems.join("\n")).toEqual([]);
    if (stale.length > 0 && process.env.UPDATE_CARD_SNAPSHOT === "1") {
      write(now);
      return;
    }
    expect(stale, `snapshot out of date for: ${stale.join(", ")} — run UPDATE_CARD_SNAPSHOT=1 npx vitest run catalog.snapshot`).toEqual([]);
  });
});
