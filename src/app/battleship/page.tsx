import type { Metadata } from "next";
import { BattleshipGame } from "@/components/battleship/BattleshipGame";

export const metadata: Metadata = { title: "Batalla Naval · Pikaboom" };

export default function BattleshipPage() {
  return <BattleshipGame />;
}
