import Link from "next/link";
import { LiveBadge } from "@/components/live-badge";
import { SplitBar } from "@/components/split-bar";
import { MatchChip } from "@/components/match-chip";
import { RoomCard } from "@/components/room-card";
import { Avatar } from "@/components/avatar";
import { matches, rooms, matchById, profileById, formatMoney, splitPct } from "@/lib/mock-data";

// Sections per docs/masterplan/07-product-blueprint.md#43-home, cut down
// per the "ruthless V1" case study in docs/masterplan/08-v1-scope.md: the
// hero prediction carries the "Following" and "Weekend Highlights" framing
// on its own, so those aren't broken out as separate sections here.
export default function Home() {
  const heroRoom = rooms[0];
  const heroMatch = matchById(heroRoom.matchId)!;
  const heroCreator = profileById(heroRoom.creatorId)!;

  const trending = rooms.filter((r) => r.status !== "settled").slice(0, 3);
  const settledRoom = rooms.find((r) => r.status === "settled")!;
  const settledMatch = matchById(settledRoom.matchId)!;
  const settledCreator = profileById(settledRoom.creatorId)!;
  const spotlight = profileById("u3")!;

  return (
    <main className="flex-1">
      {/* Hero — the prediction is the product, shown, not explained. */}
      <section className="border-b border-border">
        <div className="mx-auto max-w-5xl px-6 py-14 md:py-20">
          <div className="flex items-center gap-3">
            <LiveBadge minute="67'" />
            <span className="font-mono text-[11px] uppercase tracking-wider text-muted">
              {heroMatch.competition}
            </span>
          </div>

          <p className="mt-6 font-display text-4xl font-bold tracking-tight text-foreground md:text-6xl">
            {heroMatch.homeTeam}{" "}
            <span className="text-muted">
              {heroMatch.homeScore}–{heroMatch.awayScore}
            </span>{" "}
            {heroMatch.awayTeam}
          </p>

          <div className="mt-10 max-w-xl">
            <p className="font-mono text-[11px] uppercase tracking-wider text-muted">
              {heroCreator.displayName}&rsquo;s room
            </p>
            <p className="mt-2 font-display text-2xl font-semibold leading-tight text-foreground md:text-3xl">
              &ldquo;{heroRoom.prediction}&rdquo;
            </p>
            <p className="mt-3 text-sm text-muted">
              {heroCreator.displayName} is backing it. {heroRoom.participantCount} rivals are
              watching.
            </p>

            <div className="mt-7 max-w-sm">
              <SplitBar leftPct={splitPct(heroRoom)} leftLabel="Yes" rightLabel="No" />
            </div>

            <div className="mt-7 flex items-center gap-4">
              <Link
                href={`/rooms/${heroRoom.id}`}
                className="rounded-md bg-foreground px-5 py-2.5 text-sm font-medium text-background transition-transform duration-150 ease-out active:scale-[0.97]"
              >
                Take the other side →
              </Link>
              <span className="font-mono text-xs text-muted">
                {formatMoney(heroRoom.poolTotalCents)} pool
              </span>
            </div>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-5xl px-6 py-12 flex flex-col gap-14">
        {/* Live matches */}
        <section>
          <div className="flex items-center justify-between">
            <h2 className="font-display text-xl font-semibold text-foreground">Live matches</h2>
            <Link href="/search" className="text-sm text-muted transition-colors hover:text-foreground">
              See all →
            </Link>
          </div>
          <div className="mt-5 flex gap-3 overflow-x-auto pb-1">
            {matches.map((match, i) => (
              <div
                key={match.id}
                className="stagger-in"
                style={{ animationDelay: `${i * 50}ms` }}
              >
                <MatchChip match={match} />
              </div>
            ))}
          </div>
        </section>

        {/* Trending rooms */}
        <section>
          <div className="flex items-center justify-between">
            <h2 className="font-display text-xl font-semibold text-foreground">Trending rooms</h2>
            <Link href="/rooms/create" className="text-sm text-muted transition-colors hover:text-foreground">
              Create one →
            </Link>
          </div>
          <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {trending.map((room, i) => {
              const match = matchById(room.matchId)!;
              return (
                <div key={room.id} className="stagger-in" style={{ animationDelay: `${i * 60}ms` }}>
                  <RoomCard room={room} match={match} />
                </div>
              );
            })}
          </div>
        </section>

        {/* Friends playing */}
        <section className="flex items-center gap-4 rounded-lg border border-border bg-surface px-5 py-4">
          <div className="flex -space-x-2.5">
            <Avatar name="Alex" size={30} />
            <Avatar name="Daniel" size={30} />
            <Avatar name="Victor" size={30} />
          </div>
          <p className="text-sm text-muted">
            <span className="font-medium text-foreground">Alex</span> and{" "}
            <span className="font-medium text-foreground">2 others</span> you follow are in rooms
            right now.
          </p>
          <Link
            href="/following"
            className="ml-auto shrink-0 text-sm text-muted transition-colors hover:text-foreground"
          >
            View →
          </Link>
        </section>

        {/* Big win */}
        <section>
          <h2 className="font-display text-xl font-semibold text-foreground">Recent win</h2>
          <div className="mt-5 flex items-center gap-4 rounded-lg border border-border bg-surface p-5">
            <Avatar name={settledCreator.displayName} size={40} />
            <div className="min-w-0 flex-1">
              <p className="text-sm text-foreground">
                <Link href={`/profile/${settledCreator.username}`} className="font-medium hover:underline">
                  {settledCreator.displayName}
                </Link>{" "}
                called it — &ldquo;{settledRoom.prediction}.&rdquo;
              </p>
              <p className="mt-0.5 font-mono text-xs text-muted">
                {settledMatch.homeTeam} {settledMatch.homeScore}–{settledMatch.awayScore}{" "}
                {settledMatch.awayTeam} · FT
              </p>
            </div>
            <p className="shrink-0 font-mono text-lg font-medium text-rival-green">
              +{formatMoney(settledRoom.poolTotalCents / settledRoom.participantCount)}
            </p>
          </div>
        </section>

        {/* Creator spotlight */}
        <section className="flex items-center gap-4 rounded-lg border border-border bg-surface p-5">
          <Avatar name={spotlight.displayName} size={44} />
          <div className="min-w-0 flex-1">
            <Link href={`/profile/${spotlight.username}`} className="font-medium text-foreground hover:underline">
              {spotlight.displayName}
            </Link>
            <p className="mt-0.5 text-sm text-muted">
              {Math.round(spotlight.predictionAccuracy * 100)}% accuracy across{" "}
              {spotlight.roomsCreated} rooms created
            </p>
          </div>
          <Link
            href={`/profile/${spotlight.username}`}
            className="shrink-0 rounded-md border border-border-strong px-4 py-2 text-sm font-medium text-foreground transition-transform duration-150 ease-out active:scale-[0.97]"
          >
            Challenge
          </Link>
        </section>
      </div>
    </main>
  );
}
