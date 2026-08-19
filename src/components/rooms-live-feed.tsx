import { rooms, matchById } from "@/lib/mock-data";
import { RoomCard } from "./room-card";
import { LiveBadge } from "./live-badge";
import type { Room } from "@/lib/types";

// Live now, then a taste of what's coming — per the founder's direction,
// this tab should "subtly introduce upcoming rooms" rather than being a
// dead end once the live list runs dry.
function isOpen(r: Room) {
  return r.status !== "settled";
}

export function RoomsLiveFeed() {
  const live = rooms.filter((r) => isOpen(r) && matchById(r.matchId)?.status === "live");
  const upcoming = [...rooms]
    .filter((r) => isOpen(r) && matchById(r.matchId)?.status === "scheduled")
    .sort((a, b) => {
      const ka = matchById(a.matchId)?.kickoffAt ?? "";
      const kb = matchById(b.matchId)?.kickoffAt ?? "";
      return +new Date(ka) - +new Date(kb);
    })
    .slice(0, 6);

  return (
    <div className="flex flex-col gap-10">
      <section>
        <div className="flex items-center gap-2">
          <LiveBadge />
        </div>
        {live.length === 0 ? (
          <p className="mt-3 text-sm text-muted">Nothing live right now — check back at kickoff.</p>
        ) : (
          <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {live.map((room, i) => (
              <div key={room.id} className="stagger-in" style={{ animationDelay: `${i * 40}ms` }}>
                <RoomCard room={room} match={matchById(room.matchId)!} />
              </div>
            ))}
          </div>
        )}
      </section>

      {upcoming.length > 0 && (
        <section>
          <p className="text-xs font-medium uppercase tracking-wide text-muted">Starting soon</p>
          <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {upcoming.map((room) => (
              <RoomCard key={room.id} room={room} match={matchById(room.matchId)!} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
