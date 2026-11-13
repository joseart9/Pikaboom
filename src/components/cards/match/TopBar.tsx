"use client";

import type { MatchClient } from "@/game/cards/client/matchClient";
import type { EntityId } from "@/game/cards/engine/types";
import { t } from "@/game/cards/i18n";
import type { SideView } from "@/game/cards/server/view";
import { ConnectionBadge } from "./ConnectionBadge";
import { FoeArea } from "./FoeArea";
import { TurnTimer } from "./TurnTimer";

export interface TopBarProps {
  client: MatchClient;
  foe: SideView;
  foeActive: boolean;
  targets: readonly EntityId[];
  hoverTarget?: EntityId | null;
  menuOpen: boolean;
  onTapEntity: (id: EntityId) => void;
  onToggleMenu: () => void;
}

export function TopBar({ client, foe, foeActive, targets, hoverTarget = null, menuOpen, onTapEntity, onToggleMenu }: TopBarProps) {
  return (
    <div className="cg-topbar">
      <FoeArea foe={foe} active={foeActive} targets={targets} hoverTarget={hoverTarget} onTapEntity={onTapEntity} />
      <span className="cg-topbar-spacer" />
      <ConnectionBadge client={client} />
      <TurnTimer client={client} />
      <button
        type="button"
        data-cg-tap
        className={`cg-button${menuOpen ? " cg-button--active" : ""}`}
        aria-expanded={menuOpen}
        aria-label={t("match.menu")}
        onClick={onToggleMenu}
      >
        <svg viewBox="0 0 24 24" aria-hidden style={{ width: 22, height: 22 }}>
          <path d="M4 6 H20 M4 12 H20 M4 18 H20" stroke="currentColor" strokeWidth={3} strokeLinecap="round" />
        </svg>
      </button>
    </div>
  );
}
