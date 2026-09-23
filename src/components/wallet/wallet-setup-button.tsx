"use client";

import { useWallet } from "@/lib/wallet/wallet-context";

// Shown wherever a balance would be, for a signed-in account whose wallet
// isn't usable yet — never a demo balance standing in for it. The wallet
// provider already tries to fill a missing address silently; this is the
// one-tap fallback when that can't (e.g. Dynamic's session had ended).
export function WalletSetupButton({ next, centered = false }: { next: string; centered?: boolean }) {
  const { status, reconnect } = useWallet();
  if (status === "ready" || status === "signed_out") return null;
  const busy = status === "loading";

  return (
    <div className={`flex flex-col gap-2 ${centered ? "items-center text-center" : "items-start"}`}>
      <button
        type="button"
        onClick={() => void reconnect(next)}
        disabled={busy}
        className="rounded-md px-5 py-2.5 text-sm font-semibold text-white transition-[transform,opacity] duration-150 ease-out active:scale-[0.97] disabled:opacity-50"
        style={{ background: "var(--rival-blue)" }}
      >
        {busy ? "Getting your wallet ready…" : status === "no_wallet" ? "Set up your wallet" : "Reconnect wallet"}
      </button>
      {!busy && (
        <p className="text-xs text-muted">
          {status === "no_wallet"
            ? "One quick sign-in creates your USDC wallet."
            : "Your wallet's session ended — reconnect to see your balance and stake."}
        </p>
      )}
    </div>
  );
}
