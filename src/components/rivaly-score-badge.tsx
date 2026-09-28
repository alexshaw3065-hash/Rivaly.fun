"use client";

import { useEffect, useState } from "react";
import type { Profile } from "@/lib/types";
import { fetchCardNumbers, type CardNumbers } from "@/lib/player-card-client";
import { RivalyScoreSheet } from "./rivaly-score-sheet";

const TIER_COLORS: Record<string, string> = { gold: "#c9a13a", silver: "#9ea3ab", bronze: "#a5673f" };

// The small pill next to @username: their card rating ("NR" until 3 settled
// rooms). Tap for the full card — one image, made on the server.
export function RivalyScoreBadge({ profile }: { profile: Profile }) {
  const [open, setOpen] = useState(false);
  const [card, setCard] = useState<CardNumbers | null>(null);
  useEffect(() => {
    let live = true;
    void fetchCardNumbers(profile.id).then((c) => live && setCard(c));
    return () => {
      live = false;
    };
  }, [profile.id]);
  const color = card?.tier ? TIER_COLORS[card.tier] : "var(--text-secondary)";

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        aria-label="View Rivaly card"
        className="flex items-center gap-1 rounded-full border px-2 py-0.5 tabular-nums text-caption font-semibold transition-transform duration-150 active:scale-[0.95]"
        style={{ borderColor: color, color }}
      >
        {card?.rating ?? "NR"}
      </button>
      <RivalyScoreSheet open={open} onClose={() => setOpen(false)} profile={profile} />
    </>
  );
}
