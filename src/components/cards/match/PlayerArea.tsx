// The bottom strip (§17.3): my portrait + mana (left), my hand (centre), deck count + end-turn button (right).
import type { EntityId, LegalActions } from "@/game/cards/engine/types";
import { t } from "@/game/cards/i18n";
import type { HandCardView, MeView } from "@/game/cards/server/view";
import { CardBack, EndTurnButton, ManaCrystals, type EndTurnState } from "../skin";
import { Hand } from "./Hand";
import { HeroButton } from "./HeroButton";

export interface PlayerAreaProps {
  me: MeView;
  active: boolean;
  legal: LegalActions | null;
  targets: readonly EntityId[];
  selectedCard: EntityId | null;
  pendingCard: EntityId | null;
  endTurnState: EndTurnState;
  onTapEntity: (id: EntityId) => void;
  onTapHandCard: (card: HandCardView) => void;
  onEndTurn: () => void;
}

const END_TURN_LABEL: Record<EndTurnState, () => string> = {
  ready: () => t("match.endTurn"),
  readyIdle: () => t("match.endTurn"),
  foe: () => t("match.foeTurnButton"),
  pending: () => t("match.pendingButton"),
};

export function PlayerArea(p: PlayerAreaProps) {
  const { me } = p;
  return (
    <div className="cg-bottom">
      <div className="cg-bottom-left">
        <HeroButton
          hero={me.hero}
          name={me.name}
          seat={me.seat}
          mine
          targetable={p.targets.includes(me.hero.id)}
          highlighted={p.active}
          size="var(--cg-portrait)"
          onTap={p.onTapEntity}
        />
        <ManaCrystals
          current={me.mana.current}
          max={me.mana.max}
          temporary={me.mana.temporary}
          size="clamp(10px, 2.8dvh, 18px)"
          compact
          label={t("match.mana", { current: me.mana.current, max: me.mana.max })}
        />
      </div>
      <Hand cards={me.hand} legal={p.legal} selected={p.selectedCard} pending={p.pendingCard} onTap={p.onTapHandCard} />
      <div className="cg-bottom-right">
        <span className="cg-counter" title={t("match.deckCount", { n: me.deckCount })} aria-label={t("match.deckCount", { n: me.deckCount })}>
          <CardBack height="clamp(16px, 5dvh, 28px)" />
          {me.deckCount}
        </span>
        <EndTurnButton state={p.endTurnState} label={END_TURN_LABEL[p.endTurnState]()} onPress={p.onEndTurn} />
      </div>
    </div>
  );
}
