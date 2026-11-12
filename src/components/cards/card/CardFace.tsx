// A full card (hand / inspect size) rendered from its CardDef plus live overrides. Sizes itself to its parent box
// (container query units), so the same component works in the hand, a modal or the collection.
import { memo } from "react";
import type { CardDef } from "@/game/cards/catalog/types";
import { cardName, cardText, t } from "@/game/cards/i18n";
import { AttackBadge, CardArt, CardFrame, CostBadge, HealthBadge, RarityGem, TribeLabel, type CardFrameState } from "../skin";
import { CardText } from "./CardText";

export interface CardOverrides {
  cost?: number;
  attack?: number;
  health?: number;
  maxHealth?: number;
}

export interface CardFaceProps {
  def: CardDef;
  overrides?: CardOverrides;
  state?: CardFrameState;
}

function sign(a: number, b: number): -1 | 0 | 1 {
  return a < b ? -1 : a > b ? 1 : 0;
}

export const CardFace = memo(function CardFace({ def, overrides = {}, state = "normal" }: CardFaceProps) {
  const cost = overrides.cost ?? def.cost;
  const isMob = def.type === "mob";
  const attack = isMob ? (overrides.attack ?? def.attack) : 0;
  const health = isMob ? (overrides.health ?? def.health) : 0;
  const maxHealth = isMob ? (overrides.maxHealth ?? def.health) : 0;
  const tribe = isMob ? def.tribes[0] : undefined;
  return (
    <div className="cg-card">
      <CardFrame type={def.type} rarity={def.rarity} state={state}>
        <div className="cg-card-art">
          <CardArt art={def.art} tribe={tribe} spell={!isMob} />
        </div>
        <div className="cg-card-gem">
          <RarityGem rarity={def.rarity} size="7cqh" title={t(`rarity.${def.rarity}`)} />
        </div>
        <div className="cg-card-name">{cardName(def.id)}</div>
        <div className="cg-card-text">
          <CardText text={cardText(def.id)} />
        </div>
        {isMob && def.tribes.length > 0 && (
          <div className="cg-card-tribe">
            <TribeLabel label={def.tribes.map((tr) => t(`tribe.${tr}`)).join(" · ")} />
          </div>
        )}
      </CardFrame>
      <div className="cg-card-cost">
        <CostBadge value={cost} modified={sign(cost, def.cost)} size="17cqh" />
      </div>
      {isMob && (
        <>
          <div className="cg-card-attack">
            <AttackBadge value={attack} buffed={attack > def.attack} debuffed={attack < def.attack} size="17cqh" />
          </div>
          <div className="cg-card-health">
            <HealthBadge value={health} max={maxHealth} damaged={health < maxHealth} size="17cqh" />
          </div>
        </>
      )}
    </div>
  );
});
