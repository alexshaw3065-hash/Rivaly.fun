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
import { useCurrentUser } from "./current-user-provider";
import { getAuthModalNext, useAuthModalState } from "@/lib/auth-modal-store";

const environmentId = process.env.NEXT_PUBLIC_DYNAMIC_ENVIRONMENT_ID;
// Stable reference across renders — see the memoization note below on why
// this matters.
const walletConnectors = [SolanaWalletConnectors];

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
function DynamicAuthWatcher({ onAuthSuccess }: { onAuthSuccess: () => void }) {
  const isLoggedIn = useIsLoggedIn();
  const currentUser = useCurrentUser();
  const attempted = useRef(false);

  useEffect(() => {
    if (isLoggedIn && !currentUser && !attempted.current) {
      attempted.current = true;
      onAuthSuccess();
    }
  }, [isLoggedIn, currentUser, onAuthSuccess]);

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

  const handleAuthSuccess = useCallback(async () => {
    const dynamicJwt = getAuthToken();
    if (!dynamicJwt) return;

    setBridgeError(null);
    setBridging(true);

    const result = await bridgeDynamicSession(dynamicJwt);
    if (!result.ok) {
      setBridging(false);
      setBridgeError(result.error);
      return;
    }

    const supabase = createClient();
    const { error } = await supabase.auth.verifyOtp({
      token_hash: result.hashedToken,
      type: "magiclink",
    });
    if (error) {
      setBridging(false);
      setBridgeError("Couldn't sign you in — try again.");
      return;
    }

    // Read off the auth-modal store rather than the URL — the modal can
    // now open over any page (not just a dedicated /login?next=... route),
    // so by the time a login actually finishes, the page the user is
    // sitting on may have no relationship to where they were headed. The
    // store is the one place that value still reliably exists.
    const next = getAuthModalNext();
    const destination = result.usernameIsPlaceholder
      ? `/auth/complete-profile?next=${encodeURIComponent(next)}`
      : next;

    router.push(destination);
    router.refresh();
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
      events: { onAuthSuccess: handleAuthSuccess },
    }),
    [handleAuthSuccess],
  );

  return (
    <DynamicContextProvider settings={settings}>
      <DynamicAuthWatcher onAuthSuccess={handleAuthSuccess} />
      <AuthFlowTrigger onUrlError={setBridgeError} />
      {children}

      {/* An immediate, branded full-screen transition the instant Dynamic
          confirms login — not a spinner glued to the button someone just
          tapped. The bridge's real latency (see the login-speed
          conversation this was designed against) finishes underneath
          this, out of sight, rather than leaving the sign-in form up
          while it works. */}
      {bridging && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-3 bg-background">
          <span
            className="h-6 w-6 animate-spin rounded-full border-2 border-t-transparent"
            style={{ borderColor: "var(--border-strong)", borderTopColor: "transparent" }}
            aria-label="Signing you in"
          />
          <p className="font-display text-sm text-muted">Signing you in…</p>
        </div>
      )}
      {bridgeError && !bridging && (
        <div className="fixed inset-x-0 bottom-6 z-50 mx-auto w-fit rounded-md border border-border bg-surface px-4 py-2.5 text-sm text-danger-red shadow-lg">
          {bridgeError}
        </div>
      )}
    </DynamicContextProvider>
  );
}

export function DynamicProvider({ children }: { children: React.ReactNode }) {
  return <DynamicAuthBridge>{children}</DynamicAuthBridge>;
}
