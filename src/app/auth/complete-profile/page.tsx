"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

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

    router.push(next);
    router.refresh();
  }

  return (
    <main className="mx-auto flex min-h-[80vh] max-w-sm flex-col justify-center px-4 py-16 md:px-6">
      <h1 className="font-display text-2xl font-bold text-foreground">One more thing.</h1>
      <p className="mt-1.5 text-sm text-muted">Pick the username other rivals will see you as.</p>

      <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-1.5">
        <div
          className="flex w-full items-center rounded-md border bg-surface px-4 py-3 focus-within:border-border-strong"
          style={{
            borderColor: showFormatHint ? "var(--danger-red)" : "var(--border)",
            transition: "border-color 150ms ease",
          }}
        >
          <span className="font-mono text-base text-muted">@</span>
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value.toLowerCase())}
            onBlur={() => setTouched(true)}
            placeholder="username"
            autoComplete="username"
            autoFocus
            className="w-full bg-transparent font-mono text-base text-foreground placeholder:text-muted focus:outline-none"
          />
          {/* Live checkmark, not just an error after the fact — the same
              rule either way, just surfaced the moment it's satisfied
              instead of only the moment it isn't. */}
          {isValidFormat && (
            <span aria-hidden className="text-rival-green">
              ✓
            </span>
          )}
        </div>

        <p className={`min-h-[1.25rem] px-0.5 text-xs ${showFormatHint ? "text-danger-red" : "text-muted"}`}>
          {showFormatHint
            ? "3-20 characters: lowercase letters, numbers, underscores only."
            : "This is how other rivals will find and challenge you."}
        </p>

        {error && <p className="text-sm text-danger-red">{error}</p>}
        <button
          type="submit"
          disabled={busy || !isValidFormat}
          className="mt-2 w-full rounded-md bg-foreground py-3 text-sm font-medium text-background transition-transform duration-150 ease-out active:scale-[0.97] disabled:opacity-40"
        >
          {busy ? "Saving…" : "Continue"}
        </button>
      </form>
    </main>
  );
}
