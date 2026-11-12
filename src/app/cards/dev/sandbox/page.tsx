import { notFound } from "next/navigation";
import { Sandbox } from "@/components/cards/dev/Sandbox";

/** Dev-only local battlefield (Phase 10). 404 in production builds. */
export default function SandboxPage() {
  if (process.env.NODE_ENV === "production") notFound();
  return <Sandbox />;
}
