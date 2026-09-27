"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  DynamicContextProvider,
  getAuthToken,
  useDynamicContext,
  useIsLoggedIn,
} from "@dynamic-labs/sdk-react-core";
import { SolanaWalletConnectors } from "@dynamic-labs/solana";
import { createClient } from "@/lib/supabase/client";
import { bridgeDynamicSession } from "@/app/auth/dynamic-actions";
import { prewarmDynamicAuth } from "@/app/auth/prewarm";
import { useCurrentUser } from "./current-user-provider";
import { useIsLightTheme } from "./theme-toggle";
import { RivalyWordmark } from "./rivaly-wordmark";
import { getAuthModalNext, useAuthModalState } from "@/lib/auth-modal-store";
import { clearSignOutFlag, finishDynamicLogout, signOutPending } from "@/lib/sign-out-state";

// Dynamic's own OAuth round-trip (opening the provider's popup, the
// redirect back) happens before onAuthSuccess ever fires, so by the time
// this screen shows, real time has already passed and more is coming —
// live-measured backend bridge latency alone runs ~0.7-1.5s. A bare
// spinner reads slower than it is; naming what's actually happening
// (verifying, then the account, then the wallet) gives the same wait
// something to say instead of nothing. Capped at 3 phrases — this is a
// utility wait, not a moment to perform on (see rivaly-engagement-
// psychology's SportyBet note: remove friction, don't decorate it).
const BRIDGING_PHRASES = ["Verifying your login…", "Setting up your account…", "Almost there…"];

// Real hang found via a real signup recording: with no timeout, a stalled
// step (network hiccup, a hung serverless call) left the bridging overlay
// on screen indefinitely — the only way out was a manual page refresh.
// This caps the wait instead of trusting every step to always resolve.
const BRIDGE_TIMEOUT_MS = 15000;

const environmentId = process.env.NEXT_PUBLIC_DYNAMIC_ENVIRONMENT_ID;

// Dynamic's wallet catalogue marks Phantom (and a few others) as Ledger-
// capable, which inserts a "Using Ledger? Toggle / Connect" screen before
// every wallet sign-in. Almost nobody signs in with a hardware wallet, so
// that screen is pure friction: report no hardware support and the wallet
// connects straight away. (Worth revisiting on mainnet if Ledger users ask.)
type ConnectorClass = ReturnType<typeof SolanaWalletConnectors>[number];
const SolanaConnectorsWithoutLedgerStep = (props: unknown): ConnectorClass[] =>
  SolanaWalletConnectors(props).map((Connector) => {
    // The catalogue's constructor types are abstract-ish; treat it as a plain class.
    const Base = Connector as unknown as new (...args: never[]) => object;
    class NoLedgerStep extends Base {
      canConnectWithHardwareWallet() {
        return false;
      }
    }
    return NoLedgerStep as unknown as ConnectorClass;
  });

// Stable reference across renders — see the memoization note below on why
// this matters.
const walletConnectors = [SolanaConnectorsWithoutLedgerStep];

// Covers the case onAuthSuccess alone can't: Dynamic already considers
// this browser authenticated (a previous attempt got past Dynamic but
// never finished the bridge — a network hiccup, a closed tab mid-flow)
// but there's no real Rivaly/Supabase session yet. Dynamic won't let
// someone "log in" again once it thinks they already are, so without this,
// they'd be stuck on the login screen with no way to retry. Gated on
// there being no current Rivaly user so this doesn't re-run the bridge on
// every navigation once someone is actually fully signed in — Dynamic
// stays "logged in" forever after a real login, that alone isn't a signal
// anything needs to happen.
//
// Also follows account switches: each wallet is its own Rivaly account, so
// when the wallet app switches to a different wallet and Dynamic signs in as
// that one, the Rivaly account switches with it — same page, no prompt.
function DynamicAuthWatcher({ onAuthSuccess }: { onAuthSuccess: (opts?: { stayHere?: boolean }) => void }) {
  const isLoggedIn = useIsLoggedIn();
  const { user: dynamicUser, handleLogOut } = useDynamicContext();
  const currentUser = useCurrentUser();
  const attempted = useRef(false);
  const switchedFor = useRef<string | null>(null);

  useEffect(() => {
    // Mid sign-out (or one Dynamic never confirmed, even across a reload):
    // this same shape means "finish logging out", not "sign back in".
    if (isLoggedIn && !currentUser && signOutPending()) {
      void finishDynamicLogout(handleLogOut);
      return;
    }
    if (isLoggedIn && !currentUser && !attempted.current) {
      attempted.current = true;
      onAuthSuccess();
    }
  }, [isLoggedIn, currentUser, onAuthSuccess, handleLogOut]);

  useEffect(() => {
    const address = currentUser?.dynamicWalletAddress;
    if (!isLoggedIn || !dynamicUser || !address) return;
    const credentials = dynamicUser.verifiedCredentials ?? [];
    const sameAccount = credentials.some((c) => c.address === address);
    if (sameAccount || switchedFor.current === dynamicUser.userId) return;
    switchedFor.current = dynamicUser.userId ?? null;
    onAuthSuccess({ stayHere: true });
  }, [isLoggedIn, dynamicUser, currentUser, onAuthSuccess]);

  return null;
}

const ERROR_MESSAGES: Record<string, string> = {
  missing_code: "That sign-in link was incomplete — try again.",
  auth_failed: "That sign-in link expired or was already used — try again.",
};

// The actual sign-in/sign-up UI is Dynamic's own prebuilt modal, not a
// custom-built one — it already covers Google, email OTP, and 150+ wallets
// out of the box, and any look-and-feel changes happen in Dynamic's own
// dashboard (Design settings), not in this codebase. This component is just
// the bridge: every openAuthModal() call anywhere in the app (the nav CTA,
// a protected action's redirect, the /login route shim) bumps openId in
// auth-modal-store.ts, and this watcher reacts to that by calling Dynamic's
// setShowAuthFlow(true) — it has to live inside DynamicContextProvider's
// tree since that hook only works for its descendants, which DynamicAuthBridge
// itself (the component that renders DynamicContextProvider) isn't.
function AuthFlowTrigger({ onUrlError }: { onUrlError: (message: string) => void }) {
  const { setShowAuthFlow } = useDynamicContext();
  const { error, openId } = useAuthModalState();
  const seen = useRef(0);

  useEffect(() => {
    if (openId === seen.current) return;
    seen.current = openId;
    if (error) onUrlError(ERROR_MESSAGES[error] ?? error);
    setShowAuthFlow(true);
    // Fire-and-forget — see prewarm.ts for why. Never awaited: the modal
    // must open immediately regardless of whether this succeeds.
    void prewarmDynamicAuth();
  }, [openId, error, setShowAuthFlow, onUrlError]);

  return null;
}

// One global success handler for every way Dynamic can authenticate
// someone (Google, Apple, email OTP, or a connected wallet) — mounted at
// the provider level rather than duplicated per-page, since "a Dynamic
// login just succeeded" should always mean the same thing everywhere:
// bridge it into a real Supabase session, then continue wherever the user
// was headed. See src/app/auth/dynamic-actions.ts for what the bridge
// itself does.
function DynamicAuthBridge({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [bridging, setBridging] = useState(false);
  const [bridgeError, setBridgeError] = useState<string | null>(null);
  const [phraseIndex, setPhraseIndex] = useState(0);
  // Dynamic's own modal has no "auto" that follows Rivaly's manual
  // light/dark toggle (its own "auto" only follows the OS's
  // prefers-color-scheme) — this keeps the two in sync explicitly instead.
  // A separate top-level prop from `settings`, so changing it can't trip
  // the settings-memoization issue described below.
  const isLightTheme = useIsLightTheme();

  // Advances through BRIDGING_PHRASES on a fixed clock rather than tying
  // each phrase to a real step finishing — the real steps don't have even,
  // predictable durations (see the login-speed numbers this was measured
  // against), and a phrase that visibly stalls mid-word reads worse than
  // one that just keeps moving.
  useEffect(() => {
    if (!bridging) return;
    const id = setInterval(() => {
      setPhraseIndex((i) => Math.min(i + 1, BRIDGING_PHRASES.length - 1));
    }, 900);
    return () => clearInterval(id);
  }, [bridging]);

  // Guards against a real double-fire: Dynamic's own onAuthSuccess event
  // and DynamicAuthWatcher's recovery effect both call this same function,
  // and nothing previously stopped both from running concurrently for the
  // same real login (the watcher's isLoggedIn && !currentUser condition
  // can be true for a moment even during a completely normal login, before
  // the bridge has had a chance to establish a session). Two concurrent
  // bridge attempts racing generateLink against each other is exactly the
  // kind of thing that invalidates the other's magic-link token underneath
  // it — a re-entrant call while one is already running is just a no-op.
  const inFlightRef = useRef(false);

  const handleAuthSuccess = useCallback(async (opts?: { stayHere?: boolean }) => {
    if (inFlightRef.current) return;
    if (signOutPending()) return; // never re-bridge a session the user just signed out of
    const dynamicJwt = getAuthToken();
    if (!dynamicJwt) return;

    inFlightRef.current = true;
    setBridgeError(null);
    setPhraseIndex(0);
    setBridging(true);

    // Found via a real signup recording: with no timeout, a stalled step
    // left this overlay on screen indefinitely — the sign-in had actually
    // already gone through underneath it, invisible behind the stuck full-
    // screen state, and the only way out was a manual refresh. This just
    // stops blocking the UI past a reasonable wait; it doesn't cancel the
    // underlying work, so a slow-but-eventually-successful attempt still
    // redirects on its own if it finishes after the timeout fires.
    let timedOut = false;
    const timeoutId = setTimeout(() => {
      timedOut = true;
      inFlightRef.current = false;
      setBridging(false);
      setBridgeError("That's taking longer than expected — try again.");
    }, BRIDGE_TIMEOUT_MS);

    try {
      const result = await bridgeDynamicSession(dynamicJwt);
      if (!result.ok) {
        if (!timedOut) setBridgeError(result.error);
        return;
      }

      const supabase = createClient();
      const { error } = await supabase.auth.verifyOtp({
        token_hash: result.hashedToken,
        type: "magiclink",
      });
      if (error) {
        if (!timedOut) setBridgeError("Couldn't sign you in — try again.");
        return;
      }

      // Read off the auth-modal store rather than the URL — the modal can
      // now open over any page (not just a dedicated /login?next=...
      // route), so by the time a login actually finishes, the page the
      // user is sitting on may have no relationship to where they were
      // headed. The store is the one place that value still reliably
      // exists.
      const next = opts?.stayHere ? `${window.location.pathname}${window.location.search}` : getAuthModalNext();
      const destination = result.usernameIsPlaceholder
        ? `/auth/complete-profile?next=${encodeURIComponent(next)}`
        : next;

      router.push(destination);
      router.refresh();
    } finally {
      clearTimeout(timeoutId);
      // DynamicProvider wraps the whole app at the root layout and never
      // unmounts on a client-side navigation — router.push above changes
      // the page underneath, not this component, so bridging has to be
      // explicitly cleared here. This exact line was missing before: the
      // success path used to just navigate away and leave bridging stuck
      // true forever, which is why the overlay never went away on its own.
      if (!timedOut) {
        setBridging(false);
        inFlightRef.current = false;
      }
    }
  }, [router]);

  // DynamicContextProvider takes this whole object as one `settings` prop —
  // a fresh object/array/function on every render (which a plain inline
  // literal here would be) reads as "the config changed" and can tear down
  // and re-register its internal auth-success listener mid-flight, which is
  // exactly the kind of thing that silently drops an in-progress OAuth
  // redirect's completion event. Memoizing keeps it referentially stable.
  const settings = useMemo(
    () => ({
      environmentId: environmentId ?? "",
      walletConnectors,
      events: {
        // A genuine sign-in from the modal — it overrides any unfinished sign-out.
        onAuthSuccess: () => {
          clearSignOutFlag();
          void handleAuthSuccess();
        },
      },
    }),
    [handleAuthSuccess],
  );

  return (
    <DynamicContextProvider settings={settings} theme={isLightTheme ? "light" : "dark"}>
      <DynamicAuthWatcher onAuthSuccess={handleAuthSuccess} />
      <AuthFlowTrigger onUrlError={setBridgeError} />
      {children}

      {/* A dimmed overlay, not an opaque full-page takeover — same
          backdrop-plus-centered-card treatment Dynamic's own "Logging you
          in" step already uses, so this reads as one continuous moment
          instead of two different UI languages back to back. The page
          stays dimly visible underneath instead of vanishing behind a flat
          background, which also makes it obvious this is a brief overlay
          on top of something, not a new screen you've navigated to. */}
      {bridging && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-4 rounded-2xl border border-border bg-surface-elevated px-10 py-8 shadow-2xl">
            <div style={{ animation: "live-pulse 1.6s ease-in-out infinite" }}>
              <RivalyWordmark />
            </div>
            <p key={phraseIndex} className="stagger-in font-display text-sm text-muted" role="status">
              {BRIDGING_PHRASES[phraseIndex]}
            </p>
          </div>
        </div>
      )}
      {bridgeError && !bridging && (
        <div className="fixed inset-x-0 bottom-[calc(1.5rem+env(safe-area-inset-bottom))] z-50 mx-auto w-fit rounded-md border border-border bg-surface px-4 py-2.5 text-sm text-danger-red shadow-lg">
          {bridgeError}
        </div>
      )}
    </DynamicContextProvider>
  );
}

export function DynamicProvider({ children }: { children: React.ReactNode }) {
  return <DynamicAuthBridge>{children}</DynamicAuthBridge>;
}
