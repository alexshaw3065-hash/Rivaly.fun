import Link from "next/link";
import { profileByUsername, roomsByCreator, matchById, formatMoney } from "@/lib/mock-data";
import { Avatar } from "@/components/avatar";
import { RoomCard } from "@/components/room-card";
import { FollowButton } from "@/components/follow-button";

// Minimal for V1 per docs/masterplan/08-v1-scope.md: history, followers,
// accuracy. Communicates reputation, not vanity — "is this person worth
// challenging?" per docs/design-references/rivaly-redesign-brief.md.
// Achievement/badge grids are cut — generic gamification filler that isn't
// in the V1 field list (docs/masterplan/07-product-blueprint.md#47-profile).
export default async function ProfilePage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;
  const profile = profileByUsername(username);

  if (!profile) {
    return (
      <main className="mx-auto max-w-3xl px-6 py-16 text-center">
        <p className="font-display text-xl font-semibold text-foreground">Rival not found</p>
        <p className="mt-2 text-sm text-muted">@{username} doesn&rsquo;t exist.</p>
        <Link href="/" className="mt-6 inline-block text-sm text-foreground hover:underline">
          ← Back home
        </Link>
      </main>
    );
  }

  const created = roomsByCreator(profile.id);

  return (
    <main className="mx-auto max-w-4xl px-6 py-12">
      <div className="flex items-start gap-5">
        <Avatar name={profile.displayName} size={64} />
        <div className="min-w-0 flex-1">
          <h1 className="font-display text-2xl font-bold text-foreground md:text-3xl">
            {profile.displayName}
          </h1>
          <p className="font-mono text-sm text-muted">@{profile.username}</p>
          {profile.bio && <p className="mt-2 max-w-md text-sm text-foreground">{profile.bio}</p>}
          <div className="mt-3 flex gap-4 text-sm text-muted">
            <span>
              <span className="font-medium text-foreground">
                {profile.followerCount.toLocaleString()}
              </span>{" "}
              rivals
            </span>
            <span>
              <span className="font-medium text-foreground">{profile.followingCount}</span>{" "}
              following
            </span>
            <span>
              <span className="font-medium text-foreground">{profile.roomsCreated}</span> rooms
            </span>
          </div>
        </div>
        <div className="flex shrink-0 gap-2">
          <FollowButton />
          <Link
            href="/rooms/create"
            className="rounded-md border border-border-strong px-4 py-2 text-sm font-medium text-foreground transition-transform duration-150 ease-out active:scale-[0.97]"
          >
            Challenge
          </Link>
        </div>
      </div>

      <div className="mt-8 grid grid-cols-3 gap-3">
        <div className="rounded-lg border border-border bg-surface p-4">
          <p className="font-mono text-2xl font-medium text-foreground">
            {Math.round(profile.predictionAccuracy * 100)}%
          </p>
          <p className="mt-0.5 text-xs text-muted">Accuracy</p>
        </div>
        <div className="rounded-lg border border-border bg-surface p-4">
          <p className="font-mono text-2xl font-medium text-rival-green">
            {formatMoney(profile.totalWinningsCents)}
          </p>
          <p className="mt-0.5 text-xs text-muted">Total winnings</p>
        </div>
        <div className="rounded-lg border border-border bg-surface p-4">
          <p className="font-mono text-2xl font-medium text-foreground">{profile.roomsCreated}</p>
          <p className="mt-0.5 text-xs text-muted">Rooms created</p>
        </div>
      </div>

      <div className="mt-10">
        <p className="font-display text-xl font-semibold text-foreground">History</p>
        {created.length === 0 ? (
          <p className="mt-3 text-sm text-muted">No rooms yet.</p>
        ) : (
          <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {created.map((room) => (
              <RoomCard key={room.id} room={room} match={matchById(room.matchId)!} />
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
