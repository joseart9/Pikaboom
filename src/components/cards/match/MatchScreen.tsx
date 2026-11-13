"use client";

// Battlefield screen (§17.4): wires the MatchClient store to the layout and owns the interaction (§17.7): tap mode
// (Phase 10) plus drag mode, arrow, inspect and keyboard controls (Phase 12), all feeding the same reducer.
// Phase 13: `board` is the presentation model; while events animate, game input is locked (legal = null) and any
// tap skips the current animation; inspect keeps working.
// `MatchScreen` = a real match over HTTP; `Battlefield` takes any MatchClient (the dev sandbox passes a local one).
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore, type MouseEvent, type ReactNode } from "react";
import { isReducedMotion, osReducedMotion, reducedMotionToggle, setReducedMotionToggle, subscribeReducedMotion } from "@/game/cards/client/animation/motion";
import { gameOutcome, onlyEndTurnLeft } from "@/game/cards/client/boardModel";
import { decideAimRelease, decideAttackDrop, decideCardDrop, type DragHost, type DragState, type InspectTarget } from "@/game/cards/client/drag";
import { HttpTransport } from "@/game/cards/client/httpTransport";
import { canCast, currentTargets, IDLE, interactionReducer, selectedCard, type Interaction, type InteractionInput } from "@/game/cards/client/interaction";
import { MatchClient, useMatchSelector } from "@/game/cards/client/matchClient";
import { CATALOG } from "@/game/cards/catalog";
import type { CardDef } from "@/game/cards/catalog/types";
import type { GameCommand } from "@/game/cards/engine/commands";
import type { UnitSnapshot } from "@/game/cards/engine/events";
import type { EntityId, LegalActions } from "@/game/cards/engine/types";
import { t } from "@/game/cards/i18n";
import type { ClientCommand } from "@/game/cards/server/commands";
import type { HandCardView } from "@/game/cards/server/view";
import { keepAwake } from "@/game/wakeLock";
import { haptic } from "@/lib/haptic";
import { CardInspect } from "../card/CardInspect";
import { BoardBackdrop, type EndTurnState } from "../skin";
import { Board, type BoardGhost } from "./Board";
import { animateBackToHand, DragLayer } from "./DragLayer";
import { FxLayer } from "./FxLayer";
import { GameOverOverlay } from "./GameOverOverlay";
import { MatchSounds } from "./MatchSounds";
import { MulliganOverlay } from "./MulliganOverlay";
import { PlayerArea } from "./PlayerArea";
import { TargetArrow } from "./TargetArrow";
import { Toasts } from "./Toasts";
import { TopBar } from "./TopBar";
import { useCardDrag } from "./useCardDrag";

export function MatchScreen({ matchId }: { matchId: string }) {
  const [client] = useState(() => new MatchClient(new HttpTransport(matchId)));
  const status = useMatchSelector(client, (s) => s.view?.status ?? null);
  const router = useRouter();
  // A match that has not started yet lives on the lobby screen (resume links, stale tabs).
  useEffect(() => {
    if (status === "lobby") router.replace("/cards/play");
  }, [status, router]);
  return <Battlefield client={client} />;
}

function pendingEntity(cmd: ClientCommand | undefined): { card: EntityId | null; unit: EntityId | null } {
  if (cmd?.t === "play") return { card: cmd.card, unit: null };
  if (cmd?.t === "attack") return { card: null, unit: cmd.attacker };
  return { card: null, unit: null };
}

const HAPTIC_PICKUP = 15;
const HAPTIC_DROP = 30;
const HAPTIC_INVALID = [40, 30, 40];

type Point = { x: number; y: number };
type Parked = Point & { iid: EntityId };

/**
 * Where a hand card is while it is "out of the hand" (§17.7 server confirmation): following the pointer, as a ghost
 * unit at its board slot (mob waiting for a target or for the server), or parked where it was released (spell).
 * `away` is the hand card hidden meanwhile; when it stops being away and is still in the hand, it animates back.
 */
function outOfHand(
  hand: readonly HandCardView[],
  interaction: Interaction,
  pending: ClientCommand | undefined,
  parked: Parked | null,
  drag: DragState,
): { ghost: BoardGhost | null; parked: Parked | null; away: EntityId | null } {
  const inHand = (iid: EntityId) => hand.find((c) => c.iid === iid);
  let ghost: BoardGhost | null = null;
  let ghostIid: EntityId | null = null;
  const placed =
    interaction.mode === "awaitingTarget" && interaction.position !== null
      ? { iid: interaction.card, index: interaction.position }
      : pending?.t === "play" && pending.position !== undefined
        ? { iid: pending.card, index: pending.position }
        : null;
  const placedCard = placed ? inHand(placed.iid) : undefined;
  if (placed && placedCard && CATALOG[placedCard.defId]?.type === "mob") {
    ghost = { defId: placedCard.defId, index: placed.index };
    ghostIid = placed.iid;
  }

  const parkedFor =
    (pending?.t === "play" ? pending.card : null) ??
    (interaction.mode === "awaitingTarget" && interaction.position === null ? interaction.card : null);
  const shownParked = parked && parked.iid === parkedFor && parked.iid !== ghostIid && inHand(parked.iid) ? parked : null;
  const dragIid = drag.kind === "draggingCard" ? drag.iid : null;
  return { ghost, parked: shownParked, away: dragIid ?? ghostIid ?? shownParked?.iid ?? null };
}

/** Reduced-motion state for the menu toggle: [effective, forced by the OS]. */
function useReducedMotion(): { reduced: boolean; forcedByOs: boolean } {
  const reduced = useSyncExternalStore(subscribeReducedMotion, isReducedMotion, () => false);
  const forcedByOs = useSyncExternalStore(subscribeReducedMotion, osReducedMotion, () => false);
  return { reduced, forcedByOs };
}

export function Battlefield({ client, children }: { client: MatchClient; children?: ReactNode }) {
  const board = useMatchSelector(client, (s) => s.board);
  const status = useMatchSelector(client, (s) => s.view?.status ?? null);
  const pending = useMatchSelector(client, (s) => s.pending);
  const animating = useMatchSelector(client, (s) => s.animating);
  const settling = useMatchSelector(client, (s) => s.settling);
  const motion = useReducedMotion();
  const fatal = useMatchSelector(client, (s) => s.fatal);
  const rewards = useMatchSelector(client, (s) => s.view?.rewards ?? null);
  const legal = board?.legal ?? null;
  const over = board && status ? gameOutcome(status, board.winner, board.mySeat, board.endReason) : null;

  // Interaction state, re-validated whenever `legal` changes (§21 Phase 10 H: "view arrives while a card is
  // selected"). Adjusting state during render is React's pattern for state derived from props/store values.
  const [ix, setIx] = useState<{ state: Interaction; legal: LegalActions | null }>({ state: IDLE, legal });
  let interaction = ix.state;
  if (ix.legal !== legal) {
    interaction = interactionReducer(ix.state, { t: "viewChanged", legal }, legal).state;
    setIx({ state: interaction, legal });
  }
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirmConcede, setConfirmConcede] = useState(false);
  const [parked, setParked] = useState<Parked | null>(null);
  const [inspect, setInspect] = useState<InspectTarget | null>(null);
  const [kbGap, setKbGap] = useState<{ card: EntityId; index: number } | null>(null);
  const dropPoints = useRef(new Map<EntityId, Point>());
  const rootEl = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    client.start();
    keepAwake(true);
    return () => {
      keepAwake(false);
      client.stop();
    };
  }, [client]);

  const dispatch = useCallback(
    (input: InteractionInput) => {
      // While events animate, a tap skips the current animation instead of acting (§18.3).
      if (client.getSnapshot().animating && input.t !== "cancel") {
        client.skipAnimations();
        return;
      }
      if (client.getSnapshot().pending && input.t !== "cancel") return; // one command at a time (§17.6)
      const r = interactionReducer(interaction, input, legal);
      if (r.hint) client.showError(t(`errors.${r.hint}`));
      setIx({ state: r.state, legal });
      if (r.command) void client.send(r.command);
    },
    [client, interaction, legal],
  );

  // ── Drag mode (§17.7, Phase 12). Every host callback runs on a discrete pointer event, never per move. ──
  const hand = board?.me.hand;
  const setInteraction = (state: Interaction) => setIx({ state, legal });
  const sendFromDrag = (command: GameCommand) => {
    setInteraction(IDLE);
    if (client.getSnapshot().pending) {
      haptic(HAPTIC_INVALID);
      return;
    }
    haptic(HAPTIC_DROP);
    void client.send(command);
  };
  const cancelFromDrag = (invalid: boolean) => {
    if (invalid) haptic(HAPTIC_INVALID);
    setInteraction(IDLE);
  };
  const host: DragHost = {
    dragKind: (source) => {
      if (!legal || client.getSnapshot().pending || over) return null;
      if (source.type === "unit") return legal.attacks[source.iid]?.length ? "attack" : null;
      const card = legal.play[source.iid] ? hand?.find((c) => c.iid === source.iid) : undefined;
      if (!card) return null;
      return CATALOG[card.defId]?.type === "spell" ? "spell" : "mob";
    },
    onDenied: (source) => {
      if (source.type === "hand") haptic(HAPTIC_INVALID);
    },
    onCardDragStart: () => {
      haptic(HAPTIC_PICKUP);
      setInteraction(IDLE);
    },
    onCardDrop: (drop) => {
      dropPoints.current.set(drop.iid, { x: drop.x, y: drop.y });
      const decision = decideCardDrop(drop, legal);
      if (decision.t === "cancel") return cancelFromDrag(decision.invalid);
      if (drop.kind === "spell") setParked({ iid: drop.iid, x: drop.x, y: drop.y });
      if (decision.t === "aim") {
        haptic(HAPTIC_DROP);
        setInteraction(decision.interaction);
        return;
      }
      sendFromDrag(decision.command);
    },
    onCardCancel: (iid, x, y) => {
      dropPoints.current.set(iid, { x, y });
    },
    onAttackStart: (attacker) => {
      haptic(HAPTIC_PICKUP);
      setInteraction(interactionReducer(IDLE, { t: "tapEntity", id: attacker }, legal).state);
    },
    onAttackDrop: (attacker, target) => {
      const decision = decideAttackDrop(attacker, target, legal);
      if (decision.t === "command") sendFromDrag(decision.command);
      else cancelFromDrag(decision.t === "cancel" && decision.invalid);
    },
    onAimRelease: (target) => {
      const decision = decideAimRelease(interaction, target, legal);
      if (decision.t === "command") sendFromDrag(decision.command);
      else cancelFromDrag(decision.t === "cancel" && decision.invalid);
    },
    onAimCancel: () => setInteraction(IDLE),
    onInspect: (target) => setInspect(target),
  };
  const { controller, drag, rootRef } = useCardDrag(host);
  const setRoot = useCallback(
    (el: HTMLDivElement | null) => {
      rootEl.current = el;
      const detach = rootRef(el);
      return () => {
        rootEl.current = null;
        detach?.();
      };
    },
    [rootRef],
  );

  // Arrow mode follows the interaction: a dropped targeted card, a dragged or tapped attacker, a tapped spell.
  useEffect(() => {
    if (interaction.mode === "attackerSelected") controller.setAim({ kind: "attack", iid: interaction.attacker, targets: interaction.targets });
    else if (interaction.mode === "awaitingTarget" && interaction.targets.length > 0)
      controller.setAim({ kind: "card", iid: interaction.card, position: interaction.position, targets: interaction.targets });
    else controller.setAim(null);
  }, [controller, interaction]);

  // A view arriving mid-drag (e.g. a turn timeout) cancels the drag if the card/attacker is no longer legal.
  useEffect(() => controller.revalidate(), [controller, legal]);

  // My own command stays "pending" for the hand card until its result has animated (no flicker back into the hand).
  const out = outOfHand(hand ?? [], interaction, pending?.command ?? settling ?? undefined, parked, drag);
  const away = out.away;

  // A card that comes back to the hand (cancelled drag, rejected/failed command, cancelled arrow) slides back from
  // where it was released (240 ms, §17.7).
  const prevAway = useRef<EntityId | null>(null);
  useLayoutEffect(() => {
    const prev = prevAway.current;
    prevAway.current = away;
    if (!prev || prev === away) return;
    const from = dropPoints.current.get(prev);
    dropPoints.current.delete(prev);
    const el = from ? rootEl.current?.querySelector<HTMLElement>(`[data-cg-drag="hand"][data-iid="${CSS.escape(prev)}"]`) : null;
    if (el && from) animateBackToHand(el, from);
  }, [away]);

  // Inspect (long-press / right-click / "i"), resolved against the current board: it closes itself if the card left.
  let inspected: { def: CardDef; cost?: number; unit?: UnitSnapshot } | null = null;
  if (inspect && board) {
    if (inspect.kind === "hand") {
      const c = board.me.hand.find((h) => h.iid === inspect.iid);
      const def = c ? CATALOG[c.defId] : undefined;
      if (c && def) inspected = { def, cost: c.cost };
    } else {
      const u = board.me.board.find((x) => x.iid === inspect.iid) ?? board.foe.board.find((x) => x.iid === inspect.iid);
      const def = u ? CATALOG[u.defId] : undefined;
      if (u && def) inspected = { def, unit: u };
    }
  }
  const inspectOpen = inspected !== null;

  const endTurn = useCallback(() => {
    dispatch({ t: "cancel" });
    void client.send({ t: "endTurn" });
  }, [client, dispatch]);

  // Keyboard (§17.7): Tab/Enter through the native buttons; arrows move the placement gap; Enter places; Esc
  // cancels; E ends the turn; I inspects the focused or hovered card.
  const myUnits = board?.me.board;
  const canEndTurn = !!legal?.endTurn && !over;
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey) return;
      const target = e.target instanceof HTMLElement ? e.target : null;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable)) return;
      if (inspectOpen) {
        if (e.key === "Escape") {
          e.preventDefault();
          setInspect(null);
        }
        return;
      }
      const unitCount = myUnits?.length ?? 0;
      const gapFor = (card: EntityId) => Math.min(unitCount, kbGap?.card === card ? kbGap.index : unitCount);
      switch (e.key) {
        case "Escape":
          if (controller.active()) controller.cancel();
          else dispatch({ t: "cancel" });
          setMenuOpen(false);
          return;
        case "ArrowLeft":
        case "ArrowRight": {
          if (interaction.mode !== "cardSelected") return;
          e.preventDefault();
          const next = gapFor(interaction.card) + (e.key === "ArrowLeft" ? -1 : 1);
          setKbGap({ card: interaction.card, index: Math.max(0, Math.min(unitCount, next)) });
          return;
        }
        case "Enter": {
          if (interaction.mode !== "cardSelected") return;
          // Another focused control (Cancelar, a different hand card…) keeps its own Enter.
          const focused = document.activeElement;
          const focusedIid = focused instanceof HTMLElement ? (focused.closest("[data-iid]")?.getAttribute("data-iid") ?? null) : null;
          const placesHere =
            !focused ||
            focused === document.body ||
            focused === rootEl.current ||
            focusedIid === interaction.card ||
            (focusedIid !== null && !!myUnits?.some((u) => u.iid === focusedIid));
          if (!placesHere) return;
          e.preventDefault();
          dispatch({ t: "tapSlot", index: gapFor(interaction.card) });
          return;
        }
        case "e":
        case "E":
          if (!canEndTurn || client.getSnapshot().pending) return;
          e.preventDefault();
          endTurn();
          return;
        case "i":
        case "I": {
          const el = document.activeElement?.closest("[data-cg-inspect]") ?? rootEl.current?.querySelector("[data-cg-inspect]:hover") ?? null;
          const kind = el?.getAttribute("data-cg-inspect");
          const iid = el?.getAttribute("data-iid");
          if (!iid || (kind !== "hand" && kind !== "unit")) return;
          e.preventDefault();
          setInspect({ kind, iid });
          return;
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [canEndTurn, client, controller, dispatch, endTurn, inspectOpen, interaction, kbGap, myUnits]);

  const onTapHandCard = useCallback(
    (card: HandCardView) => dispatch({ t: "tapHandCard", iid: card.iid, kind: CATALOG[card.defId]?.type === "spell" ? "spell" : "mob" }),
    [dispatch],
  );
  const onTapEntity = useCallback((id: EntityId) => dispatch({ t: "tapEntity", id }), [dispatch]);
  const onTapSlot = useCallback((index: number) => dispatch({ t: "tapSlot", index }), [dispatch]);

  const onRootClick = (e: MouseEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest("[data-cg-tap]")) return;
    if (animating) client.skipAnimations();
    if (interaction.mode !== "idle") dispatch({ t: "cancel" });
    if (menuOpen) setMenuOpen(false);
  };

  if (fatal) {
    return (
      <div className="cg-center-message">
        <p>{fatal}</p>
        <Link href="/cards" className="cg-button cg-button--primary">
          {t("match.backToMenu")}
        </Link>
      </div>
    );
  }
  if (!board) {
    return (
      <div className="cg-center-message">
        <p>{status === "lobby" ? t("match.notStarted") : status === "cancelled" ? t("lobby.cancelled") : t("match.loading")}</p>
        {status !== null && (
          <Link href="/cards" className="cg-button">
            {t("match.backToMenu")}
          </Link>
        )}
      </div>
    );
  }

  const targets = currentTargets(interaction);
  const selected = selectedCard(interaction);
  const pend = pendingEntity(pending?.command);
  const finished = over !== null;
  const endTurnState: EndTurnState =
    pending || (animating && board.isMyTurn)
    ? "pending"
    : !board.isMyTurn || !legal?.endTurn
      ? "foe"
      : onlyEndTurnLeft(legal)
        ? "readyIdle"
        : "ready";

  // Drag / arrow presentation.
  const aiming = drag.kind === "aimingCard" || drag.kind === "aimingAttack" ? drag : null;
  const arrowVisible = !!aiming?.tracking && !inspectOpen;
  const hoverTarget = aiming?.tracking ? aiming.hover : null;
  let arrowSource: string | null = null;
  if (drag.kind === "aimingAttack") arrowSource = `[data-cg-drag="unit"][data-iid="${CSS.escape(drag.attacker)}"]`;
  else if (drag.kind === "aimingCard")
    arrowSource = out.ghost ? "[data-cg-ghost]" : out.parked ? "[data-cg-parked]" : `[data-cg-drag="hand"][data-iid="${CSS.escape(drag.iid)}"]`;
  const draggedCard = drag.kind === "draggingCard" ? board.me.hand.find((c) => c.iid === drag.iid) : undefined;
  const draggedIsMob = !!draggedCard && CATALOG[draggedCard.defId]?.type === "mob";
  const dropGap = drag.kind === "draggingCard" && draggedIsMob ? drag.gapIndex : null;
  const keyboardGap = interaction.mode === "cardSelected" && kbGap?.card === interaction.card ? Math.min(kbGap.index, board.me.board.length) : null;
  const parkedCard = out.parked ? board.me.hand.find((c) => c.iid === out.parked?.iid) : undefined;

  let prompt: ReactNode;
  if (interaction.mode === "cardSelected") prompt = t("match.choosePosition");
  else if (interaction.mode === "attackerSelected") prompt = t("match.chooseAttackTarget");
  else if (interaction.mode === "awaitingTarget") prompt = canCast(interaction) ? t("match.castPrompt") : t("match.chooseTarget");
  else if (board.phase === "playing") prompt = board.isMyTurn ? t("match.yourTurn") : t("match.foeTurn");
  else prompt = t("match.turnNumber", { n: board.turn });

  return (
    <div
      ref={setRoot}
      className={`cg-battlefield${motion.reduced ? " cg-battlefield--reduced" : ""}${animating ? " cg-battlefield--animating" : ""}`}
      onClick={onRootClick}
    >
      <BoardBackdrop />
      <TopBar
        client={client}
        foe={board.foe}
        foeActive={board.phase === "playing" && !board.isMyTurn}
        targets={targets}
        hoverTarget={hoverTarget}
        menuOpen={menuOpen}
        onTapEntity={onTapEntity}
        onToggleMenu={() => {
          setMenuOpen((o) => !o);
          setConfirmConcede(false);
        }}
      />
      <Board
        units={board.foe.board}
        mine={false}
        legal={legal}
        targets={targets}
        selectedUnit={null}
        pendingUnit={null}
        placing={false}
        hoverTarget={hoverTarget}
        onTapUnit={onTapEntity}
        onTapSlot={onTapSlot}
      />
      <div className="cg-divider">
        <span className={board.isMyTurn ? "cg-divider-text--mine" : "cg-divider-text--foe"}>{prompt}</span>
        {canCast(interaction) && (
          <button type="button" data-cg-tap className="cg-button cg-button--primary" onClick={() => dispatch({ t: "tapCast" })}>
            {t("match.cast")}
          </button>
        )}
        {interaction.mode !== "idle" && (
          <button type="button" data-cg-tap className="cg-button" onClick={() => dispatch({ t: "cancel" })}>
            {t("match.cancel")}
          </button>
        )}
      </div>
      <Board
        units={board.me.board}
        mine
        legal={legal}
        targets={targets}
        selectedUnit={interaction.mode === "attackerSelected" ? interaction.attacker : null}
        pendingUnit={pend.unit}
        placing={interaction.mode === "cardSelected"}
        activeGap={dropGap ?? keyboardGap}
        ghost={out.ghost}
        hoverTarget={hoverTarget}
        onTapUnit={onTapEntity}
        onTapSlot={onTapSlot}
      />
      <PlayerArea
        me={board.me}
        active={board.isMyTurn}
        legal={legal}
        targets={targets}
        selectedCard={selected}
        pendingCard={pend.card}
        awayCard={away}
        previewEnabled={drag.kind !== "draggingCard" && !arrowVisible && !inspectOpen}
        hoverTarget={hoverTarget}
        endTurnState={endTurnState}
        onTapEntity={onTapEntity}
        onTapHandCard={onTapHandCard}
        onEndTurn={endTurn}
      />

      <FxLayer client={client} />

      {menuOpen && (
        <div className="cg-menu" data-cg-tap>
          {!confirmConcede ? (
            <button type="button" className="cg-button cg-button--danger" disabled={finished} onClick={() => setConfirmConcede(true)}>
              {t("match.concede")}
            </button>
          ) : (
            <>
              <span className="cg-menu-title">{t("match.confirmConcede")}</span>
              <button
                type="button"
                className="cg-button cg-button--danger"
                onClick={() => {
                  setMenuOpen(false);
                  setConfirmConcede(false);
                  void client.send({ t: "concede" });
                }}
              >
                {t("match.confirmYes")}
              </button>
              <button type="button" className="cg-button" onClick={() => setConfirmConcede(false)}>
                {t("match.confirmNo")}
              </button>
            </>
          )}
          <button
            type="button"
            className={`cg-button${motion.reduced ? " cg-button--active" : ""}`}
            aria-pressed={motion.reduced}
            disabled={motion.forcedByOs}
            onClick={() => setReducedMotionToggle(!reducedMotionToggle())}
          >
            {motion.forcedByOs ? t("match.reducedMotionSystem") : motion.reduced ? t("match.reducedMotionOn") : t("match.reducedMotionOff")}
          </button>
          <Link href="/cards" className="cg-button">
            {t("match.backToMenu")}
          </Link>
        </div>
      )}

      {board.phase === "mulligan" && !over && (
        <MulliganOverlay
          client={client}
          me={board.me}
          iGoFirst={board.firstSeat === board.mySeat}
          canMulligan={!!legal?.mulligan}
          pending={!!pending}
        />
      )}

      {over && <GameOverOverlay outcome={over.outcome} reason={over.reason} rewards={rewards} />}

      <DragLayer
        controller={controller}
        dragging={draggedCard && drag.kind === "draggingCard" ? { card: draggedCard, valid: drag.valid, overBoard: drag.zone === "board" && draggedIsMob } : null}
        parked={out.parked && parkedCard ? { card: parkedCard, x: out.parked.x, y: out.parked.y } : null}
      />
      <TargetArrow controller={controller} source={arrowSource} visible={arrowVisible} valid={hoverTarget !== null && targets.includes(hoverTarget)} />

      {inspected && (
        <CardInspect
          def={inspected.def}
          overrides={inspected.unit ? { attack: inspected.unit.attack, health: inspected.unit.health, maxHealth: inspected.unit.maxHealth } : { cost: inspected.cost }}
          unit={inspected.unit ?? null}
          turn={{ number: board.turn, activeSeat: board.activeSeat }}
          onClose={() => setInspect(null)}
        />
      )}

      <Toasts client={client} />
      <MatchSounds client={client} />
      {children}
    </div>
  );
}
