import Link from "next/link";
import { rooms, roomsJoinedBy, followedProfileIds, profileById, matchById } from "@/lib/mock-data";
import { RoomCard } from "./room-card";
import { Avatar } from "./avatar";
import type { Room } from "@/lib/types";

// The social heart of the Rooms tab — not just "here are some rooms," but
// "here's what people you actually follow are doing right now." Each card
// carries a small by-line (avatar + name) rather than being grouped under
// one generic header, since the point is *who*, not just *what*.
function RoomWithByline({ room, byId }: { room: Room; byId: string }) {
  const profile = profileById(byId);
  if (!profile) return null;
  return (
    <div className="flex flex-col gap-2">
      <Link
        href={`/profile/${profile.username}`}
        className="hover-link flex items-center gap-2 text-muted transition-colors"
      >
        <Avatar name={profile.displayName} size={20} />
        <span className="text-xs font-medium">{profile.displayName}</span>
      </Link>
      <RoomCard room={room} match={matchById(room.matchId)!} />
    </div>
  );
}

export function RoomsFollowingFeed() {
  const followed = followedProfileIds();

  const created = rooms.filter((r) => r.status !== "settled" && followed.includes(r.creatorId));

  const joined = followed
    .flatMap((id) => roomsJoinedBy(id).map((room) => ({ room, byId: id })))
    .filter(({ room, byId }) => room.status !== "settled" && room.creatorId !== byId);

  const hasAnything = created.length > 0 || joined.length > 0;

  if (!hasAnything) {
    return (
      <div className="rounded-lg border border-border bg-surface p-8 text-center">
        <p className="text-sm text-muted">
          Nobody you follow has an active room right now. Follow a few more rivals to fill this up.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-10">
      {created.length > 0 && (
        <section>
          <p className="text-xs font-medium uppercase tracking-wide text-muted">Created</p>
          <div className="mt-3 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {created.map((room) => (
              <RoomWithByline key={room.id} room={room} byId={room.creatorId} />
            ))}
          </div>
        </section>
      )}

      {joined.length > 0 && (
        <section>
          <p className="text-xs font-medium uppercase tracking-wide text-muted">Joined</p>
          <div className="mt-3 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {joined.map(({ room, byId }) => (
              <RoomWithByline key={`${room.id}-${byId}`} room={room} byId={byId} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
