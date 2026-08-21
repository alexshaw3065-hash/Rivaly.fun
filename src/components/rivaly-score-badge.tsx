"use client";

import { useState } from "react";
import type { Profile } from "@/lib/types";
import { computeRivalyScore } from "@/lib/rivaly-score";
import { RivalyScoreSheet } from "./rivaly-score-sheet";

const TIER_COLORS: Record<string, string> = {
  gold: "#c9a13a",
  silver: "#9ea3ab",
  bronze: "#a5673f",
};

// The minimal trigger — a small tier-tinted pill with just the score
// number, sitting next to @username. Tap opens the full shareable card.
export function RivalyScoreBadge({ profile }: { profile: Profile }) {
  const [open, setOpen] = useState(false);
  const { score, tier } = computeRivalyScore(profile.id);
  const color = TIER_COLORS[tier];

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        aria-label="View Rivaly Score"
        className="flex items-center gap-1 rounded-full border px-2 py-0.5 font-mono text-xs font-semibold active:scale-[0.95]"
        style={{ borderColor: color, color, transition: "transform 150ms ease-out" }}
      >
        {score}
      </button>
      <RivalyScoreSheet open={open} onClose={() => setOpen(false)} profile={profile} />
    </>
  );
}
