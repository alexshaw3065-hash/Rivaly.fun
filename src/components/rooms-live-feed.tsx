"use client";

import { usePublicRooms } from "@/lib/use-real-rooms";
import { RoomCard } from "./room-card";
import { LiveBadge } from "./live-badge";
import { EmptyRooms } from "./empty-rooms";

// Live now, then a taste of what's coming — per the founder's direction,
// this tab should "subtly introduce upcoming rooms" rather than being a
// dead end once the live list runs dry.
export function RoomsLiveFeed() {
  const { items, isLoading } = usePublicRooms();
  const live = items.filter((i) => i.match.status === "live");
  const upcoming = items
    .filter((i) => i.match.status === "scheduled")
    .sort((a, b) => +new Date(a.match.kickoffAt) - +new Date(b.match.kickoffAt))
    .slice(0, 6);

  if (!isLoading && items.length === 0) return <EmptyRooms />;

  return (
    <div className="flex flex-col gap-10">
      <section>
        <div className="flex items-center gap-2">
          <LiveBadge />
        </div>
        {live.length === 0 ? (
          <p className="mt-3 text-body text-secondary">Nothing live right now — check back at kickoff.</p>
        ) : (
          <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {live.map(({ room, match }, i) => (
              <div key={room.id} className="stagger-in" style={{ animationDelay: `${i * 40}ms` }}>
                <RoomCard room={room} match={match} />
              </div>
            ))}
          </div>
        )}
      </section>

      {upcoming.length > 0 && (
        <section>
          <p className="text-label font-semibold text-secondary">Starting soon</p>
          <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {upcoming.map(({ room, match }) => (
              <RoomCard key={room.id} room={room} match={match} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
