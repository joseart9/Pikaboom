"use client";

// Collection filter panel (§15.1, Phase 14): search, "Solo mías"/"Solo faltantes", rarity, tribe and cost chips.
// Everything combines; the state lives in CollectionScreen (persisted in sessionStorage).
import type { ReactNode } from "react";
import { RARITIES } from "@/game/cards/catalog";
import { COST_BUCKETS, EMPTY_FILTER, isActive, MAX_COST_BUCKET, NO_TRIBE, TRIBE_CHIPS, toggleChip, type CollectionFilter, type Ownership } from "@/game/cards/collection/filter";
import { t } from "@/game/cards/i18n";
import { GameIcon, RarityGem } from "../skin";

export interface FiltersProps {
  filter: CollectionFilter;
  onChange: (next: CollectionFilter) => void;
  shown: number;
  total: number;
}

function Chip({ pressed, onClick, children }: { pressed: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button type="button" className={`cg-filter-chip${pressed ? " cg-filter-chip--on" : ""}`} aria-pressed={pressed} onClick={onClick}>
      {children}
    </button>
  );
}

export function Filters({ filter, onChange, shown, total }: FiltersProps) {
  const set = (patch: Partial<CollectionFilter>) => onChange({ ...filter, ...patch });
  const ownership = (o: Exclude<Ownership, "all">) => set({ ownership: filter.ownership === o ? "all" : o });

  return (
    <aside className="cg-filters" aria-label={t("collection.filters")}>
      <span className="cg-search-field">
        <GameIcon name="search" className="cg-search-icon" />
        <input
          type="search"
          className="cg-filter-search"
          value={filter.query}
          maxLength={60}
          placeholder={t("collection.search")}
          aria-label={t("collection.searchLabel")}
          autoComplete="off"
          spellCheck={false}
          onChange={(e) => set({ query: e.target.value })}
        />
      </span>
      <div className="cg-filter-row">
        <Chip pressed={filter.ownership === "owned"} onClick={() => ownership("owned")}>
          <GameIcon name="check" />
          {t("collection.owned")}
        </Chip>
        <Chip pressed={filter.ownership === "missing"} onClick={() => ownership("missing")}>
          <GameIcon name="lock" />
          {t("collection.missing")}
        </Chip>
      </div>

      <fieldset className="cg-filter-group">
        <legend>{t("collection.rarity")}</legend>
        {RARITIES.map((r) => (
          <Chip key={r} pressed={filter.rarities.includes(r)} onClick={() => set({ rarities: toggleChip(filter.rarities, r, RARITIES) })}>
            <RarityGem rarity={r} size="0.9em" />
            {t(`rarity.${r}`)}
          </Chip>
        ))}
      </fieldset>

      <fieldset className="cg-filter-group">
        <legend>{t("collection.tribe")}</legend>
        {TRIBE_CHIPS.map((tr) => (
          <Chip key={tr} pressed={filter.tribes.includes(tr)} onClick={() => set({ tribes: toggleChip(filter.tribes, tr, TRIBE_CHIPS) })}>
            {tr === NO_TRIBE ? t("collection.noTribe") : t(`tribe.${tr}`)}
          </Chip>
        ))}
      </fieldset>

      <fieldset className="cg-filter-group cg-filter-group--cost">
        <legend>{t("collection.cost")}</legend>
        {COST_BUCKETS.map((c) => (
          <Chip key={c} pressed={filter.costs.includes(c)} onClick={() => set({ costs: toggleChip(filter.costs, c, COST_BUCKETS) })}>
            {c === MAX_COST_BUCKET ? t("collection.costPlus", { n: c }) : c}
          </Chip>
        ))}
      </fieldset>

      <div className="cg-filter-footer">
        <span className="cg-filter-count" aria-live="polite">
          {t("collection.showing", { n: shown, total })}
        </span>
        <button type="button" className="cg-button cg-filter-clear" disabled={!isActive(filter)} onClick={() => onChange(EMPTY_FILTER)}>
          {t("collection.clear")}
        </button>
      </div>
    </aside>
  );
}
