// The bottom strip (§17.3): my portrait (left), my hand (centre), deck count + end-turn button. My mana bar
// (`ManaBar`, full height on the right edge) is rendered by the battlefield next to the card log.
import type { EntityId, LegalActions } from "@/game/cards/engine/types";
import { t } from "@/game/cards/i18n";
import type { HandCardView, MeView, SideView } from "@/game/cards/server/view";
import { CardBack, EndTurnButton, type EndTurnState } from "../skin";
import { Hand } from "./Hand";
import { HeroButton } from "./HeroButton";

export interface PlayerAreaProps {
  me: MeView;
  active: boolean;
  legal: LegalActions | null;
  targets: readonly EntityId[];
  selectedCard: EntityId | null;
  pendingCard: EntityId | null;
  /** The hand card currently out of the hand (dragged / parked / ghost). */
  awayCard: EntityId | null;
  previewEnabled: boolean;
  hoverTarget: EntityId | null;
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

/** Spoken/tooltip mana text, naming temporary mana when there is some. */
export function manaLabel(mana: SideView["mana"]): string {
  const base = t("match.mana", { current: mana.current, max: mana.max });
  return mana.temporary > 0 ? `${base} ${t("match.manaTemporary", { n: mana.temporary })}` : base;
}

export function PlayerArea(p: PlayerAreaProps) {
  const { me } = p;
  return (
    <div className="cg-bottom" data-cg-zone="hand">
      <div className="cg-bottom-left">
        <HeroButton
          hero={me.hero}
          name={me.name}
          seat={me.seat}
          mine
          targetable={p.targets.includes(me.hero.id)}
          hovered={p.hoverTarget === me.hero.id}
          highlighted={p.active}
          size="var(--cg-portrait)"
          onTap={p.onTapEntity}
        />
      </div>
      <Hand
        cards={me.hand}
        legal={p.legal}
        selected={p.selectedCard}
        pending={p.pendingCard}
        away={p.awayCard}
        previewEnabled={p.previewEnabled}
        onTap={p.onTapHandCard}
      />
      <div className="cg-bottom-right">
        <span className="cg-hud-chip" data-cg-anchor="my-deck" role="img" title={t("match.deckCount", { n: me.deckCount })} aria-label={t("match.deckCount", { n: me.deckCount })}>
          <CardBack height="var(--cg-chip-card)" />
          {me.deckCount}
        </span>
        <EndTurnButton state={p.endTurnState} label={END_TURN_LABEL[p.endTurnState]()} onPress={p.onEndTurn} />
      </div>
    </div>
  );
}
