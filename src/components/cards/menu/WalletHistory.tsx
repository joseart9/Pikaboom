"use client";

// Oro movements (Phase 16): the newest ledger rows from GET /api/cards/wallet (starter grant, match rewards, later
// pack purchases). Opened from the menu's balance badge. Esc / tapping outside closes it.
import { useEffect } from "react";
import type { CurrencyTransaction } from "@/game/cards/collection/wallet";
import { t } from "@/game/cards/i18n";

const DATE = new Intl.DateTimeFormat("es", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

export interface WalletHistoryProps {
  /** null while loading; "error" when the request failed. */
  transactions: CurrencyTransaction[] | null | "error";
  onClose: () => void;
}

export function WalletHistory({ transactions, onClose }: WalletHistoryProps) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="cg-dialog-backdrop" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="cg-dialog cg-wallet-history" role="dialog" aria-modal aria-labelledby="cg-wallet-history-title">
        <p id="cg-wallet-history-title" className="cg-dialog-title">
          {t("economy.history")}
        </p>
        {transactions === null && <p className="cg-dialog-help">{t("economy.historyLoading")}</p>}
        {transactions === "error" && <p className="cg-dialog-help">{t("economy.historyError")}</p>}
        {Array.isArray(transactions) && transactions.length === 0 && <p className="cg-dialog-help">{t("economy.historyEmpty")}</p>}
        {Array.isArray(transactions) && transactions.length > 0 && (
          <ul className="cg-wallet-list">
            {transactions.map((tx) => (
              <li key={tx.id} className="cg-wallet-row">
                <span className="cg-wallet-kind">
                  {t(`economy.kind.${tx.kind}`)}
                  <small>{DATE.format(new Date(tx.createdAt))}</small>
                </span>
                <span className={`cg-wallet-amount${tx.amount < 0 ? " cg-wallet-amount--debit" : ""}`}>
                  {tx.amount > 0 ? `+${tx.amount}` : tx.amount}
                  <small>{t("economy.balanceAfter", { amount: tx.balanceAfter })}</small>
                </span>
              </li>
            ))}
          </ul>
        )}
        <div className="cg-dialog-actions">
          <button type="button" className="cg-button" onClick={onClose} autoFocus>
            {t("economy.historyClose")}
          </button>
        </div>
      </div>
    </div>
  );
}
