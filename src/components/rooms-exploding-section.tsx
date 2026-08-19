import { explodingRooms, matchById } from "@/lib/mock-data";
import { ExplodingRoomCard } from "./exploding-room-card";

// Discover's own Exploding Now — a vertical stack, not Home's swipeable
// carousel (the founder's direction: same concept, no shared instance or
// behavior). First thing in the tab, everything else drops below it.
export function RoomsExplodingSection() {
  const exploding = explodingRooms(3).map((room) => ({ room, match: matchById(room.matchId)! }));

  return (
    <section>
      <h2 className="font-display text-xl font-semibold text-foreground">🔥 Exploding now</h2>
      <div className="mt-5 flex flex-col gap-4">
        {exploding.map(({ room, match }, i) => (
          <div key={room.id} className="stagger-in" style={{ animationDelay: `${i * 40}ms` }}>
            <ExplodingRoomCard room={room} match={match} />
          </div>
        ))}
      </div>
    </section>
  );
}
