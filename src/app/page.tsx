"use client";

import { useState } from "react";
import Link from "next/link";
import { ExplodingCarousel } from "@/components/exploding-carousel";
import { SearchBarLink } from "@/components/search-bar-link";
import { RivalCard, GoatedRivalCard } from "@/components/rival-card";
import { RivalDivider } from "@/components/rival-divider";
import { RoomsMatchesBrowser } from "@/components/rooms-matches-browser";
import { OnlineRivalsBadge } from "@/components/online-rivals-badge";
import { ArenaFeedCard } from "@/components/arena-feed-card";
import { explodingRooms, matchById, topRivals, goatedRivals, followedLiveFeed } from "@/lib/mock-data";

// Redesigned against the founder's sketch (2026-08-15): search pill, an
// "Exploding Now" carousel (one card at a time — swipe or auto-advance,
// see exploding-carousel.tsx), one continuous "Top Rivals" / "Goated
// Rivals" scroll row (weekly-style P/L into all-time career winnings,
// split by a divider rather than stacked as two sections — per founder
// feedback referencing the FOMO app), then the same [filter icon][Rooms]
// [Matches] browser Search uses (see rooms-matches-browser.tsx) so both
// pages share one league-filtered, infinite-scrolling browse experience.
export default function Home() {
  const exploding = explodingRooms(6).map((room) => ({ room, match: matchById(room.matchId)! }));
  const followedLive = followedLiveFeed();
  const rivals = topRivals(5);
  const goated = goatedRivals(4);
  const [selectedLeagues, setSelectedLeagues] = useState<string[]>([]);

  return (
    <main className="mx-auto min-w-0 max-w-5xl px-6 py-6">
      {/* md:hidden — desktop already has a search bar in DesktopHeader
          (nav.tsx/desktop-header.tsx); this is the mobile-only shortcut. */}
      <div className="md:hidden">
        <SearchBarLink />
      </div>

      {/* Engagement-psychology mechanism #4 (social facilitation — see
          .claude/skills/rivaly-engagement-psychology): mere presence of
          other real people measurably raises engagement before anyone
          interacts. Home had zero ambient-presence signal even though
          Arena already built one — this is the same real, honest count
          (OnlineRivalsBadge), just surfaced on the page most people land
          on first. Its own line, not crammed into the header row, so it
          stays the quiet ambient pulse it's designed to be. */}
      <div className="mt-6 md:mt-4">
        <OnlineRivalsBadge />
      </div>

      <section className="mt-5 min-w-0 md:mt-6">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-xl font-semibold text-foreground">🔥 Exploding now</h2>
          <Link href="/search" className="hover-link text-sm text-muted transition-colors">
            View all →
          </Link>
        </div>
        <div className="mt-5">
          <ExplodingCarousel items={exploding} />
        </div>
      </section>

      {/* Engagement-psychology mechanism #5 (social identity/rivalry —
          see .claude/skills/rivaly-engagement-psychology): named,
          personal rivalry is a stronger pull than an anonymous ranking.
          Reuses the exact rival_activity card Arena's Feed already
          renders, scoped to "someone you follow, live right now" — real
          on both conditions, so it just doesn't render when neither is
          true (no fabricated "someone's live" filler). */}
      {followedLive.length > 0 && (
        <section className="mt-12 min-w-0">
          <h2 className="font-display text-xl font-semibold text-foreground">Rivals you follow — live now</h2>
          <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
            {followedLive.map((item) => (
              <ArenaFeedCard key={item.id} item={item} />
            ))}
          </div>
        </section>
      )}

      <section className="mt-12 min-w-0">
        <h2 className="font-display text-xl font-semibold text-foreground">Top rivals</h2>
        <div className="no-scrollbar mt-5 flex min-w-0 gap-3 overflow-x-auto pb-1">
          {rivals.map((profile, i) => (
            <div key={profile.id} className="stagger-in" style={{ animationDelay: `${i * 40}ms` }}>
              <RivalCard profile={profile} />
            </div>
          ))}
          <RivalDivider />
          {goated.map((profile, i) => (
            <div
              key={profile.id}
              className="stagger-in"
              style={{ animationDelay: `${(rivals.length + i) * 40}ms` }}
            >
              <GoatedRivalCard profile={profile} />
            </div>
          ))}
        </div>
      </section>

      <section className="mt-12 min-w-0">
        <RoomsMatchesBrowser selectedLeagues={selectedLeagues} onLeaguesChange={setSelectedLeagues} />
      </section>
    </main>
  );
}
