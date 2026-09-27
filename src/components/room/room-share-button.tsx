"use client";
import { withRef } from "@/lib/referral";
import { track } from "@/lib/analytics/track";

import { useState } from "react";
import { siteUrl } from "@/lib/site";

// Sharing is gameplay: a room without opponents isn't a room. Opens the
// phone's own share sheet (WhatsApp, X, DMs) with the call as a dare; falls
// back to copying the link where there's no native share.
export function RoomShareButton({
  path,
  claim,
  label,
  tone,
}: {
  path: string;
  claim: string;
  label?: string;
  /** An empty side of the pool: a quiet "challenge a rival" nudge in its colour. */
  tone?: "yes" | "no";
}) {
  const [copied, setCopied] = useState(false);

  async function share() {
    track("room_shared", { native: Boolean(navigator.share) });
    const url = withRef(siteUrl(path));
    const text = `“${claim}” — I've called it on Rivaly. Think I'm wrong? Prove it.`;
    if (navigator.share) {
      try {
        await navigator.share({ title: "Rivaly", text, url });
        return;
      } catch {
        // Cancelled, or the share target failed — fall through to copying.
      }
    }
    await navigator.clipboard?.writeText(url).catch(() => undefined);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  }

  if (tone) {
    return (
      <button
        type="button"
        onClick={() => void share()}
        className="flex w-full items-center justify-center gap-1.5 text-xs font-semibold transition-transform duration-150 active:scale-95"
        style={{ color: tone === "yes" ? "var(--rival-blue)" : "var(--rival-red)" }}
      >
        <ShareGlyph />
        {copied ? "Link copied" : "Empty — challenge a rival"}
      </button>
    );
  }

  if (label) {
    return (
      <button
        type="button"
        onClick={() => void share()}
        className="inline-flex min-h-10 items-center gap-2 rounded-full bg-rival-blue px-4 text-sm font-semibold text-white transition-transform duration-150 ease-out active:scale-[0.97]"
      >
        <ShareGlyph />
        {copied ? "Link copied" : label}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={() => void share()}
      aria-label={copied ? "Link copied" : "Share room"}
      className="flex h-9 w-9 items-center justify-center rounded-full bg-black/70 ring-1 ring-white/20 backdrop-blur-sm transition-[color,transform] duration-150 active:scale-90"
      style={{ color: copied ? "#7c9bff" : "#fff" }}
    >
      {copied ? (
        <svg width="15" height="15" viewBox="0 0 16 16" aria-hidden>
          <path d="m3.5 8.5 3 3 6-7" stroke="currentColor" strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      ) : (
        <ShareGlyph />
      )}
    </button>
  );
}

function ShareGlyph() {
  return (
    <svg width="15" height="15" viewBox="0 0 16 16" aria-hidden>
      <path d="M8 10V2.5M5 5.2 8 2.3l3 2.9" stroke="currentColor" strokeWidth="1.6" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M3.5 8.5v4a1 1 0 0 0 1 1h7a1 1 0 0 0 1-1v-4" stroke="currentColor" strokeWidth="1.6" fill="none" strokeLinecap="round" />
    </svg>
  );
}
