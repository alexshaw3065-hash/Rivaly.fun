"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

const USERNAME_RE = /^[a-z0-9_]{3,20}$/;

export default function SignupPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") ?? "/";

  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [checkEmail, setCheckEmail] = useState(false);

  const usernameValid = USERNAME_RE.test(username);

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!usernameValid) {
      setError("Username must be 3-20 characters: lowercase letters, numbers, underscores only.");
      return;
    }
    if (!displayName.trim()) {
      setError("Add a display name — this is what other rivals see.");
      return;
    }

    setBusy(true);
    const supabase = createClient();
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { username, display_name: displayName.trim() },
        emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
      },
    });
    setBusy(false);

    if (error) {
      // Postgres unique_violation from the profiles.username constraint,
      // surfaced through the signup trigger — see 20260902190652_profiles.sql.
      if (error.message.toLowerCase().includes("duplicate") || error.message.toLowerCase().includes("unique")) {
        setError("That username is already taken — try another.");
      } else {
        setError(error.message);
      }
      return;
    }

    // Email confirmation is on by default for a new Supabase project —
    // no session yet until they click the link. If it's off, signUp()
    // already returns an active session and we can go straight in.
    if (data.session) {
      router.push(next);
      router.refresh();
    } else {
      setCheckEmail(true);
    }
  }

  async function handleGoogleSignup() {
    setError(null);
    const supabase = createClient();
    const redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`;
    await supabase.auth.signInWithOAuth({ provider: "google", options: { redirectTo } });
  }

  if (checkEmail) {
    return (
      <main className="mx-auto flex min-h-[80vh] max-w-sm flex-col items-center justify-center px-6 py-16 text-center">
        <h1 className="font-display text-2xl font-bold text-foreground">Check your email</h1>
        <p className="mt-2 text-sm text-muted">
          We sent a confirmation link to <span className="text-foreground">{email}</span>. Open it to
          finish creating your account.
        </p>
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-[80vh] max-w-sm flex-col justify-center px-6 py-16">
      <h1 className="font-display text-2xl font-bold text-foreground">Join the first rivals.</h1>
      <p className="mt-1.5 text-sm text-muted">Create your Rivaly account.</p>

      <form onSubmit={handleSignup} className="mt-8 flex flex-col gap-3">
        <input
          value={username}
          onChange={(e) => setUsername(e.target.value.toLowerCase())}
          placeholder="username"
          autoComplete="username"
          className="w-full rounded-md border border-border bg-surface px-4 py-3 font-mono text-base text-foreground placeholder:text-muted focus:border-border-strong focus:outline-none"
          style={{ transition: "border-color 150ms ease" }}
        />
        <input
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          placeholder="Display name"
          autoComplete="name"
          className="w-full rounded-md border border-border bg-surface px-4 py-3 text-base text-foreground placeholder:text-muted focus:border-border-strong focus:outline-none"
          style={{ transition: "border-color 150ms ease" }}
        />
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
          minLength={6}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
          autoComplete="new-password"
          className="w-full rounded-md border border-border bg-surface px-4 py-3 text-base text-foreground placeholder:text-muted focus:border-border-strong focus:outline-none"
          style={{ transition: "border-color 150ms ease" }}
        />
        {error && <p className="text-sm text-danger-red">{error}</p>}
        <button
          type="submit"
          disabled={busy}
          className="mt-1 w-full rounded-md bg-foreground py-3 text-sm font-medium text-background transition-transform duration-150 ease-out active:scale-[0.97] disabled:opacity-40"
        >
          {busy ? "Creating account…" : "Create account"}
        </button>
      </form>

      <div className="mt-5 flex items-center gap-3 text-xs text-muted">
        <span className="h-px flex-1 bg-border" />
        or
        <span className="h-px flex-1 bg-border" />
      </div>

      <button
        onClick={handleGoogleSignup}
        className="mt-5 w-full rounded-md border border-border-strong py-3 text-sm font-medium text-foreground transition-transform duration-150 ease-out active:scale-[0.97]"
      >
        Continue with Google
      </button>

      <p className="mt-8 text-center text-sm text-muted">
        Already have an account?{" "}
        <Link href="/login" className="hover-link text-foreground transition-colors">
          Sign in
        </Link>
      </p>
    </main>
  );
}
