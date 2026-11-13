import { Badge } from "./Badge";

export interface HealthBadgeProps {
  value: number;
  max?: number;
  damaged: boolean;
  /** Max health raised above the printed value (UI-08). */
  buffed?: boolean;
  size: string;
  title?: string;
}

/** Health number on a red drop; pink-red when the character is damaged, mint when its max health is buffed. */
export function HealthBadge({ value, damaged, buffed = false, size, title }: HealthBadgeProps) {
  const color = damaged ? "#ffd6de" : buffed ? "#b9ffe6" : "var(--cg-text)";
  return <Badge shape="drop" fill="var(--cg-health)" value={value} size={size} valueColor={color} title={title} />;
}
