"use client";

import { useState, type FormEvent } from "react";

type Status = "idle" | "loading" | "success" | "error";

export function WaitlistForm({ onJoined }: { onJoined?: () => void }) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState("");

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (status === "loading") return;

    setStatus("loading");
    setMessage("");

    const ref =
      typeof window !== "undefined"
        ? new URLSearchParams(window.location.search).get("ref")
        : null;

    try {
      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, source: "landing", ref }),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok && res.status !== 202) {
        setStatus("error");
        setMessage(
          data?.error === "invalid_email"
            ? "That email doesn't look right."
            : "Something went wrong. Try again.",
        );
        return;
      }

      setStatus("success");
      setMessage(
        data?.already ? "You're already in. We'll see you at kickoff." : "",
      );
      onJoined?.();
    } catch {
      setStatus("error");
      setMessage("Network hiccup. Try again.");
    }
  }

  if (status === "success") {
    return (
      <div className="w-full max-w-md text-center animate-[fadeIn_0.4s_ease]">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-victory-green/15 ring-1 ring-victory-green/40">
          <svg
            viewBox="0 0 24 24"
            className="h-7 w-7 text-victory-green"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M20 6 9 17l-5-5" />
          </svg>
        </div>
        <h3 className="text-xl font-semibold">You&apos;re on the list.</h3>
        <p className="mt-2 text-sm text-muted">
          {message || "First whistle is coming. You'll be first through the gate."}
        </p>
        <ShareRow />
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-md">
      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          type="email"
          required
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            if (status === "error") setStatus("idle");
          }}
          placeholder="you@email.com"
          aria-label="Email address"
          className="h-12 flex-1 rounded-xl border border-border bg-surface px-4 text-base text-foreground outline-none transition-colors placeholder:text-muted focus:border-rival-blue"
        />
        <button
          type="submit"
          disabled={status === "loading"}
          className="h-12 rounded-xl bg-rival-blue px-6 font-semibold text-white transition-all hover:brightness-110 active:scale-[0.98] disabled:opacity-70"
        >
          {status === "loading" ? "Joining…" : "Claim your spot"}
        </button>
      </div>
      <p
        className={`mt-2 min-h-5 text-sm ${
          status === "error" ? "text-error" : "text-muted"
        }`}
      >
        {status === "error"
          ? message
          : "No spam. Just your invite when the gates open."}
      </p>
    </form>
  );
}

function ShareRow() {
  const [copied, setCopied] = useState(false);
  const shareText = "I just backed my football opinion. Think you can beat me?";
  const url = "https://rivaly.fun";

  async function copy() {
    try {
      await navigator.clipboard.writeText(`${shareText} ${url}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard blocked — no-op */
    }
  }

  const tweet = `https://twitter.com/intent/tweet?text=${encodeURIComponent(
    shareText,
  )}&url=${encodeURIComponent(url)}`;

  return (
    <div className="mt-6 flex items-center justify-center gap-3">
      <a
        href={tweet}
        target="_blank"
        rel="noopener noreferrer"
        className="rounded-lg border border-border px-4 py-2 text-sm text-foreground transition-colors hover:border-rival-blue"
      >
        Call out a rival
      </a>
      <button
        onClick={copy}
        className="rounded-lg border border-border px-4 py-2 text-sm text-foreground transition-colors hover:border-victory-green"
      >
        {copied ? "Copied!" : "Copy invite link"}
      </button>
    </div>
  );
}
