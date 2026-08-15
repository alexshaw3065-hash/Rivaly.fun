"use client";

import { useState } from "react";

// The gift icon's destination. Rivaly doesn't do bonus/promo-driven
// retention (see docs/masterplan/09-competitive-research.md#5.3 — "social
// investment," not free money) so this is a referral link, not a
// claim-a-reward screen. Reuses the exact code-chip + copy pattern from the
// Create Room share flow for a consistent "share something real" feeling.
const REFERRAL_CODE = "RIVAL-VJ2026";
const JOINED_COUNT = 7;

export default function InvitePage() {
  const [copied, setCopied] = useState(false);

  return (
    <main className="mx-auto max-w-xl px-6 py-16 text-center">
      <p className="font-mono text-[11px] uppercase tracking-wider text-rival-blue">Invite</p>
      <h1 className="mt-3 font-display text-3xl font-bold text-foreground md:text-4xl">
        Find your rival.
      </h1>
      <p className="mt-3 text-sm text-muted">
        A room without opponents isn&rsquo;t a room. Share your link — whoever disagrees with you
        joins on the other side.
      </p>

      <div className="mt-8 flex items-center justify-center gap-2">
        <code className="rounded-md border border-border bg-surface px-4 py-2.5 font-mono text-sm text-foreground">
          {REFERRAL_CODE}
        </code>
        <button
          onClick={() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
          }}
          className="rounded-md border border-border-strong px-4 py-2.5 text-sm font-medium text-foreground transition-transform duration-150 ease-out active:scale-[0.97]"
        >
          {copied ? "Copied" : "Copy link"}
        </button>
      </div>

      <p className="mt-8 font-mono text-sm text-muted">
        <span className="font-medium text-foreground">{JOINED_COUNT} rivals</span> joined through
        your invites.
      </p>
    </main>
  );
}
