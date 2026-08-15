import Link from "next/link";
import { ExplodingCarousel } from "@/components/exploding-carousel";
import { SearchBarLink } from "@/components/search-bar-link";
import { RivalCard, GoatedRivalCard } from "@/components/rival-card";
import { RoomFeed } from "@/components/room-feed";
import { explodingRooms, matchById, topRivals, goatedRivals } from "@/lib/mock-data";

// Redesigned against the founder's sketch (2026-08-15): search pill, an
// "Exploding Now" carousel (one card at a time — swipe or auto-advance,
// see exploding-carousel.tsx), "Top Rivals" (weekly-style P/L) and "Goated
// Rivals" (all-time career winnings) strips — two distinct leaderboards per
// the FOMO "Weekly Top Trades" / "Hall of Fame" reference — then a
// filter-chip'd, league-grouped, infinite-scrolling feed (Polymarket
// reference for the load-more-on-scroll + closing-moment pattern — see
// room-feed.tsx).
export default function Home() {
  const exploding = explodingRooms(6).map((room) => ({ room, match: matchById(room.matchId)! }));
  const rivals = topRivals(5);
  const goated = goatedRivals(4);

  return (
    <main className="mx-auto min-w-0 max-w-5xl px-6 py-6">
      <SearchBarLink />

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
        <h2 className="font-display text-xl font-semibold text-foreground">🏆 Goated rivals</h2>
        <div className="mt-5 flex min-w-0 gap-3 overflow-x-auto pb-1">
          {goated.map((profile, i) => (
            <div key={profile.id} className="stagger-in" style={{ animationDelay: `${i * 40}ms` }}>
              <GoatedRivalCard profile={profile} />
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
