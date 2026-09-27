import type { Metadata } from "next";
import { CharadesGame } from "@/components/game/CharadesGame";

export const metadata: Metadata = { title: "Charadas · Pikaboom" };

export default function CharadesPage() {
  return <CharadesGame />;
}
