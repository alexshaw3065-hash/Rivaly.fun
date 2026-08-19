import {
  SELF_USER_ID,
  roomsByCreator,
  roomsJoinedBy,
  entriesByUser,
  matchById,
  formatSignedMoney,
} from "@/lib/mock-data";
import { RoomCard } from "./room-card";
import type { Room } from "@/lib/types";

function CompletedRoomCard({ room }: { room: Room }) {
  const entry = entriesByUser(SELF_USER_ID).find((e) => e.roomId === room.id);
  return (
    <div className="flex flex-col gap-2">
      {entry && entry.isWinner !== null && (
        <p
          className="text-xs font-medium"
          style={{ color: entry.isWinner ? "var(--rival-green)" : "var(--muted)" }}
        >
          {entry.isWinner ? `Won ${formatSignedMoney(entry.payoutCents ?? 0)}` : "Didn't hit"}
        </p>
      )}
      <RoomCard room={room} match={matchById(room.matchId)!} />
    </div>
  );
}

// My Rooms: everything with your name on it, split the way people
// actually think about their own activity — what you started, what you
// joined in on, and how it all turned out.
export function RoomsMineFeed() {
  const created = roomsByCreator(SELF_USER_ID);
  const joined = roomsJoinedBy(SELF_USER_ID).filter((r) => r.creatorId !== SELF_USER_ID);

  const activeCreated = created.filter((r) => r.status !== "settled");
  const activeJoined = joined.filter((r) => r.status !== "settled");

  const completedIds = new Set(
    [...created, ...joined].filter((r) => r.status === "settled").map((r) => r.id),
  );
  const completed = [...created, ...joined].filter(
    (r, i, arr) => completedIds.has(r.id) && arr.findIndex((x) => x.id === r.id) === i,
  );

  const hasAnything = activeCreated.length + activeJoined.length + completed.length > 0;

  if (!hasAnything) {
    return (
      <div className="rounded-lg border border-border bg-surface p-8 text-center">
        <p className="text-sm text-muted">
          Nothing here yet. Create a room or join one to see it show up.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-10">
      {activeCreated.length > 0 && (
        <section>
          <p className="text-xs font-medium uppercase tracking-wide text-muted">Created</p>
          <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {activeCreated.map((room) => (
              <RoomCard key={room.id} room={room} match={matchById(room.matchId)!} />
            ))}
          </div>
        </section>
      )}

      {activeJoined.length > 0 && (
        <section>
          <p className="text-xs font-medium uppercase tracking-wide text-muted">Joined</p>
          <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {activeJoined.map((room) => (
              <RoomCard key={room.id} room={room} match={matchById(room.matchId)!} />
            ))}
          </div>
        </section>
      )}

      {completed.length > 0 && (
        <section>
          <p className="text-xs font-medium uppercase tracking-wide text-muted">Completed</p>
          <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {completed.map((room) => (
              <CompletedRoomCard key={room.id} room={room} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
