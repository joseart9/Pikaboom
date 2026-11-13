"use client";

// Lobby screen (/cards/play, §13.7, Phase 11 G.2–G.5). Stages:
//   loading  → resuming your open match (GET current) or joining the `?sala=` code
//   home     → "Crear partida" or join with a typed code
//   conflict → the code belongs to another lobby but you already have an open match (409 already_in_match)
//   room     → a lobby driven by the same MatchClient/HttpTransport as the battlefield; when it becomes `active`
//              the screen moves to /cards/match/[id].
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { commandRequest, createMatch, currentMatch, joinMatch, type ApiError } from "@/game/cards/client/api";
import { HttpTransport } from "@/game/cards/client/httpTransport";
import { MatchClient, useMatchSelector, type ToastMessage } from "@/game/cards/client/matchClient";
import { armAudioUnlock, playCardSound } from "@/game/cards/client/sounds";
import type { Seat } from "@/game/cards/engine/types";
import { t } from "@/game/cards/i18n";
import { CODE_LENGTH, normalizeCode } from "@/game/cards/server/lobbyCode";
import type { LobbySeatView, MatchView } from "@/game/cards/server/view";
import { ConnectionBadge } from "../match/ConnectionBadge";
import { Toasts, ToastView } from "../match/Toasts";
import { DeckPicker } from "./DeckPicker";
import { InviteShare } from "./InviteShare";

type Stage =
  | { k: "loading"; text: string }
  | { k: "home" }
  | { k: "conflict"; matchId: string; code: string }
  | { k: "room"; id: number; client: MatchClient };

const loginUrl = (next: string) => `/auth/login?next=${encodeURIComponent(next)}`;

export function LobbyScreen({ initialCode }: { initialCode: string | null }) {
  const router = useRouter();
  const [stage, setStage] = useState<Stage>({ k: "loading", text: t(initialCode ? "lobby.joining" : "lobby.loading") });
  const [code, setCode] = useState(initialCode ?? "");
  const [toast, setToast] = useState<ToastMessage | null>(null);
  const toastSeq = useRef(0);
  const roomSeq = useRef(0);
  const started = useRef(false);

  const notify = (text: string, tone?: "info") => {
    toastSeq.current += 1;
    setToast({ id: toastSeq.current, text, tone });
  };

  /** Shared handling of a failed lobby call. */
  const fail = (r: ApiError, next: string) => {
    if (r.status === 401) {
      router.replace(loginUrl(next));
      return;
    }
    setStage({ k: "home" });
    notify(r.error || t("match.noConnection"));
  };

  const openView = (view: MatchView) => {
    if (view.status !== "lobby") {
      router.replace(`/cards/match/${view.matchId}`);
      return;
    }
    const client = new MatchClient(new HttpTransport(view.matchId));
    client.prime(view);
    roomSeq.current += 1;
    setStage({ k: "room", id: roomSeq.current, client });
  };

  const openMatchId = (matchId: string) => {
    // The room shows a lobby, or forwards an active/finished match to the battlefield on its first poll.
    roomSeq.current += 1;
    setStage({ k: "room", id: roomSeq.current, client: new MatchClient(new HttpTransport(matchId)) });
  };

  const onCurrent = (r: Awaited<ReturnType<typeof currentMatch>>) => {
    if (!r.ok) return fail(r, "/cards/play");
    if (r.matchId) openMatchId(r.matchId);
    else setStage({ k: "home" });
  };
  const resume = () => currentMatch().then(onCurrent);

  const join = async (raw: string) => {
    const c = normalizeCode(raw);
    if (c.length !== CODE_LENGTH) {
      notify(t("matchErrors.not_found"));
      return;
    }
    setStage({ k: "loading", text: t("lobby.joining") });
    await joinValid(c);
  };

  /** Joins a normalized 6-char code (no synchronous state change, so the mount effect may call it). */
  const joinValid = async (c: string) => {
    const r = await joinMatch(c);
    if (r.ok) return openView(r.view);
    if (r.code === "own_lobby") return resume(); // the host opened their own invite
    if (r.code === "already_in_match" && r.matchId) return setStage({ k: "conflict", matchId: r.matchId, code: c });
    setCode(c);
    fail(r, `/cards/play?sala=${c}`);
  };

  const create = async () => {
    setStage({ k: "loading", text: t("lobby.creating") });
    const r = await createMatch();
    if (r.ok) openView(r.view);
    else fail(r, "/cards/play");
  };

  const leaveOtherAndJoin = async (matchId: string, c: string) => {
    setStage({ k: "loading", text: t("lobby.joining") });
    const r = await commandRequest(matchId, { t: "lobby.leave" });
    if (r.ok || r.code === "game_over") return join(c);
    if (r.code === "wrong_phase") return openMatchId(matchId); // that match already started: go play it
    fail(r, `/cards/play?sala=${c}`);
  };

  useEffect(() => {
    armAudioUnlock();
    if (started.current) return; // StrictMode re-runs effects; joining/creating twice is harmless but noisy
    started.current = true;
    if (initialCode) {
      // Drop `?sala=` from the address bar: a refresh resumes through GET current instead of re-joining.
      window.history.replaceState(null, "", "/cards/play");
      void joinValid(initialCode);
    } else {
      void currentMatch().then(onCurrent);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- runs once on mount
  }, []);

  let body;
  if (stage.k === "loading") {
    body = <div className="cg-center-message">{stage.text}</div>;
  } else if (stage.k === "home") {
    body = (
      <LobbyHome
        code={code}
        onCode={setCode}
        onCreate={() => void create()}
        onJoin={() => void join(code)}
      />
    );
  } else if (stage.k === "conflict") {
    body = (
      <div className="cg-center-message cg-lobby-conflict">
        <p>{t("lobby.otherMatch")}</p>
        <p className="cg-lobby-help">{t("lobby.otherMatchHelp")}</p>
        <div className="cg-lobby-row">
          <button type="button" className="cg-button cg-button--primary" onClick={() => openMatchId(stage.matchId)}>
            {t("lobby.goToOther")}
          </button>
          <button type="button" className="cg-button" onClick={() => void leaveOtherAndJoin(stage.matchId, stage.code)}>
            {t("lobby.leaveOtherAndJoin")}
          </button>
        </div>
        <Link href="/cards" className="cg-button">
          {t("match.backToMenu")}
        </Link>
      </div>
    );
  } else {
    body = (
      <LobbyRoom
        key={stage.id}
        client={stage.client}
        onClosed={(message) => {
          setStage({ k: "home" });
          if (message) notify(message);
        }}
      />
    );
  }

  return (
    <div className="cg-lobby-screen">
      {body}
      <ToastView message={toast} />
    </div>
  );
}

function LobbyHome({ code, onCode, onCreate, onJoin }: { code: string; onCode: (c: string) => void; onCreate: () => void; onJoin: () => void }) {
  return (
    <div className="cg-lobby-home">
      <header className="cg-lobby-header">
        <Link href="/cards" className="cg-button">
          {t("match.backToMenu")}
        </Link>
        <h1 className="cg-lobby-title">{t("lobby.title")}</h1>
        <span />
      </header>
      <div className="cg-lobby-columns">
        <section className="cg-panel">
          <p className="cg-lobby-help">{t("lobby.createHelp")}</p>
          <button type="button" className="cg-button cg-button--primary cg-button--big" data-haptic="medium" onClick={onCreate}>
            {t("lobby.create")}
          </button>
        </section>
        <form
          className="cg-panel"
          onSubmit={(e) => {
            e.preventDefault();
            onJoin();
          }}
        >
          <h2 className="cg-panel-title">{t("lobby.joinTitle")}</h2>
          <label className="cg-lobby-help" htmlFor="cg-join-code">
            {t("lobby.joinHelp")}
          </label>
          <div className="cg-lobby-row">
            <input
              id="cg-join-code"
              className="cg-code-input"
              value={code}
              onChange={(e) => onCode(normalizeCode(e.target.value).slice(0, CODE_LENGTH))}
              inputMode="text"
              autoCapitalize="characters"
              autoComplete="off"
              autoCorrect="off"
              spellCheck={false}
              maxLength={CODE_LENGTH + 4}
              aria-label={t("lobby.codeLabel")}
              placeholder="ABC234"
            />
            <button type="submit" className="cg-button cg-button--primary" disabled={code.length !== CODE_LENGTH}>
              {t("lobby.join")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function SeatRow({ seat, view, mine }: { seat: Seat; view: LobbySeatView | null; mine: boolean }) {
  return (
    <li className="cg-seat">
      <span className={`cg-seat-dot${view?.online ? " cg-seat-dot--on" : ""}`} title={view?.online ? t("lobby.online") : t("lobby.offline")} />
      <span className="cg-seat-who">
        <span className="cg-seat-role">
          {t(seat === 0 ? "lobby.host" : "lobby.guest")} {mine && t("lobby.you")}
        </span>
        <span className="cg-seat-name">{view ? view.name : t("lobby.waitingGuest")}</span>
      </span>
      {view && (
        <span className="cg-seat-chips">
          <span className={`cg-chip${view.deckChosen ? " cg-chip--ok" : ""}`}>{view.deckChosen ? `✓ ${t("lobby.deckChosen")}` : t("lobby.noDeck")}</span>
          <span className={`cg-chip${view.ready ? " cg-chip--ok" : ""}`}>{view.ready ? `✓ ${t("lobby.isReady")}` : t("lobby.notReadyYet")}</span>
        </span>
      )}
    </li>
  );
}

function LobbyRoom({ client, onClosed }: { client: MatchClient; onClosed: (message?: string) => void }) {
  const router = useRouter();
  const view = useMatchSelector(client, (s) => s.view);
  const pending = useMatchSelector(client, (s) => s.pending !== null);
  const fatal = useMatchSelector(client, (s) => s.fatal);
  const status = view?.status ?? null;
  const hasGuest = !!view?.lobby?.guest;
  const matchId = view?.matchId ?? null;
  const hadGuest = useRef<boolean | null>(null);
  // Leaving, a cancelled lobby, a 403 and the match start can race; whichever comes first wins, once.
  const done = useRef(false);
  const sawLobby = useRef(false);
  const onClosedRef = useRef(onClosed);
  useEffect(() => {
    onClosedRef.current = onClosed;
  });

  useEffect(() => {
    client.start();
    return () => client.stop();
  }, [client]);

  useEffect(() => {
    if (done.current || !matchId) return;
    if (status === "lobby") sawLobby.current = true;
    if (status === "active" || status === "finished" || status === "abandoned") {
      done.current = true;
      if (status === "active" && sawLobby.current) playCardSound("matchStart");
      router.replace(`/cards/match/${matchId}`);
    } else if (status === "cancelled") {
      done.current = true;
      onClosedRef.current(t("lobby.cancelled"));
    }
  }, [status, matchId, router]);

  useEffect(() => {
    if (fatal && !done.current) {
      done.current = true;
      onClosedRef.current(fatal);
    }
  }, [fatal]);

  useEffect(() => {
    if (hadGuest.current === false && hasGuest) playCardSound("foeJoined");
    if (view) hadGuest.current = hasGuest;
  }, [hasGuest, view]);

  const lobby = view?.lobby;
  if (!view || !lobby) {
    return <div className="cg-center-message">{status && status !== "lobby" ? t("match.loading") : t("lobby.loading")}</div>;
  }

  const me = view.seat === 0 ? lobby.host : lobby.guest;
  const lastError = lobby.lastError ?? null;
  const ready = !!me?.ready;

  const leave = async () => {
    if (done.current) return;
    done.current = true;
    const ok = await client.send({ t: "lobby.leave" });
    if (ok) onClosed();
    else done.current = false;
  };

  return (
    <div className="cg-lobby-room">
      <header className="cg-lobby-header">
        <button type="button" className="cg-button" disabled={pending} onClick={() => void leave()}>
          {t("lobby.leave")}
        </button>
        <h1 className="cg-lobby-title">{t("lobby.title")}</h1>
        <ConnectionBadge client={client} />
      </header>
      <div className="cg-lobby-columns">
        <section className="cg-panel cg-panel--invite">
          <InviteShare code={lobby.code} onNotice={(text, tone) => (tone === "info" ? client.showInfo(text) : client.showError(text))} />
        </section>
        <section className="cg-panel cg-panel--setup">
          <ul className="cg-seats">
            <SeatRow seat={0} view={lobby.host} mine={view.seat === 0} />
            <SeatRow seat={1} view={lobby.guest} mine={view.seat === 1} />
          </ul>
          <h2 className="cg-panel-title">{t("lobby.chooseDeck")}</h2>
          {lastError && (
            <p className="cg-lobby-error" role="alert">
              {lastError.seat === view.seat ? t("lobby.deckGone") : t("lobby.foeDeckGone")}
            </p>
          )}
          <DeckPicker
            key={lastError ? `gone-${lastError.seat}` : "decks"}
            selected={lobby.myDeck}
            disabled={pending}
            onSelect={(id) => void client.send({ t: "lobby.selectDeck", deck: { kind: "saved", id } })}
          />
          <div className="cg-lobby-ready">
            <button
              type="button"
              className={`cg-button cg-button--big${ready ? "" : " cg-button--primary"}`}
              data-haptic="medium"
              disabled={pending || !lobby.myDeck}
              aria-pressed={ready}
              onClick={() => void client.send({ t: "lobby.ready", ready: !ready })}
            >
              {ready ? t("lobby.unready") : t("lobby.ready")}
            </button>
            <span className="cg-lobby-help">{lobby.myDeck ? t("lobby.waitingBoth") : t("lobby.pickDeckFirst")}</span>
          </div>
        </section>
      </div>
      <Toasts client={client} />
    </div>
  );
}
