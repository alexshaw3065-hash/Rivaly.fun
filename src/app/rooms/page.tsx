"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { RoomFeed, type FilterTab } from "@/components/room-feed";
import { RoomsExplodingSection } from "@/components/rooms-exploding-section";
import { DiscoverFilterMenu } from "@/components/discover-filter-menu";
import { RoomsLiveFeed } from "@/components/rooms-live-feed";
import { RoomsFollowingFeed } from "@/components/rooms-following-feed";
import { RoomsMineFeed } from "@/components/rooms-mine-feed";
import { JoinPrivateRoomButton } from "@/components/join-private-room-button";
import Link from "next/link";
import { MatchBanner } from "@/components/create-room/match-hero";
import { useRealMatches } from "@/lib/use-real-matches";
import { createClient } from "@/lib/supabase/client";
import { mapMatchRow, MATCH_COLUMNS, type MatchRow } from "@/lib/supabase/match-mapper";
import type { Match } from "@/lib/types";

type RoomsTab = "discover" | "live" | "following" | "mine";

const tabs: { id: RoomsTab; label: string }[] = [
  { id: "discover", label: "Discover" },
  { id: "live", label: "Live" },
  { id: "following", label: "Following" },
  { id: "mine", label: "My Rooms" },
];

// The third nav tab (Home, Search, Rooms, Following, Wallet) — where you
// actually go to place a bet, distinct from Home's lighter highlights reel.
// Four sub-tabs instead of one long page: Discover is the endless-scroll
// hook (the dopamine engine — infinite scroll, momentum-sorted by
// default), Live surfaces what's happening + what's about to, Following is
// the social payoff (rooms from people you actually follow), and My Rooms
// is the personal ledger (Created/Joined/Completed). Join Private Room
// sits apart from these four as a one-off action, not a browsing surface.
// No per-tab hint copy — the founder's call: the tabs and their content
// speak for themselves.
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
  const [discoverTab, setDiscoverTab] = useState<FilterTab>("trending");

  // ?match=<id> (from a match on Home): every room on that one match.
  const matchId = searchParams.get("match");
  if (matchId) return <MatchRooms matchId={matchId} />;

  return (
    <main className="mx-auto min-w-0 max-w-5xl px-4 py-6 md:px-6 md:py-12">
      <div className="flex items-center justify-between border-b border-border">
        <div className="no-scrollbar flex min-w-0 gap-6 overflow-x-auto">
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
        <div className="shrink-0 pb-2.5">
          <JoinPrivateRoomButton />
        </div>
      </div>

      <div className="mt-8">
        {tab === "discover" && (
          <div className="flex flex-col gap-10">
            <RoomsExplodingSection />
            <section>
              <DiscoverFilterMenu selected={discoverTab} onSelect={setDiscoverTab} />
              <div className="mt-6">
                <RoomFeed tab={discoverTab} onTabChange={setDiscoverTab} hideChips />
              </div>
            </section>
          </div>
        )}
        {tab === "live" && <RoomsLiveFeed />}
        {tab === "following" && <RoomsFollowingFeed />}
        {tab === "mine" && <RoomsMineFeed />}
      </div>
    </main>
  );
}

// One match's rooms: the match up top, its rooms below, and when there are
// none yet the one obvious action — start the first.
function MatchRooms({ matchId }: { matchId: string }) {
  const { matches, isReal } = useRealMatches();
  const listed = matches.find((m) => m.id === matchId) ?? null;
  // Older results (or a shared link to one) aren't in the app's match list —
  // fetch that one match directly.
  const [fetched, setFetched] = useState<{ id: string; match: Match | null } | null>(null);
  useEffect(() => {
    if (!isReal || listed) return;
    let cancelled = false;
    void createClient()
      .from("matches")
      .select(MATCH_COLUMNS)
      .eq("id", matchId)
      .maybeSingle()
      .then(({ data }) => {
        if (!cancelled) setFetched({ id: matchId, match: data ? mapMatchRow(data as MatchRow) : null });
      });
    return () => {
      cancelled = true;
    };
  }, [isReal, listed, matchId]);
  const match = listed ?? (fetched?.id === matchId ? fetched.match : null);
  // Only once the match is known to be upcoming — never offered on a finished one.
  const canStart = match?.status === "scheduled";
  const startHref = `/rooms/create?matchId=${matchId}`;

  return (
    <main className="mx-auto min-w-0 max-w-5xl px-4 py-6 md:px-6 md:py-12">
      <div className="mb-4 flex items-center justify-between gap-3">
        <Link href="/rooms" className="text-sm text-muted transition-colors hover:text-foreground">
          ← All rooms
        </Link>
        {canStart && (
          <Link href={startHref} className="text-sm font-medium text-rival-blue">
            + New room
          </Link>
        )}
      </div>
      {match && (
        <div className="overflow-hidden rounded-2xl border border-border">
          <MatchBanner match={match} />
        </div>
      )}
      <h1 className="mt-6 font-display text-lg font-bold text-foreground">Rooms on this match</h1>
      <div className="mt-4">
        <RoomFeed
          extraFilter={(_room, m) => m.id === matchId}
          emptyFiltered={
            <div className="flex flex-col items-center gap-3 py-14 text-center">
              <p className="font-display text-lg font-bold text-foreground">No rooms on this match yet</p>
              <p className="max-w-xs text-sm text-muted">Make the first call and let someone take the other side.</p>
              {canStart && (
                <Link
                  href={startHref}
                  className="mt-1 rounded-md bg-rival-blue px-5 py-2.5 text-sm font-semibold text-white transition-transform duration-150 ease-out active:scale-[0.97]"
                >
                  Start the first room
                </Link>
              )}
            </div>
          }
        />
      </div>
    </main>
  );
}

