"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  useDynamicContext,
  useSocialAccounts,
  useConnectWithOtp,
} from "@dynamic-labs/sdk-react-core";
import { ProviderEnum } from "@dynamic-labs/sdk-api-core";

const ERROR_MESSAGES: Record<string, string> = {
  missing_code: "That sign-in link was incomplete — try again.",
  auth_failed: "That sign-in link expired or was already used — try again.",
};

type Step = "options" | "email" | "code";

// One screen — Google / Apple / email primary, a small "Connect wallet"
// link for the ~5% who want it (see the founder's Polymarket reference:
// positioning, not pixel-matched layout). Built on Dynamic's headless
// hooks rather than its prebuilt widget so the primary path matches
// Rivaly's own design system exactly; the wallet path opens Dynamic's own
// modal instead — not worth hand-building a 320-wallet picker for the
// rare path. The actual "you're signed in now" handling (verify with
// Dynamic → mirror into Supabase → redirect) happens once, globally, in
// DynamicProvider's onAuthSuccess — this page only ever starts a method
// and shows its own busy/error state while doing so.
export default function LoginPage() {
  const searchParams = useSearchParams();
  const urlError = searchParams.get("error");

  const { setShowAuthFlow } = useDynamicContext();
  const { signInWithSocialAccount, isProcessingForProvider } = useSocialAccounts();
  const { connectWithEmail, verifyOneTimePassword, retryOneTimePassword } = useConnectWithOtp();

  const [step, setStep] = useState<Step>("options");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(urlError ? (ERROR_MESSAGES[urlError] ?? null) : null);

  async function handleEmailSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await connectWithEmail(email);
      setStep("code");
    } catch {
      setError("Couldn't send that code — check the address and try again.");
    } finally {
      setBusy(false);
    }
  }

  async function handleCodeSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await verifyOneTimePassword(code);
      // DynamicProvider's onAuthSuccess takes it from here — busy stays
      // true until the full-screen "Signing you in…" transition replaces
      // this page entirely.
    } catch {
      setError("Wrong code — check and try again.");
      setBusy(false);
    }
  }

  if (step === "code") {
    return (
      <main className="mx-auto flex min-h-[80vh] max-w-sm flex-col justify-center px-6 py-16">
        <h1 className="font-display text-2xl font-bold text-foreground">Check your email.</h1>
        <p className="mt-1.5 text-sm text-muted">Enter the code we sent to {email}.</p>

        <form onSubmit={handleCodeSubmit} className="mt-8 flex flex-col gap-3">
          <input
            type="text"
            inputMode="numeric"
            required
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="123456"
            autoComplete="one-time-code"
            className="w-full rounded-md border border-border bg-surface px-4 py-3 text-base text-foreground placeholder:text-muted focus:border-border-strong focus:outline-none"
            style={{ transition: "border-color 150ms ease" }}
          />
          {error && <p className="text-sm text-danger-red">{error}</p>}
          <button
            type="submit"
            disabled={busy}
            className="mt-1 w-full rounded-md bg-foreground py-3 text-sm font-medium text-background transition-transform duration-150 ease-out active:scale-[0.97] disabled:opacity-40"
          >
            {busy ? "Verifying…" : "Verify"}
          </button>
        </form>

        <button
          onClick={() => retryOneTimePassword()}
          className="hover-link mt-4 text-center text-sm text-muted transition-colors"
        >
          Resend code
        </button>
        <button
          onClick={() => {
            setStep("options");
            setCode("");
            setError(null);
          }}
          className="hover-link mt-2 text-center text-sm text-muted transition-colors"
        >
          ← Use a different method
        </button>
      </main>
    );
  }

  if (step === "email") {
    return (
      <main className="mx-auto flex min-h-[80vh] max-w-sm flex-col justify-center px-6 py-16">
        <h1 className="font-display text-2xl font-bold text-foreground">Enter your email.</h1>
        <p className="mt-1.5 text-sm text-muted">We&rsquo;ll send you a one-time code.</p>

        <form onSubmit={handleEmailSubmit} className="mt-8 flex flex-col gap-3">
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@email.com"
            autoComplete="email"
            className="w-full rounded-md border border-border bg-surface px-4 py-3 text-base text-foreground placeholder:text-muted focus:border-border-strong focus:outline-none"
            style={{ transition: "border-color 150ms ease" }}
          />
          {error && <p className="text-sm text-danger-red">{error}</p>}
          <button
            type="submit"
            disabled={busy}
            className="mt-1 w-full rounded-md bg-foreground py-3 text-sm font-medium text-background transition-transform duration-150 ease-out active:scale-[0.97] disabled:opacity-40"
          >
            {busy ? "Sending…" : "Continue"}
          </button>
        </form>

        <button
          onClick={() => {
            setStep("options");
            setError(null);
          }}
          className="hover-link mt-4 text-center text-sm text-muted transition-colors"
        >
          ← Back
        </button>
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-[80vh] max-w-sm flex-col justify-center px-6 py-16">
      <h1 className="font-display text-2xl font-bold text-foreground">Back your opinion.</h1>
      <p className="mt-1.5 text-sm text-muted">Sign in to Rivaly.</p>

      <div className="mt-8 flex flex-col gap-2.5">
        <button
          onClick={() => signInWithSocialAccount(ProviderEnum.Google)}
          disabled={isProcessingForProvider(ProviderEnum.Google)}
          className="w-full rounded-md border border-border-strong py-3 text-sm font-medium text-foreground transition-transform duration-150 ease-out active:scale-[0.97] disabled:opacity-40"
        >
          Continue with Google
        </button>
        <button
          onClick={() => signInWithSocialAccount(ProviderEnum.Apple)}
          disabled={isProcessingForProvider(ProviderEnum.Apple)}
          className="w-full rounded-md border border-border-strong py-3 text-sm font-medium text-foreground transition-transform duration-150 ease-out active:scale-[0.97] disabled:opacity-40"
        >
          Continue with Apple
        </button>
      </div>

      <div className="mt-5 flex items-center gap-3 text-xs text-muted">
        <span className="h-px flex-1 bg-border" />
        or
        <span className="h-px flex-1 bg-border" />
      </div>

      <button
        onClick={() => setStep("email")}
        className="mt-5 w-full rounded-md bg-foreground py-3 text-sm font-medium text-background transition-transform duration-150 ease-out active:scale-[0.97]"
      >
        Enter email
      </button>

      {error && <p className="mt-4 text-center text-sm text-danger-red">{error}</p>}

      <button
        onClick={() => setShowAuthFlow(true)}
        className="hover-link mt-8 text-center text-sm text-muted transition-colors"
      >
        Connect wallet →
      </button>
    </main>
  );
}
