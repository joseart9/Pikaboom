import type { HeroView } from "@/game/cards/server/view";
import { t } from "@/game/cards/i18n";
import { HealthBadge, HeroPortrait } from "../skin";

export interface HeroButtonProps {
  hero: HeroView;
  name: string;
  seat: 0 | 1;
  mine: boolean;
  targetable: boolean;
  /** Under the targeting arrow right now. */
  hovered?: boolean;
  highlighted: boolean;
  size: string;
  onTap: (id: string) => void;
}

/** A hero portrait with its health, tappable as a target. */
export function HeroButton({ hero, name, seat, mine, targetable, hovered = false, highlighted, size, onTap }: HeroButtonProps) {
  return (
    <button
      type="button"
      data-cg-tap
      data-cg-target
      data-iid={hero.id}
      data-entity-id={hero.id}
      className={`cg-hero-button${targetable ? " cg-hero-button--targetable" : ""}${hovered ? (targetable ? " cg-hero-button--hover-valid" : " cg-hero-button--hover") : ""}`}
      aria-label={t("match.heroHealth", { name, n: hero.health })}
      onClick={() => onTap(hero.id)}
    >
      <HeroPortrait name={name} seat={seat} mine={mine} highlighted={highlighted} targetable={targetable} size={size}>
        <span className="cg-hero-health">
          <HealthBadge value={hero.health} max={hero.maxHealth} damaged={hero.health < hero.maxHealth} size={`calc(${size} * 0.46)`} />
        </span>
      </HeroPortrait>
    </button>
  );
}
