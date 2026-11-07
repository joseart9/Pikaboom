// Batalla Naval — pure game rules shared by the server (authoritative) and the client (previews).
// No I/O here: the server loads a GameState, runs applyAction() and saves it back.

export const SIZE = 10;
export const CELLS = SIZE * SIZE;
export const MAX_MINES = 3;
export const TREASURES = 3;
const EVENT_LOG = 24;
const APPLIED_LOG = 40;

export type Mode = "classic" | "arcade";
export type Phase = "lobby" | "placing" | "battle" | "over";
export type Dir = "h" | "v";
export type Seat = 0 | 1;
export type ShipType = "carrier" | "battleship" | "cruiser" | "submarine" | "destroyer";

export const FLEET: { type: ShipType; name: string; size: number }[] = [
  { type: "carrier", name: "Portaaviones", size: 5 },
  { type: "battleship", name: "Acorazado", size: 4 },
  { type: "cruiser", name: "Crucero", size: 3 },
  { type: "submarine", name: "Submarino", size: 3 },
  { type: "destroyer", name: "Destructor", size: 2 },
];
export const SHIP_INFO = Object.fromEntries(FLEET.map((s) => [s.type, s])) as Record<ShipType, (typeof FLEET)[number]>;

export type Placement = { type: ShipType; r: number; c: number; dir: Dir };
export type Ship = Placement & { hits: number[]; sunk: boolean; shield: boolean };

/** What the attacker learned about a cell. "repaired" and "blocked" can be shot again. */
export type Mark = "miss" | "hit" | "repaired" | "blocked" | "mine" | "treasure";
const FINAL_MARKS: Mark[] = ["miss", "hit", "mine", "treasure"];

export type Weapon = "shot" | "cross" | "air" | "torpedo";
export type ItemId = "cross" | "air" | "torpedo" | "double" | "sonar" | "repair" | "shield" | "mine";

export type ItemInfo = {
  id: ItemId;
  name: string;
  emoji: string;
  price: number;
  desc: string;
  /** Where you aim it. */
  target: "enemy" | "ownHit" | "ownShip" | "ownWater" | "none";
  /** Firing weapons use up the shot; tactical items don't. */
  endsTurn: boolean;
};

export const ITEMS: ItemInfo[] = [
  { id: "cross", name: "Misil en cruz", emoji: "✳️", price: 120, desc: "Golpea 5 casillas en forma de +.", target: "enemy", endsTurn: true },
  { id: "air", name: "Bombardeo 3×3", emoji: "✈️", price: 220, desc: "Arrasa un cuadro de 3×3 casillas.", target: "enemy", endsTurn: true },
  { id: "torpedo", name: "Torpedo", emoji: "🚀", price: 90, desc: "Recorre una fila desde la izquierda y pega en el primer barco que encuentre.", target: "enemy", endsTurn: true },
  { id: "double", name: "Doble disparo", emoji: "🎯", price: 80, desc: "Este turno disparas dos veces.", target: "none", endsTurn: false },
  { id: "sonar", name: "Sonar", emoji: "📡", price: 70, desc: "Revela si hay barcos en un área de 3×3 (sin dañar). No gasta tu turno.", target: "enemy", endsTurn: false },
  { id: "repair", name: "Kit de reparación", emoji: "🔧", price: 90, desc: "Repara una casilla dañada de un barco tuyo (no hundido). No gasta tu turno.", target: "ownHit", endsTurn: false },
  { id: "shield", name: "Escudo", emoji: "🛡️", price: 110, desc: "Protege un barco de su próximo impacto. No gasta tu turno.", target: "ownShip", endsTurn: false },
  { id: "mine", name: "Mina naval", emoji: "💣", price: 100, desc: "Escóndela en tu agua. Si el rival le dispara, ¡daña uno de SUS barcos!", target: "ownWater", endsTurn: false },
];
export const ITEM_INFO = Object.fromEntries(ITEMS.map((i) => [i.id, i])) as Record<ItemId, ItemInfo>;

/** Arcade economy. */
export const COINS = { start: 60, miss: 5, hit: 25, streak: 10, sink: 60, treasure: 40, hitTaken: 10 };

export type Stats = { shots: number; hits: number; sunk: number; earned: number };

export type PlayerState = {
  id: string;
  name: string;
  ready: boolean;
  ships: Ship[];
  /** Shots this player's board has received, by cell index. */
  received: Record<string, Mark>;
  mines: number[];
  treasure: number[];
  coins: number;
  inv: Partial<Record<ItemId, number>>;
  /** Sonar intel about the enemy board: 1 = ship, 0 = water. */
  sonar: Record<string, 0 | 1>;
  streak: number;
  stats: Stats;
  wins: number;
  rematch: boolean;
  /** Recent action ids, so retried requests are applied once. */
  applied: string[];
};

export type GameEvent = {
  seq: number;
  by: Seat;
  kind: "fire" | "sonar" | "repair" | "shield" | "mine" | "double" | "buy" | "start" | "join";
  weapon?: Weapon;
  item?: ItemId;
  target?: number;
  results?: [number, Mark][];
  sunk?: ShipType[];
  coins?: number;
  /** A mine blew up under the attacker's own fleet. */
  backfire?: { cell: number; mark: Mark; sunk?: ShipType };
  ship?: ShipType;
  sonar?: [number, 0 | 1][];
};

export type GameState = {
  mode: Mode;
  phase: Phase;
  extraTurn: boolean;
  players: [PlayerState, PlayerState | null];
  turn: Seat;
  shotsLeft: number;
  doubleUsed: boolean;
  winner: Seat | null;
  round: number;
  seq: number;
  events: GameEvent[];
};

export type Action =
  | { t: "join"; name: string }
  | { t: "rename"; name: string }
  | { t: "place"; fleet: Placement[] }
  | { t: "unready" }
  | { t: "fire"; weapon: Weapon; cell: number }
  | { t: "buy"; item: ItemId }
  | { t: "sonar"; cell: number }
  | { t: "repair"; cell: number }
  | { t: "shield"; ship: ShipType }
  | { t: "mine"; cell: number }
  | { t: "double" }
  | { t: "rematch" }
  | { t: "setMode"; mode: Mode; extraTurn: boolean };

export class GameError extends Error {}

// ───────────────────────── geometry ─────────────────────────

export const idx = (r: number, c: number) => r * SIZE + c;
export const rc = (i: number) => [Math.floor(i / SIZE), i % SIZE] as const;
const inBounds = (r: number, c: number) => r >= 0 && c >= 0 && r < SIZE && c < SIZE;

export function shipCells(p: Placement): number[] {
  const size = SHIP_INFO[p.type].size;
  return Array.from({ length: size }, (_, k) => (p.dir === "h" ? idx(p.r, p.c + k) : idx(p.r + k, p.c)));
}

export function fitsBoard(p: Placement) {
  const size = SHIP_INFO[p.type]?.size;
  if (!size || !Number.isInteger(p.r) || !Number.isInteger(p.c)) return false;
  return p.dir === "h" ? inBounds(p.r, p.c) && p.c + size <= SIZE : inBounds(p.r, p.c) && p.r + size <= SIZE;
}

/** null if the fleet is legal: every ship once, on the board, no overlaps. */
export function fleetProblem(fleet: Placement[]): string | null {
  if (!Array.isArray(fleet) || fleet.length !== FLEET.length) return "Coloca los 5 barcos.";
  const used = new Set<number>();
  for (const s of FLEET) {
    const p = fleet.find((f) => f?.type === s.type);
    if (!p) return `Falta el ${s.name}.`;
    if (p.dir !== "h" && p.dir !== "v") return "Orientación inválida.";
    if (!fitsBoard(p)) return `El ${s.name} se sale del mapa.`;
    for (const cell of shipCells(p)) {
      if (used.has(cell)) return "Hay barcos encimados.";
      used.add(cell);
    }
  }
  return null;
}

export function randomFleet(): Placement[] {
  for (;;) {
    const used = new Set<number>();
    const out: Placement[] = [];
    let ok = true;
    for (const s of FLEET) {
      let placed = false;
      for (let tries = 0; tries < 200 && !placed; tries++) {
        const dir: Dir = Math.random() < 0.5 ? "h" : "v";
        const p: Placement = {
          type: s.type,
          dir,
          r: Math.floor(Math.random() * (dir === "v" ? SIZE - s.size + 1 : SIZE)),
          c: Math.floor(Math.random() * (dir === "h" ? SIZE - s.size + 1 : SIZE)),
        };
        const cells = shipCells(p);
        if (cells.some((c) => used.has(c))) continue;
        cells.forEach((c) => used.add(c));
        out.push(p);
        placed = true;
      }
      if (!placed) ok = false;
    }
    if (ok) return out;
  }
}

/** Cells a weapon can affect when aimed at `cell` (the torpedo's path is decided when it runs). */
export function weaponArea(weapon: Weapon | "sonar", cell: number): number[] {
  const [r, c] = rc(cell);
  const pick = (offsets: [number, number][]) =>
    offsets.filter(([dr, dc]) => inBounds(r + dr, c + dc)).map(([dr, dc]) => idx(r + dr, c + dc));
  switch (weapon) {
    case "cross":
      return pick([[0, 0], [-1, 0], [1, 0], [0, -1], [0, 1]]);
    case "air":
    case "sonar":
      return pick([-1, 0, 1].flatMap((dr) => [-1, 0, 1].map((dc) => [dr, dc] as [number, number])));
    case "torpedo":
      return Array.from({ length: SIZE }, (_, k) => idx(r, k));
    default:
      return [cell];
  }
}

export const isFinal = (m: Mark | undefined) => !!m && FINAL_MARKS.includes(m);

// ───────────────────────── state setup ─────────────────────────

export function cleanName(name: unknown, fallback: string) {
  const s = typeof name === "string" ? name.replace(/\s+/g, " ").trim().slice(0, 16) : "";
  return s || fallback;
}

function freshBoard(): Pick<PlayerState, "ready" | "ships" | "received" | "mines" | "treasure" | "coins" | "inv" | "sonar" | "streak" | "stats" | "rematch"> {
  return {
    ready: false,
    ships: [],
    received: {},
    mines: [],
    treasure: [],
    coins: 0,
    inv: {},
    sonar: {},
    streak: 0,
    stats: { shots: 0, hits: 0, sunk: 0, earned: 0 },
    rematch: false,
  };
}

export function newPlayer(id: string, name: string): PlayerState {
  return { id, name, wins: 0, applied: [], ...freshBoard() };
}

export function newGame(hostId: string, hostName: string, mode: Mode, extraTurn: boolean): GameState {
  return {
    mode: mode === "arcade" ? "arcade" : "classic",
    phase: "lobby",
    extraTurn: !!extraTurn,
    players: [newPlayer(hostId, cleanName(hostName, "Capitán 1")), null],
    turn: 0,
    shotsLeft: 1,
    doubleUsed: false,
    winner: null,
    round: 1,
    seq: 0,
    events: [],
  };
}

export function seatOf(state: GameState, playerId: string): Seat | null {
  if (state.players[0].id === playerId) return 0;
  if (state.players[1]?.id === playerId) return 1;
  return null;
}

// ───────────────────────── rules ─────────────────────────

function pushEvent(s: GameState, e: Omit<GameEvent, "seq">) {
  s.seq += 1;
  s.events.push({ ...e, seq: s.seq });
  if (s.events.length > EVENT_LOG) s.events.splice(0, s.events.length - EVENT_LOG);
}

function earn(p: PlayerState, s: GameState, amount: number) {
  if (s.mode !== "arcade" || amount <= 0) return 0;
  p.coins += amount;
  p.stats.earned += amount;
  return amount;
}

const shipAt = (p: PlayerState, cell: number) => p.ships.find((s) => shipCells(s).includes(cell));
const allSunk = (p: PlayerState) => p.ships.length > 0 && p.ships.every((s) => s.sunk);

/** Damages `cell` of `p`'s fleet. Returns the mark and the ship it sank, if any. */
function damage(p: PlayerState, cell: number, s: GameState): { mark: Mark; sunk?: ShipType } {
  const ship = shipAt(p, cell);
  if (!ship || ship.sunk || ship.hits.includes(cell)) return { mark: p.received[cell] ?? "miss" };
  if (ship.shield) {
    ship.shield = false;
    p.received[cell] = "blocked";
    return { mark: "blocked" };
  }
  ship.hits.push(cell);
  p.received[cell] = "hit";
  earn(p, s, COINS.hitTaken);
  if (ship.hits.length >= SHIP_INFO[ship.type].size) {
    ship.sunk = true;
    return { mark: "hit", sunk: ship.type };
  }
  return { mark: "hit" };
}

function fire(s: GameState, seat: Seat, weapon: Weapon, target: number) {
  const me = s.players[seat]!;
  const foe = s.players[(1 - seat) as Seat]!;
  if (!Number.isInteger(target) || target < 0 || target >= CELLS) throw new GameError("Casilla inválida.");
  if (weapon !== "shot") {
    if (s.mode !== "arcade") throw new GameError("Esa arma es del modo Arcade.");
    if (!me.inv[weapon]) throw new GameError("No tienes esa arma. ¡Cómprala en la tienda!");
  } else if (isFinal(foe.received[target])) {
    throw new GameError("Ya disparaste ahí.");
  }

  const results: [number, Mark][] = [];
  const sunk: ShipType[] = [];
  let coins = 0;
  let backfire: GameEvent["backfire"];

  const hitCell = (cell: number): "stop" | "go" => {
    const before = foe.received[cell];
    if (isFinal(before)) return "go";
    if (foe.mines.includes(cell)) {
      foe.mines = foe.mines.filter((m) => m !== cell);
      foe.received[cell] = "mine";
      results.push([cell, "mine"]);
      // The blast travels back: hit a random intact part of the attacker's fleet.
      const intact = me.ships.filter((sh) => !sh.sunk).flatMap((sh) => shipCells(sh).filter((c) => !sh.hits.includes(c)));
      if (intact.length) {
        const victim = intact[Math.floor(Math.random() * intact.length)];
        const d = damage(me, victim, s);
        backfire = { cell: victim, mark: d.mark, sunk: d.sunk };
      }
      return "stop";
    }
    if (shipAt(foe, cell)) {
      const d = damage(foe, cell, s);
      results.push([cell, d.mark]);
      if (d.mark === "hit") {
        me.stats.hits += 1;
        coins += earn(me, s, COINS.hit);
      }
      if (d.sunk) {
        sunk.push(d.sunk);
        me.stats.sunk += 1;
        coins += earn(me, s, COINS.sink);
      }
      return "stop";
    }
    if (s.mode === "arcade" && foe.treasure.includes(cell)) {
      foe.treasure = foe.treasure.filter((t) => t !== cell);
      foe.received[cell] = "treasure";
      results.push([cell, "treasure"]);
      coins += earn(me, s, COINS.treasure);
      return "go";
    }
    foe.received[cell] = "miss";
    results.push([cell, "miss"]);
    return "go";
  };

  if (weapon === "torpedo") {
    const [r] = rc(target);
    for (let c = 0; c < SIZE; c++) if (hitCell(idx(r, c)) === "stop") break;
  } else {
    weaponArea(weapon, target).forEach(hitCell);
  }

  if (weapon !== "shot") me.inv[weapon] = (me.inv[weapon] ?? 1) - 1;
  me.stats.shots += Math.max(1, results.filter(([, m]) => m !== "mine").length); // cells fired at, so precision stays ≤ 100%
  const anyHit = results.some(([, m]) => m === "hit");
  if (anyHit) {
    me.streak += 1;
    if (me.streak > 1) coins += earn(me, s, COINS.streak * Math.min(me.streak - 1, 5));
  } else {
    me.streak = 0;
    if (weapon === "shot" && results.some(([, m]) => m === "miss")) coins += earn(me, s, COINS.miss);
  }

  pushEvent(s, { by: seat, kind: "fire", weapon, target, results, sunk, coins, backfire });

  if (allSunk(foe)) return finish(s, seat);
  if (allSunk(me)) return finish(s, (1 - seat) as Seat);

  s.shotsLeft -= 1;
  if (s.shotsLeft <= 0) {
    if (s.extraTurn && anyHit) {
      s.shotsLeft = 1;
    } else {
      s.turn = (1 - seat) as Seat;
      s.shotsLeft = 1;
      s.doubleUsed = false;
    }
  }
}

function finish(s: GameState, winner: Seat) {
  s.phase = "over";
  s.winner = winner;
  s.players[winner]!.wins += 1;
  s.players.forEach((p) => p && (p.rematch = false));
}

function startBattle(s: GameState) {
  s.phase = "battle";
  s.turn = s.round === 1 ? (Math.random() < 0.5 ? 0 : 1) : s.winner === 0 ? 1 : 0; // loser of the last game starts
  s.winner = null;
  s.shotsLeft = 1;
  s.doubleUsed = false;
  for (const p of s.players) {
    if (!p) continue;
    p.ships = p.ships.map((sh) => ({ ...sh, hits: [], sunk: false, shield: false }));
    p.received = {};
    p.mines = [];
    p.sonar = {};
    p.streak = 0;
    p.stats = { shots: 0, hits: 0, sunk: 0, earned: 0 };
    p.inv = {};
    p.coins = s.mode === "arcade" ? COINS.start : 0;
    p.stats.earned = 0;
    if (s.mode === "arcade") {
      const occupied = new Set(p.ships.flatMap(shipCells));
      const water = Array.from({ length: CELLS }, (_, i) => i).filter((i) => !occupied.has(i));
      p.treasure = [];
      while (p.treasure.length < TREASURES && water.length) p.treasure.push(water.splice(Math.floor(Math.random() * water.length), 1)[0]);
    } else {
      p.treasure = [];
    }
  }
  pushEvent(s, { by: s.turn, kind: "start" });
}

function requireTurn(s: GameState, seat: Seat) {
  if (s.phase !== "battle") throw new GameError("La batalla no ha empezado.");
  if (s.turn !== seat) throw new GameError("Espera tu turno.");
}

function takeItem(me: PlayerState, item: ItemId) {
  if (!me.inv[item]) throw new GameError(`No tienes ${ITEM_INFO[item].name}. ¡Cómpralo en la tienda!`);
  me.inv[item] = me.inv[item]! - 1;
}

/** Applies one player action to a copy of the state. Throws GameError for illegal moves. */
export function applyAction(state: GameState, seat: Seat, a: Action): GameState {
  const s: GameState = structuredClone(state);
  const me = s.players[seat];
  if (!me) throw new GameError("No estás en esta sala.");
  const foe = s.players[(1 - seat) as Seat];
  const arcadeOnly = () => {
    if (s.mode !== "arcade") throw new GameError("Eso es del modo Arcade.");
  };

  switch (a.t) {
    case "join":
    case "rename":
      me.name = cleanName(a.name, me.name);
      break;

    case "setMode":
      if (seat !== 0) throw new GameError("Solo quien creó la sala elige el modo.");
      if (s.phase !== "lobby" && s.phase !== "placing" && s.phase !== "over") throw new GameError("No puedes cambiar el modo en plena batalla.");
      s.mode = a.mode === "arcade" ? "arcade" : "classic";
      s.extraTurn = !!a.extraTurn;
      break;

    case "place": {
      if (s.phase !== "placing" && s.phase !== "lobby") throw new GameError("Ya no puedes mover tus barcos.");
      const problem = fleetProblem(a.fleet);
      if (problem) throw new GameError(problem);
      me.ships = FLEET.map((f) => {
        const p = a.fleet.find((x) => x.type === f.type)!;
        return { type: p.type, r: p.r, c: p.c, dir: p.dir, hits: [], sunk: false, shield: false };
      });
      me.ready = true;
      if (s.phase === "placing" && foe?.ready) startBattle(s);
      break;
    }

    case "unready":
      if (s.phase !== "placing" && s.phase !== "lobby") throw new GameError("La batalla ya empezó.");
      me.ready = false;
      break;

    case "fire":
      requireTurn(s, seat);
      if (!["shot", "cross", "air", "torpedo"].includes(a.weapon)) throw new GameError("Arma desconocida.");
      fire(s, seat, a.weapon, a.cell);
      break;

    case "buy": {
      arcadeOnly();
      if (s.phase !== "battle") throw new GameError("La tienda abre durante la batalla.");
      const info = ITEM_INFO[a.item];
      if (!info) throw new GameError("Ese artículo no existe.");
      if (me.coins < info.price) throw new GameError("No te alcanzan las monedas.");
      me.coins -= info.price;
      me.inv[a.item] = (me.inv[a.item] ?? 0) + 1;
      pushEvent(s, { by: seat, kind: "buy", item: a.item });
      break;
    }

    case "sonar": {
      arcadeOnly();
      requireTurn(s, seat);
      if (!Number.isInteger(a.cell) || a.cell < 0 || a.cell >= CELLS) throw new GameError("Casilla inválida.");
      takeItem(me, "sonar");
      const found: [number, 0 | 1][] = weaponArea("sonar", a.cell).map((c) => {
        const ship = shipAt(foe!, c);
        return [c, ship && !ship.sunk && !ship.hits.includes(c) ? 1 : 0];
      });
      found.forEach(([c, v]) => (me.sonar[c] = v));
      pushEvent(s, { by: seat, kind: "sonar", target: a.cell, sonar: found });
      break;
    }

    case "repair": {
      arcadeOnly();
      requireTurn(s, seat);
      const ship = shipAt(me, a.cell);
      if (!ship || ship.sunk || !ship.hits.includes(a.cell)) throw new GameError("Elige una casilla dañada de un barco que siga a flote.");
      takeItem(me, "repair");
      ship.hits = ship.hits.filter((h) => h !== a.cell);
      me.received[a.cell] = "repaired";
      pushEvent(s, { by: seat, kind: "repair", target: a.cell, ship: ship.type });
      break;
    }

    case "shield": {
      arcadeOnly();
      requireTurn(s, seat);
      const ship = me.ships.find((sh) => sh.type === a.ship);
      if (!ship || ship.sunk) throw new GameError("Elige un barco que siga a flote.");
      if (ship.shield) throw new GameError("Ese barco ya tiene escudo.");
      takeItem(me, "shield");
      ship.shield = true;
      pushEvent(s, { by: seat, kind: "shield", ship: ship.type });
      break;
    }

    case "mine": {
      arcadeOnly();
      requireTurn(s, seat);
      if (!Number.isInteger(a.cell) || a.cell < 0 || a.cell >= CELLS) throw new GameError("Casilla inválida.");
      if (shipAt(me, a.cell) || me.received[a.cell] || me.mines.includes(a.cell)) throw new GameError("Pon la mina en agua libre.");
      if (me.mines.length >= MAX_MINES) throw new GameError(`Máximo ${MAX_MINES} minas a la vez.`);
      takeItem(me, "mine");
      me.mines.push(a.cell);
      me.treasure = me.treasure.filter((t) => t !== a.cell);
      pushEvent(s, { by: seat, kind: "mine", target: a.cell });
      break;
    }

    case "double":
      arcadeOnly();
      requireTurn(s, seat);
      if (s.doubleUsed) throw new GameError("Solo un doble disparo por turno.");
      takeItem(me, "double");
      s.doubleUsed = true;
      s.shotsLeft += 1;
      pushEvent(s, { by: seat, kind: "double" });
      break;

    case "rematch":
      if (s.phase !== "over") throw new GameError("La partida no ha terminado.");
      me.rematch = true;
      if (foe?.rematch) {
        s.round += 1;
        s.phase = "placing";
        for (const p of s.players) if (p) Object.assign(p, { ...freshBoard(), ships: p.ships.map((sh) => ({ ...sh, hits: [], sunk: false, shield: false })) });
      }
      break;

    default:
      throw new GameError("Acción desconocida.");
  }
  return s;
}

/** Seats a second player. Returns the new state and the seat. */
export function joinGame(state: GameState, playerId: string, name: string, takeover: boolean): { state: GameState; seat: Seat } {
  const s: GameState = structuredClone(state);
  const seat = seatOf(s, playerId);
  if (seat !== null) return { state: applyAction(s, seat, { t: "join", name }), seat };
  if (s.players[1] && !takeover) throw new GameError("La sala ya tiene dos jugadores.");
  if (s.players[1]) {
    s.players[1].id = playerId; // the old guest vanished: the new device takes the seat as-is
    s.players[1].name = cleanName(name, s.players[1].name);
  } else {
    s.players[1] = newPlayer(playerId, cleanName(name, "Capitán 2"));
    if (s.phase === "lobby") s.phase = "placing";
    if (s.players[0].ready && s.players[1].ready) startBattle(s);
  }
  pushEvent(s, { by: 1, kind: "join" });
  return { state: s, seat: 1 };
}

export function rememberAction(state: GameState, seat: Seat, actionId: string) {
  const p = state.players[seat];
  if (!p) return;
  p.applied = [...p.applied, actionId].slice(-APPLIED_LOG);
}

// ───────────────────────── what each player may see ─────────────────────────

export type PublicShip = Ship;

export type FoeView = {
  name: string;
  ready: boolean;
  coins: number;
  wins: number;
  received: Record<string, Mark>;
  /** Only sunk ships (or the whole fleet once the game is over). */
  ships: PublicShip[];
  shipsLeft: number;
  rematch: boolean;
  stats: Stats;
  online: boolean;
};

export type MeView = Omit<PlayerState, "id" | "applied">;

export type View = {
  code: string;
  version: number;
  mode: Mode;
  phase: Phase;
  extraTurn: boolean;
  seat: Seat;
  turn: Seat;
  shotsLeft: number;
  doubleUsed: boolean;
  winner: Seat | null;
  round: number;
  seq: number;
  events: GameEvent[];
  me: MeView;
  foe: FoeView | null;
};

export function viewFor(state: GameState, seat: Seat, code: string, version: number, foeOnline: boolean): View {
  const { id: _id, applied: _applied, ...me } = state.players[seat]!;
  void _id;
  void _applied;
  const f = state.players[(1 - seat) as Seat];
  const reveal = state.phase === "over";
  const events = state.events.map((e) => {
    if (e.by === seat) return e;
    // Hide the opponent's secret placements.
    if (e.kind === "mine") return { ...e, target: undefined };
    if (e.kind === "shield" || e.kind === "repair") return { ...e, ship: undefined };
    return e;
  });
  return {
    code,
    version,
    mode: state.mode,
    phase: state.phase,
    extraTurn: state.extraTurn,
    seat,
    turn: state.turn,
    shotsLeft: state.shotsLeft,
    doubleUsed: state.doubleUsed,
    winner: state.winner,
    round: state.round,
    seq: state.seq,
    events,
    me: { ...me, treasure: [] },
    foe: f
      ? {
          name: f.name,
          ready: f.ready,
          coins: f.coins,
          wins: f.wins,
          received: f.received,
          ships: f.ships.filter((s) => reveal || s.sunk),
          shipsLeft: f.ships.filter((s) => !s.sunk).length,
          rematch: f.rematch,
          stats: f.stats,
          online: foeOnline,
        }
      : null,
  };
}
