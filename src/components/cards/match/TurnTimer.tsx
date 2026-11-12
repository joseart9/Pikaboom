"use client";

// Turn countdown from `turnDeadline` + the server clock offset (§17.6). Owns its own tick, so only it re-renders.
// From `turn.warningSeconds` (15 s) left it pulses red and, while you can act, ticks once per second (Phase 11 G.7).
import { useEffect, useState } from "react";
import { useMatchSelector, type MatchClient } from "@/game/cards/client/matchClient";
import { playCardSound } from "@/game/cards/client/sounds";
import { STANDARD_RULES } from "@/game/cards/config/rules";
import { t } from "@/game/cards/i18n";

const WARNING_MS = STANDARD_RULES.turn.warningSeconds * 1000;

export function TurnTimer({ client, silent = false }: { client: MatchClient; silent?: boolean }) {
  const deadline = useMatchSelector(client, (s) => s.view?.turnDeadline ?? null);
  const offset = useMatchSelector(client, (s) => s.clockOffsetMs);
  const canAct = useMatchSelector(client, (s) => s.view?.status === "active" && s.view.game?.legal != null);
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    if (!deadline) return;
    const tick = () => setNow(Date.now());
    const id = setInterval(tick, 250);
    const first = setTimeout(tick, 0);
    return () => {
      clearInterval(id);
      clearTimeout(first);
    };
  }, [deadline]);

  const left = deadline && now !== null ? Math.max(0, Date.parse(deadline) - (now + offset)) : null;
  const secs = left === null ? null : Math.ceil(left / 1000);
  const warning = left !== null && left <= WARNING_MS;

  useEffect(() => {
    if (!silent && warning && canAct && secs !== null && secs > 0) playCardSound("tick");
  }, [silent, warning, canAct, secs]);

  if (left === null || secs === null) return null;
  const text = `${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, "0")}`;
  return (
    <span
      className={`cg-timer${warning ? " cg-timer--warning" : ""}`}
      role="timer"
      title={warning ? t("match.timeWarning") : t("match.timeLeft")}
      aria-label={`${warning ? t("match.timeWarning") : t("match.timeLeft")}: ${text}`}
    >
      {text}
    </span>
  );
}
