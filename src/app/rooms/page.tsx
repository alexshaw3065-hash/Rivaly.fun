"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { RoomFeed } from "@/components/room-feed";
import { RoomsLiveFeed } from "@/components/rooms-live-feed";
import { RoomsFollowingFeed } from "@/components/rooms-following-feed";
import { RoomsMineFeed } from "@/components/rooms-mine-feed";
import { JoinPrivateRoomButton } from "@/components/join-private-room-button";

type RoomsTab = "discover" | "live" | "following" | "mine";

const tabs: { id: RoomsTab; label: string; hint: string }[] = [
  { id: "discover", label: "Discover", hint: "Trending, new, and live — everything worth a bet, in one place." },
  { id: "live", label: "Live", hint: "What's happening right now, and what's about to." },
  { id: "following", label: "Following", hint: "Rooms from the rivals you follow." },
  { id: "mine", label: "My Rooms", hint: "Everything you've created, joined, or settled." },
];

// The third nav tab (Home, Search, Rooms, Following, Wallet) — where you
// actually go to place a bet, distinct from Home's lighter highlights reel.
// Four sub-tabs instead of one long page: Discover is the endless-scroll
// hook (the dopamine engine — infinite scroll, momentum-sorted by
// default), Live surfaces what's happening + what's about to, Following is
// the social payoff (rooms from people you actually follow), and My Rooms
// is the personal ledger (Created/Joined/Completed). Join Private Room
// sits apart from these four as a one-off action, not a browsing surface.
// useSearchParams needs a Suspense boundary around whatever reads it (Next
// bails out of static rendering otherwise) — split into a thin wrapper so
// the actual page doesn't have to care.
export default function RoomsPage() {
  return (
    <Suspense fallback={null}>
      <RoomsPageContent />
    </Suspense>
  );
}

function RoomsPageContent() {
  // ?tab=mine lets other pages (Wallet) deep-link straight into a sub-tab —
  // read once on mount, not kept in sync afterward (the tab row owns
  // navigation from here, no need to push URL updates on every click).
  const searchParams = useSearchParams();
  const requestedTab = searchParams.get("tab");
  const initialTab = tabs.some((t) => t.id === requestedTab) ? (requestedTab as RoomsTab) : "discover";
  const [tab, setTab] = useState<RoomsTab>(initialTab);
  const active = tabs.find((t) => t.id === tab)!;

  return (
    <main className="mx-auto min-w-0 max-w-5xl px-6 py-6 md:py-12">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-bold text-foreground md:text-3xl">Rooms</h1>
        <JoinPrivateRoomButton />
      </div>

      <div className="no-scrollbar mt-6 flex gap-6 overflow-x-auto border-b border-border">
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

      <p className="mt-3 text-sm text-muted">{active.hint}</p>

      <div className="mt-8">
        {tab === "discover" && <RoomFeed />}
        {tab === "live" && <RoomsLiveFeed />}
        {tab === "following" && <RoomsFollowingFeed />}
        {tab === "mine" && <RoomsMineFeed />}
      </div>
    </main>
  );
}
