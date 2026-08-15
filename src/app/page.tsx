import Link from "next/link";
import { ExplodingCarousel } from "@/components/exploding-carousel";
import { RivalCard } from "@/components/rival-card";
import { RoomFeed } from "@/components/room-feed";
import { explodingRooms, matchById, topRivals } from "@/lib/mock-data";

// Redesigned against the founder's sketch (2026-08-15): search pill, an
// "Exploding Now" carousel (one card at a time — swipe or auto-advance,
// see exploding-carousel.tsx), a "Top Rivals" P/L strip, then a
// filter-chip'd, league-grouped, infinite-scrolling feed (Polymarket
// reference for the load-more-on-scroll + closing-moment pattern — see
// room-feed.tsx).
export default function Home() {
  const exploding = explodingRooms(6).map((room) => ({ room, match: matchById(room.matchId)! }));
  const rivals = topRivals(8);

  return (
    <main className="mx-auto min-w-0 max-w-5xl px-6 py-6">
      <Link
        href="/search"
        className="hover-border block w-full rounded-full border border-border bg-surface px-4 py-3 text-sm text-muted transition-colors"
      >
        Search rooms, matches, people…
      </Link>

      <section className="mt-9 min-w-0">
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

      <section className="mt-12 min-w-0">
        <h2 className="font-display text-xl font-semibold text-foreground">Top rivals</h2>
        <div className="mt-5 flex min-w-0 gap-3 overflow-x-auto pb-1">
          {rivals.map((profile, i) => (
            <div key={profile.id} className="stagger-in" style={{ animationDelay: `${i * 40}ms` }}>
              <RivalCard profile={profile} />
            </div>
          ))}
        </div>
      </section>

      <section className="mt-12 min-w-0">
        <RoomFeed />
      </section>
    </main>
  );
}
