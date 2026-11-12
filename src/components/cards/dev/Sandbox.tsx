"use client";

// Dev-only local sandbox (Phase 10 G.9): both starter decks, random seed, opening hands kept automatically, both
// seats played in this browser. "Ver como" switches the viewer; "Seguir turno" follows the active seat.
import { useState } from "react";
import { LocalTransport, randomSeed } from "@/game/cards/client/localTransport";
import { MatchClient, useMatchSelector } from "@/game/cards/client/matchClient";
import type { Seat } from "@/game/cards/engine/types";
import { t } from "@/game/cards/i18n";
import { Battlefield } from "../match/MatchScreen";

interface SandboxSession {
  id: number;
  transport: LocalTransport;
  client: MatchClient;
}

function newSession(id: number, follow: boolean): SandboxSession {
  const transport = new LocalTransport({ seed: randomSeed(), names: [t("sandbox.player1"), t("sandbox.player2")], follow });
  return { id, transport, client: new MatchClient(transport) };
}

export function Sandbox() {
  const [follow, setFollow] = useState(true);
  const [session, setSession] = useState<SandboxSession>(() => newSession(1, true));
  return (
    // `key` remounts the battlefield (fresh interaction state) for a new match.
    <Battlefield key={session.id} client={session.client}>
      <SandboxBar
        session={session}
        follow={follow}
        onFollow={(f) => {
          setFollow(f);
          session.transport.setFollow(f);
        }}
        onNewMatch={() => setSession(newSession(session.id + 1, follow))}
      />
    </Battlefield>
  );
}

function SandboxBar({
  session,
  follow,
  onFollow,
  onNewMatch,
}: {
  session: SandboxSession;
  follow: boolean;
  onFollow: (follow: boolean) => void;
  onNewMatch: () => void;
}) {
  const seat = useMatchSelector(session.client, (s) => s.view?.seat ?? 0);
  const viewAs = (s: Seat) => {
    onFollow(false);
    session.transport.setViewer(s);
  };
  return (
    <div className="cg-sandbox-bar" data-cg-tap>
      <span>{t("sandbox.viewAs")}</span>
      <button type="button" className={`cg-button${seat === 0 ? " cg-button--active" : ""}`} onClick={() => viewAs(0)}>
        {t("sandbox.player1")}
      </button>
      <button type="button" className={`cg-button${seat === 1 ? " cg-button--active" : ""}`} onClick={() => viewAs(1)}>
        {t("sandbox.player2")}
      </button>
      <button type="button" className={`cg-button${follow ? " cg-button--active" : ""}`} aria-pressed={follow} onClick={() => onFollow(!follow)}>
        {t("sandbox.follow")}
      </button>
      <button type="button" className="cg-button" onClick={onNewMatch}>
        {t("sandbox.newMatch")}
      </button>
    </div>
  );
}
