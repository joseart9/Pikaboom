// The opponent's strip in the top bar (§17.3): portrait + health, name + mana, hidden hand (card backs + count — the
// cards themselves are never sent to this client), deck count. UI-08: compact HUD chips, mana as a small gauge.
import type { EntityId } from "@/game/cards/engine/types";
import { t } from "@/game/cards/i18n";
import type { SideView } from "@/game/cards/server/view";
import { CardBack, ManaGauge } from "../skin";
import { HeroButton } from "./HeroButton";
import { manaLabel } from "./PlayerArea";

const MAX_BACKS = 5;

export interface FoeAreaProps {
  foe: SideView;
  active: boolean;
  targets: readonly EntityId[];
  hoverTarget?: EntityId | null;
  onTapEntity: (id: EntityId) => void;
}

export function FoeArea({ foe, active, targets, hoverTarget = null, onTapEntity }: FoeAreaProps) {
  const backs = Math.min(foe.handCount, MAX_BACKS);
  return (
    <>
      <HeroButton
        hero={foe.hero}
        name={foe.name}
        seat={foe.seat}
        mine={false}
        targetable={targets.includes(foe.hero.id)}
        hovered={hoverTarget === foe.hero.id}
        highlighted={active}
        size="calc(max(12dvh, 48px) - 8px)"
        onTap={onTapEntity}
      />
      <span className="cg-foe-id">
        <span className="cg-foe-name">{foe.name}</span>
        <ManaGauge current={foe.mana.current} max={foe.mana.max} temporary={foe.mana.temporary} pips={false} label={manaLabel(foe.mana)} />
      </span>
      <span className="cg-hud-chip" data-cg-anchor="foe-hand" role="img" title={t("match.handCount", { n: foe.handCount })} aria-label={t("match.handCount", { n: foe.handCount })}>
        <span className="cg-hud-backs" aria-hidden>
          {Array.from({ length: backs }, (_, i) => (
            <CardBack key={i} height="var(--cg-chip-card)" />
          ))}
        </span>
        {foe.handCount}
      </span>
      <span className="cg-hud-chip" data-cg-anchor="foe-deck" role="img" title={t("match.deckCount", { n: foe.deckCount })} aria-label={t("match.deckCount", { n: foe.deckCount })}>
        <CardBack height="var(--cg-chip-card)" />
        {foe.deckCount}
      </span>
    </>
  );
}
