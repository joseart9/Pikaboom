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
export { ManaCrystals, type ManaCrystalsProps } from "./ManaCrystals";
export { RarityGem, type RarityGemProps } from "./RarityGem";
export { StatusIcon, type StatusIconProps } from "./StatusIcon";
export { TribeLabel, type TribeLabelProps } from "./TribeLabel";
export { QrCode, type QrCodeProps } from "./QrCode";
