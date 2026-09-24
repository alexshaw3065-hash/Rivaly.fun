"use client";

import { byHeat, usePublicRooms } from "@/lib/use-real-rooms";
import { ExplodingCarousel } from "./exploding-carousel";

// Rooms' own Exploding Now — the same carousel as Home, per founder direction
// (2026-09-24). The hottest real rooms; nothing at all when there aren't any,
// since the feed right below carries its own empty state.
export function RoomsExplodingSection() {
  const { items } = usePublicRooms();
  const exploding = [...items].sort(byHeat).slice(0, 6);
  if (exploding.length === 0) return null;

  return (
    <section className="min-w-0">
      <h2 className="font-display text-xl font-semibold text-foreground">🔥 Exploding now</h2>
      <div className="mt-5">
        <ExplodingCarousel items={exploding} />
      </div>
    </section>
  );
}
