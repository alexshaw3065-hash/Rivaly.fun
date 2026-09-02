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
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
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
    <main className="mx-auto flex min-h-[80vh] max-w-sm flex-col justify-center px-6 py-16">
      <h1 className="font-display text-2xl font-bold text-foreground">One more thing.</h1>
      <p className="mt-1.5 text-sm text-muted">Pick the username other rivals will see you as.</p>

      <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-3">
        <input
          value={username}
          onChange={(e) => setUsername(e.target.value.toLowerCase())}
          placeholder="username"
          autoComplete="username"
          autoFocus
          className="w-full rounded-md border border-border bg-surface px-4 py-3 font-mono text-base text-foreground placeholder:text-muted focus:border-border-strong focus:outline-none"
          style={{ transition: "border-color 150ms ease" }}
        />
        {error && <p className="text-sm text-danger-red">{error}</p>}
        <button
          type="submit"
          disabled={busy || !username}
          className="mt-1 w-full rounded-md bg-foreground py-3 text-sm font-medium text-background transition-transform duration-150 ease-out active:scale-[0.97] disabled:opacity-40"
        >
          {busy ? "Saving…" : "Continue"}
        </button>
      </form>
    </main>
  );
}
