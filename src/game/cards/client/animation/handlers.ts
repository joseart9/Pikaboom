// Event → animation handlers (§18.5: Phase 13 basic, Phase 20 cinematic column). Each handler animates ONE event and
// resolves when the queue may move on (long tails such as a floating number keep running in the background). A
// handler whose element is missing resolves at once. Handlers never change the board: the queue applies the reducer.
//
// Registration: add `TYPE: handler` to ANIMATIONS (runs before the group is applied, on the elements as they were)
// or to ENTER_ANIMATIONS (runs after the apply, on elements that only exist then: a summoned unit, a drawn card).
//
// Reduced motion (§18.3): no shake, no particles, no projectiles, no trails; only fades, flashes and number pops.
import { CATALOG } from "../../catalog";
import type { CardDef, StatusId, TriggerOn } from "../../catalog/types";
import { cardEntrance, effectElement, type FxElement } from "../../catalog/visuals";
import type { EntityId, Seat } from "../../engine/types";
import { cardName, t } from "../../i18n";
import type { ViewEvent } from "../../server/view";
import type { CardSound } from "../sounds";
import { entranceTimeline, playEntrance } from "./cinematics";
import type { FxApi, ParticleKind } from "./fx";

export interface AnimationEnv {
  fx: FxApi;
  reducedMotion: boolean;
  speed: number;
  /** The seat whose screen this is. */
  perspective: Seat;
  /** Aborted when the group is skipped: stop chaining further steps. */
  signal: AbortSignal;
  /** A base duration (ms at speed 1) scaled by speed and reduced motion (0.3×). */
  ms(base: number): number;
  /** A reading time (reveal, banner): scaled by speed only. */
  hold(base: number): number;
  /** Plays a sound once per group. */
  sound(kind: CardSound): void;
  /** The card an entity is (units, spell instances, recently dead units), or null (heroes, unknown). */
  defOf(id: EntityId): string | null;
  /** Speed factor for a cinematic starting now (the second one in a turn plays faster, Phase 20 H). */
  paceCinematic(): number;
}

export type AnimationHandler = (e: ViewEvent, env: AnimationEnv) => Promise<void>;
type HandlerMap = { [K in ViewEvent["type"]]?: (e: Extract<ViewEvent, { type: K }>, env: AnimationEnv) => Promise<void> };

const done = Promise.resolve();

function center(r: DOMRect) {
  return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
}

const defFor = (env: AnimationEnv, id: EntityId): CardDef | undefined => {
  const defId = env.defOf(id);
  return defId ? CATALOG[defId] : undefined;
};

/** The element an entity's effects look like, with a neutral fallback. */
function elementOf(env: AnimationEnv, id: EntityId, fallback: FxElement = "arcane"): FxElement {
  return effectElement(defFor(env, id)) ?? fallback;
}

/** Particles + sound of each status when it lands (§18.5 STATUS_APPLIED, Phase 20). */
export const STATUS_FX: Record<StatusId, ParticleKind> = {
  burn: "fire",
  freeze: "ice",
  stun: "lightning",
  weakness: "shadow",
  vulnerability: "shadow",
  curse: "shadow",
  blessing: "holy",
  disarm: "debris",
  bleed: "fire",
  immune: "holy",
};

/** The glyph shown over a unit when one of its abilities fires, by trigger (§18.5 TRIGGER_ACTIVATED, Phase 20). */
export const TRIGGER_GLYPH: Record<TriggerOn, string> = {
  play: "!",
  summoned: "✦",
  death: "☠︎",
  attack: "⚔︎",
  attacked: "⚔︎",
  damageDealt: "✸",
  damageTaken: "✸",
  kill: "☠︎",
  healthThreshold: "◆",
  turnStart: "⟳",
  turnEnd: "⟳",
  healed: "✚",
  cardDrawn: "▤",
  spellCast: "✧",
  otherSummoned: "✦",
  otherDied: "☠︎",
};

const ELEMENT_SOUND: Record<FxElement, CardSound> = {
  fire: "fire",
  ice: "ice",
  arcane: "arcane",
  lightning: "lightning",
  shadow: "shadow",
  nature: "nature",
  holy: "holy",
};

/** Shake from this much combat damage on (§18.5 Phase 20: shake ∝ damage ≥ 5). */
export const SHAKE_FROM_DAMAGE = 5;

/** Quick glow on an entity (buff, keyword change). */
function glow(id: string, kind: "glow" | "buff", base: number): AnimationHandler {
  return (_e, env) => {
    const el = env.fx.el(id);
    return el ? env.fx.flash(el, kind, env.ms(base)) : done;
  };
}

/** Hides my played hand card (or fades the parked spell) without flying it — the entrance shows it in the centre. */
async function clearMyPlayedCard(iid: EntityId, env: AnimationEnv): Promise<void> {
  const { fx } = env;
  const parked = fx.query("[data-cg-parked]");
  if (parked) {
    await fx.animate(parked, [{ opacity: 0.7, scale: "1" }, { opacity: 0, scale: "1.2" }], env.ms(160), { persist: true });
    return;
  }
  const card = fx.el(iid);
  if (card && !card.classList.contains("cg-hand-card--away")) void fx.animate(card, [{ opacity: 0 }, { opacity: 0 }], 1, { persist: true });
}

/** Handlers that run before their group is applied. */
export const ANIMATIONS: HandlerMap = {
  CARD_PLAYED: async (e, env) => {
    const { fx } = env;
    const def = CATALOG[e.defId];
    const entrance = cardEntrance(def);
    const mine = e.seat === env.perspective;

    if (def && entrance !== "normal") {
      // Phase 20: heavy / Legendaria-Única entrances (the reveal happens for both seats).
      if (mine) await clearMyPlayedCard(e.iid, env);
      else if (entrance === "heavy" && !env.reducedMotion) {
        env.sound("play");
        const to = fx.anchor("center");
        const from = fx.anchor("foe-hand");
        if (to && from) await fx.flyCard(from, to, env.ms(240));
      }
      if (env.signal.aborted) return;
      const pace = entrance === "cinematic" ? env.paceCinematic() : 1;
      const timeline = entranceTimeline(entrance, { speed: env.speed * pace, reducedMotion: env.reducedMotion });
      await playEntrance(def, cardName(def.id), timeline, env);
      return;
    }

    env.sound("play");
    if (mine) {
      // A dropped spell parked at its release point fades out; a tapped card still in the hand flies to the centre.
      const parked = fx.query("[data-cg-parked]");
      if (parked) return fx.animate(parked, [{ opacity: 0.7, scale: "1" }, { opacity: 0, scale: "1.2" }], env.ms(220), { persist: true });
      const card = fx.el(e.iid);
      const to = fx.anchor("center");
      if (!card || !to || card.classList.contains("cg-hand-card--away")) return;
      const from = card.getBoundingClientRect();
      void fx.animate(card, [{ opacity: 0 }, { opacity: 0 }], 1, { persist: true });
      if (env.reducedMotion) return;
      await fx.flyCard(from, to, env.ms(260), { source: card, fadeOut: true });
      return;
    }
    const to = fx.anchor("center");
    const from = fx.anchor("foe-hand");
    if (to && from && !env.reducedMotion) await fx.flyCard(from, to, env.ms(260));
    if (env.signal.aborted) return;
    await fx.reveal(e.defId, "played", env.hold(500));
  },

  ATTACK_DECLARED: async (e, env) => {
    const { fx } = env;
    const attacker = fx.el(e.attacker);
    const target = fx.el(e.target);
    if (!attacker) return;
    if (env.reducedMotion || !target) return fx.flash(attacker, "glow", env.ms(200));
    const a = center(attacker.getBoundingClientRect());
    const b = center(target.getBoundingClientRect());
    const dx = (b.x - a.x) * 0.78;
    const dy = (b.y - a.y) * 0.78;
    const total = env.ms(350);
    void fx.animate(
      attacker,
      [
        { translate: "0px 0px" },
        { translate: `${dx}px ${dy}px`, offset: 0.5, easing: "cubic-bezier(0.5, 0, 0.2, 1)" },
        { translate: "0px 0px" },
      ],
      total,
      { raise: true, easing: "linear" },
    );
    // Phase 20: a trail in the attacker's element, then the impact (flash + shockwave) as it lands.
    fx.streak(attacker, target, effectElement(defFor(env, e.attacker)) ?? "dust", 12);
    await fx.wait(total / 2);
    if (env.signal.aborted) return;
    void fx.flash(target, "impact", env.ms(220));
    void fx.ring(target, "dust", env.ms(320));
  },

  DAMAGE: async (e, env) => {
    const { fx } = env;
    const el = fx.el(e.target);
    if (!el) return;
    if (e.blocked) {
      env.sound("blocked");
      void fx.floatNumber(el, t("fx.blocked"), "info", env.ms(900));
      if (!env.reducedMotion) void fx.ring(el, e.blocked === "divine" ? "holy" : "ice", env.ms(360));
      await fx.flash(el, "glow", env.ms(240));
      return;
    }
    if (e.dealt <= 0) return;
    // Phase 20: an effect's damage flies from its source (a unit, or the centre for a spell) in the source's element.
    if (e.kind === "effect" && !env.reducedMotion) {
      const element = elementOf(env, e.source);
      const src = fx.el(e.source);
      const from = src && src !== el ? src : src ? null : fx.anchor("center");
      if (from) {
        env.sound(ELEMENT_SOUND[element]);
        await fx.projectile(from, el, element, env.ms(260));
        if (env.signal.aborted) return;
      }
    }
    env.sound("hit");
    void fx.flash(el, "damage", env.ms(260));
    void fx.floatNumber(el, `-${e.dealt}`, "damage", env.ms(900));
    if (!env.reducedMotion && e.kind === "combat" && e.dealt >= SHAKE_FROM_DAMAGE) void fx.shake(Math.min(6, e.dealt), env.ms(300));
    if (e.target === `h${env.perspective}`) void fx.vignette(env.ms(650));
    await fx.wait(env.ms(320));
  },

  HEAL: async (e, env) => {
    const { fx } = env;
    const el = fx.el(e.target);
    if (!el) return;
    env.sound("heal");
    void fx.flash(el, "heal", env.ms(300));
    void fx.floatNumber(el, `+${e.amount}`, "heal", env.ms(900));
    if (!env.reducedMotion) {
      fx.burst(el, "heal", 22);
      if (elementOf(env, e.source, "nature") === "holy") fx.burst(el, "holy", 10);
    }
    await fx.wait(env.ms(320));
  },

  MOB_DESTROYED: async (e, env) => {
    const { fx } = env;
    const el = fx.el(e.iid);
    if (!el) return;
    if (env.reducedMotion) {
      env.sound("death");
      await fx.animate(el, [{ opacity: 1 }, { opacity: 0 }], env.ms(300), { persist: true });
      return;
    }
    // Phase 20: an explosion in the unit's element with debris and a shockwave.
    env.sound("explosion");
    fx.burst(el, effectElement(CATALOG[e.defId]) ?? "fire", 18);
    fx.burst(el, "debris", 14);
    void fx.ring(el, "damage", env.ms(380));
    await fx.animate(
      el,
      [
        { opacity: 1, scale: "1", rotate: "0deg" },
        { opacity: 1, scale: "1.12", rotate: "-3deg", offset: 0.25 },
        { opacity: 0, scale: "0.5", rotate: "6deg" },
      ],
      env.ms(320),
      { persist: true },
    );
  },

  TRIGGER_ACTIVATED: async (e, env) => {
    const { fx } = env;
    const el = fx.el(e.sourceId);
    if (!el) return;
    const on = CATALOG[e.defId]?.abilities.find((a) => a.id === e.abilityId)?.trigger.on;
    const kind: ParticleKind = effectElement(CATALOG[e.defId]) ?? "arcane";
    void fx.flash(el, "glow", env.ms(220));
    if (on) void fx.glyph(el, TRIGGER_GLYPH[on], kind, env.ms(650));
    await fx.wait(env.ms(200));
  },

  STATS_CHANGED: (e, env) => glow(e.iid, "buff", 240)(e, env),
  KEYWORDS_CHANGED: (e, env) => glow(e.iid, "buff", 200)(e, env),

  STATUS_APPLIED: async (e, env) => {
    const { fx } = env;
    const el = fx.el(e.iid);
    if (!el) return;
    const kind = STATUS_FX[e.status];
    void fx.flash(el, kind === "holy" ? "heal" : "glow", env.ms(240));
    if (!env.reducedMotion) {
      fx.burst(el, kind, 16);
      void fx.ring(el, kind, env.ms(360));
      if (kind !== "debris") env.sound(ELEMENT_SOUND[kind as FxElement]);
    }
    await fx.wait(env.ms(220));
  },

  STATUS_REMOVED: async (e, env) => {
    const el = env.fx.el(e.iid);
    if (!el) return;
    if (!env.reducedMotion) env.fx.burst(el, STATUS_FX[e.status], 6);
    await env.fx.flash(el, "glow", env.ms(160));
  },

  MOB_SILENCED: async (e, env) => {
    const el = env.fx.el(e.iid);
    if (!el) return;
    if (!env.reducedMotion) {
      env.fx.burst(el, "arcane", 10);
      void env.fx.ring(el, "arcane", env.ms(360));
    }
    await env.fx.flash(el, "glow", env.ms(260));
  },

  MOB_TRANSFORMED: async (e, env) => {
    // Evolution: the old unit flares up before it is replaced.
    const el = env.fx.el(e.iid);
    if (!el) return;
    if (!env.reducedMotion) {
      env.sound("arcane");
      env.fx.burst(el, effectElement(CATALOG[e.unit.defId]) ?? "arcane", 18);
    }
    await env.fx.flash(el, "glow", env.ms(260));
  },

  MOB_RETURNED_TO_HAND: async (e, env) => {
    const { fx } = env;
    const el = fx.el(e.iid);
    if (!el) return;
    if (!env.reducedMotion) {
      env.sound("shadow");
      fx.burst(el, "shadow", 12);
    }
    await fx.animate(el, [{ opacity: 1, scale: "1" }, { opacity: 0, scale: env.reducedMotion ? "1" : "0.5" }], env.ms(280), { persist: true });
  },

  CARD_STOLEN: async (e, env) => {
    const { fx } = env;
    const mine = e.to === env.perspective;
    const from = fx.anchor(mine ? "foe-hand" : "my-hand");
    const to = fx.anchor(mine ? "my-hand" : "foe-hand");
    if (from && to && !env.reducedMotion) {
      env.sound("shadow");
      fx.burst(from, "shadow", 12);
      await fx.flyCard(from, to, env.ms(300));
    }
    if (env.signal.aborted) return;
    await fx.reveal(e.defId, "played", env.hold(600));
  },

  CARD_BURNED: async (e, env) => {
    env.sound("burn");
    const c = env.fx.anchor("center");
    if (c && !env.reducedMotion) {
      env.sound("fire");
      env.fx.burst(c, "fire", 26);
    }
    await env.fx.reveal(e.defId, "burned", env.hold(900));
  },

  GAME_OVER: async (e, env) => {
    // Phase 20: the loser's portrait cracks and explodes, the winner's side gets confetti, then the overlay.
    const { fx } = env;
    if (e.winner !== "draw") {
      const loser = fx.el(`h${e.winner === 0 ? 1 : 0}`);
      const winner = fx.el(`h${e.winner}`);
      if (loser) {
        void fx.crack(loser, env.hold(900));
        if (!env.reducedMotion) {
          env.sound("explosion");
          fx.burst(loser, "debris", 24);
          fx.burst(loser, "fire", 18);
          void fx.shake(5, env.ms(420));
        }
      }
      if (winner && !env.reducedMotion && e.winner === env.perspective) fx.burst(winner, "confetti", 60);
    }
    // A beat so the last hit and death read before the overlay (the overlay appears when the group is applied).
    await fx.wait(env.hold(e.winner === "draw" ? 450 : 900));
  },
};

/** Handlers that run after their group is applied (the element exists only now). */
export const ENTER_ANIMATIONS: HandlerMap = {
  // After the apply, so the divider prompt, the end-turn button and the "your turn" sound change with the banner.
  TURN_STARTED: async (e, env) => {
    const mine = e.seat === env.perspective;
    if (!env.reducedMotion) void env.fx.sweep(mine ? "mine" : "foe", env.ms(700));
    await env.fx.banner(mine ? t("match.yourTurn") : t("match.foeTurn"), mine ? "mine" : "foe", env.hold(650));
  },

  MOB_SUMMONED: async (e, env) => {
    const { fx } = env;
    const el = fx.el(e.unit.iid);
    if (!el) return;
    if (env.reducedMotion) return fx.animate(el, [{ opacity: 0 }, { opacity: 1 }], env.ms(260));
    const def = CATALOG[e.unit.defId];
    if (def && !def.collectible) {
      // Tokens rise from the ground.
      fx.burst(el, "dust", 10);
      await fx.animate(
        el,
        [
          { opacity: 0, translate: "0 45%", scale: "0.9" },
          { opacity: 1, translate: "0 -6%", scale: "1", offset: 0.7 },
          { opacity: 1, translate: "0 0", scale: "1" },
        ],
        env.ms(340),
      );
      return;
    }
    if (e.cause === "reborn" || e.cause === "resurrect") fx.burst(el, e.cause === "reborn" ? "holy" : "shadow", 18);
    const heavy = e.cause === "play" && cardEntrance(def) !== "normal";
    fx.burst(el, "dust", heavy ? 24 : 14);
    if (heavy) {
      env.sound("slam");
      void fx.ring(el, "dust", env.ms(420));
      void fx.shake(3, env.ms(260));
    }
    await fx.animate(
      el,
      [
        { opacity: 0, scale: heavy ? "1.5" : "0.3" },
        { opacity: 1, scale: heavy ? "0.94" : "1.12", offset: 0.7 },
        { opacity: 1, scale: "1" },
      ],
      env.ms(320),
      { easing: heavy ? "ease-in" : undefined },
    );
  },

  MOB_TRANSFORMED: (e, env) => popIn(e.unit.iid, env),
  CONTROL_CHANGED: async (e, env) => {
    const el = env.fx.el(e.iid);
    if (el && !env.reducedMotion) env.fx.burst(el, "shadow", 12);
    await popIn(e.iid, env);
  },

  CARD_DRAWN: async (e, env) => {
    const { fx } = env;
    if ("hidden" in e) {
      const from = fx.anchor("foe-deck");
      const to = fx.anchor("foe-hand");
      if (from && to && !env.reducedMotion) await fx.flyCard(from, to, env.ms(240));
      return;
    }
    env.sound("draw");
    await slideIntoHand(fx.el(e.iid), fx.anchor("my-deck"), env);
  },

  CARD_ADDED_TO_HAND: async (e, env) => {
    if ("hidden" in e) return;
    await slideIntoHand(env.fx.el(e.iid), env.fx.anchor("center"), env);
  },
};

/** A unit that appears in a new place (transformed, changed sides). */
async function popIn(iid: string, env: AnimationEnv): Promise<void> {
  const el = env.fx.el(iid);
  if (!el) return;
  if (env.reducedMotion) return env.fx.animate(el, [{ opacity: 0 }, { opacity: 1 }], env.ms(240));
  await env.fx.animate(el, [{ opacity: 0.2, scale: "0.7" }, { opacity: 1, scale: "1" }], env.ms(280));
}

async function slideIntoHand(card: HTMLElement | null, from: DOMRect | null, env: AnimationEnv): Promise<void> {
  if (!card) return;
  if (env.reducedMotion || !from) {
    await env.fx.animate(card, [{ opacity: 0 }, { opacity: 1 }], env.ms(260));
    return;
  }
  const a = center(from);
  const b = center(card.getBoundingClientRect());
  await env.fx.animate(card, [{ translate: `${a.x - b.x}px ${a.y - b.y}px`, opacity: 0.4 }, { translate: "0px 0px", opacity: 1 }], env.ms(320));
}

/** A heavy/cinematic entrance: the rest of its group (Grito damage, summons…) waits until the card has landed. */
function isEntranceLead(e: ViewEvent): boolean {
  return e.type === "CARD_PLAYED" && cardEntrance(CATALOG[e.defId]) !== "normal";
}

/**
 * Runs the handlers of every event in the group in parallel; one failing handler never breaks the others.
 * Phase 20: a heavy/cinematic CARD_PLAYED runs first and the others start when it ends (still within the group cap).
 */
export async function runHandlers(map: HandlerMap, group: readonly ViewEvent[], env: AnimationEnv): Promise<void> {
  const lead = map === ANIMATIONS ? group.filter(isEntranceLead) : [];
  if (lead.length > 0) {
    await runParallel(map, lead, env);
    if (env.signal.aborted) return;
    await runParallel(
      map,
      group.filter((e) => !lead.includes(e)),
      env,
    );
    return;
  }
  await runParallel(map, group, env);
}

async function runParallel(map: HandlerMap, group: readonly ViewEvent[], env: AnimationEnv): Promise<void> {
  const tasks: Promise<void>[] = [];
  for (const e of group) {
    const h = map[e.type] as AnimationHandler | undefined;
    if (!h) continue;
    try {
      tasks.push(h(e, env).catch(() => {}));
    } catch {
      /* a synchronous failure counts as done */
    }
  }
  await Promise.all(tasks);
}

/** Whether any event of the group has a handler in `map` (lets the queue skip a frame wait for nothing). */
export function hasHandlers(map: HandlerMap, group: readonly ViewEvent[]): boolean {
  return group.some((e) => map[e.type] !== undefined);
}
