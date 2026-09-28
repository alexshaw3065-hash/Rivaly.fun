"use client";

import { withRef } from "@/lib/referral";
import { useState } from "react";
import { ShareIcon } from "./icons";
import { siteUrl } from "@/lib/site";

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
        const url = withRef(siteUrl(path));
        navigator.clipboard.writeText(url).then(() => {
          setCopied(true);
          window.setTimeout(() => setCopied(false), 1500);
        });
      }}
      aria-label={copied ? "Link copied" : `Share ${label}`}
      className={`relative shrink-0 p-0.5 transition-[transform,color] duration-100 ease-out before:absolute before:-inset-2 active:scale-[0.9] ${copied ? "text-yes-ink" : "text-secondary hover:text-foreground"}`}
    >
      <ShareIcon />
    </button>
  );
}
