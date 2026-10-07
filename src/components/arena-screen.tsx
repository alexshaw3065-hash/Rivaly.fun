"use client";

import { useEffect, useState } from "react";
import { ArenaFeed } from "@/components/arena-feed";
import { ArenaLeagues } from "@/components/arena-leagues";
import { ArenaLeaderboard } from "@/components/arena-leaderboard";
import { Tabs } from "@/components/ui/controls";
import { ArenaRivals } from "@/components/arena/arena-rivals";
import { useWideScreen } from "@/lib/use-wide-screen";

export type ArenaTab = "feed" | "leagues" | "leaderboard";

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
export function ArenaScreen({ initialTab }: { initialTab: ArenaTab }) {
  // ?tab=leaderboard / ?tab=leagues opens straight on that tab (e.g. from a
  // profile's rank) — read by the server page and handed in ready, so nothing
  // waits on it while the screen loads.
  const [tab, setTab] = useState<ArenaTab>(initialTab);
  const wide = useWideScreen();

  // The floating "post a take" button (nav.tsx) belongs to the Feed only —
  // Leagues and Leaderboard have their own one primary action.
  useEffect(() => {
    document.documentElement.dataset.arenaTab = tab;
    return () => {
      delete document.documentElement.dataset.arenaTab;
    };
  }, [tab]);

  // Desktop sizing like X: one 600px column from laptops up, and on wide
  // screens a right-hand column with Rivals beside the feed. Phones and
  // tablets keep the full-width layout.
  return (
    <main className="mx-auto min-w-0 max-w-5xl px-4 pb-6 pt-3 md:px-6 md:py-12 lg:max-w-[648px] xl:max-w-[1000px]">
      <div className="xl:grid xl:grid-cols-[600px_320px] xl:justify-center xl:gap-8">
        <div className="min-w-0">
          <Tabs tabs={tabs} value={tab} onChange={setTab} />

          <div className="mt-6">
            {tab === "feed" && <ArenaFeed />}
            {tab === "leagues" && <ArenaLeagues />}
            {tab === "leaderboard" && <ArenaLeaderboard />}
          </div>
        </div>
        {wide && (
          <aside className="min-w-0 pt-2" aria-label="Rivals">
            <div className="sticky top-24">
              <ArenaRivals variant="rail" />
            </div>
          </aside>
        )}
      </div>
    </main>
  );
}
