// Engine performance bench (Phase 21, §19.1 "Engine `applyCommand` p95 (server) ≤ 15 ms" with a 10-unit board).
// Run with `npm run bench`. Vitest prints min/max/mean/p75/p99 per task; p99 is used as the upper bound for p95.
//
// The states are deliberately heavier than a typical turn: 5 units per side (with triggers, auras and statuses),
// full hands, 20-card decks, the full catalog in `defs` (a real match only carries its decks' closure) and the
// event log filled to LOG_LIMIT from a real random game, so `structuredClone` + resolve cost is a worst case.
import { bench, describe } from "vitest";
import { applyCommand } from "./apply";
import { LOG_LIMIT } from "./ctx";
import type { EngineCommand } from "./commands";
import type { GameEvent } from "./events";
import { seedToRng } from "./rng";
import type { MatchState, Seat } from "./types";
import { viewFor } from "../server/view";
import { randomCommand, seedHex } from "../testing/driver";
import { makeState } from "../testing/fixtures";
import { newMatch, randomCatalogDeck, UNDEAD_DECK, BEAST_DECK } from "../testing/matches";
import { rowFor } from "../testing/server";

/** A real event log (LOG_LIMIT entries) from a seeded random starter-deck game. */
function realLog(): GameEvent[] {
  let s = newMatch(seedHex(21));
  const driver = { rng: seedToRng(seedHex(2021)) };
  const log: GameEvent[] = [];
  while (s.phase !== "finished" && log.length < LOG_LIMIT) {
    const [seat, cmd] = randomCommand(s, driver);
    try {
      const r = applyCommand(s, seat, cmd);
      s = r.state;
      log.push(...r.events);
    } catch {
      /* random driver never produces illegal commands; ignore defensively */
    }
  }
  return log.slice(-LOG_LIMIT);
}

const LOG = realLog();

/** 10 units on the board (5 per side), mid-game, seat 0 active with 10 mana. */
function tenUnitBoard(): MatchState {
  const s = makeState({
    turn: 9,
    p0: {
      board: ["alpha-wolf", "crypt-banshee", "necromancer", "line-breaker", { defId: "berserker-bear", damage: 3 }],
      hand: ["bone-storm", "wolf-pup", "flame-lance", "storm-weaver", "morvath", "pack-call", "chain-lightning"],
      deck: [...UNDEAD_DECK.slice(0, 20)],
      health: 21,
    },
    p1: {
      board: ["stone-golem", "thornback-tortoise", "restless-skeleton", "swamp-ent", "vampire-bat"],
      hand: ["arcane-spark", "drain-life", "iron-guard", "bone-wall", "ursaria"],
      deck: [...BEAST_DECK.slice(0, 20)],
      health: 18,
    },
  });
  s.log = LOG.map((e) => structuredClone(e));
  s.seq = LOG.length;
  return s;
}

const BOARD = tenUnitBoard();
const id = (seat: Seat, i: number) => BOARD.players[seat].board[i].iid;
const hand = (seat: Seat, defId: string) => BOARD.players[seat].hand.find((c) => c.defId === defId)!.iid;

/** Recorded (state, seat, command) triples from random all-cards games: the real command mix. */
function recordedCommands(games: number): [MatchState, Seat, EngineCommand][] {
  const out: [MatchState, Seat, EngineCommand][] = [];
  for (let g = 0; g < games; g++) {
    let s = newMatch(seedHex(1000 + g), [randomCatalogDeck(1000 + g), randomCatalogDeck(2000 + g)]);
    const driver = { rng: seedToRng(seedHex(3000 + g)) };
    for (let i = 0; i < 400 && s.phase !== "finished"; i++) {
      const [seat, cmd] = randomCommand(s, driver);
      out.push([s, seat, cmd]);
      s = applyCommand(s, seat, cmd).state;
    }
  }
  return out;
}

const RECORDED = recordedCommands(6);
let cursor = 0;

/** The 10-unit board commands. Each is applied once at load so an illegal one fails loudly instead of benching a throw. */
const BOARD_COMMANDS: [string, EngineCommand][] = [
  ["attack a Provocar unit with Barrido (cleave hits 3)", { t: "attack", attacker: id(0, 3), target: id(1, 0) }],
  ["attack into Espinas (thorns retaliation)", { t: "attack", attacker: id(0, 0), target: id(1, 1) }],
  ["play bone-storm (damage to 5 units, deaths, Último Aliento)", { t: "play", card: hand(0, "bone-storm") }],
  ["play storm-weaver (Grito: 3 random hits)", { t: "play", card: hand(0, "storm-weaver"), position: 2 }],
  ["play morvath (destroy 9 units, death chain)", { t: "play", card: hand(0, "morvath"), position: 0 }],
  ["endTurn (end/start triggers, draw, Regeneración)", { t: "endTurn" }],
];
for (const [name, cmd] of BOARD_COMMANDS) {
  try {
    applyCommand(BOARD, 0, cmd);
  } catch (e) {
    throw new Error(`bench command "${name}" is illegal on the bench board: ${String(e)}`);
  }
}

describe("applyCommand on a 10-unit board (budget p95 ≤ 15 ms)", () => {
  for (const [name, cmd] of BOARD_COMMANDS) {
    bench(name, () => {
      applyCommand(BOARD, 0, cmd);
    });
  }
});

describe("applyCommand over recorded all-cards games (real command mix)", () => {
  bench(`next recorded command (${RECORDED.length} commands, cycled)`, () => {
    const [s, seat, cmd] = RECORDED[cursor];
    cursor = (cursor + 1) % RECORDED.length;
    applyCommand(s, seat, cmd);
  });
});

describe("server view projection (not budgeted; context for the round trip)", () => {
  const row = rowFor(BOARD);
  bench("viewFor + JSON.stringify (full view, all events since 0)", () => {
    JSON.stringify(viewFor(row, 0, { since: 0 }));
  });
});
