// Replaceable visual primitives (§17.4 "skin rule"): no game logic, no data fetching, no engine imports.
// The rest of the card UI imports visuals only from "@/components/cards/skin".
export { AttackBadge, type AttackBadgeProps } from "./AttackBadge";
export { BoardBackdrop } from "./BoardBackdrop";
export { CardArt, type CardArtProps } from "./CardArt";
export { CardBack, type CardBackProps } from "./CardBack";
export { CardFrame, type CardFrameProps, type CardFrameState } from "./CardFrame";
export { CostBadge, type CostBadgeProps } from "./CostBadge";
export { CurrencyBadge, type CurrencyBadgeProps } from "./CurrencyBadge";
export { GameIcon, type GameIconProps } from "./GameIcon";
export { type GameIconName } from "./icons/gameIcons";
export { EndTurnButton, type EndTurnButtonProps, type EndTurnState } from "./EndTurnButton";
export { HealthBadge, type HealthBadgeProps } from "./HealthBadge";
export { HeroPortrait, type HeroPortraitProps } from "./HeroPortrait";
export { KeywordIcon, type KeywordIconProps } from "./KeywordIcon";
export { MANA_BAR_SLOTS, ManaBar, ManaCrystals, ManaGauge, type ManaBarProps, type ManaCrystalsProps, type ManaGaugeProps } from "./ManaCrystals";
export { RarityGem, type RarityGemProps } from "./RarityGem";
export { StatDelta, type StatDeltaProps } from "./StatDelta";
export { StatusIcon, type StatusIconProps } from "./StatusIcon";
export { TribeLabel, type TribeLabelProps } from "./TribeLabel";
// Non-match visuals (GameCrest, PackArt — UI-07) are imported from their own modules, not from this barrel, so the
// shared skin chunk that the match route loads stays free of them (route-size budget, PERFORMANCE.md).
export { QrCode, type QrCodeProps } from "./QrCode";
