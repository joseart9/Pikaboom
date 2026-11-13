// Event → animation handlers (§18.5, Phase 13 column). Each handler animates ONE event and resolves when the
// queue may move on (long tails such as a floating number keep running in the background). A handler whose
// element is missing resolves at once. Handlers never change the board: the queue applies the reducer.
//
// Registration: add `TYPE: handler` to ANIMATIONS (runs before the group is applied, on the elements as they were)
// or to ENTER_ANIMATIONS (runs after the apply, on elements that only exist then: a summoned unit, a drawn card).
import { t } from "../../i18n";
import type { Seat } from "../../engine/types";
import type { ViewEvent } from "../../server/view";
import type { CardSound } from "../sounds";
import type { FxApi } from "./fx";

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
}

export type AnimationHandler = (e: ViewEvent, env: AnimationEnv) => Promise<void>;
type HandlerMap = { [K in ViewEvent["type"]]?: (e: Extract<ViewEvent, { type: K }>, env: AnimationEnv) => Promise<void> };

const done = Promise.resolve();

function center(r: DOMRect) {
  return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
}

/** Quick glow on an entity (trigger, buff, status). */
function glow(id: string, kind: "glow" | "buff", base: number): AnimationHandler {
  return (_e, env) => {
    const el = env.fx.el(id);
    return el ? env.fx.flash(el, kind, env.ms(base)) : done;
  };
}

/** Handlers that run before their group is applied. */
export const ANIMATIONS: HandlerMap = {
  CARD_PLAYED: async (e, env) => {
    const { fx } = env;
    env.sound("play");
    if (e.seat === env.perspective) {
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
    // The damage group starts at the impact; the way back overlaps the numbers.
    await fx.wait(total / 2);
  },

  DAMAGE: async (e, env) => {
    const { fx } = env;
    const el = fx.el(e.target);
    if (!el) return;
    if (e.blocked) {
      void fx.floatNumber(el, t("fx.blocked"), "info", env.ms(900));
      await fx.flash(el, "glow", env.ms(240));
      return;
    }
    if (e.dealt <= 0) return;
    env.sound("hit");
    void fx.flash(el, "damage", env.ms(260));
    void fx.floatNumber(el, `-${e.dealt}`, "damage", env.ms(900));
    await fx.wait(env.ms(320));
  },

  HEAL: async (e, env) => {
    const { fx } = env;
    const el = fx.el(e.target);
    if (!el) return;
    env.sound("heal");
    void fx.flash(el, "heal", env.ms(300));
    void fx.floatNumber(el, `+${e.amount}`, "heal", env.ms(900));
    if (!env.reducedMotion) fx.burst(el, "heal", 14);
    await fx.wait(env.ms(320));
  },

  MOB_DESTROYED: async (e, env) => {
    const { fx } = env;
    const el = fx.el(e.iid);
    if (!el) return;
    env.sound("death");
    if (!env.reducedMotion) fx.burst(el, "dust", 18);
    await fx.animate(el, [{ opacity: 1, scale: "1" }, { opacity: 0, scale: env.reducedMotion ? "1" : "0.6" }], env.ms(300), { persist: true });
  },

  TRIGGER_ACTIVATED: (e, env) => glow(e.sourceId, "glow", 220)(e, env),
  STATS_CHANGED: (e, env) => glow(e.iid, "buff", 240)(e, env),
  KEYWORDS_CHANGED: (e, env) => glow(e.iid, "buff", 200)(e, env),
  STATUS_APPLIED: (e, env) => glow(e.iid, "glow", 220)(e, env),
  STATUS_REMOVED: (e, env) => glow(e.iid, "glow", 160)(e, env),
  MOB_SILENCED: (e, env) => glow(e.iid, "glow", 260)(e, env),
  MOB_TRANSFORMED: (e, env) => glow(e.iid, "glow", 260)(e, env),

  // Phase 19 (basic; Phase 20 owns the cinematic versions).
  MOB_RETURNED_TO_HAND: async (e, env) => {
    const { fx } = env;
    const el = fx.el(e.iid);
    if (!el) return;
    await fx.animate(el, [{ opacity: 1, scale: "1" }, { opacity: 0, scale: env.reducedMotion ? "1" : "0.5" }], env.ms(280), { persist: true });
  },

  CARD_STOLEN: async (e, env) => {
    const { fx } = env;
    const mine = e.to === env.perspective;
    const from = fx.anchor(mine ? "foe-hand" : "my-hand");
    const to = fx.anchor(mine ? "my-hand" : "foe-hand");
    if (from && to && !env.reducedMotion) await fx.flyCard(from, to, env.ms(300));
    if (env.signal.aborted) return;
    await fx.reveal(e.defId, "played", env.hold(600));
  },

  CARD_BURNED: async (e, env) => {
    env.sound("burn");
    await env.fx.reveal(e.defId, "burned", env.hold(900));
  },

  GAME_OVER: async (_e, env) => {
    // A beat so the last hit and death read before the overlay (the overlay appears when the group is applied).
    await env.fx.wait(env.hold(450));
  },
};

/** Handlers that run after their group is applied (the element exists only now). */
export const ENTER_ANIMATIONS: HandlerMap = {
  // After the apply, so the divider prompt, the end-turn button and the "your turn" sound change with the banner.
  TURN_STARTED: async (e, env) => {
    const mine = e.seat === env.perspective;
    await env.fx.banner(mine ? t("match.yourTurn") : t("match.foeTurn"), mine ? "mine" : "foe", env.hold(650));
  },

  MOB_SUMMONED: async (e, env) => {
    const { fx } = env;
    const el = fx.el(e.unit.iid);
    if (!el) return;
    if (env.reducedMotion) return fx.animate(el, [{ opacity: 0 }, { opacity: 1 }], env.ms(260));
    fx.burst(el, "dust", 12);
    await fx.animate(
      el,
      [
        { opacity: 0, scale: "0.3" },
        { opacity: 1, scale: "1.12", offset: 0.7 },
        { opacity: 1, scale: "1" },
      ],
      env.ms(320),
    );
  },

  MOB_TRANSFORMED: (e, env) => popIn(e.unit.iid, env),
  CONTROL_CHANGED: (e, env) => popIn(e.iid, env),

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

/** Runs the handlers of every event in the group in parallel; one failing handler never breaks the others. */
export async function runHandlers(map: HandlerMap, group: readonly ViewEvent[], env: AnimationEnv): Promise<void> {
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
