"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { getAuthToken, useDynamicContext, useIsLoggedIn, useRefreshUser, useUserWallets } from "@dynamic-labs/sdk-react-core";
import { isSolanaWallet } from "@dynamic-labs/solana";
import { syncWalletAddress } from "@/app/auth/wallet-sync-action";
import { openAuthModal } from "@/lib/auth-modal-store";
import { useCurrentUser } from "@/components/current-user-provider";
import { USDC_MINT } from "./constants";
import { getUsdcTokenAccounts, solanaRpc } from "./solana-rpc";

// Derived from the hook rather than imported from
// @dynamic-labs/wallet-connector-core directly: the SDK resolves its own
// Wallet<WalletConnector> through an internal path, so the separately
// imported type isn't assignable to it. Taking the hook's own element type
// keeps these exactly in sync through SDK upgrades.
export type UserWallet = ReturnType<typeof useUserWallets>[number];

export interface WalletState {
  /** A real Dynamic-backed wallet exists for this user (vs. the seeded mock roster). */
  isReal: boolean;
  /** The user's own Solana address — the deposit/receive address. */
  address: string | null;
  usdcBalance: number;
  /** SOL pays network fees; a USDC-only wallet can't send anything. */
  solBalance: number;
  /** False until the first successful read. Keeps a not-yet-known balance
   *  from rendering as a confident "$0.00", which would be a lie. */
  hasLoaded: boolean;
  /** The wallet object that can actually sign — matched to `address`. */
  signingWallet: UserWallet | null;
  /**
   * Can this user stake right now, and if not, why:
   * ready — the account's wallet is connected and can sign;
   * no_wallet — the account has no wallet address yet (being set up);
   * disconnected — it has one, but Dynamic has no wallet connected in this tab;
   * mismatch — a different wallet is connected (`connectedAddress`).
   */
  status: "signed_out" | "loading" | "ready" | "no_wallet" | "disconnected" | "mismatch";
  connectedAddress: string | null;
  /**
   * Re-runs the wallet login and comes back to `next`. A stale Dynamic
   * session (Rivaly's own session outlived it) is cleared first — Dynamic
   * won't reopen its login while it still believes someone is logged in.
   */
  reconnect: (next: string) => Promise<void>;
  refresh: () => void;
}

const WalletContext = createContext<WalletState | null>(null);

async function readBalances(address: string): Promise<{ usdc: number; sol: number }> {
  const [tokenAccounts, lamports] = await Promise.all([
    getUsdcTokenAccounts(address, USDC_MINT),
    solanaRpc<{ value: number }>("getBalance", [address]),
  ]);

  // A wallet can legitimately hold more than one token account for the same
  // mint, so sum rather than taking the first.
  const usdc = tokenAccounts.reduce((total, entry) => {
    const amount = parseFloat(entry.account?.data?.parsed?.info?.tokenAmount?.uiAmountString ?? "0");
    return total + (Number.isFinite(amount) ? amount : 0);
  }, 0);

  return { usdc, sol: (lamports.value ?? 0) / 1_000_000_000 };
}

// One balance read for the whole app. Every wallet surface (top bar chip,
// /wallet, Profile's PNL card, both deposit entry points) used to call its
// own balance hook, which meant the same fetch several times per page.
//
// The address comes from profiles.dynamic_wallet_address — server-rendered
// with the page — rather than from Dynamic's client-side primaryWallet.
// That fixes a real production bug: the Supabase session outlives Dynamic's
// own client session, so on a fresh load primaryWallet was frequently null
// while the user was very much signed in, which left the deposit sheet
// stuck on "Setting up your wallet address" and the balance silently
// reading 0. It also guarantees the balance shown and the deposit address
// given out always belong to the same wallet, which wasn't true when a user
// connected a second external wallet and Dynamic made that one primary.
export function WalletProvider({ children }: { children: React.ReactNode }) {
  const profile = useCurrentUser();
  const address = profile?.dynamicWalletAddress ?? null;
  const wallets = useUserWallets();
  const { sdkHasLoaded, handleLogOut } = useDynamicContext();
  const dynamicLoggedIn = useIsLoggedIn();
  const refreshUser = useRefreshUser();
  const router = useRouter();
  const [syncing, setSyncing] = useState(false);
  const syncTried = useRef(false);

  // Self-heal a missing wallet address without making anyone sign in again:
  // Dynamic often finishes provisioning the embedded wallet after the login
  // that created the account, so the address wasn't in that first token.
  // Refresh Dynamic's view of the user, hand its fresh token to the server
  // (which verifies it and only ever fills a missing address), then reload.
  useEffect(() => {
    if (!profile || address || !sdkHasLoaded || !dynamicLoggedIn || syncTried.current) return;
    syncTried.current = true;
    let cancelled = false;
    void (async () => {
      setSyncing(true);
      try {
        await refreshUser().catch(() => undefined);
        const res = await syncWalletAddress(getAuthToken());
        if (res.filled && !cancelled) router.refresh();
      } finally {
        if (!cancelled) setSyncing(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [profile, address, sdkHasLoaded, dynamicLoggedIn, refreshUser, router]);

  const [usdcBalance, setUsdcBalance] = useState(0);
  const [solBalance, setSolBalance] = useState(0);
  const [hasLoaded, setHasLoaded] = useState(false);

  // Signing needs the wallet object, and it must be the one matching the
  // address above — never just whichever wallet Dynamic considers primary.
  const signingWallet = useMemo(
    () => (address ? wallets.find((w) => w.address === address) ?? null : null),
    [wallets, address],
  );

  const load = useCallback(async () => {
    if (!address) return;
    try {
      const { usdc, sol } = await readBalances(address);
      setUsdcBalance(usdc);
      setSolBalance(sol);
      setHasLoaded(true);
    } catch {
      // Keep the last known-good value. Showing a stale-but-real number
      // beats replacing it with a zero that never happened.
    }
  }, [address]);

  useEffect(() => {
    if (!address) return;
    // One read on mount / when the address first becomes known. The lint
    // rule can't see that load()'s state updates happen after its await.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [address, load]);

  // A deposit arrives entirely outside this app — nothing tells us it
  // landed. Re-reading whenever the tab regains focus covers the common
  // real path by itself: go to an exchange or wallet, send, come back.
  useEffect(() => {
    if (!address) return;
    const onWake = () => {
      if (document.visibilityState === "visible") void load();
    };
    window.addEventListener("focus", onWake);
    document.addEventListener("visibilitychange", onWake);
    return () => {
      window.removeEventListener("focus", onWake);
      document.removeEventListener("visibilitychange", onWake);
    };
  }, [address, load]);

  // Defined outside the memo below on purpose: as an inline arrow inside it,
  // refresh got a new identity on every balance change, and consumers keying
  // an effect on it (the deposit sheet's poll) would tear down and restart
  // that effect each time. This way its identity only changes with `address`.
  const refresh = useCallback(() => void load(), [load]);

  const connectedAddress = wallets.find((w) => w.chain === "SOL")?.address ?? wallets[0]?.address ?? null;
  const status: WalletState["status"] = !profile
    ? "signed_out"
    : !sdkHasLoaded || syncing
      ? "loading"
      : !address
        ? "no_wallet"
        : signingWallet && isSolanaWallet(signingWallet)
          ? "ready"
          : wallets.length === 0
            ? "disconnected"
            : "mismatch";

  const reconnect = useCallback(
    async (next: string) => {
      if (dynamicLoggedIn) await handleLogOut().catch(() => undefined);
      openAuthModal({ next });
    },
    [dynamicLoggedIn, handleLogOut],
  );

  const value = useMemo<WalletState>(
    () => ({
      isReal: address !== null,
      address,
      usdcBalance,
      solBalance,
      hasLoaded,
      signingWallet,
      status,
      connectedAddress,
      reconnect,
      refresh,
    }),
    [address, usdcBalance, solBalance, hasLoaded, signingWallet, status, connectedAddress, reconnect, refresh],
  );

  return <WalletContext.Provider value={value}>{children}</WalletContext.Provider>;
}

export function useWallet(): WalletState {
  const state = useContext(WalletContext);
  if (!state) {
    // Mounted at the root layout, so this only happens if a surface renders
    // outside it — worth failing loudly rather than silently showing zeros.
    throw new Error("useWallet must be used inside WalletProvider");
  }
  return state;
}
