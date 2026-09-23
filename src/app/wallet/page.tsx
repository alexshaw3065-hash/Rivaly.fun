import { SolanaWalletSection } from "@/components/wallet/solana-wallet-section";
import { BalanceActivity, RivalyBalanceCard } from "@/components/wallet/rivaly-balance";

// Per docs/masterplan/07-product-blueprint.md#48-wallet — the user should
// never wonder "where is my money?" Two clearly separate things, in the
// order people need them: the Rivaly balance you stake from (and every
// movement on it), then the Solana wallet behind your account. Moving USDC
// from that wallet into the Rivaly balance is the next phase — see
// docs/plans/fast-deposit-and-create.md.
export default function WalletPage() {
  return (
    <main className="mx-auto max-w-4xl px-4 py-8 md:px-6 md:py-12">
      <RivalyBalanceCard />

      <section className="mt-10">
        <p className="font-display text-xl font-semibold text-foreground">Activity</p>
        <BalanceActivity />
      </section>

      <SolanaWalletSection />
    </main>
  );
}
