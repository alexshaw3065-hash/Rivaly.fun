"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { markUsernameClaimed } from "@/components/username-gate";

const USERNAME_RE = /^[a-z0-9_]{3,20}$/;

// OAuth signups (Google/Apple) never collect a username up front — they
// land here once, with a generated placeholder, to claim a real one
// before continuing wherever they were headed (auth/callback/route.ts
// routes here only when profiles.username_is_placeholder is true).
export default function CompleteProfilePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") ?? "/";

  const [username, setUsername] = useState("");
  const [touched, setTouched] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Live, not just on submit — the same USERNAME_RE the server-side check
  // already enforces, just surfaced the moment it'd fail rather than only
  // after tapping Continue. Empty and untouched shows nothing; the founder
  // shouldn't see red before they've typed a single character.
  const isValidFormat = USERNAME_RE.test(username);
  const showFormatHint = touched && username.length > 0 && !isValidFormat;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setTouched(true);
    setError(null);

    if (!USERNAME_RE.test(username)) {
      setError("Username must be 3-20 characters: lowercase letters, numbers, underscores only.");
      return;
    }

    setBusy(true);
    const supabase = createClient();
    const { error } = await supabase
      .from("profiles")
      .update({ username, username_is_placeholder: false })
      .eq("username_is_placeholder", true);
    setBusy(false);

    if (error) {
      if (error.message.toLowerCase().includes("duplicate") || error.message.toLowerCase().includes("unique")) {
        setError("That username is already taken — try another.");
      } else {
        setError(error.message);
      }
      return;
    }

    markUsernameClaimed();
    router.push(next);
    router.refresh();
  }

  return (
    <main className="mx-auto flex min-h-[80vh] max-w-sm flex-col justify-center px-4 py-16 md:px-6">
      <h1 className="text-title-1 font-display text-foreground">One more thing.</h1>
      <p className="mt-1.5 text-body text-secondary">Pick the username other rivals will see you as.</p>

      <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-1.5">
        <div className={`flex h-12 w-full items-center rounded-control border bg-surface px-4 transition-colors duration-150 ${showFormatHint ? "border-no" : "border-line-strong focus-within:border-yes"}`}>
          <span className="tabular-nums text-body-lg text-secondary">@</span>
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value.toLowerCase())}
            onBlur={() => setTouched(true)}
            placeholder="username"
            autoComplete="username"
            autoFocus
            className="w-full bg-transparent tabular-nums text-body-lg text-foreground placeholder:text-tertiary focus:outline-none"
          />
          {/* Live checkmark, not just an error after the fact — the same
              rule either way, just surfaced the moment it's satisfied
              instead of only the moment it isn't. */}
          {isValidFormat && (
            <span aria-hidden className="text-money-ink">
              ✓
            </span>
          )}
        </div>

        <p className={`min-h-[1.25rem] px-0.5 text-caption ${showFormatHint ? "text-no-ink" : "text-secondary"}`}>
          {showFormatHint
            ? "3-20 characters: lowercase letters, numbers, underscores only."
            : "This is how other rivals will find and challenge you."}
        </p>

        {error && <p className="text-body text-no-ink">{error}</p>}
        <button
          type="submit"
          disabled={busy || !isValidFormat}
          className="mt-2 h-12 w-full rounded-control bg-foreground text-body-lg font-semibold text-background transition-transform duration-100 ease-out active:scale-[0.97] disabled:opacity-40"
        >
          {busy ? "Saving…" : "Continue"}
        </button>
        <p className="mt-3 text-center text-caption text-secondary">
          By continuing you confirm you&apos;re 18 or over and agree to Rivaly&apos;s{" "}
          <Link href="/terms" target="_blank" className="underline underline-offset-2 hover:text-foreground">
            Terms of Use
          </Link>{" "}
          and{" "}
          <Link href="/privacy" target="_blank" className="underline underline-offset-2 hover:text-foreground">
            Privacy Policy
          </Link>
          .
        </p>
      </form>
    </main>
  );
}
