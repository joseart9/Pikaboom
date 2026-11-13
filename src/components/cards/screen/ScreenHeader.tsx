// Shared header for every non-match screen (UI-07): a quiet back control (icon + label; the label hides on narrow
// phones but stays the accessible name), the screen title in an engraved plate with its section icon, and an end
// slot for resources/actions. One component so menu, lobby, collection, decks and store read as one game.
import Link from "next/link";
import type { ReactNode } from "react";
import { t } from "@/game/cards/i18n";
import { GameIcon, type GameIconName } from "../skin";

export type ScreenBack = { href: string; label?: string } | { onClick: () => void; label: string; disabled?: boolean };

export interface ScreenHeaderProps {
  title: string;
  icon: GameIconName;
  back: ScreenBack;
  /** Right-hand slot: balance, counters, the primary action of the screen. */
  children?: ReactNode;
}

export function ScreenHeader({ title, icon, back, children }: ScreenHeaderProps) {
  const label = back.label ?? t("match.backToMenu");
  const inner = (
    <>
      <GameIcon name="back" size="1.1em" />
      <span className="cg-screen-back-label">{label}</span>
    </>
  );
  return (
    <header className="cg-screen-header">
      {"href" in back ? (
        <Link href={back.href} className="cg-button cg-button--quiet cg-screen-back" aria-label={label}>
          {inner}
        </Link>
      ) : (
        <button type="button" className="cg-button cg-button--quiet cg-screen-back" aria-label={label} disabled={back.disabled} onClick={back.onClick}>
          {inner}
        </button>
      )}
      <h1 className="cg-screen-title">
        <span className="cg-screen-title-icon" aria-hidden>
          <GameIcon name={icon} outlined />
        </span>
        <span className="cg-screen-title-text">{title}</span>
      </h1>
      <div className="cg-screen-header-end">{children}</div>
    </header>
  );
}
