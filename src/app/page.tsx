"use client";

import { useState } from "react";
import Link from "next/link";
import { ExplodingCarousel, useExplodingSlides } from "@/components/exploding-carousel";
import { SearchBarLink } from "@/components/search-bar-link";
import { TopRivals } from "@/components/top-rivals";
import { RoomsMatchesBrowser } from "@/components/rooms-matches-browser";
import { EmptyRooms } from "@/components/empty-rooms";
import { FeatureCardShape } from "@/components/loading-shapes";
import { SectionHeader } from "@/components/ui";

// Redesigned against the founder's sketch (2026-08-15): search pill, an
// "Exploding Now" carousel (Apple-style — see exploding-carousel.tsx), Top
// rivals (the five biggest real wins and the rooms that paid them — see
// top-rivals.tsx), then the same [filter icon][Rooms][Matches]
// browser Search uses (see rooms-matches-browser.tsx) so both pages share
// one league-filtered, infinite-scrolling browse experience.
export default function Home() {
  const { slides: exploding, isLoading: explodingLoading } = useExplodingSlides();
  const [selectedLeagues, setSelectedLeagues] = useState<string[]>([]);

  return (
    <main className="mx-auto min-w-0 max-w-5xl px-4 py-6 md:px-6">
      {/* md:hidden — desktop already has a search bar in DesktopHeader
          (nav.tsx/desktop-header.tsx); this is the mobile-only shortcut. */}
      <div className="md:hidden">
        <SearchBarLink />
      </div>

      <section className="mt-6 min-w-0">
        <SectionHeader
          title="🔥 Exploding now"
          action={
            <Link href="/rooms" className="hover-link transition-colors">
              View all →
            </Link>
          }
        />
        <div>
          {exploding.length > 0 ? (
            <ExplodingCarousel items={exploding} />
          ) : explodingLoading ? (
            <div aria-busy>
              <FeatureCardShape />
            </div>
          ) : (
            <EmptyRooms />
          )}
        </div>
      </section>

      <div className="mt-8">
        <TopRivals />
      </div>

      <section className="mt-8 min-w-0">
        <RoomsMatchesBrowser selectedLeagues={selectedLeagues} onLeaguesChange={setSelectedLeagues} />
      </section>
    </main>
  );
}
