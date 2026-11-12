"use client";

import { useMatchSelector, type MatchClient } from "@/game/cards/client/matchClient";
import { t } from "@/game/cards/i18n";

/** Connection state (§13.5): hidden while online; "Conectando…" / "Reconectando…" otherwise. */
export function ConnectionBadge({ client }: { client: MatchClient }) {
  const status = useMatchSelector(client, (s) => s.status);
  const foeOnline = useMatchSelector(client, (s) => s.foeOnline);
  const hasGame = useMatchSelector(client, (s) => s.view?.status === "active");
  if (status === "online") {
    if (!hasGame || foeOnline) return null;
    return (
      <span className="cg-badge-conn cg-badge-conn--reconnecting">
        <span className="cg-badge-conn-dot" />
        {t("match.foeDisconnected")}
      </span>
    );
  }
  return (
    <span className={`cg-badge-conn cg-badge-conn--${status}`} role="status">
      <span className="cg-badge-conn-dot" />
      {t(status === "connecting" ? "match.connecting" : "match.reconnecting")}
    </span>
  );
}
