"use client";

import { useState } from "react";
import Link from "next/link";
import { profiles } from "@/lib/mock-data";
import { useCurrentUser } from "./current-user-provider";
import { Avatar } from "./avatar";
import { BottomSheet } from "./bottom-sheet";

// "N rivals online" — a real, honest count (everyone in the mock roster
// besides you; swap for a real presence system later) rather than an
// invented number tuned to look impressive. Rendered as a real pill with
// visibly-sized avatars (not a bare inline row) — per founder feedback,
// the original text-xs/16px-avatar version read as too small and ambient
// to register as tappable. Sits inline next to Feed's Global/Following
// toggle rather than floating alone at the top of every Arena tab, so it
// only shows up where presence is actually relevant — you're about to see
// what people are doing, not on Leagues or Leaderboard where it has
// nothing to do with the content.
export function OnlineRivalsBadge() {
  const [open, setOpen] = useState(false);
  const currentUser = useCurrentUser();
  const online = profiles.filter((p) => p.id !== currentUser?.id);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="hover-border flex shrink-0 items-center gap-2 rounded-full border border-border bg-surface py-1.5 pl-1.5 pr-3.5 transition-colors"
      >
        <div className="flex -space-x-2.5">
          {online.slice(0, 3).map((p) => (
            <div key={p.id} className="relative">
              <Avatar name={p.displayName} size={26} />
              <span
                className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2"
                style={{ background: "var(--rival-green)", borderColor: "var(--surface)" }}
              />
            </div>
          ))}
        </div>
        <span className="text-sm font-medium text-foreground">{online.length} online</span>
      </button>

      <BottomSheet open={open} onClose={() => setOpen(false)} title="Rivals online now">
        <div className="flex max-h-[50vh] flex-col gap-1 overflow-y-auto">
          {online.map((p) => (
            <Link
              key={p.id}
              href={`/profile/${p.username}`}
              onClick={() => setOpen(false)}
              className="flex items-center gap-3 rounded-lg px-2 py-2.5 transition-colors duration-150 hover:bg-surface-elevated"
            >
              <div className="relative shrink-0">
                <Avatar name={p.displayName} size={36} />
                <span
                  className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2"
                  style={{ background: "var(--rival-green)", borderColor: "var(--surface)" }}
                />
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-foreground">{p.displayName}</p>
                <p className="truncate text-xs text-muted">@{p.username}</p>
              </div>
            </Link>
          ))}
        </div>
      </BottomSheet>
    </>
  );
}
