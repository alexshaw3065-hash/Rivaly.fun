"use client";

import { useWallet } from "@/lib/wallet/wallet-context";

// Shown wherever a balance would be while a signed-in account's wallet isn't
// usable yet — never a demo balance standing in for it. Normally that's just
// a moment of "getting ready" (the provider saves a new wallet's address by
// itself); the button only matters in the two rare cases in wallet-context.
export function WalletSetupButton({ next, centered = false }: { next: string; centered?: boolean }) {
  const { status, reconnect } = useWallet();
  if (status === "ready" || status === "signed_out") return null;
  if (status === "loading") {
    return (
      <p role="status" className={`text-sm text-muted ${centered ? "text-center" : ""}`}>
        Getting your wallet ready…
      </p>
    );
  }

  return (
    <div className={`flex flex-col gap-2 ${centered ? "items-center text-center" : "items-start"}`}>
      <button
        type="button"
        onClick={() => void reconnect(next)}
        className="rounded-md px-5 py-2.5 text-sm font-semibold text-white transition-transform duration-150 ease-out active:scale-[0.97]"
        style={{ background: "var(--rival-blue)" }}
      >
        {status === "no_wallet" ? "Sign in again to finish your wallet" : status === "expired" ? "Sign back in" : "Sign in with this wallet"}
      </button>
      <p className="text-xs text-muted">
        {status === "no_wallet"
          ? "Your wallet didn't finish setting up — one sign-in completes it."
          : status === "expired"
            ? "Your login timed out while you were away."
            : "Your wallet app is on a different account than this one."}
      </p>
    </div>
  );
}
