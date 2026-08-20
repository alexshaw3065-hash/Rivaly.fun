"use client";

import { useState } from "react";
import Link from "next/link";
import { profiles, SELF_USER_ID } from "@/lib/mock-data";
import { Avatar } from "./avatar";
import { BottomSheet } from "./bottom-sheet";

// "N rivals online" — a real, honest count (everyone in the mock roster
// besides you; swap for a real presence system later) rather than an
// invented number tuned to look impressive. Deliberately small and
// ambient — an "online now" signal reads best as a quiet pulse you notice
// in passing (Discord's status dots, Twitter Spaces' "listening" pill),
// not a headline competing with primary navigation. Sits inline next to
// Feed's Global/Following toggle rather than floating alone at the top of
// every Arena tab, so it only shows up where presence is actually
// relevant — you're about to see what people are doing, not on Leagues or
// Leaderboard where it has nothing to do with the content.
export function OnlineRivalsBadge() {
  const [open, setOpen] = useState(false);
  const online = profiles.filter((p) => p.id !== SELF_USER_ID);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="hover-link flex shrink-0 items-center gap-1.5 text-muted transition-colors"
      >
        <div className="flex -space-x-1.5">
          {online.slice(0, 3).map((p) => (
            <Avatar key={p.id} name={p.displayName} size={16} />
          ))}
        </div>
        <span className="text-xs">{online.length} online</span>
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
