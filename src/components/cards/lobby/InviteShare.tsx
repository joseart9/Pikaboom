"use client";

// Invite (Phase 11 G.2): big code, "Compartir invitación" (Web Share API, else copy the link + "¡Enlace copiado!"),
// and a QR of the link `/cards/play?sala=CODE` (§13.7).
import { useSyncExternalStore } from "react";
import { t } from "@/game/cards/i18n";
import { GameIcon, QrCode } from "../skin";

const noSubscribe = () => () => {};

export function inviteUrl(origin: string, code: string): string {
  return `${origin}/cards/play?sala=${encodeURIComponent(code)}`;
}

export interface InviteShareProps {
  code: string;
  onNotice: (text: string, tone?: "info") => void;
}

export function InviteShare({ code, onNotice }: InviteShareProps) {
  // The origin only exists in the browser; the server snapshot renders without the QR.
  const origin = useSyncExternalStore(noSubscribe, () => window.location.origin, () => "");
  const url = origin ? inviteUrl(origin, code) : "";

  const share = async () => {
    if (!url) return;
    const data = { title: t("lobby.shareTitle"), text: t("lobby.shareText", { code }), url };
    if (typeof navigator.share === "function" && (!navigator.canShare || navigator.canShare(data))) {
      try {
        await navigator.share(data);
        return;
      } catch (e) {
        if (e instanceof DOMException && e.name === "AbortError") return; // the user closed the sheet
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      onNotice(t("lobby.copied"), "info");
    } catch {
      onNotice(t("lobby.copyFailed", { code }));
    }
  };

  return (
    <div className="cg-invite">
      <div className="cg-code-plate">
        <span className="cg-invite-label">{t("lobby.roomCode")}</span>
        <span className="cg-code" aria-label={`${t("lobby.codeLabel")}: ${code.split("").join(" ")}`}>
          {code}
        </span>
      </div>
      <button type="button" className="cg-button cg-button--primary" data-haptic="medium" onClick={() => void share()}>
        <GameIcon name="share" size="1em" />
        {t("lobby.share")}
      </button>
      {url && <QrCode text={url} size="min(30dvh, 150px)" label={t("lobby.qrLabel")} />}
    </div>
  );
}
