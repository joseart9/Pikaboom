import { Badge } from "./Badge";

export interface CostBadgeProps {
  value: number;
  /** -1 cheaper than printed, 1 more expensive, 0 unchanged. */
  modified: -1 | 0 | 1;
  size: string;
}

/** Mana cost on a blue gem. */
export function CostBadge({ value, modified, size }: CostBadgeProps) {
  const color = modified < 0 ? "#b9ffe6" : modified > 0 ? "#ffd6de" : "var(--cg-text)";
  return <Badge shape="gem" fill="var(--cg-mana)" value={value} size={size} valueColor={color} />;
}
