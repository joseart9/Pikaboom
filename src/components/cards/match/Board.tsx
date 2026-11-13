// One side of the battlefield (§17.3). In placement mode (a mob is selected) the gaps between units light up; tapping
// a gap, the left/right half of a unit, or the empty board area chooses the position. While a mob is dragged (or a
// gap is chosen with the arrow keys) only the active gap opens. A ghost marks a mob placed but not yet confirmed.
import type { MouseEvent, ReactNode } from "react";
import { CATALOG } from "@/game/cards/catalog";
import type { CardId } from "@/game/cards/catalog/types";
import type { UnitSnapshot } from "@/game/cards/engine/events";
import type { EntityId, LegalActions } from "@/game/cards/engine/types";
import { AttackBadge, CardArt, HealthBadge } from "../skin";
import { UnitToken } from "./UnitToken";

export interface BoardGhost {
  defId: CardId;
  index: number;
}

export interface BoardProps {
  units: UnitSnapshot[];
  mine: boolean;
  legal: LegalActions | null;
  targets: readonly EntityId[];
  selectedUnit: EntityId | null;
  pendingUnit: EntityId | null;
  placing: boolean;
  /** The gap a dragged mob (or the keyboard) would use, or null. */
  activeGap?: number | null;
  /** A mob placed at `index` that waits for its target or for the server. */
  ghost?: BoardGhost | null;
  /** The entity under the targeting arrow. */
  hoverTarget?: EntityId | null;
  onTapUnit: (id: EntityId) => void;
  onTapSlot: (index: number) => void;
}

function Ghost({ defId }: { defId: CardId }) {
  const def = CATALOG[defId];
  if (!def || def.type !== "mob") return null;
  return (
    <span className="cg-unit cg-unit--ghost" data-cg-ghost aria-hidden>
      <span className="cg-unit-body">
        <CardArt art={def.art} tribe={def.tribes[0]} />
      </span>
      <span className="cg-unit-attack">
        <AttackBadge value={def.attack} buffed={false} debuffed={false} size="30cqh" />
      </span>
      <span className="cg-unit-health">
        <HealthBadge value={def.health} max={def.health} damaged={false} size="30cqh" />
      </span>
    </span>
  );
}

export function Board({
  units,
  mine,
  legal,
  targets,
  selectedUnit,
  pendingUnit,
  placing,
  activeGap = null,
  ghost = null,
  hoverTarget = null,
  onTapUnit,
  onTapSlot,
}: BoardProps) {
  const onUnit = (unit: UnitSnapshot, e: MouseEvent<HTMLButtonElement>) => {
    if (placing && mine) {
      const rect = e.currentTarget.getBoundingClientRect();
      const index = units.findIndex((u) => u.iid === unit.iid);
      onTapSlot(index + (e.clientX > rect.left + rect.width / 2 ? 1 : 0));
      return;
    }
    onTapUnit(unit.iid);
  };
  const gap = (index: number) => (
    <span
      key={`gap-${index}`}
      className={`cg-slot-gap${activeGap === index ? " cg-slot-gap--active" : ""}`}
      data-cg-tap={placing ? "" : undefined}
      onClick={placing ? () => onTapSlot(index) : undefined}
      aria-hidden
    />
  );
  const children: ReactNode[] = [];
  units.forEach((u, i) => {
    if (mine) children.push(gap(i));
    if (mine && ghost?.index === i) children.push(<Ghost key="ghost" defId={ghost.defId} />);
    const canAttack = mine && !!legal?.attacks[u.iid]?.length;
    const targetable = targets.includes(u.iid);
    children.push(
      <UnitToken
        key={u.iid}
        unit={u}
        mine={mine}
        canAttack={canAttack}
        targetable={targetable}
        hovered={hoverTarget === u.iid}
        selected={selectedUnit === u.iid}
        pending={pendingUnit === u.iid}
        actionable={canAttack || (placing && mine)}
        onTap={onUnit}
      />,
    );
  });
  if (mine) children.push(gap(units.length));
  if (mine && ghost && ghost.index >= units.length) children.push(<Ghost key="ghost" defId={ghost.defId} />);
  const boardClasses = ["cg-board"];
  if (placing && mine) boardClasses.push("cg-board--placing");
  if (activeGap !== null && mine) boardClasses.push("cg-board--dropping");
  return (
    <div
      className={`cg-board-row${mine ? " cg-board-row--mine" : ""}`}
      data-cg-zone={mine ? "board" : undefined}
      data-cg-tap={placing && mine ? "" : undefined}
      onClick={placing && mine ? (e) => e.target === e.currentTarget && onTapSlot(units.length) : undefined}
    >
      <div className={boardClasses.join(" ")} onClick={placing && mine ? (e) => e.target === e.currentTarget && onTapSlot(units.length) : undefined}>
        {children}
      </div>
    </div>
  );
}
