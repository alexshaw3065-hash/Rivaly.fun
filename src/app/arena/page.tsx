"use client";

import { useState } from "react";
import { ArenaFeed } from "@/components/arena-feed";
import { ArenaLeagues } from "@/components/arena-leagues";
import { ArenaLeaderboard } from "@/components/arena-leaderboard";

type ArenaTab = "feed" | "leagues" | "leaderboard";

const tabs: { id: ArenaTab; label: string }[] = [
  { id: "feed", label: "Feed" },
  { id: "leagues", label: "Leagues" },
  { id: "leaderboard", label: "Leaderboard" },
];

// The fourth nav tab (formerly "Following") — see the Arena implementation
// plan for the full research/scope rationale. Feed is the social/FOMO
// engine (Global/Following toggle inside arena-feed.tsx), Leagues is
// points-only FPL-style standings, Leaderboard is a podium (top 3) plus a
// ranked list. No page title, no per-tab hint copy, matching the same call
// already made on Rooms — the tabs speak for themselves. The online-rivals
// badge lives inside arena-feed.tsx now, not here — see that file for why.
export default function ArenaPage() {
  const [tab, setTab] = useState<ArenaTab>("feed");

  return (
    <main className="mx-auto min-w-0 max-w-5xl px-4 py-6 md:px-6 md:py-12">
      <div className="flex gap-6 border-b border-border">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className="-mb-px shrink-0 border-b-2 pb-2.5 text-sm font-medium transition-colors duration-150"
            style={{
              borderColor: tab === t.id ? "var(--foreground)" : "transparent",
              color: tab === t.id ? "var(--foreground)" : "var(--muted)",
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="mt-8">
        {tab === "feed" && <ArenaFeed />}
        {tab === "leagues" && <ArenaLeagues />}
        {tab === "leaderboard" && <ArenaLeaderboard />}
      </div>
    </main>
  );
}
