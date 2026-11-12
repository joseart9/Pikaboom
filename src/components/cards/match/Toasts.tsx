"use client";

import { useMatchSelector, type MatchClient, type ToastMessage } from "@/game/cards/client/matchClient";

/** One toast. Keyed by id, so a repeated message replays the animation; fades out via CSS. */
export function ToastView({ message }: { message: ToastMessage | null }) {
  if (!message) return null;
  return (
    <div className="cg-toasts" role="status" aria-live="polite">
      <div key={message.id} className={`cg-toast${message.tone === "info" ? " cg-toast--info" : ""}`}>
        {message.text}
      </div>
    </div>
  );
}

/** The latest rejection/hint/notice of a match client. */
export function Toasts({ client }: { client: MatchClient }) {
  const error = useMatchSelector(client, (s) => s.error);
  return <ToastView message={error} />;
}
