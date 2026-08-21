"use client";

import { useState } from "react";
import type { Profile } from "@/lib/types";
import { computeRivalyScore } from "@/lib/rivaly-score";
import { shareScoreCard } from "@/lib/score-card-export";
import { RivalyScoreCard } from "./rivaly-score-card";
import { BottomSheet } from "./bottom-sheet";

export function RivalyScoreSheet({
  open,
  onClose,
  profile,
}: {
  open: boolean;
  onClose: () => void;
  profile: Profile;
}) {
  const [sharing, setSharing] = useState(false);
  const breakdown = computeRivalyScore(profile.id);

  async function handleShare() {
    setSharing(true);
    try {
      await shareScoreCard(profile, breakdown);
    } finally {
      setSharing(false);
    }
  }

  return (
    <BottomSheet open={open} onClose={onClose} title="Rivaly Score">
      <div className="flex flex-col gap-5">
        <RivalyScoreCard profile={profile} breakdown={breakdown} />
        <button
          onClick={handleShare}
          disabled={sharing}
          className="rounded-md bg-foreground px-4 py-3 text-sm font-medium text-background active:scale-[0.97] disabled:opacity-60"
          style={{ transition: "transform 150ms ease-out" }}
        >
          {sharing ? "Preparing image…" : "Share as image"}
        </button>
      </div>
    </BottomSheet>
  );
}
