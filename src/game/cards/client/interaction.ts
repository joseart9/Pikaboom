// Tap-mode interaction state machine (§17.7, Phase 10). Pure: given the current interaction, an input and the
// seat's legal actions, returns the next interaction and, when an action is complete, the command to send.
// Highlights are derived from this state + `legal`, so they always match what the engine accepts.
import type { GameCommand } from "../engine/commands";
import type { EntityId, LegalActions } from "../engine/types";

export type Interaction =
  | { mode: "idle" }
  | { mode: "cardSelected"; card: EntityId; position: number | null } // mob awaiting a slot
  | { mode: "awaitingTarget"; card: EntityId; position: number | null; targets: EntityId[] } // spell, or mob after its slot
  | { mode: "attackerSelected"; attacker: EntityId; targets: EntityId[] };

export type InteractionInput =
  | { t: "tapHandCard"; iid: EntityId; kind: "mob" | "spell" }
  | { t: "tapSlot"; index: number }
  | { t: "tapEntity"; id: EntityId }
  | { t: "tapCast" }
  | { t: "cancel" }
  | { t: "viewChanged"; legal: LegalActions | null };

export interface InteractionResult {
  state: Interaction;
  command?: GameCommand;
  /** A meaningful invalid tap (e.g. a non-target while choosing a target): the UI shows `errors.<hint>`. */
  hint?: "invalid_target";
}

export const IDLE: Interaction = { mode: "idle" };

const idle = (): InteractionResult => ({ state: IDLE });

/** The card currently selected from the hand, if any. */
export function selectedCard(s: Interaction): EntityId | null {
  return s.mode === "cardSelected" || s.mode === "awaitingTarget" ? s.card : null;
}

/** Entities that glow as valid targets right now. */
export function currentTargets(s: Interaction): readonly EntityId[] {
  return s.mode === "awaitingTarget" || s.mode === "attackerSelected" ? s.targets : [];
}

/** Whether "Lanzar" is offered: an untargeted spell is selected. */
export function canCast(s: Interaction): boolean {
  return s.mode === "awaitingTarget" && s.position === null && s.targets.length === 0;
}

function selectHandCard(iid: EntityId, kind: "mob" | "spell", legal: LegalActions): InteractionResult {
  const play = legal.play[iid];
  if (!play) return idle();
  if (kind === "mob") return { state: { mode: "cardSelected", card: iid, position: null } };
  return { state: { mode: "awaitingTarget", card: iid, position: null, targets: play.targets ?? [] } };
}

function playCommand(card: EntityId, position: number | null, target?: EntityId): GameCommand {
  const cmd: GameCommand = { t: "play", card };
  if (position !== null) cmd.position = position;
  if (target !== undefined) cmd.target = target;
  return cmd;
}

/** Re-validates an in-progress interaction against fresh legal actions (refreshing its target list). */
function revalidate(state: Interaction, legal: LegalActions | null): Interaction {
  if (state.mode === "idle" || !legal) return IDLE;
  if (state.mode === "attackerSelected") {
    const targets = legal.attacks[state.attacker];
    return targets && targets.length > 0 ? { ...state, targets } : IDLE;
  }
  const play = legal.play[state.card];
  if (!play) return IDLE;
  if (state.mode === "awaitingTarget") return { ...state, targets: play.targets ?? [] };
  return state;
}

export function interactionReducer(state: Interaction, input: InteractionInput, legal: LegalActions | null): InteractionResult {
  if (input.t === "viewChanged") return { state: revalidate(state, input.legal) };
  if (input.t === "cancel") return idle();
  if (!legal) return idle();

  switch (input.t) {
    case "tapHandCard": {
      if (selectedCard(state) === input.iid) return idle(); // tap the selected card again → cancel
      return selectHandCard(input.iid, input.kind, legal);
    }

    case "tapSlot": {
      if (state.mode !== "cardSelected") return { state };
      const play = legal.play[state.card];
      if (!play) return idle();
      const targets = play.targets ?? [];
      // A mob with a targeted Grito de Guerra needs a target when one exists (§6.5 rule 5); otherwise play now.
      if (targets.length > 0) return { state: { mode: "awaitingTarget", card: state.card, position: input.index, targets } };
      return { state: IDLE, command: playCommand(state.card, input.index) };
    }

    case "tapCast": {
      if (!canCast(state) || state.mode !== "awaitingTarget") return { state };
      if (!legal.play[state.card]) return idle();
      return { state: IDLE, command: playCommand(state.card, null) };
    }

    case "tapEntity": {
      const id = input.id;
      if (state.mode === "awaitingTarget") {
        if (state.targets.includes(id)) return { state: IDLE, command: playCommand(state.card, state.position, id) };
        return { state, hint: "invalid_target" };
      }
      if (state.mode === "attackerSelected") {
        if (id === state.attacker) return idle();
        if (state.targets.includes(id)) return { state: IDLE, command: { t: "attack", attacker: state.attacker, target: id } };
        const other = legal.attacks[id];
        if (other && other.length > 0) return { state: { mode: "attackerSelected", attacker: id, targets: other } };
        return { state, hint: "invalid_target" };
      }
      if (state.mode === "cardSelected") return { state }; // waiting for a slot: unit taps are handled as slots by the board
      const targets = legal.attacks[id];
      if (targets && targets.length > 0) return { state: { mode: "attackerSelected", attacker: id, targets } };
      return { state };
    }
  }
}
