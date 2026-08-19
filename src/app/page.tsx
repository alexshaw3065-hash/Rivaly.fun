"use client";

import Link from "next/link";
import { ExplodingCarousel } from "@/components/exploding-carousel";
import { SearchBarLink } from "@/components/search-bar-link";
import { explodingRooms, matchById } from "@/lib/mock-data";

// Home stays deliberately light — a highlights reel, not the browsing
// experience. Rooms (the new third nav tab) owns "get me to a bet," with
// its own Discover/Live/Following/My Rooms sub-tabs; Home's one job is to
// hook you with what's exploding right now and get you tapping in. Top
// Rivals and the old Rooms/Matches/Packs browser both moved out (2026-08-19
// founder direction) rather than duplicating what Rooms now does properly.
export default function Home() {
  const exploding = explodingRooms(6).map((room) => ({ room, match: matchById(room.matchId)! }));

  return (
    <main className="mx-auto min-w-0 max-w-5xl px-6 py-6">
      {/* md:hidden — desktop already has a search bar in DesktopHeader
          (nav.tsx/desktop-header.tsx); this is the mobile-only shortcut. */}
      <div className="md:hidden">
        <SearchBarLink />
      </div>

      <section className="mt-9 min-w-0 md:mt-6">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-xl font-semibold text-foreground">🔥 Exploding now</h2>
          <Link href="/rooms" className="hover-link text-sm text-muted transition-colors">
            View all →
          </Link>
        </div>
        <div className="mt-5">
          <ExplodingCarousel items={exploding} />
        </div>
      </section>
    </main>
  );
}
