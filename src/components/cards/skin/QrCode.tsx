"use client";

// Invite QR code as inline SVG (copied from the Batalla Naval approach, not imported from it — Phase 11 G.2).
import QRCode from "qrcode";
import { useEffect, useState } from "react";

export interface QrCodeProps {
  text: string;
  /** CSS length. */
  size: string;
  /** Accessible name (callers pass translated text; the skin stays i18n-free). */
  label: string;
}

export function QrCode({ text, size, label }: QrCodeProps) {
  const [svg, setSvg] = useState("");
  useEffect(() => {
    let alive = true;
    QRCode.toString(text, { type: "svg", margin: 1, errorCorrectionLevel: "M", color: { dark: "#1d0842", light: "#ffffff" } })
      .then((s) => alive && setSvg(s))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [text]);
  return (
    <div
      role="img"
      aria-label={label}
      style={{ width: size, height: size, flex: "0 0 auto", padding: 4, borderRadius: 12, background: "#ffffff", overflow: "hidden", boxShadow: "0 6px 16px #00000066" }}
      className="cg-qr"
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}
