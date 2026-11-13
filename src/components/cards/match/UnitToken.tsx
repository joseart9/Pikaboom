// A unit on the board (§17.4): art, attack bottom-left, health bottom-right, keyword icons, Escudo charges, status
// icons with magnitudes (+ the Silencio marker), "zZz" while sleeping, green ring when it can attack (from
// `legal.attacks`), red glow when targetable, an icy rim while Congelado; Phase 20: Escudo Divino bubble, Sigilo shimmer.
// UI-08: one prioritized marker row on the top edge (at most 3 slots, the last one "+N" when more apply — the inspect
// sheet lists everything), a shield-plate frame for Provocar, a dimmed "sleeping" look with a moon badge, and
// buff/debuff chevrons next to the stat badges.
import { memo, type MouseEvent } from "react";
import { CATALOG } from "@/game/cards/catalog";
import type { UnitSnapshot } from "@/game/cards/engine/events";
import { cardName, t } from "@/game/cards/i18n";
import { AttackBadge, CardArt, HealthBadge, KeywordIcon, StatDelta, StatusIcon } from "../skin";
import { markerName, statDeltas, unitMarkers, visibleMarkers } from "@/game/cards/client/unitMarkers";

export interface UnitTokenProps {
  unit: UnitSnapshot;
  /** My unit: a drag source (attack arrow). */
  mine: boolean;
  canAttack: boolean;
  targetable: boolean;
  /** Under the targeting arrow right now. */
  hovered: boolean;
  selected: boolean;
  pending: boolean;
  /** Clickable at all (an action or a placement uses it). */
  actionable: boolean;
  onTap: (unit: UnitSnapshot, e: MouseEvent<HTMLButtonElement>) => void;
}

/** Marker slots on the token's top edge (the last becomes "+N" when more apply). */
export const MAX_UNIT_MARKERS = 3;

export const UnitToken = memo(function UnitToken({ unit, mine, canAttack, targetable, hovered, selected, pending, actionable, onTap }: UnitTokenProps) {
  const def = CATALOG[unit.defId];
  const markers = unitMarkers(unit);
  const { shown, hidden } = visibleMarkers(markers, MAX_UNIT_MARKERS);
  const delta = statDeltas(unit, def);
  const taunt = !unit.silenced && unit.keywords.taunt === true;
  const classes = ["cg-unit", mine ? "cg-unit--mine" : "cg-unit--foe"];
  if (taunt) classes.push("cg-unit--taunt");
  if (unit.silenced) classes.push("cg-unit-silenced");
  if (unit.statuses.some((st) => st.id === "freeze")) classes.push("cg-unit--frozen");
  // Phase 20: a holy bubble while Escudo Divino holds, a shimmer while hidden by Sigilo.
  if (!unit.silenced && unit.keywords.divineShield) classes.push("cg-unit--divine");
  if (!unit.silenced && unit.keywords.stealth) classes.push("cg-unit--stealth");
  if (unit.sleeping) classes.push("cg-unit--sleeping");
  if (unit.health < unit.maxHealth) classes.push("cg-unit--damaged");
  if (actionable || targetable) classes.push("cg-unit--actionable");
  if (selected) classes.push("cg-unit--selected");
  else if (targetable) classes.push("cg-unit--targetable");
  else if (canAttack) classes.push("cg-unit--can-attack");
  if (pending) classes.push("cg-unit--pending");
  if (hovered) classes.push(targetable ? "cg-unit--hover-valid" : "cg-unit--hover");
  const name = cardName(unit.defId);
  const state = unit.sleeping ? t("match.sleeping") : canAttack ? t("match.canAttack") : null;
  const label = [t("match.unitLabel", { name, attack: unit.attack, health: unit.health }), ...markers.map(markerName), ...(state ? [state] : [])].join(", ");
  return (
    <button
      type="button"
      data-cg-tap
      data-cg-drag={mine ? "unit" : undefined}
      data-cg-inspect="unit"
      data-cg-target
      data-iid={unit.iid}
      data-entity-id={unit.iid}
      className={classes.join(" ")}
      aria-label={label}
      aria-pressed={selected}
      title={`${name}${state ? ` — ${state}` : ""}`}
      onClick={(e) => onTap(unit, e)}
    >
      <span className="cg-unit-body">
        <CardArt art={def?.art ?? unit.defId} tribe={def?.type === "mob" ? def.tribes[0] : undefined} />
      </span>
      {(shown.length > 0 || hidden > 0) && (
        <span className="cg-unit-markers">
          {shown.map((m) =>
            m.kind === "keyword" ? (
              <KeywordIcon key={`k-${m.id}`} keyword={m.id} value={m.value} size="22cqh" title={markerName(m)} />
            ) : (
              <StatusIcon key={`s-${m.id}`} status={m.id} magnitude={m.magnitude} size="22cqh" title={markerName(m)} />
            ),
          )}
          {hidden > 0 && (
            <span className="cg-unit-more" title={markers.slice(shown.length).map(markerName).join(", ")}>
              +{hidden}
            </span>
          )}
        </span>
      )}
      {unit.sleeping && (
        <span className="cg-unit-sleep" aria-hidden>
          zZz
        </span>
      )}
      <span className="cg-unit-attack">
        <AttackBadge value={unit.attack} buffed={delta.attack > 0} debuffed={delta.attack < 0} size="30cqh" />
        <StatDelta delta={delta.attack} size="13cqh" />
      </span>
      <span className="cg-unit-health">
        <HealthBadge value={unit.health} max={unit.maxHealth} damaged={unit.health < unit.maxHealth} buffed={delta.health > 0} size="30cqh" />
        <StatDelta delta={delta.health} size="13cqh" />
      </span>
    </button>
  );
});
