"use client";

import { ExplodingCarousel, useExplodingSlides } from "./exploding-carousel";

// Rooms' own Exploding Now — the same carousel as Home, per founder direction
// (2026-09-24): the hottest real rooms, topped up with upcoming fixtures.
export function RoomsExplodingSection() {
  const { slides } = useExplodingSlides();
  if (slides.length === 0) return null;

  return (
    <section className="min-w-0">
      <h2 className="font-display text-xl font-semibold text-foreground">🔥 Exploding now</h2>
      <div className="mt-5">
        <ExplodingCarousel items={slides} />
      </div>
    </section>
  );
}
