"use client";

// Dev-only local sandbox (Phase 10 G.9): both starter decks, random seed, opening hands kept automatically, both
// seats played in this browser. "Ver como" switches the viewer; "Seguir turno" follows the active seat;
// "Rival automático" (Phase 13) lets the other seat play by itself so its animations can be watched.
// "Mazo de estados" (Phase 18) / "Mazo avanzado" (Phase 19) deal both seats that deck on the next "Nueva partida".
import { useState } from "react";
import { LocalTransport, randomSeed, SANDBOX_ADVANCED_DECK, SANDBOX_STATUS_DECK } from "@/game/cards/client/localTransport";
import { MatchClient, useMatchSelector } from "@/game/cards/client/matchClient";
import type { Seat } from "@/game/cards/engine/types";
import { t } from "@/game/cards/i18n";
import { Battlefield } from "../match/MatchScreen";
import { ArtGallery } from "./ArtGallery";
import { StyleProof } from "./StyleProof";
import { UiKit } from "./UiKit";

interface SandboxSession {
  id: number;
  transport: LocalTransport;
  client: MatchClient;
}

/** Which test deck both seats get (null = the two starter decks). */
type SandboxDeck = "status" | "advanced" | null;
const SANDBOX_DECKS = { status: SANDBOX_STATUS_DECK, advanced: SANDBOX_ADVANCED_DECK };

function newSession(id: number, follow: boolean, deck: SandboxDeck = null): SandboxSession {
  const transport = new LocalTransport({
    seed: randomSeed(),
    names: [t("sandbox.player1"), t("sandbox.player2")],
    follow,
    deckLists: deck ? [SANDBOX_DECKS[deck], SANDBOX_DECKS[deck]] : undefined,
  });
  return { id, transport, client: new MatchClient(transport) };
}

export function Sandbox() {
  const [follow, setFollow] = useState(true);
  const [bot, setBot] = useState(false);
  const [deck, setDeck] = useState<SandboxDeck>(null);
  const [session, setSession] = useState<SandboxSession>(() => newSession(1, true));
  return (
    // `key` remounts the battlefield (fresh interaction state) for a new match.
    <Battlefield key={session.id} client={session.client}>
      <SandboxBar
        session={session}
        follow={follow}
        bot={bot}
        deck={deck}
        onDeck={setDeck}
        onFollow={(f) => {
          setFollow(f);
          session.transport.setFollow(f);
          if (f && bot) {
            setBot(false);
            session.transport.setBot(null);
          }
        }}
        onBot={(on) => {
          setBot(on);
          if (on) {
            setFollow(false);
            session.transport.setFollow(false);
          }
          const me = session.transport.getViewer();
          session.transport.setBot(on ? (me === 0 ? 1 : 0) : null);
        }}
        onNewMatch={() => {
          setBot(false);
          setSession(newSession(session.id + 1, follow || bot, deck));
          if (bot) setFollow(true);
        }}
      />
    </Battlefield>
  );
}

function SandboxBar({
  session,
  follow,
  bot,
  deck,
  onDeck,
  onFollow,
  onBot,
  onNewMatch,
}: {
  session: SandboxSession;
  follow: boolean;
  bot: boolean;
  deck: SandboxDeck;
  onDeck: (deck: SandboxDeck) => void;
  onFollow: (follow: boolean) => void;
  onBot: (on: boolean) => void;
  onNewMatch: () => void;
}) {
  const seat = useMatchSelector(session.client, (s) => s.view?.seat ?? 0);
  const [proof, setProof] = useState(false);
  const [kit, setKit] = useState(false);
  const [gallery, setGallery] = useState(false);
  const viewAs = (s: Seat) => {
    onFollow(false);
    session.transport.setViewer(s);
    if (bot) session.transport.setBot(s === 0 ? 1 : 0);
  };
  return (
    <>
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
        <button type="button" className={`cg-button${bot ? " cg-button--active" : ""}`} aria-pressed={bot} onClick={() => onBot(!bot)}>
          {t("sandbox.bot")}
        </button>
        {(["status", "advanced"] as const).map((d) => (
          <button key={d} type="button" className={`cg-button${deck === d ? " cg-button--active" : ""}`} aria-pressed={deck === d} onClick={() => onDeck(deck === d ? null : d)}>
            {t(d === "status" ? "sandbox.statusDeck" : "sandbox.advancedDeck")}
          </button>
        ))}
        <button type="button" className="cg-button" onClick={onNewMatch}>
          {t("sandbox.newMatch")}
        </button>
        <button type="button" className={`cg-button${proof ? " cg-button--active" : ""}`} aria-pressed={proof} onClick={() => setProof(!proof)}>
          {t("sandbox.styleProof")}
        </button>
        <button type="button" className={`cg-button${kit ? " cg-button--active" : ""}`} aria-pressed={kit} onClick={() => setKit(!kit)}>
          {t("sandbox.uiKit")}
        </button>
        <button type="button" className={`cg-button${gallery ? " cg-button--active" : ""}`} aria-pressed={gallery} onClick={() => setGallery(!gallery)}>
          {t("sandbox.artGallery")}
        </button>
      </div>
      {proof && <StyleProof onClose={() => setProof(false)} />}
      {kit && <UiKit onClose={() => setKit(false)} />}
      {gallery && <ArtGallery onClose={() => setGallery(false)} />}
    </>
  );
}
