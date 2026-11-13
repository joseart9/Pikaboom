"use client";

// Small in-app confirmation (delete a deck, leave with unsaved changes). Esc / tapping outside cancels.
import { useEffect, type ReactNode } from "react";

export interface ConfirmDialogProps {
  title: string;
  help?: string;
  confirmLabel: string;
  cancelLabel: string;
  danger?: boolean;
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  children?: ReactNode;
}

export function ConfirmDialog({ title, help, confirmLabel, cancelLabel, danger, busy, onConfirm, onCancel }: ConfirmDialogProps) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onCancel]);

  return (
    <div className="cg-dialog-backdrop" onClick={(e) => e.target === e.currentTarget && onCancel()}>
      <div className="cg-dialog" role="alertdialog" aria-modal aria-labelledby="cg-dialog-title">
        <p id="cg-dialog-title" className="cg-dialog-title">
          {title}
        </p>
        {help && <p className="cg-dialog-help">{help}</p>}
        <div className="cg-dialog-actions">
          <button type="button" className="cg-button" onClick={onCancel} autoFocus>
            {cancelLabel}
          </button>
          <button type="button" className={`cg-button ${danger ? "cg-button--danger" : "cg-button--primary"}`} disabled={busy} onClick={onConfirm}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
