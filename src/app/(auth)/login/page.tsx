"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

const ERROR_MESSAGES: Record<string, string> = {
  missing_code: "That sign-in link was incomplete — try again.",
  auth_failed: "That sign-in link expired or was already used — try again.",
};

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") ?? "/";
  const urlError = searchParams.get("error");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(urlError ? ERROR_MESSAGES[urlError] ?? null : null);
  const [busy, setBusy] = useState(false);

  async function handleEmailLogin(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (error) {
      setError("Wrong email or password — double-check and try again.");
      return;
    }
    router.push(next);
    router.refresh();
  }

  async function handleGoogleLogin() {
    setError(null);
    const supabase = createClient();
    const redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`;
    await supabase.auth.signInWithOAuth({ provider: "google", options: { redirectTo } });
  }

  return (
    <main className="mx-auto flex min-h-[80vh] max-w-sm flex-col justify-center px-6 py-16">
      <h1 className="font-display text-2xl font-bold text-foreground">Back your opinion.</h1>
      <p className="mt-1.5 text-sm text-muted">Sign in to Rivaly.</p>

      <form onSubmit={handleEmailLogin} className="mt-8 flex flex-col gap-3">
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
        <input
          type="password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
          autoComplete="current-password"
          className="w-full rounded-md border border-border bg-surface px-4 py-3 text-base text-foreground placeholder:text-muted focus:border-border-strong focus:outline-none"
          style={{ transition: "border-color 150ms ease" }}
        />
        {error && <p className="text-sm text-danger-red">{error}</p>}
        <button
          type="submit"
          disabled={busy}
          className="mt-1 w-full rounded-md bg-foreground py-3 text-sm font-medium text-background transition-transform duration-150 ease-out active:scale-[0.97] disabled:opacity-40"
        >
          {busy ? "Signing in…" : "Sign in"}
        </button>
      </form>

      <div className="mt-5 flex items-center gap-3 text-xs text-muted">
        <span className="h-px flex-1 bg-border" />
        or
        <span className="h-px flex-1 bg-border" />
      </div>

      <div className="mt-5 flex flex-col gap-2.5">
        <button
          onClick={handleGoogleLogin}
          className="w-full rounded-md border border-border-strong py-3 text-sm font-medium text-foreground transition-transform duration-150 ease-out active:scale-[0.97]"
        >
          Continue with Google
        </button>
        <button
          disabled
          title="Available once Apple Sign-In is configured"
          className="w-full rounded-md border border-border py-3 text-sm font-medium text-muted opacity-40"
        >
          Continue with Apple
        </button>
      </div>

      <p className="mt-8 text-center text-sm text-muted">
        New to Rivaly?{" "}
        <Link href="/signup" className="hover-link text-foreground transition-colors">
          Create an account
        </Link>
      </p>
    </main>
  );
}
