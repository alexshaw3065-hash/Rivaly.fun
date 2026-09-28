"use client";

import { withRef } from "@/lib/referral";
import Link from "next/link";
import { useState } from "react";
import { useCurrentUser } from "@/components/current-user-provider";
import { openAuthModal } from "@/lib/auth-modal-store";
import { siteUrl } from "@/lib/site";

// The gift icon's destination. Rivaly doesn't do bonus/promo-driven
// retention (see docs/masterplan/09-competitive-research.md#5.3 — "social
// investment," not free money), and there's no referral system yet — so
// this is honest: your real profile link, to send to someone who thinks
// differently. No invented code, no invented "joined" count.
export default function InvitePage() {
  const me = useCurrentUser();
  const [copied, setCopied] = useState(false);
  const path = me ? `/profile/${me.username}` : null;

  async function copy() {
    if (!path) return;
    await navigator.clipboard?.writeText(withRef(siteUrl(path))).catch(() => undefined);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  async function share() {
    if (!path) return;
    const url = withRef(siteUrl(path));
    try {
      if (navigator.share) await navigator.share({ title: "Rivaly", text: "Think you know football better than me? Prove it on Rivaly.", url });
      else await copy();
    } catch {
      // cancelled
    }
  }

  return (
    <main className="mx-auto max-w-xl px-4 py-16 text-center md:px-6">
      <p className="tabular-nums text-caption uppercase text-yes-ink">Invite</p>
      <h1 className="mt-3 font-display text-3xl font-bold text-foreground md:text-4xl">Find your rival.</h1>
      <p className="mt-3 text-body text-secondary">
        A room without opponents isn&rsquo;t a room. Send your link — whoever disagrees with you joins on the other side.
      </p>

      {me && path ? (
        <>
          <div className="mt-8 flex items-center justify-center gap-2">
            <code className="max-w-full truncate rounded-control border border-line bg-surface px-4 py-3 font-mono text-body text-foreground">rivaly.fun{path}</code>
            <button
              onClick={copy}
              className="shrink-0 rounded-control border border-line-strong px-4 py-3 text-body font-medium text-foreground transition-transform duration-150 ease-out active:scale-[0.97]"
            >
              {copied ? "Copied" : "Copy link"}
            </button>
          </div>
          <button onClick={share} className="mt-4 rounded-full px-6 py-3 text-body font-bold text-white" style={{ background: "var(--yes)" }}>
            Share your profile
          </button>
          <p className="mt-6 text-caption text-secondary">
            Or share a room — every room has its own link. <Link href="/rooms" className="underline">Find one</Link>
          </p>
        </>
      ) : (
        <button onClick={() => openAuthModal({ next: "/invite" })} className="mt-8 rounded-full px-6 py-3 text-body font-bold text-white" style={{ background: "var(--yes)" }}>
          Sign in to get your link
        </button>
      )}
    </main>
  );
}
