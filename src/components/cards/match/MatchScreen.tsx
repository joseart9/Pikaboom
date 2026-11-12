"use client";

// Battlefield screen (§17.4): wires the MatchClient store to the layout and owns the tap-mode interaction (§17.7).
// `MatchScreen` = a real match over HTTP; `Battlefield` takes any MatchClient (the dev sandbox passes a local one).
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState, type MouseEvent, type ReactNode } from "react";
import { gameOutcome, onlyEndTurnLeft } from "@/game/cards/client/boardModel";
import { HttpTransport } from "@/game/cards/client/httpTransport";
import { canCast, currentTargets, IDLE, interactionReducer, selectedCard, type Interaction, type InteractionInput } from "@/game/cards/client/interaction";
import { MatchClient, useMatchSelector } from "@/game/cards/client/matchClient";
import { CATALOG } from "@/game/cards/catalog";
import type { EntityId, LegalActions } from "@/game/cards/engine/types";
import { t } from "@/game/cards/i18n";
import type { ClientCommand } from "@/game/cards/server/commands";
import type { HandCardView } from "@/game/cards/server/view";
import { keepAwake } from "@/game/wakeLock";
import { BoardBackdrop, type EndTurnState } from "../skin";
import { Board } from "./Board";
import { GameOverOverlay } from "./GameOverOverlay";
import { MatchSounds } from "./MatchSounds";
import { MulliganOverlay } from "./MulliganOverlay";
import { PlayerArea } from "./PlayerArea";
import { Toasts } from "./Toasts";
import { TopBar } from "./TopBar";
import { TurnBanner } from "./TurnBanner";

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

export function Battlefield({ client, children }: { client: MatchClient; children?: ReactNode }) {
  const board = useMatchSelector(client, (s) => s.board);
  const status = useMatchSelector(client, (s) => s.view?.status ?? null);
  const pending = useMatchSelector(client, (s) => s.pending);
  const fatal = useMatchSelector(client, (s) => s.fatal);
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
      if (client.getSnapshot().pending && input.t !== "cancel") return; // one command at a time (§17.6)
      const r = interactionReducer(interaction, input, legal);
      if (r.hint) client.showError(t(`errors.${r.hint}`));
      setIx({ state: r.state, legal });
      if (r.command) void client.send(r.command);
    },
    [client, interaction, legal],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") dispatch({ t: "cancel" });
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [dispatch]);

  const onTapHandCard = useCallback(
    (card: HandCardView) => dispatch({ t: "tapHandCard", iid: card.iid, kind: CATALOG[card.defId]?.type === "spell" ? "spell" : "mob" }),
    [dispatch],
  );
  const onTapEntity = useCallback((id: EntityId) => dispatch({ t: "tapEntity", id }), [dispatch]);
  const onTapSlot = useCallback((index: number) => dispatch({ t: "tapSlot", index }), [dispatch]);

  const onRootClick = (e: MouseEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest("[data-cg-tap]")) return;
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
  const endTurnState: EndTurnState = pending
    ? "pending"
    : !board.isMyTurn || !legal?.endTurn
      ? "foe"
      : onlyEndTurnLeft(legal)
        ? "readyIdle"
        : "ready";

  let prompt: ReactNode;
  if (interaction.mode === "cardSelected") prompt = t("match.choosePosition");
  else if (interaction.mode === "attackerSelected") prompt = t("match.chooseAttackTarget");
  else if (interaction.mode === "awaitingTarget") prompt = canCast(interaction) ? t("match.castPrompt") : t("match.chooseTarget");
  else if (board.phase === "playing") prompt = board.isMyTurn ? t("match.yourTurn") : t("match.foeTurn");
  else prompt = t("match.turnNumber", { n: board.turn });

  return (
    <div className="cg-battlefield" onClick={onRootClick}>
      <BoardBackdrop />
      <TopBar
        client={client}
        foe={board.foe}
        foeActive={board.phase === "playing" && !board.isMyTurn}
        targets={targets}
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
        onTapUnit={onTapEntity}
        onTapSlot={onTapSlot}
      />
      <div className="cg-divider">
        <span className={board.isMyTurn ? "cg-divider-text--mine" : "cg-divider-text--foe"}>{prompt}</span>
        <TurnBanner turn={board.turn} mine={board.isMyTurn} phase={board.phase} />
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
        endTurnState={endTurnState}
        onTapEntity={onTapEntity}
        onTapHandCard={onTapHandCard}
        onEndTurn={() => {
          dispatch({ t: "cancel" });
          void client.send({ t: "endTurn" });
        }}
      />

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

      {over && <GameOverOverlay outcome={over.outcome} reason={over.reason} />}

      <Toasts client={client} />
      <MatchSounds client={client} />
      {children}
    </div>
  );
}
