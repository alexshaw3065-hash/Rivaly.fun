"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  getAuthToken,
  useDynamicContext,
  useIsLoggedIn,
  useRefreshAuth,
  useRefreshUser,
  useUserWallets,
} from "@dynamic-labs/sdk-react-core";
import { isSolanaWallet } from "@dynamic-labs/solana";
import { syncWalletAddress } from "@/app/auth/wallet-sync-action";
import { openAuthModal } from "@/lib/auth-modal-store";
import { createClient } from "@/lib/supabase/client";
import { useCurrentUser } from "@/components/current-user-provider";
import { USDC_MINT } from "./constants";
import { getUsdcTokenAccounts, solanaRpc } from "./solana-rpc";
import { watchWallet } from "./watch-wallet";

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
   * mismatch — Phantom etc. is switched to a different account than this one;
   * expired — the wallet login timed out while this page was open. Rivaly
   *   never signs anyone out mid-use: the stake button keeps its normal label
   *   and a tap is a quick sign-in that comes straight back to the stake;
   * unavailable — Dynamic's script never loaded (blocked, offline). Offered
   *   as a retry instead of an endless "getting ready".
   */
  status: "signed_out" | "loading" | "ready" | "no_wallet" | "mismatch" | "expired" | "unavailable";
  connectedAddress: string | null;
  /** Fresh wallet sign-in, then back to `next` — only for the rare states above. */
  reconnect: (next: string) => Promise<void>;
  refresh: () => void;
}

const WalletContext = createContext<WalletState | null>(null);

async function readBalances(address: string): Promise<{ usdc: number; sol: number }> {
  const [tokenAccounts, lamports] = await Promise.all([
    getUsdcTokenAccounts(address, USDC_MINT),
    solanaRpc<{ value: number }>("getBalance", [address, { commitment: "confirmed" }]),
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

  const refreshAuth = useRefreshAuth();
  // True once Dynamic has been logged in at any point on this page load.
  // (State adjusted during render — React's pattern for deriving from a
  // changing value; it only ever flips false → true once.)
  const [wasLoggedIn, setWasLoggedIn] = useState(false);
  if (dynamicLoggedIn && !wasLoggedIn) setWasLoggedIn(true);

  // Opening the app with a wallet login that has already expired: nobody was
  // mid-anything, so sign out of Rivaly too rather than show a signed-in
  // screen whose wallet can't sign. The next action asks for one sign-in.
  // Only ever on arrival — if the login lapses while the page is open, the
  // user is left alone (status "expired" above). The short grace period
  // rides out Dynamic settling right after load.
  useEffect(() => {
    if (!profile || !sdkHasLoaded || dynamicLoggedIn || wasLoggedIn) return;
    const id = window.setTimeout(() => {
      void createClient()
        .auth.signOut()
        .then(() => router.refresh());
    }, 1500);
    return () => window.clearTimeout(id);
  }, [profile, sdkHasLoaded, dynamicLoggedIn, wasLoggedIn, router]);

  // Rolling login: while someone is actually using Rivaly, renew Dynamic's
  // session so its expiry keeps moving forward (Dynamic re-arms its logout
  // timer from the renewed token). Active = tab visible + a tap, key or
  // scroll in the last few minutes; renew at most every 30 minutes. So you
  // stay signed in while you use it, and sign in again only after a real
  // break longer than the session length set in Dynamic's dashboard.
  useEffect(() => {
    if (!profile || !dynamicLoggedIn) return;
    let lastActivity = Date.now();
    let lastRenew = Date.now();
    const onActivity = () => {
      lastActivity = Date.now();
    };
    const events = ["pointerdown", "keydown", "scroll", "visibilitychange"] as const;
    events.forEach((e) => window.addEventListener(e, onActivity, { passive: true }));
    const id = window.setInterval(() => {
      const now = Date.now();
      const active = document.visibilityState === "visible" && now - lastActivity < 5 * 60_000;
      if (!active || now - lastRenew < 30 * 60_000) return;
      lastRenew = now;
      void refreshAuth().catch(() => undefined);
    }, 60_000);
    return () => {
      window.clearInterval(id);
      events.forEach((e) => window.removeEventListener(e, onActivity));
    };
  }, [profile, dynamicLoggedIn, refreshAuth]);

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

  // Dynamic's script normally loads in a second or two; if it never does,
  // say so and offer a retry rather than "getting ready" forever.
  const [sdkSlow, setSdkSlow] = useState(false);
  useEffect(() => {
    if (!profile || sdkHasLoaded) return;
    const id = window.setTimeout(() => setSdkSlow(true), 12000);
    return () => window.clearTimeout(id);
  }, [profile, sdkHasLoaded]);

  // Waiting on wallet creation shouldn't spin forever if it never comes.
  // (No address yet means nothing to watch either.)
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

  const retryTimer = useRef<number | undefined>(undefined);
  const load = useCallback(async () => {
    if (!address) return;
    const owner = address;
    // Keep the last known-good value on failure — a stale-but-real number
    // beats a zero that never happened — and retry a few times with backoff
    // so a blip on the first read doesn't leave "—" up until the next focus.
    async function read(attempt: number): Promise<void> {
      window.clearTimeout(retryTimer.current);
      try {
        const { usdc, sol } = await readBalances(owner);
        setUsdcBalance(usdc);
        setSolBalance(sol);
        setHasLoaded(true);
      } catch {
        if (attempt < 4) retryTimer.current = window.setTimeout(() => void read(attempt + 1), 2000 * 2 ** attempt);
      }
    }
    await read(0);
  }, [address]);
  useEffect(() => () => window.clearTimeout(retryTimer.current), []);

  useEffect(() => {
    if (!address) return;
    // One read on mount / when the address first becomes known.
    void load();
  }, [address, load]);

  // Live watch: subscribe to the wallet (and its USDC account) over the RPC
  // websocket, so any deposit, withdrawal, stake or payout shows up about a
  // second after it lands — including money sent from outside Rivaly.
  useEffect(() => {
    if (!address) return;
    return watchWallet(address, () => void load());
  }, [address, load]);

  // Backstop for a dropped websocket: re-read when the tab regains focus.
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
      : !sdkHasLoaded && sdkSlow
        ? "unavailable"
        : sdkHasLoaded && !dynamicLoggedIn && wasLoggedIn
        ? "expired"
        : !sdkHasLoaded || !dynamicLoggedIn || syncing
        ? "loading" // restoring, or the arrival check is about to sign out
        : !address
          ? walletTimedOut
            ? "no_wallet"
            : "loading"
          : dynamicSolAddress
            ? "mismatch"
            : "loading";

  // Dynamic won't reopen its login while it believes someone is logged in,
  // so clear it first; the sign-in that follows restores both sessions and
  // returns to `next`.
  const reconnect = useCallback(
    async (next: string) => {
      // Dynamic never loaded: nothing to sign in with yet — reload into `next`.
      if (!sdkHasLoaded) {
        window.location.assign(next);
        return;
      }
      if (dynamicLoggedIn) await handleLogOut().catch(() => undefined);
      openAuthModal({ next });
    },
    [sdkHasLoaded, dynamicLoggedIn, handleLogOut],
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
