// Mana curve bar chart for the deck editor (§15.4): card count per cost 0…7+.
import { MAX_COST_BUCKET } from "@/game/cards/collection/filter";
import { t } from "@/game/cards/i18n";

export function ManaCurve({ curve }: { curve: readonly number[] }) {
  const top = Math.max(1, ...curve);
  return (
    <figure className="cg-curve" aria-label={t("decks.curve")}>
      {curve.map((n, cost) => {
        const label = cost === MAX_COST_BUCKET ? t("collection.costPlus", { n: cost }) : String(cost);
        return (
          <div key={cost} className="cg-curve-col" title={t("decks.curveBar", { cost: label, n })}>
            <span className="cg-curve-n">{n > 0 ? n : ""}</span>
            <span className="cg-curve-bar" style={{ height: `${(n / top) * 100}%` }} />
            <span className="cg-curve-cost">{label}</span>
          </div>
        );
      })}
    </figure>
  );
}
