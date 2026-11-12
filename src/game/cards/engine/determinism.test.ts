import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { es } from "../i18n/es";
import { deepFreeze } from "../testing/fixtures";
import { newMatch } from "../testing/matches";
import { applyCommand } from "./apply";
import type { EngineCommand } from "./commands";
import { ENGINE_ERROR_CODES } from "./errors";
import type { GameEvent } from "./events";
import { getLegalActions } from "./legal";
import { rngInt, seedToRng, type RngState } from "./rng";
import type { MatchState, Seat } from "./types";

/** Plays `count` random legal commands chosen by a driver RNG independent of the match RNG. */
function script(seed: string, driverSeed: string, count: number): { state: MatchState; events: GameEvent[]; commands: [Seat, EngineCommand][] } {
  let s = newMatch(seed);
  const driver: { rng: RngState } = { rng: seedToRng(driverSeed) };
  const events: GameEvent[] = [];
  const commands: [Seat, EngineCommand][] = [];
  for (let i = 0; i < count && s.phase !== "finished"; i++) {
    let seat: Seat;
    let cmd: EngineCommand;
    if (s.phase === "mulligan") {
      seat = s.players[0].mulliganDone ? 1 : 0;
      cmd = { t: "mulligan", replace: s.players[seat].hand.filter(() => rngInt(driver, 2) === 1).map((c) => c.iid) };
    } else {
      seat = s.turn.activeSeat;
      const legal = getLegalActions(s, seat);
      const plays = Object.keys(legal.play);
      const attacks = Object.entries(legal.attacks).flatMap(([attacker, targets]) => targets.map((target) => ({ attacker, target })));
      const choice = rngInt(driver, plays.length + attacks.length + 1);
      if (choice === plays.length + attacks.length) cmd = rngInt(driver, 10) === 0 ? { t: "timeout" } : { t: "endTurn" };
      else if (choice >= plays.length) cmd = { t: "attack", ...attacks[choice - plays.length] };
      else {
        const board = s.players[seat].board.length;
        const entry = legal.play[plays[choice]];
        const target = entry.targets?.length ? entry.targets[rngInt(driver, entry.targets.length)] : undefined;
        cmd = { t: "play", card: plays[choice], position: rngInt(driver, board + 1), ...(target !== undefined ? { target } : {}) };
      }
    }
    const r = applyCommand(s, seat, cmd);
    s = r.state;
    events.push(...r.events);
    commands.push([seat, cmd]);
  }
  return { state: s, events, commands };
}

describe("determinism & purity", () => {
  it("row 16: 40 scripted random legal commands replay to identical states and events", () => {
    const a = script("feedfacecafebeef0011223344556677", "000000000000000000000000000000aa", 40);
    const b = script("feedfacecafebeef0011223344556677", "000000000000000000000000000000aa", 40);
    expect(a.commands).toHaveLength(40);
    expect(a.commands.some(([, c]) => c.t === "play")).toBe(true);
    expect(b.state).toEqual(a.state);
    expect(b.events).toEqual(a.events);
    // Replaying the recorded commands from scratch also reproduces the state.
    let s = newMatch("feedfacecafebeef0011223344556677");
    for (const [seat, cmd] of a.commands) s = applyCommand(s, seat, cmd).state;
    expect(s).toEqual(a.state);
  });

  it("longer scripts with attacks also replay identically", () => {
    const a = script("0badc0de0badc0de0badc0de0badc0de", "0000000000000000000000000000a77a", 200);
    expect(a.commands.some(([, c]) => c.t === "attack")).toBe(true);
    expect(a.events.some((e) => e.type === "MOB_DESTROYED")).toBe(true);
    let s = newMatch("0badc0de0badc0de0badc0de0badc0de");
    for (const [seat, cmd] of a.commands) s = applyCommand(s, seat, cmd).state;
    expect(s).toEqual(a.state);
  });

  it("applyCommand never mutates its input (deep-frozen states)", () => {
    let s = newMatch();
    const driver = { rng: seedToRng("0000000000000000000000000000beef") };
    for (let i = 0; i < 30 && s.phase !== "finished"; i++) {
      const frozen = deepFreeze(s);
      const copy = structuredClone(frozen);
      let cmd: EngineCommand;
      let seat: Seat;
      if (frozen.phase === "mulligan") {
        seat = frozen.players[0].mulliganDone ? 1 : 0;
        cmd = { t: "mulligan", replace: [frozen.players[seat].hand[0].iid] };
      } else {
        seat = frozen.turn.activeSeat;
        const legal = getLegalActions(frozen, seat);
        const plays = Object.keys(legal.play);
        const target = plays.length ? legal.play[plays[0]].targets?.[0] : undefined;
        cmd = plays.length && rngInt(driver, 2) ? { t: "play", card: plays[0], ...(target !== undefined ? { target } : {}) } : { t: "endTurn" };
      }
      s = applyCommand(frozen, seat, cmd).state;
      expect(frozen).toEqual(copy);
    }
  });

  it("the state survives a JSON round trip (it is stored as JSONB)", () => {
    const s = newMatch();
    expect(JSON.parse(JSON.stringify(s))).toEqual(s);
  });

  it("every EngineError code has Spanish text", () => {
    for (const code of ENGINE_ERROR_CODES) expect(es.errors[code], code).toBeTruthy();
  });

  it("engine source has no Math.random, Date, I/O or framework imports", () => {
    const dir = fileURLToPath(new URL(".", import.meta.url));
    const files: string[] = [];
    const walk = (d: string) => {
      for (const name of readdirSync(d)) {
        const path = join(d, name);
        if (statSync(path).isDirectory()) walk(path);
        else if (name.endsWith(".ts") && !name.endsWith(".test.ts") && !name.endsWith(".bench.ts")) files.push(path);
      }
    };
    walk(dir);
    expect(files.length).toBeGreaterThan(10);
    const banned = [/Math\.random/, /Date\.now/, /new Date\b/, /from ["'](react|next|pg|node:)[^"']*["']/, /from ["']@\//];
    for (const file of files) {
      // Code only: comments may mention the banned APIs ("never use Math.random").
      const src = readFileSync(file, "utf8").replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:"'])\/\/.*$/gm, "$1");
      for (const re of banned) expect(re.test(src), `${file} matches ${re}`).toBe(false);
    }
  });
});
