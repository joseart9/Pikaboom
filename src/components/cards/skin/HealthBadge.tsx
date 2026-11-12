import { Badge } from "./Badge";

export interface HealthBadgeProps {
  value: number;
  max?: number;
  damaged: boolean;
  size: string;
  title?: string;
}

/** Health number on a red drop; the number turns pink-red when the character is damaged. */
export function HealthBadge({ value, damaged, size, title }: HealthBadgeProps) {
  return <Badge shape="drop" fill="var(--cg-health)" value={value} size={size} valueColor={damaged ? "#ffd6de" : "var(--cg-text)"} title={title} />;
}
