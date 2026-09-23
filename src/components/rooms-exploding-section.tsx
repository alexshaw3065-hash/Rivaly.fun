"use client";

import { byHeat, usePublicRooms } from "@/lib/use-real-rooms";
import { ExplodingRoomCard } from "./exploding-room-card";

// Discover's own Exploding Now — a vertical stack, not Home's swipeable
// carousel (the founder's direction: same concept, no shared instance or
// behavior). The three hottest real rooms; nothing at all when there aren't
// any, since Discover's feed right below carries its own empty state.
export function RoomsExplodingSection() {
  const { items } = usePublicRooms();
  const exploding = [...items].sort(byHeat).slice(0, 3);
  if (exploding.length === 0) return null;

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
