"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { getAuthToken, useDynamicContext, useIsLoggedIn, useRefreshUser, useUserWallets } from "@dynamic-labs/sdk-react-core";
import { isSolanaWallet } from "@dynamic-labs/solana";
import { syncWalletAddress } from "@/app/auth/wallet-sync-action";
import { openAuthModal } from "@/lib/auth-modal-store";
import { createClient } from "@/lib/supabase/client";
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
  /** This account has a saved wallet address (balance can be read). */
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
   * Can this user stake right now:
   * ready — the account's wallet is live and can sign;
   * loading — Dynamic is restoring the session or still creating/saving the
   *   wallet (a fresh signup's embedded wallet lands a moment after login);
   * no_wallet — the wallet never appeared (rare; offer a fresh sign-in);
   * mismatch — Phantom etc. is switched to a different account than this one.
   * There is deliberately no "signed in but disconnected" state: signed in to
   * Rivaly always means signed in to the wallet (see the session guard).
   */
  status: "signed_out" | "loading" | "ready" | "no_wallet" | "mismatch";
  connectedAddress: string | null;
  /** Fresh wallet sign-in, then back to `next` — only for the rare states above. */
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
  const [walletTimedOut, setWalletTimedOut] = useState(false);
  const syncedFor = useRef<string | null>(null);

  // The Solana wallet Dynamic has for this user right now (embedded or
  // Phantom etc.). Dynamic builds this list from its own logged-in user.
  const dynamicSolAddress = wallets.find((w) => isSolanaWallet(w))?.address ?? null;

  // Session guard. Dynamic's login expires on its own clock (2 hours unless
  // raised in its dashboard) while Rivaly's Supabase session doesn't — which
  // left people "signed in" with no wallet able to sign. Rivaly's session now
  // follows Dynamic's: once Dynamic has finished restoring and says nobody is
  // logged in, sign out of Rivaly too. The next action that needs an account
  // asks for one sign-in (create keeps its draft), and both come back together.
  // The short grace period rides out Dynamic settling right after load.
  useEffect(() => {
    if (!profile || !sdkHasLoaded || dynamicLoggedIn) return;
    const id = window.setTimeout(() => {
      void createClient()
        .auth.signOut()
        .then(() => router.refresh());
    }, 1500);
    return () => window.clearTimeout(id);
  }, [profile, sdkHasLoaded, dynamicLoggedIn, router]);

  // Save a missing wallet address the moment Dynamic's wallet exists. A fresh
  // signup's embedded wallet is created a beat after login, so the address
  // often wasn't in the token the sign-in bridge saw. Refresh Dynamic's user,
  // hand its fresh token to the server (which verifies it and only ever fills
  // a missing address), then reload. Re-runs whenever a new wallet appears.
  useEffect(() => {
    if (!profile || address || !dynamicLoggedIn || !dynamicSolAddress) return;
    if (syncedFor.current === dynamicSolAddress) return;
    syncedFor.current = dynamicSolAddress;
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
  }, [profile, address, dynamicLoggedIn, dynamicSolAddress, refreshUser, router]);

  // Waiting on wallet creation shouldn't spin forever if it never comes.
  useEffect(() => {
    if (!profile || address || !dynamicLoggedIn) return;
    const id = window.setTimeout(() => setWalletTimedOut(true), 20000);
    return () => window.clearTimeout(id);
  }, [profile, address, dynamicLoggedIn]);

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

  const connectedAddress = dynamicSolAddress;
  const status: WalletState["status"] = !profile
    ? "signed_out"
    : signingWallet && isSolanaWallet(signingWallet)
      ? "ready"
      : !sdkHasLoaded || !dynamicLoggedIn || syncing
        ? "loading" // restoring, or the session guard is about to sign out
        : !address
          ? walletTimedOut
            ? "no_wallet"
            : "loading"
          : dynamicSolAddress
            ? "mismatch"
            : "loading";

  // Dynamic won't reopen its login while it believes someone is logged in,
  // so clear it first. The session guard then signs Rivaly out too, and the
  // sign-in that follows restores both and returns to `next`.
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
