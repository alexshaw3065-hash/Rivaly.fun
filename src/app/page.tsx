"use client";

import { useState } from "react";
import Link from "next/link";
import { ExplodingCarousel } from "@/components/exploding-carousel";
import { SearchBarLink } from "@/components/search-bar-link";
import { RivalCard, GoatedRivalCard, HallOfFameCard } from "@/components/rival-card";
import { RivalDivider } from "@/components/rival-divider";
import { AutoScrollRow } from "@/components/auto-scroll-row";
import { RoomsMatchesBrowser } from "@/components/rooms-matches-browser";
import { explodingRooms, matchById, followedTopRivals, goatedStreakRivals, goatedRivals } from "@/lib/mock-data";

// Redesigned against the founder's sketch (2026-08-15): search pill, an
// "Exploding Now" carousel (one card at a time — swipe or auto-advance,
// see exploding-carousel.tsx), one continuous "Top rivals" scroll row —
// Top Rivals (people you follow) -> Goated Rivals (global streaks) ->
// Hall of Fame (global all-time winnings), five each, divided by
// RivalDivider and auto-scrolling as one unit (see rival-card.tsx /
// auto-scroll-row.tsx) — then the same [filter icon][Rooms][Matches]
// browser Search uses (see rooms-matches-browser.tsx) so both pages share
// one league-filtered, infinite-scrolling browse experience.
export default function Home() {
  const exploding = explodingRooms(6).map((room) => ({ room, match: matchById(room.matchId)! }));
  const rivals = followedTopRivals(5);
  const goated = goatedStreakRivals(5);
  const hallOfFame = goatedRivals(5);
  const hasTop = rivals.length > 0;
  const hasGoated = goated.length > 0;
  const hasHof = hallOfFame.length > 0;
  const totalRivalsCount = rivals.length + goated.length + hallOfFame.length;
  const initialRivalsHeading = hasTop ? "Top rivals" : hasGoated ? "Goated rivals" : "Hall of fame";
  const [rivalsHeading, setRivalsHeading] = useState(initialRivalsHeading);
  const [selectedLeagues, setSelectedLeagues] = useState<string[]>([]);

  return (
    <main className="mx-auto min-w-0 max-w-5xl px-6 py-6">
      {/* md:hidden — desktop already has a search bar in DesktopHeader
          (nav.tsx/desktop-header.tsx); this is the mobile-only shortcut. */}
      <div className="md:hidden">
        <SearchBarLink />
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

      {/* One row, three groups, per founder direction — Top Rivals (people
          you follow: mechanism #5, social identity/rivalry — in-group
          favoritism beats an anonymous ranking), Goated Rivals (global
          streaks: mechanism #6, loss aversion & streaks — a real hot
          streak is what makes someone worth watching right now), Hall of
          Fame (global all-time winnings — the platform's actual biggest
          earners ever). See .claude/skills/rivaly-engagement-psychology.
          Each group only renders, and only gets a divider, if it actually
          has real data — no fabricated filler between them. The h2 itself
          tracks scroll position (via AutoScrollRow's onActiveSectionChange)
          so it always names whichever group currently sits at the row's
          left edge, instead of staying stuck on "Top rivals" once you've
          scrolled past it. */}
      <section className="mt-12 min-w-0">
        <h2 className="font-display text-xl font-semibold text-foreground">{rivalsHeading}</h2>
        {totalRivalsCount > 0 ? (
          <div className="mt-5 min-w-0">
            <AutoScrollRow
              itemCount={totalRivalsCount}
              initialSectionLabel={initialRivalsHeading}
              onActiveSectionChange={setRivalsHeading}
            >
              {rivals.map((profile) => (
                <RivalCard key={profile.id} profile={profile} />
              ))}
              {hasTop && hasGoated && (
                <RivalDivider emoji="🔥" label="Goated" sectionHeading="Goated rivals" />
              )}
              {goated.map((profile) => (
                <GoatedRivalCard key={profile.id} profile={profile} />
              ))}
              {(hasTop || hasGoated) && hasHof && (
                <RivalDivider emoji="👑" label="Hall of fame" sectionHeading="Hall of fame" />
              )}
              {hallOfFame.map((profile) => (
                <HallOfFameCard key={profile.id} profile={profile} />
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
