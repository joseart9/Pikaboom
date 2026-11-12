import { Badge } from "./Badge";

export interface AttackBadgeProps {
  value: number;
  buffed: boolean;
  debuffed: boolean;
  size: string;
  title?: string;
}

/** Attack number on a yellow diamond; green when buffed above the printed value, pale when below. */
export function AttackBadge({ value, buffed, debuffed, size, title }: AttackBadgeProps) {
  const color = buffed ? "#b9ffe6" : debuffed ? "#ffd6de" : "var(--cg-text)";
  return <Badge shape="diamond" fill="var(--cg-attack)" value={value} size={size} valueColor={color} title={title} />;
}
