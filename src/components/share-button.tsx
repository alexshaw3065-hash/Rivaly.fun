"use client";

import { withRef } from "@/lib/referral";
import { useState } from "react";
import { ShareIcon } from "./icons";

// Copies a shareable link to the clipboard — same pattern already used on
// Profile (see ShareButton in profile-view.tsx), generalized to take an
// explicit path since this fires from cards that aren't themselves the
// target page (e.g. a room card on Home, not the room page itself).
// Same bare-icon styling convention as BookmarkButton right next to it.
export function ShareButton({ path, label = "item" }: { path: string; label?: string }) {
  const [copied, setCopied] = useState(false);

  return (
    <button
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        const url = withRef(`${window.location.origin}${path}`);
        navigator.clipboard.writeText(url).then(() => {
          setCopied(true);
          window.setTimeout(() => setCopied(false), 1500);
        });
      }}
      aria-label={copied ? "Link copied" : `Share ${label}`}
      className="shrink-0 p-0.5 active:scale-[0.9]"
      style={{
        color: copied ? "var(--rival-blue)" : "var(--muted)",
        transition: "transform 150ms ease-out, color 150ms ease",
      }}
    >
      <ShareIcon />
    </button>
  );
}
