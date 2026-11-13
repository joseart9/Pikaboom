// A unit on the board (§17.4): art, attack bottom-left, health bottom-right, keyword icons, Escudo charges, status
// icons with magnitudes (+ the Silencio marker), "zZz" while sleeping, green ring when it can attack (from
// `legal.attacks`), red glow when targetable, an icy rim while Congelado; Phase 20: Escudo Divino bubble, Sigilo shimmer.
import { memo, type MouseEvent } from "react";
import { CATALOG } from "@/game/cards/catalog";
import { KEYWORDS } from "@/game/cards/catalog/keywords";
import { STATUS_DEFS } from "@/game/cards/catalog/statuses";
import type { KeywordId, StatusId } from "@/game/cards/catalog/types";
import type { UnitSnapshot } from "@/game/cards/engine/events";
import { cardName, t } from "@/game/cards/i18n";
import { AttackBadge, CardArt, HealthBadge, KeywordIcon, StatusIcon } from "../skin";

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

const MAX_ICONS = 4;

function keywordIcons(unit: UnitSnapshot): { id: KeywordId; value?: number }[] {
  if (unit.silenced) return [];
  const out: { id: KeywordId; value?: number }[] = [];
  for (const meta of Object.values(KEYWORDS).sort((a, b) => a.order - b.order)) {
    const v = unit.keywords[meta.id];
    if (v === undefined || meta.id === "taunt") continue; // Provocar is shown by the frame
    if (meta.id === "shield") {
      if (unit.shieldCharges > 0) out.push({ id: "shield", value: unit.shieldCharges });
      continue;
    }
    out.push({ id: meta.id, value: typeof v === "number" ? v : undefined });
  }
  return out.slice(0, MAX_ICONS);
}

const MAX_STATUS_ICONS = 4;

function statusIcons(unit: UnitSnapshot): { id: StatusId | "silenced"; magnitude?: number }[] {
  const out: { id: StatusId | "silenced"; magnitude?: number }[] = [];
  if (unit.silenced) out.push({ id: "silenced" });
  for (const st of unit.statuses) out.push({ id: st.id, magnitude: STATUS_DEFS[st.id].hasMagnitude ? st.magnitude : undefined });
  return out.slice(0, MAX_STATUS_ICONS);
}

export const UnitToken = memo(function UnitToken({ unit, mine, canAttack, targetable, hovered, selected, pending, actionable, onTap }: UnitTokenProps) {
  const def = CATALOG[unit.defId];
  const baseAttack = def?.type === "mob" ? def.attack : unit.attack;
  const taunt = !unit.silenced && unit.keywords.taunt === true;
  const classes = ["cg-unit"];
  if (taunt) classes.push("cg-unit--taunt");
  if (unit.silenced) classes.push("cg-unit-silenced");
  if (unit.statuses.some((st) => st.id === "freeze")) classes.push("cg-unit--frozen");
  // Phase 20: a holy bubble while Escudo Divino holds, a shimmer while hidden by Sigilo.
  if (!unit.silenced && unit.keywords.divineShield) classes.push("cg-unit--divine");
  if (!unit.silenced && unit.keywords.stealth) classes.push("cg-unit--stealth");
  if (actionable || targetable) classes.push("cg-unit--actionable");
  if (selected) classes.push("cg-unit--selected");
  else if (targetable) classes.push("cg-unit--targetable");
  else if (canAttack) classes.push("cg-unit--can-attack");
  if (pending) classes.push("cg-unit--pending");
  if (hovered) classes.push(targetable ? "cg-unit--hover-valid" : "cg-unit--hover");
  const name = cardName(unit.defId);
  const label = t("match.unitLabel", { name, attack: unit.attack, health: unit.health });
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
      title={`${name}${unit.sleeping ? ` — ${t("match.sleeping")}` : canAttack ? ` — ${t("match.canAttack")}` : ""}`}
      onClick={(e) => onTap(unit, e)}
    >
      <span className="cg-unit-body">
        <CardArt art={def?.art ?? unit.defId} tribe={def?.type === "mob" ? def.tribes[0] : undefined} />
      </span>
      <span className="cg-unit-keywords">
        {keywordIcons(unit).map((k) => (
          <KeywordIcon key={k.id} keyword={k.id} value={k.value} size="17cqh" title={t(`keyword.${k.id}.name`)} />
        ))}
      </span>
      <span className="cg-unit-statuses">
        {statusIcons(unit).map((st) => (
          <StatusIcon
            key={st.id}
            status={st.id}
            magnitude={st.magnitude}
            size="17cqh"
            title={st.id === "silenced" ? t("abilityWords.silence.name") : t(`status.${st.id}.name`)}
          />
        ))}
      </span>
      {unit.sleeping && (
        <span className="cg-unit-sleep" aria-hidden>
          zZz
        </span>
      )}
      <span className="cg-unit-attack">
        <AttackBadge value={unit.attack} buffed={unit.attack > baseAttack} debuffed={unit.attack < baseAttack} size="30cqh" />
      </span>
      <span className="cg-unit-health">
        <HealthBadge value={unit.health} max={unit.maxHealth} damaged={unit.health < unit.maxHealth} size="30cqh" />
      </span>
    </button>
  );
});
