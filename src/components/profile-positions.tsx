import { roomsByCreator, roomsJoinedBy, matchById } from "@/lib/mock-data";
import { RoomCard } from "./room-card";

export type PositionFilter = "open" | "closed";

// Every room this profile created or joined, deduped — same underlying data
// as Rooms > My Rooms. Dedup+total count is exposed via allPositions() below
// so the parent tab row can show a real "(n)" count and own the Open/Closed
// toggle on the same line, instead of this component owning its own filter
// row above the list.
export function allPositions(profileId: string) {
  return [...roomsByCreator(profileId), ...roomsJoinedBy(profileId)].filter(
    (r, i, arr) => arr.findIndex((x) => x.id === r.id) === i,
  );
}

export function ProfilePositions({ profileId, filter }: { profileId: string; filter: PositionFilter }) {
  const rows = allPositions(profileId).filter((r) =>
    filter === "open" ? r.status !== "settled" : r.status === "settled",
  );

  return (
    <div>
      {rows.length === 0 ? (
        <p className="py-14 text-center text-sm text-muted">
          No {filter} positions yet.
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {rows.map((room) => {
            const match = matchById(room.matchId);
            if (!match) return null;
            return <RoomCard key={room.id} room={room} match={match} />;
          })}
        </div>
      )}
    </div>
  );
}
