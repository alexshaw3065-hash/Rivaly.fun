"use client";

import { useState } from "react";

// Sharing is gameplay: a room without opponents isn't a room. Opens the
// phone's own share sheet (WhatsApp, X, DMs) with the call as a dare; falls
// back to copying the link where there's no native share.
export function RoomShareButton({ path, claim, label }: { path: string; claim: string; label?: string }) {
  const [copied, setCopied] = useState(false);

  async function share() {
    const url = `${window.location.origin}${path}`;
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
      className="flex h-9 items-center gap-1.5 rounded-full bg-black/40 px-3 text-xs font-semibold text-white/85 transition-[color,transform] duration-150 hover:text-white active:scale-95"
    >
      <ShareGlyph />
      {copied ? "Copied" : "Share"}
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
