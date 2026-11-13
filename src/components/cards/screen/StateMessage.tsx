// Loading / error / empty states for the non-match screens (UI-07): an icon medallion, one line of copy and an
// optional action — the same look everywhere instead of bare centred text.
import type { ReactNode } from "react";
import { GameIcon, type GameIconName } from "../skin";

export interface StateMessageProps {
  kind: "loading" | "error" | "empty";
  text: string;
  /** Overrides the default icon (loading: hourglass, error: warning, empty: sparkle). */
  icon?: GameIconName;
  /** Retry button, link to another screen… */
  action?: ReactNode;
  /** Grow to fill the screen body (full-page loading/error) instead of sitting inline. */
  fill?: boolean;
}

const ICON: Record<StateMessageProps["kind"], GameIconName> = { loading: "hourglass", error: "warning", empty: "sparkle" };

export function StateMessage({ kind, text, icon, action, fill = false }: StateMessageProps) {
  return (
    <div className={`cg-state cg-state--${kind}${fill ? " cg-state--fill" : ""}`} role={kind === "error" ? "alert" : "status"}>
      <span className="cg-state-icon" aria-hidden>
        <GameIcon name={icon ?? ICON[kind]} />
      </span>
      <p className="cg-state-text">{text}</p>
      {action}
    </div>
  );
}
