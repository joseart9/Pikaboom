"use client";

// Sounds + haptics for match moments (Phase 11 G.7): your turn starts, a rejection/hint, the game ends.
// The state the screen opened with is never announced (a refresh must not replay a fanfare). Phase 16: a coin when
// the match reward arrives, after the outcome fanfare.
import { useEffect, useRef } from "react";
import { gameOutcome } from "@/game/cards/client/boardModel";
import { useMatchSelector, type MatchClient } from "@/game/cards/client/matchClient";
import { restoreSoundSetting } from "@/game/cards/client/settings";
import { armAudioUnlock, playCardSound } from "@/game/cards/client/sounds";

export function MatchSounds({ client }: { client: MatchClient }) {
  const turn = useMatchSelector(client, (s) => s.board?.turn ?? null);
  const myTurn = useMatchSelector(client, (s) => s.board?.isMyTurn ?? false);
  const errorId = useMatchSelector(client, (s) => (s.error && s.error.tone !== "info" ? s.error.id : null));
  const outcome = useMatchSelector(client, (s) =>
    s.view ? (gameOutcome(s.view.status, s.board?.winner ?? null, s.view.seat, s.board?.endReason ?? null)?.outcome ?? null) : null,
  );
  const paid = useMatchSelector(client, (s) => (s.view ? (s.view.rewards?.amount ?? 0) > 0 : null));
  const prev = useRef<{ turn: number | null; errorId: number | null; outcome: string | null } | null>(null);
  const prevPaid = useRef<boolean | null>(null);

  useEffect(() => {
    restoreSoundSetting(); // the "Sonido: no" choice survives a reload (Phase 20)
    armAudioUnlock();
  }, []);

  useEffect(() => {
    const p = prev.current;
    prev.current = { turn, errorId, outcome };
    if (!p) return;
    if (errorId !== null && errorId !== p.errorId) playCardSound("error");
    if (p.turn === null) return; // the first loaded state: no announcements
    if (turn !== null && turn !== p.turn && myTurn) playCardSound("myTurn");
    if (outcome && outcome !== p.outcome && outcome !== "abandoned") playCardSound(outcome);
  }, [turn, myTurn, errorId, outcome]);

  useEffect(() => {
    const was = prevPaid.current;
    prevPaid.current = paid;
    if (was !== false || paid !== true) return; // nothing loaded before (a refresh), or no new payment
    const timer = setTimeout(() => playCardSound("coin"), 900);
    return () => clearTimeout(timer);
  }, [paid]);

  return null;
}
