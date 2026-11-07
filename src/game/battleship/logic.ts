// Batalla Naval — pure game rules shared by the server (authoritative) and the client (previews).
// No I/O here: the server loads a GameState, runs applyAction() and saves it back.

export const CLASSIC_SIZE = 10;
/** Arcade weapons clear the sea much faster, so its board is roughly twice the area. */
export const ARCADE_SIZE = 14;
const EVENT_LOG = 24;
/** Enemy turns a SAM zone stays up. */
export const SAM_TURNS = 4;
const APPLIED_LOG = 40;

export type Mode = "classic" | "arcade";
export type Phase = "lobby" | "placing" | "battle" | "over";
export type Dir = "h" | "v";
export type Seat = 0 | 1;
export type ShipType = "carrier" | "battleship" | "cruiser" | "submarine" | "destroyer";

export const sizeFor = (mode: Mode) => (mode === "arcade" ? ARCADE_SIZE : CLASSIC_SIZE);

export const FLEET: { type: ShipType; name: string; size: number }[] = [
  { type: "carrier", name: "Portaaviones", size: 5 },
  { type: "battleship", name: "Acorazado", size: 4 },
  { type: "cruiser", name: "Crucero", size: 3 },
  { type: "submarine", name: "Submarino", size: 3 },
  { type: "destroyer", name: "Destructor", size: 2 },
];
export const SHIP_INFO = Object.fromEntries(FLEET.map((s) => [s.type, s])) as Record<ShipType, (typeof FLEET)[number]>;

export type Placement = { type: ShipType; r: number; c: number; dir: Dir };
export type Ship = Placement & { hits: number[]; sunk: boolean };

/** What the attacker learned about a cell. "repaired" (a fixed hit) can be shot again. */
export type Mark = "miss" | "hit" | "repaired" | "mine";
/** One cell of an attack. "blocked" = it hit a shield: no mark is left and the cell can be shot again. */
export type Result = Mark | "blocked";
const FINAL_MARKS: Mark[] = ["miss", "hit", "mine"];

// ───────────────────────── arcade abilities ─────────────────────────

export type Weapon = "shot" | "cross" | "air" | "torpedo";
export type AbilityId = "air" | "sam" | "double" | "repair" | "cross" | "mine" | "sonar" | "torpedo" | "decoy" | "ciws";

export type AbilityInfo = {
  id: AbilityId;
  name: string;
  short: string;
  emoji: string;
  ship: ShipType;
  /** Attack abilities use your shot; strategy abilities end your turn. */
  kind: "attack" | "strategy";
  /** Own turns to wait after using it (0 = none). */
  cooldown: number;
  /** Total uses per game (null = unlimited). */
  uses: number | null;
  desc: string;
  long: string;
  /** Where you aim it. */
  target: "enemy" | "ownShip" | "ownWater" | "ownArea" | "none";
};

export const ABILITIES: AbilityInfo[] = [
  {
    id: "air",
    name: "Bombardero",
    short: "Bombardero",
    emoji: "✈️",
    ship: "carrier",
    kind: "attack",
    cooldown: 10,
    uses: 3,
    desc: "Arrasa un cuadro de 3×3 casillas.",
    long: "Tus aviones bombardean un cuadro de 3×3 en el mar enemigo y golpean las 9 casillas a la vez.",
    target: "enemy",
  },
  {
    id: "sam",
    name: "SAM",
    short: "SAM",
    emoji: "🛡️",
    ship: "carrier",
    kind: "strategy",
    cooldown: 0,
    uses: 1,
    desc: "Sistema de defensa antimisiles naval: zona de 5×5 durante 4 turnos.",
    long: `Sistema de defensa antimisiles naval. Cubre 5×5 casillas de tu mapa durante los próximos ${SAM_TURNS} turnos del rival: cualquier arma especial (bombardero, misil en cruz o torpedo) que vaya a caer en esa zona es derribada y no hace daño. Los disparos normales sí pasan. Tu rival no ve la zona en su mapa ni se entera de que la desplegaste.`,
    target: "ownArea",
  },
  {
    id: "double",
    name: "Doble disparo",
    short: "Doble",
    emoji: "🎯",
    ship: "battleship",
    kind: "attack",
    cooldown: 3,
    uses: null,
    desc: "Este turno disparas dos veces.",
    long: "Activa el doble disparo y tendrás dos tiros en este turno. Cada tiro puede ser un disparo normal o cualquier arma lista.",
    target: "none",
  },
  {
    id: "repair",
    name: "Kit de reparación",
    short: "Reparar",
    emoji: "🔧",
    ship: "battleship",
    kind: "strategy",
    cooldown: 0,
    uses: 1,
    desc: "Repara por completo un barco, incluso hundido.",
    long: "Deja como nuevo uno de tus barcos, aunque esté hundido, y recupera sus habilidades. Las casillas que el rival ya había golpeado se quedan en rojo, pero pueden volver a recibir daño.",
    target: "ownShip",
  },
  {
    id: "cross",
    name: "Misil en cruz",
    short: "Cruz",
    emoji: "✳️",
    ship: "cruiser",
    kind: "attack",
    cooldown: 6,
    uses: null,
    desc: "Golpea 5 casillas en forma de +.",
    long: "Un misil que se abre en cruz: golpea la casilla elegida y las cuatro de arriba, abajo, izquierda y derecha.",
    target: "enemy",
  },
  {
    id: "mine",
    name: "Mina naval",
    short: "Mina",
    emoji: "💣",
    ship: "cruiser",
    kind: "strategy",
    cooldown: 5,
    uses: 3,
    desc: "Esconde una mina en tu agua.",
    long: "Escóndela en agua libre de tu mapa. Si el rival le dispara, la explosión rebota y daña una casilla al azar de SU flota.",
    target: "ownWater",
  },
  {
    id: "sonar",
    name: "Sonar",
    short: "Sonar",
    emoji: "📡",
    ship: "submarine",
    kind: "strategy",
    cooldown: 6,
    uses: null,
    desc: "Revela barcos en un área de 3×3, sin dañarlos.",
    long: "Escanea un cuadro de 3×3 del mar enemigo y marca dónde hay barcos. Tu rival verá qué zona escaneaste y si encontraste algo.",
    target: "enemy",
  },
  {
    id: "torpedo",
    name: "Torpedo",
    short: "Torpedo",
    emoji: "🚀",
    ship: "submarine",
    kind: "attack",
    cooldown: 8,
    uses: 4,
    desc: "Recorre una fila y pega en el primer barco.",
    long: "Elige una fila: el torpedo sale por la izquierda, avanza casilla por casilla y explota en el primer barco que encuentre.",
    target: "enemy",
  },
  {
    id: "decoy",
    name: "Señuelo",
    short: "Señuelo",
    emoji: "🎭",
    ship: "destroyer",
    kind: "strategy",
    cooldown: 7,
    uses: null,
    desc: "Un barco falso que engaña al rival.",
    long: "Coloca un señuelo en agua libre de tu mapa. Si el rival le dispara verá un impacto 🔥 como si le hubiera dado a un barco, y su sonar también lo detecta como barco.",
    target: "ownWater",
  },
  {
    id: "ciws",
    name: "CIWIS",
    short: "CIWIS",
    emoji: "🚨",
    ship: "destroyer",
    kind: "strategy",
    cooldown: 10,
    uses: 2,
    desc: "Derriba la próxima arma especial del rival.",
    long: "Arma tu defensa antiaérea: la próxima habilidad de ataque que use el rival (bombardero, cruz, torpedo o doble disparo) es destruida y no hace nada. Tu rival no se entera de que lo armaste hasta que lo derriba. Los disparos normales no la activan.",
    target: "none",
  },
];
export const ABILITY_INFO = Object.fromEntries(ABILITIES.map((a) => [a.id, a])) as Record<AbilityId, AbilityInfo>;
export const SHIP_ABILITIES = Object.fromEntries(FLEET.map((f) => [f.type, ABILITIES.filter((a) => a.ship === f.type).map((a) => a.id)])) as Record<
  ShipType,
  AbilityId[]
>;
const WEAPON_ABILITIES: AbilityId[] = ["cross", "air", "torpedo"];

export type AbilityState = { cd: number; left: number | null };

/** An active SAM zone: its centre and how many enemy turns it still covers. */
export type Sam = { center: number; left: number };

/** Every ability starts half charged, so the big guns aren't all available on turn one. */
export function freshAbilities(): Partial<Record<AbilityId, AbilityState>> {
  return Object.fromEntries(ABILITIES.map((a) => [a.id, { cd: Math.floor(a.cooldown / 2), left: a.uses }]));
}

export type Stats = { shots: number; hits: number; sunk: number; used: number };

export type PlayerState = {
  id: string;
  name: string;
  ready: boolean;
  ships: Ship[];
  /** Shots this player's board has received, by cell index. */
  received: Record<string, Mark>;
  mines: number[];
  /** Active decoys, and decoys the enemy already "hit" (they show as a hit to the enemy). */
  decoys: number[];
  decoyHits: number[];
  /** Active SAM zone (5×5), secret from the enemy. */
  sam: Sam | null;
  /** CIWIS armed: the enemy's next attack ability is shot down. */
  ciws: boolean;
  abil: Partial<Record<AbilityId, AbilityState>>;
  /** Sonar intel about the enemy board: 1 = ship, 0 = water. */
  sonar: Record<string, 0 | 1>;
  stats: Stats;
  wins: number;
  rematch: boolean;
  /** Recent action ids, so retried requests are applied once. */
  applied: string[];
};

export type GameEvent = {
  seq: number;
  by: Seat;
  kind: "fire" | "ability" | "start" | "join";
  weapon?: Weapon;
  ability?: AbilityId;
  target?: number;
  results?: [number, Result][];
  sunk?: ShipType[];
  /** A mine blew up under the attacker's own fleet. */
  backfire?: { cell: number; mark: Mark; sunk?: ShipType };
  /** The attack was shot down (by the defender's CIWIS or SAM). */
  intercepted?: boolean;
  interceptedBy?: "ciws" | "sam";
  /** Where it was shot down. */
  at?: number;
  /** Cells that were really decoys (only the defender is told). */
  decoyHit?: number[];
  ship?: ShipType;
  /** A repaired ship that had been sunk. */
  revived?: boolean;
  cells?: number[];
  sonar?: [number, 0 | 1][];
};

export type GameState = {
  mode: Mode;
  /** Board side for this game (fixed once ships are placed). */
  size: number;
  phase: Phase;
  extraTurn: boolean;
  players: [PlayerState, PlayerState | null];
  turn: Seat;
  shotsLeft: number;
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
  | { t: "ability"; ability: AbilityId; cell?: number }
  | { t: "rematch" }
  | { t: "setMode"; mode: Mode; extraTurn: boolean };

export class GameError extends Error {}

// ───────────────────────── geometry ─────────────────────────

export const idx = (r: number, c: number, n: number) => r * n + c;
export const rc = (i: number, n: number) => [Math.floor(i / n), i % n] as const;
const inBounds = (r: number, c: number, n: number) => r >= 0 && c >= 0 && r < n && c < n;

export function shipCells(p: Placement, n: number): number[] {
  const size = SHIP_INFO[p.type].size;
  return Array.from({ length: size }, (_, k) => (p.dir === "h" ? idx(p.r, p.c + k, n) : idx(p.r + k, p.c, n)));
}

export function fitsBoard(p: Placement, n: number) {
  const size = SHIP_INFO[p.type]?.size;
  if (!size || !Number.isInteger(p.r) || !Number.isInteger(p.c)) return false;
  return p.dir === "h" ? inBounds(p.r, p.c, n) && p.c + size <= n : inBounds(p.r, p.c, n) && p.r + size <= n;
}

/** null if the fleet is legal: every ship once, on the board, no overlaps. */
export function fleetProblem(fleet: Placement[], n: number): string | null {
  if (!Array.isArray(fleet) || fleet.length !== FLEET.length) return "Coloca los 5 barcos.";
  const used = new Set<number>();
  for (const s of FLEET) {
    const p = fleet.find((f) => f?.type === s.type);
    if (!p) return `Falta el ${s.name}.`;
    if (p.dir !== "h" && p.dir !== "v") return "Orientación inválida.";
    if (!fitsBoard(p, n)) return `El ${s.name} se sale del mapa.`;
    for (const cell of shipCells(p, n)) {
      if (used.has(cell)) return "Hay barcos encimados.";
      used.add(cell);
    }
  }
  return null;
}

export function randomFleet(n: number): Placement[] {
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
          r: Math.floor(Math.random() * (dir === "v" ? n - s.size + 1 : n)),
          c: Math.floor(Math.random() * (dir === "h" ? n - s.size + 1 : n)),
        };
        const cells = shipCells(p, n);
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

export type AreaKind = Weapon | "sonar" | "sam";

/** Cells an ability can affect when aimed at `cell` (the torpedo's path is decided when it runs). */
export function area(kind: AreaKind, cell: number, n: number): number[] {
  const [r, c] = rc(cell, n);
  const pick = (offsets: [number, number][]) =>
    offsets.filter(([dr, dc]) => inBounds(r + dr, c + dc, n)).map(([dr, dc]) => idx(r + dr, c + dc, n));
  switch (kind) {
    case "cross":
      return pick([[0, 0], [-1, 0], [1, 0], [0, -1], [0, 1]]);
    case "air":
    case "sonar":
      return pick([-1, 0, 1].flatMap((dr) => [-1, 0, 1].map((dc) => [dr, dc] as [number, number])));
    case "sam":
      return pick([-2, -1, 0, 1, 2].flatMap((dr) => [-2, -1, 0, 1, 2].map((dc) => [dr, dc] as [number, number])));
    case "torpedo":
      return Array.from({ length: n }, (_, k) => idx(r, k, n));
    default:
      return [cell];
  }
}

export const isFinal = (m: Mark | undefined) => !!m && FINAL_MARKS.includes(m);

/** Why an ability can't be used right now (null = ready). */
export function abilityBlock(p: Pick<PlayerState, "abil" | "ships">, id: AbilityId): { reason: "sunk" | "spent" | "cooldown" | "missing"; text: string } | null {
  const info = ABILITY_INFO[id];
  const st = p.abil?.[id];
  if (!info || !st) return { reason: "missing", text: "No tienes esa habilidad." };
  const ship = p.ships.find((s) => s.type === info.ship);
  if (!ship || ship.sunk) return { reason: "sunk", text: `Tu ${SHIP_INFO[info.ship].name} está hundido: ${info.name} no funciona.` };
  if (st.left === 0) return { reason: "spent", text: `Ya no te quedan usos de ${info.name}.` };
  if (st.cd > 0) return { reason: "cooldown", text: `${info.name} estará listo en ${st.cd} turno${st.cd === 1 ? "" : "s"}.` };
  return null;
}

// ───────────────────────── state setup ─────────────────────────

export function cleanName(name: unknown, fallback: string) {
  const s = typeof name === "string" ? name.replace(/\s+/g, " ").trim().slice(0, 16) : "";
  return s || fallback;
}

type Board = Pick<PlayerState, "ready" | "ships" | "received" | "mines" | "decoys" | "decoyHits" | "sam" | "ciws" | "abil" | "sonar" | "stats" | "rematch">;

function freshBoard(): Board {
  return {
    ready: false,
    ships: [],
    received: {},
    mines: [],
    decoys: [],
    decoyHits: [],
    sam: null,
    ciws: false,
    abil: {},
    sonar: {},
    stats: { shots: 0, hits: 0, sunk: 0, used: 0 },
    rematch: false,
  };
}

export function newPlayer(id: string, name: string): PlayerState {
  return { id, name, wins: 0, applied: [], ...freshBoard() };
}

export function newGame(hostId: string, hostName: string, mode: Mode, extraTurn: boolean): GameState {
  const m: Mode = mode === "arcade" ? "arcade" : "classic";
  return {
    mode: m,
    size: sizeFor(m),
    phase: "lobby",
    extraTurn: !!extraTurn,
    players: [newPlayer(hostId, cleanName(hostName, "Capitán 1")), null],
    turn: 0,
    shotsLeft: 1,
    winner: null,
    round: 1,
    seq: 0,
    events: [],
  };
}

/** Rooms saved before the arcade rework: fill in the new fields so they keep working. */
function upgrade(s: GameState) {
  s.size ??= CLASSIC_SIZE;
  for (const p of s.players) {
    if (!p) continue;
    p.decoys ??= [];
    p.decoyHits ??= [];
    p.sam ??= null;
    p.ciws ??= false;
    p.abil ??= s.mode === "arcade" && s.phase === "battle" ? freshAbilities() : {};
    if (s.mode === "arcade" && s.phase === "battle" && !p.abil.sam) p.abil.sam = { cd: 0, left: 1 }; // Escudo became SAM
    p.mines ??= [];
    p.sonar ??= {};
    p.stats.used ??= 0;
  }
  return s;
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

const shipAt = (p: PlayerState, cell: number, n: number) => p.ships.find((s) => shipCells(s, n).includes(cell));
const allSunk = (p: PlayerState) => p.ships.length > 0 && p.ships.every((s) => s.sunk);
const validCell = (cell: unknown, n: number): cell is number => Number.isInteger(cell) && (cell as number) >= 0 && (cell as number) < n * n;

/** Damages `cell` of `p`'s fleet. Returns the mark and the ship it sank, if any. */
function damage(p: PlayerState, cell: number, n: number): { mark: Mark; sunk?: ShipType } {
  const ship = shipAt(p, cell, n);
  if (!ship || ship.sunk || ship.hits.includes(cell)) return { mark: p.received[cell] ?? "miss" };
  ship.hits.push(cell);
  p.received[cell] = "hit";
  if (ship.hits.length >= SHIP_INFO[ship.type].size) {
    ship.sunk = true;
    return { mark: "hit", sunk: ship.type };
  }
  return { mark: "hit" };
}

/** The defender's turn starts: their abilities recharge (only those whose ship is still afloat). */
function passTurn(s: GameState, seat: Seat) {
  const next = (1 - seat) as Seat;
  s.turn = next;
  s.shotsLeft = 1;
  const p = s.players[next]!;
  if (p.sam && --p.sam.left <= 0) p.sam = null;
  for (const a of ABILITIES) {
    const st = p.abil[a.id];
    if (!st || st.cd <= 0) continue;
    const ship = p.ships.find((sh) => sh.type === a.ship);
    if (ship && !ship.sunk) st.cd -= 1;
  }
}

function takeAbility(me: PlayerState, id: AbilityId) {
  const block = abilityBlock(me, id);
  if (block) throw new GameError(block.text);
}

function spendAbility(me: PlayerState, id: AbilityId) {
  const st = me.abil[id]!;
  st.cd = ABILITY_INFO[id].cooldown;
  if (st.left !== null) st.left -= 1;
  me.stats.used += 1;
}

function afterShot(s: GameState, seat: Seat, anyHit: boolean) {
  const me = s.players[seat]!;
  const foe = s.players[(1 - seat) as Seat]!;
  if (allSunk(foe)) return finish(s, seat);
  if (allSunk(me)) return finish(s, (1 - seat) as Seat);
  s.shotsLeft -= 1;
  if (s.shotsLeft > 0) return;
  if (s.extraTurn && anyHit) s.shotsLeft = 1;
  else passTurn(s, seat);
}

function fire(s: GameState, seat: Seat, weapon: Weapon, target: number) {
  const n = s.size;
  const me = s.players[seat]!;
  const foe = s.players[(1 - seat) as Seat]!;
  if (!validCell(target, n)) throw new GameError("Casilla inválida.");
  if (weapon !== "shot") {
    if (s.mode !== "arcade") throw new GameError("Esa arma es del modo Arcade.");
    takeAbility(me, weapon);
    spendAbility(me, weapon);
    if (foe.ciws) {
      foe.ciws = false;
      pushEvent(s, { by: seat, kind: "fire", weapon, target, results: [], intercepted: true, interceptedBy: "ciws", at: target });
      return afterShot(s, seat, false);
    }
    // Bombs and cross missiles aimed so that any part lands in a SAM zone are shot down whole.
    const zone = foe.sam ? area("sam", foe.sam.center, n) : [];
    if (weapon !== "torpedo" && area(weapon, target, n).some((c) => zone.includes(c))) {
      pushEvent(s, { by: seat, kind: "fire", weapon, target, results: [], intercepted: true, interceptedBy: "sam", at: target });
      return afterShot(s, seat, false);
    }
  } else if (isFinal(foe.received[target])) {
    throw new GameError("Ya disparaste ahí.");
  }

  const results: [number, Result][] = [];
  const sunk: ShipType[] = [];
  const decoyHit: number[] = [];
  let backfire: GameEvent["backfire"];
  let samAt: number | undefined;

  const hitCell = (cell: number): "stop" | "go" => {
    if (isFinal(foe.received[cell])) return "go";
    if (foe.mines.includes(cell)) {
      foe.mines = foe.mines.filter((m) => m !== cell);
      foe.received[cell] = "mine";
      results.push([cell, "mine"]);
      // The blast travels back: hit a random intact part of the attacker's fleet.
      const intact = me.ships.filter((sh) => !sh.sunk).flatMap((sh) => shipCells(sh, n).filter((c) => !sh.hits.includes(c)));
      if (intact.length) {
        const victim = intact[Math.floor(Math.random() * intact.length)];
        const d = damage(me, victim, n);
        backfire = { cell: victim, mark: d.mark, sunk: d.sunk };
      }
      return "stop";
    }
    if (foe.decoys.includes(cell)) {
      // Looks exactly like hitting a ship.
      foe.decoys = foe.decoys.filter((d) => d !== cell);
      foe.decoyHits.push(cell);
      foe.received[cell] = "hit";
      results.push([cell, "hit"]);
      decoyHit.push(cell);
      me.stats.hits += 1;
      return "stop";
    }
    if (shipAt(foe, cell, n)) {
      const d = damage(foe, cell, n);
      results.push([cell, d.mark]);
      if (d.mark === "hit") me.stats.hits += 1;
      if (d.sunk) {
        sunk.push(d.sunk);
        me.stats.sunk += 1;
      }
      return "stop";
    }
    foe.received[cell] = "miss";
    results.push([cell, "miss"]);
    return "go";
  };

  if (weapon === "torpedo") {
    // The torpedo runs along the row; a SAM zone destroys it as soon as it gets there.
    const zone = foe.sam ? area("sam", foe.sam.center, n) : [];
    const [r] = rc(target, n);
    for (let c = 0; c < n; c++) {
      const cell = idx(r, c, n);
      if (zone.includes(cell)) {
        samAt = cell;
        break;
      }
      if (hitCell(cell) === "stop") break;
    }
  } else {
    area(weapon, target, n).forEach(hitCell);
  }

  me.stats.shots += Math.max(1, results.filter(([, m]) => m !== "mine").length); // cells fired at, so precision stays ≤ 100%
  const anyHit = results.some(([, m]) => m === "hit");
  pushEvent(s, {
    by: seat,
    kind: "fire",
    weapon,
    target,
    results,
    sunk,
    backfire,
    decoyHit: decoyHit.length ? decoyHit : undefined,
    ...(samAt !== undefined ? { intercepted: true, interceptedBy: "sam" as const, at: samAt } : {}),
  });
  afterShot(s, seat, anyHit);
}

function castAbility(s: GameState, seat: Seat, id: AbilityId, cell: number | undefined) {
  const n = s.size;
  const me = s.players[seat]!;
  const foe = s.players[(1 - seat) as Seat]!;
  takeAbility(me, id);
  const needCell = () => {
    if (!validCell(cell, n)) throw new GameError("Elige una casilla.");
    return cell;
  };
  const freeWater = (c: number) => !shipAt(me, c, n) && !me.received[c] && !me.mines.includes(c) && !me.decoys.includes(c);

  switch (id) {
    case "double": {
      spendAbility(me, id);
      if (foe.ciws) {
        foe.ciws = false;
        pushEvent(s, { by: seat, kind: "ability", ability: id, intercepted: true });
      } else {
        s.shotsLeft += 1;
        pushEvent(s, { by: seat, kind: "ability", ability: id });
      }
      return; // attack ability: the turn goes on
    }
    case "sonar": {
      const at = needCell();
      spendAbility(me, id);
      const found: [number, 0 | 1][] = area("sonar", at, n).map((c) => {
        const ship = shipAt(foe, c, n);
        return [c, (ship && !ship.sunk && !ship.hits.includes(c)) || foe.decoys.includes(c) ? 1 : 0];
      });
      found.forEach(([c, v]) => (me.sonar[c] = v));
      pushEvent(s, { by: seat, kind: "ability", ability: id, target: at, sonar: found });
      break;
    }
    case "repair": {
      const at = needCell();
      const ship = shipAt(me, at, n);
      if (!ship || !ship.hits.length) throw new GameError("Toca un barco tuyo dañado o hundido.");
      spendAbility(me, id);
      const cells = [...ship.hits];
      const revived = ship.sunk;
      cells.forEach((c) => (me.received[c] = "repaired"));
      ship.hits = [];
      ship.sunk = false;
      pushEvent(s, { by: seat, kind: "ability", ability: id, ship: ship.type, revived, cells });
      break;
    }
    case "sam": {
      const at = needCell();
      spendAbility(me, id);
      // Ticks down at the start of each of our turns, so it covers the enemy's next SAM_TURNS turns.
      me.sam = { center: at, left: SAM_TURNS };
      pushEvent(s, { by: seat, kind: "ability", ability: id, target: at });
      break;
    }
    case "mine":
    case "decoy": {
      const at = needCell();
      if (!freeWater(at)) throw new GameError(`Pon ${id === "mine" ? "la mina" : "el señuelo"} en agua libre.`);
      spendAbility(me, id);
      (id === "mine" ? me.mines : me.decoys).push(at);
      pushEvent(s, { by: seat, kind: "ability", ability: id, target: at });
      break;
    }
    case "ciws": {
      if (me.ciws) throw new GameError("Tu CIWIS ya está armado.");
      spendAbility(me, id);
      me.ciws = true;
      pushEvent(s, { by: seat, kind: "ability", ability: id });
      break;
    }
    default:
      throw new GameError("Esa habilidad se dispara desde el mar enemigo.");
  }
  passTurn(s, seat); // every strategy ability ends the turn
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
  for (const p of s.players) {
    if (!p) continue;
    Object.assign(p, {
      ...freshBoard(),
      ready: true,
      ships: p.ships.map((sh) => ({ type: sh.type, r: sh.r, c: sh.c, dir: sh.dir, hits: [], sunk: false })),
      abil: s.mode === "arcade" ? freshAbilities() : {},
    });
  }
  pushEvent(s, { by: s.turn, kind: "start" });
}

function requireTurn(s: GameState, seat: Seat) {
  if (s.phase !== "battle") throw new GameError("La batalla no ha empezado.");
  if (s.turn !== seat) throw new GameError("Espera tu turno.");
}

/** Applies one player action to a copy of the state. Throws GameError for illegal moves. */
export function applyAction(state: GameState, seat: Seat, a: Action): GameState {
  const s: GameState = upgrade(structuredClone(state));
  const me = s.players[seat];
  if (!me) throw new GameError("No estás en esta sala.");
  const foe = s.players[(1 - seat) as Seat];

  switch (a.t) {
    case "join":
    case "rename":
      me.name = cleanName(a.name, me.name);
      break;

    case "setMode": {
      if (seat !== 0) throw new GameError("Solo quien creó la sala elige el modo.");
      if (s.phase !== "lobby" && s.phase !== "placing" && s.phase !== "over") throw new GameError("No puedes cambiar el modo en plena batalla.");
      s.mode = a.mode === "arcade" ? "arcade" : "classic";
      s.extraTurn = !!a.extraTurn;
      // The board size changes with the mode; after a game it switches when the rematch starts.
      if (s.phase !== "over" && s.size !== sizeFor(s.mode)) {
        s.size = sizeFor(s.mode);
        for (const p of s.players) if (p) Object.assign(p, { ships: [], ready: false });
      }
      break;
    }

    case "place": {
      if (s.phase !== "placing" && s.phase !== "lobby") throw new GameError("Ya no puedes mover tus barcos.");
      const problem = fleetProblem(a.fleet, s.size);
      if (problem) throw new GameError(problem);
      me.ships = FLEET.map((f) => {
        const p = a.fleet.find((x) => x.type === f.type)!;
        return { type: p.type, r: p.r, c: p.c, dir: p.dir, hits: [], sunk: false };
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

    case "ability":
      if (s.mode !== "arcade") throw new GameError("Eso es del modo Arcade.");
      requireTurn(s, seat);
      if (!ABILITY_INFO[a.ability]) throw new GameError("Habilidad desconocida.");
      if (WEAPON_ABILITIES.includes(a.ability)) fire(s, seat, a.ability as Weapon, a.cell as number);
      else castAbility(s, seat, a.ability, a.cell);
      break;

    case "rematch":
      if (s.phase !== "over") throw new GameError("La partida no ha terminado.");
      me.rematch = true;
      if (foe?.rematch) {
        s.round += 1;
        s.phase = "placing";
        const size = sizeFor(s.mode);
        const resize = size !== s.size;
        s.size = size;
        for (const p of s.players) if (p) Object.assign(p, { ...freshBoard(), ships: resize ? [] : p.ships.map((sh) => ({ ...sh, hits: [], sunk: false })) });
      }
      break;

    default:
      throw new GameError("Acción desconocida.");
  }
  return s;
}

/** Seats a second player. Returns the new state and the seat. */
export function joinGame(state: GameState, playerId: string, name: string, takeover: boolean): { state: GameState; seat: Seat } {
  const s: GameState = upgrade(structuredClone(state));
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

export type FoeView = {
  name: string;
  ready: boolean;
  wins: number;
  received: Record<string, Mark>;
  /** Only sunk ships (or the whole fleet once the game is over). */
  ships: Ship[];
  shipsLeft: number;
  /** What the rival's sonar found on your board. */
  scan: Record<string, 0 | 1>;
  rematch: boolean;
  stats: Stats;
  online: boolean;
};

export type MeView = Omit<PlayerState, "id" | "applied">;

export type View = {
  code: string;
  version: number;
  mode: Mode;
  size: number;
  phase: Phase;
  extraTurn: boolean;
  seat: Seat;
  turn: Seat;
  shotsLeft: number;
  winner: Seat | null;
  round: number;
  seq: number;
  events: GameEvent[];
  me: MeView;
  foe: FoeView | null;
};

const SECRET_TARGETS: AbilityId[] = ["mine", "decoy"];
/** Abilities the rival never hears about. */
const SECRET_ABILITIES: AbilityId[] = ["ciws", "sam"];

export function viewFor(state: GameState, seat: Seat, code: string, version: number, foeOnline: boolean): View {
  const s = upgrade(structuredClone(state));
  const { id: _id, applied: _applied, ...me } = s.players[seat]!;
  void _id;
  void _applied;
  const f = s.players[(1 - seat) as Seat];
  const reveal = s.phase === "over";
  // Arming CIWIS or deploying a SAM is secret: the rival only finds out when it shoots something down.
  const events = s.events.filter((e) => !(e.by !== seat && e.kind === "ability" && e.ability && SECRET_ABILITIES.includes(e.ability))).map((e) => {
    if (e.by === seat) return e.decoyHit ? { ...e, decoyHit: undefined } : e; // you never learn you hit a decoy
    // Hide the opponent's secret placements.
    if (e.kind === "ability" && e.ability && SECRET_TARGETS.includes(e.ability)) return { ...e, target: undefined };
    if (e.kind === "ability" && e.ability === "repair" && !e.revived) return { ...e, ship: undefined };
    return e;
  });
  return {
    code,
    version,
    mode: s.mode,
    size: s.size,
    phase: s.phase,
    extraTurn: s.extraTurn,
    seat,
    turn: s.turn,
    shotsLeft: s.shotsLeft,
    winner: s.winner,
    round: s.round,
    seq: s.seq,
    events,
    me,
    foe: f
      ? {
          name: f.name,
          ready: f.ready,
          wins: f.wins,
          received: f.received,
          ships: f.ships.filter((sh) => reveal || sh.sunk),
          shipsLeft: f.ships.filter((sh) => !sh.sunk).length,
          scan: f.sonar,
          rematch: f.rematch,
          stats: f.stats,
          online: foeOnline,
        }
      : null,
  };
}
