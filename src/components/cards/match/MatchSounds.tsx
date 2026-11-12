"use client";

// Sounds + haptics for match moments (Phase 11 G.7): your turn starts, a rejection/hint, the game ends.
// The state the screen opened with is never announced (a refresh must not replay a fanfare).
import { useEffect, useRef } from "react";
import { gameOutcome } from "@/game/cards/client/boardModel";
import { useMatchSelector, type MatchClient } from "@/game/cards/client/matchClient";
import { armAudioUnlock, playCardSound } from "@/game/cards/client/sounds";

export function MatchSounds({ client }: { client: MatchClient }) {
  const turn = useMatchSelector(client, (s) => s.board?.turn ?? null);
  const myTurn = useMatchSelector(client, (s) => s.board?.isMyTurn ?? false);
  const errorId = useMatchSelector(client, (s) => (s.error && s.error.tone !== "info" ? s.error.id : null));
  const outcome = useMatchSelector(client, (s) =>
    s.view ? (gameOutcome(s.view.status, s.board?.winner ?? null, s.view.seat, s.board?.endReason ?? null)?.outcome ?? null) : null,
  );
  const prev = useRef<{ turn: number | null; errorId: number | null; outcome: string | null } | null>(null);

  useEffect(() => armAudioUnlock(), []);

  useEffect(() => {
    const p = prev.current;
    prev.current = { turn, errorId, outcome };
    if (!p) return;
    if (errorId !== null && errorId !== p.errorId) playCardSound("error");
    if (p.turn === null) return; // the first loaded state: no announcements
    if (turn !== null && turn !== p.turn && myTurn) playCardSound("myTurn");
    if (outcome && outcome !== p.outcome && outcome !== "abandoned") playCardSound(outcome);
  }, [turn, myTurn, errorId, outcome]);

  return null;
}
