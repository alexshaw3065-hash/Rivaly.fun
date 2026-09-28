import { WalletActions } from "@/components/wallet-actions";
import { WalletHistory } from "@/components/wallet/wallet-history";
import { HostingEarnings } from "@/components/wallet/hosting-earnings";

// Per docs/masterplan/07-product-blueprint.md#48-wallet — often overlooked
// but critical to trust. The user should never wonder "where is my money?"
// See docs/masterplan/09-competitive-research.md#5.2c.
export default function WalletPage() {
  return (
    <main className="mx-auto max-w-4xl px-4 py-12 md:px-6">
      <WalletActions />
      <HostingEarnings />
      <div className="mt-10">
        <p className="text-title-3 font-display text-foreground">Transaction history</p>
        <WalletHistory />
      </div>
    </main>
  );
}
