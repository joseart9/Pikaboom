// The opponent's strip in the top bar (§17.3): portrait + health, mana, hand as card backs with a count, deck count.
import type { EntityId } from "@/game/cards/engine/types";
import { t } from "@/game/cards/i18n";
import type { SideView } from "@/game/cards/server/view";
import { CardBack, ManaCrystals } from "../skin";
import { HeroButton } from "./HeroButton";

const MAX_BACKS = 10;

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
      <span className="cg-counter" style={{ color: "var(--cg-text)" }}>
        {foe.name}
      </span>
      <ManaCrystals
        current={foe.mana.current}
        max={foe.mana.max}
        temporary={foe.mana.temporary}
        size="clamp(10px, 2.6dvh, 16px)"
        label={t("match.mana", { current: foe.mana.current, max: foe.mana.max })}
      />
      <span className="cg-counter" data-cg-anchor="foe-hand" title={t("match.handCount", { n: foe.handCount })} aria-label={t("match.handCount", { n: foe.handCount })}>
        <span style={{ display: "inline-flex" }} aria-hidden>
          {Array.from({ length: backs }, (_, i) => (
            <span key={i} style={{ marginLeft: i === 0 ? 0 : "calc(clamp(18px, 6dvh, 34px) * -0.55)" }}>
              <CardBack height="clamp(18px, 6dvh, 34px)" />
            </span>
          ))}
        </span>
        {foe.handCount}
      </span>
      <span className="cg-counter" data-cg-anchor="foe-deck" title={t("match.deckCount", { n: foe.deckCount })} aria-label={t("match.deckCount", { n: foe.deckCount })}>
        <CardBack height="clamp(16px, 5dvh, 28px)" />
        {foe.deckCount}
      </span>
    </>
  );
}
