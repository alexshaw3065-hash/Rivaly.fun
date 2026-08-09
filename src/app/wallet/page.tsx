import { PageShell } from "@/components/page-shell";

// Per docs/masterplan/07-product-blueprint.md#48-wallet — often overlooked
// but critical to trust. Balance, Deposit, Withdraw, Pending, Transaction
// History, Fees, Escrow, Current Rooms, Completed Rooms. The user should
// never wonder "where is my money?" — see
// docs/masterplan/09-competitive-research.md#5.2c.
export default function WalletPage() {
  return (
    <PageShell
      title="Wallet"
      purpose="Balance, deposits, withdrawals, and escrow — always clear."
    >
      <p className="text-sm text-muted">Wallet not wired up yet.</p>
    </PageShell>
  );
}
