import { matchById } from "@/lib/mock-data";
import { RoomCard } from "./room-card";
import { MatchChip } from "./match-chip";
import { PersonRow } from "./person-row";
import type { Room, Match, Profile } from "@/lib/types";

// Grouped, live-updating search results — recomputes on every keystroke in
// the caller (no debounce needed against a mock dataset this small), so
// typing already reads as "suggest while typing." Shared by the full
// Search page and the desktop header's compact dropdown (compact caps each
// section instead of showing everything, since it renders in a small
// fixed-height panel).
export function SearchResultsList({
  query,
  rooms,
  matches,
  people,
  compact = false,
}: {
  query: string;
  rooms: Room[];
  matches: Match[];
  people: Profile[];
  compact?: boolean;
}) {
  const hasResults = rooms.length + matches.length + people.length > 0;
  const cap = compact ? 3 : rooms.length + matches.length + people.length;

  if (!hasResults) {
    return <p className="text-sm text-muted">No results for &ldquo;{query}&rdquo;.</p>;
  }

  return (
    <div className={compact ? "flex flex-col gap-6" : "flex flex-col gap-10"}>
      {rooms.length > 0 && (
        <section>
          <p className="text-xs font-medium uppercase tracking-wide text-muted">Rooms</p>
          <div
            className={
              compact
                ? "mt-3 flex flex-col gap-2"
                : "mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
            }
          >
            {rooms.slice(0, cap).map((room) => (
              <RoomCard key={room.id} room={room} match={matchById(room.matchId)!} />
            ))}
          </div>
        </section>
      )}
      {matches.length > 0 && (
        <section>
          <p className="text-xs font-medium uppercase tracking-wide text-muted">Matches</p>
          <div
            className={
              compact
                ? "no-scrollbar mt-3 flex gap-3 overflow-x-auto pb-1"
                : "mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3"
            }
          >
            {matches.slice(0, cap).map((m) => (
              <MatchChip key={m.id} match={m} />
            ))}
          </div>
        </section>
      )}
      {people.length > 0 && (
        <section>
          <p className="text-xs font-medium uppercase tracking-wide text-muted">People</p>
          <div className="mt-3 flex flex-col gap-2">
            {people.slice(0, cap).map((p) => (
              <PersonRow key={p.id} profile={p} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
