"use client";

import { useState } from "react";
import Link from "next/link";
import { ExplodingCarousel } from "@/components/exploding-carousel";
import { SearchBarLink } from "@/components/search-bar-link";
import { RivalCard } from "@/components/rival-card";
import { AutoScrollRow } from "@/components/auto-scroll-row";
import { RoomsMatchesBrowser } from "@/components/rooms-matches-browser";
import { OnlineRivalsBadge } from "@/components/online-rivals-badge";
import { explodingRooms, matchById, followedTopRivals } from "@/lib/mock-data";

// Redesigned against the founder's sketch (2026-08-15): search pill, an
// "Exploding Now" carousel (one card at a time — swipe or auto-advance,
// see exploding-carousel.tsx), a "Top Rivals" row scoped to people you
// follow and continuously auto-scrolling (see rival-card.tsx /
// auto-scroll-row.tsx), then the same [filter icon][Rooms][Matches]
// browser Search uses (see rooms-matches-browser.tsx) so both pages share
// one league-filtered, infinite-scrolling browse experience.
export default function Home() {
  const exploding = explodingRooms(6).map((room) => ({ room, match: matchById(room.matchId)! }));
  const rivals = followedTopRivals();
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

      {/* Engagement-psychology mechanism #5 (social identity/rivalry — see
          .claude/skills/rivaly-engagement-psychology): named, personal
          rivalry is a stronger pull than an anonymous ranking, so this
          scopes to people you actually follow instead of a global top-5 —
          real in-group favoritism, not just social proof. Empty for
          accounts that follow no one; no fabricated filler profiles. */}
      <section className="mt-12 min-w-0">
        <h2 className="font-display text-xl font-semibold text-foreground">Top rivals</h2>
        {rivals.length > 0 ? (
          <div className="mt-5 min-w-0">
            <AutoScrollRow itemCount={rivals.length}>
              {rivals.map((profile) => (
                <RivalCard key={profile.id} profile={profile} />
              ))}
            </AutoScrollRow>
          </div>
        ) : (
          <p className="mt-5 text-sm text-muted">Follow a few rivals to see their winnings here.</p>
        )}
      </section>

      <section className="mt-12 min-w-0">
        <RoomsMatchesBrowser selectedLeagues={selectedLeagues} onLeaguesChange={setSelectedLeagues} />
      </section>
    </main>
  );
}
