"use client";

import { roomById } from "@/lib/mock-data";
import { useCurrentUser } from "@/components/current-user-provider";
import { useWalletTransactions } from "@/lib/wallet/use-wallet-transactions";
import { USDC_DECIMALS, explorerTxUrl } from "@/lib/wallet/constants";
import { formatUsdc } from "@/lib/wallet/format";
import { formatMoney } from "@/lib/mock-data";

const mockTypeLabel: Record<string, string> = {
  deposit: "Deposit",
  withdrawal: "Withdrawal",
  entry: "Room entry",
  payout: "Payout",
  refund: "Refund",
  fee: "Fee",
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

// Real users: every row here has a real on-chain tx_signature (linked out
// to Solana Explorer) — nothing to trust blindly, it's independently
// checkable. Known V1 gap, disclosed rather than hidden: a deposit made by
// sending straight to the receive address has no app-side moment to log a
// row for, so it won't appear in this list even though it already counts
// toward the live balance above. See the deposits/withdrawals plan.
export function WalletHistory() {
  const profile = useCurrentUser();
  const history = useWalletTransactions(profile);

  if (!history.isReal) {
    return (
      <div className="mt-4 flex flex-col divide-y divide-border rounded-lg border border-border bg-surface">
        {history.transactions.map((tx) => {
          const room = tx.roomId ? roomById(tx.roomId) : undefined;
          const positive = tx.amountCents >= 0;
          return (
            <div key={tx.id} className="flex items-center justify-between px-4 py-3.5">
              <div className="min-w-0">
                <p className="text-sm text-foreground">{mockTypeLabel[tx.type]}</p>
                <p className="mt-0.5 truncate font-mono text-xs text-muted">
                  {room ? room.prediction : formatDate(tx.createdAt)}
                </p>
              </div>
              <p
                className="shrink-0 font-mono text-sm font-medium"
                style={{ color: positive ? "var(--rival-green)" : "var(--foreground)" }}
              >
                {positive ? "+" : "−"}
                {formatMoney(Math.abs(tx.amountCents))}
              </p>
            </div>
          );
        })}
      </div>
    );
  }

  if (history.transactions.length === 0) {
    return (
      <div className="mt-4 rounded-lg border border-border bg-surface p-6 text-center">
        <p className="text-sm text-muted">
          No logged transactions yet. Withdrawals and deposits you send through this app show up here —
          a direct send to your receive address updates your balance instantly but won&apos;t appear as
          a row yet.
        </p>
      </div>
    );
  }

  return (
    <div className="mt-4 flex flex-col divide-y divide-border rounded-lg border border-border bg-surface">
      {history.transactions.map((tx) => {
        const positive = tx.type === "deposit";
        const amount = tx.amountMicros / 10 ** USDC_DECIMALS;
        return (
          <a
            key={tx.id}
            href={explorerTxUrl(tx.txSignature)}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-between px-4 py-3.5 hover:bg-surface-elevated"
            style={{ transition: "background-color 150ms ease" }}
          >
            <div className="min-w-0">
              <p className="text-sm text-foreground">{positive ? "Deposit" : "Withdrawal"}</p>
              <p className="mt-0.5 truncate font-mono text-xs text-muted">{formatDate(tx.createdAt)}</p>
            </div>
            <p
              className="shrink-0 font-mono text-sm font-medium"
              style={{ color: positive ? "var(--rival-green)" : "var(--foreground)" }}
            >
              {positive ? "+" : "−"}
              {formatUsdc(amount)}
            </p>
          </a>
        );
      })}
    </div>
  );
}
