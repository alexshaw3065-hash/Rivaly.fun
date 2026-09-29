import { WalletActions } from "@/components/wallet-actions";
import { WalletHistory } from "@/components/wallet/wallet-history";
import { HostingEarnings } from "@/components/wallet/hosting-earnings";
import { WalletSignedOut } from "@/components/wallet/wallet-signed-out";
import { getCurrentProfile } from "@/lib/supabase/current-user";

export const metadata = { title: "Wallet" };

// Per docs/masterplan/07-product-blueprint.md#48-wallet — often overlooked
// but critical to trust. The user should never wonder "where is my money?"
// See docs/masterplan/09-competitive-research.md#5.2c. Signed out, there's no
// money to show, so the page is just the way in.
export default async function WalletPage() {
  const me = await getCurrentProfile();
  if (!me) {
    return (
      <main className="mx-auto max-w-4xl px-4 py-12 md:px-6 lg:max-w-[688px]">
        <WalletSignedOut />
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-4xl px-4 py-12 md:px-6 lg:max-w-[688px]">
      <WalletActions />
      <HostingEarnings />
      <div className="mt-10">
        <p className="text-title-3 font-display text-foreground">Transaction history</p>
        <WalletHistory />
      </div>
    </main>
  );
}
