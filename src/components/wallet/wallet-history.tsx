"use client";

import { useCurrentUser } from "@/components/current-user-provider";
import { useWalletTransactions } from "@/lib/wallet/use-wallet-transactions";
import { USDC_DECIMALS, explorerTxUrl } from "@/lib/wallet/constants";
import { formatUsdc } from "@/lib/wallet/format";

// Transfers with Rivaly's escrow are stakes going in and winnings/refunds
// coming back — named for what they are, not as generic deposits.
const ESCROW = process.env.NEXT_PUBLIC_ESCROW_ADDRESS;
function historyLabel(incoming: boolean, counterparty: string | null): string {
  if (ESCROW && counterparty === ESCROW) return incoming ? "Payout from a room" : "Stake into a room";
  return incoming ? "Deposit" : "Withdrawal";
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

// Real users: every row here has a real on-chain tx_signature (linked out
// to Solana Explorer) — nothing to trust blindly, it's independently
// checkable. The list is reconciled against the chain on load (see
// reconcile.ts), so deposits sent straight to the receive address show up
// here too, along with any transfer made from the wallet outside Rivaly.
export function WalletHistory() {
  const profile = useCurrentUser();
  const history = useWalletTransactions(profile);

  if (!history.isReal) {
    return (
      <div className="mt-4 rounded-lg border border-border bg-surface p-6 text-center">
        <p className="text-sm text-muted">Your history shows up here as soon as your wallet is ready.</p>
      </div>
    );
  }

  if (history.transactions.length === 0) {
    return (
      <div className="mt-4 rounded-lg border border-border bg-surface p-6 text-center">
        <p className="text-sm text-muted">
          Nothing here yet. Every deposit and withdrawal shows up with a link to verify it on-chain.
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
              <p className="text-sm text-foreground">{historyLabel(positive, tx.counterpartyAddress)}</p>
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
