"use client";

import { useState } from "react";
import Link from "next/link";
import { ExplodingCarousel } from "@/components/exploding-carousel";
import { SearchBarLink } from "@/components/search-bar-link";
import { TopRivals } from "@/components/top-rivals";
import { RoomsMatchesBrowser } from "@/components/rooms-matches-browser";
import { byHeat, usePublicRooms } from "@/lib/use-real-rooms";
import { EmptyRooms } from "@/components/empty-rooms";

// Redesigned against the founder's sketch (2026-08-15): search pill, an
// "Exploding Now" carousel (Apple-style — see exploding-carousel.tsx), Top
// rivals (the five biggest real wins and the rooms that paid them — see
// top-rivals.tsx), then the same [filter icon][Rooms][Matches]
// browser Search uses (see rooms-matches-browser.tsx) so both pages share
// one league-filtered, infinite-scrolling browse experience.
export default function Home() {
  const publicRooms = usePublicRooms();
  const exploding = [...publicRooms.items].sort(byHeat).slice(0, 6);
  const [selectedLeagues, setSelectedLeagues] = useState<string[]>([]);

  return (
    <main className="mx-auto min-w-0 max-w-5xl px-4 py-6 md:px-6">
      {/* md:hidden — desktop already has a search bar in DesktopHeader
          (nav.tsx/desktop-header.tsx); this is the mobile-only shortcut. */}
      <div className="md:hidden">
        <SearchBarLink />
      </div>

      <section className="mt-5 min-w-0 md:mt-6">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-xl font-semibold text-foreground">🔥 Exploding now</h2>
          <Link href="/rooms" className="hover-link text-sm text-muted transition-colors">
            View all →
          </Link>
        </div>
        <div className="mt-5">
          {exploding.length > 0 ? (
            <ExplodingCarousel items={exploding} />
          ) : publicRooms.isLoading ? (
            <div className="h-64 rounded-xl border border-border bg-surface" aria-busy />
          ) : (
            <EmptyRooms />
          )}
        </div>
      </section>

      <div className="mt-12">
        <TopRivals />
      </div>

      <section className="mt-12 min-w-0">
        <RoomsMatchesBrowser selectedLeagues={selectedLeagues} onLeaguesChange={setSelectedLeagues} />
      </section>
    </main>
  );
}
