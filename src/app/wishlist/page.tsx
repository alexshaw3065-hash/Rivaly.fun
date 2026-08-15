"use client";

import Link from "next/link";
import { useSavedRoomIds } from "@/lib/use-saved-rooms";
import { roomById, matchById } from "@/lib/mock-data";
import { RoomCard } from "@/components/room-card";

export default function WishlistPage() {
  const savedIds = useSavedRoomIds();
  const savedRooms = savedIds
    .map((id) => roomById(id))
    .filter((r): r is NonNullable<typeof r> => Boolean(r));

  return (
    <main className="mx-auto max-w-4xl px-6 py-12">
      <h1 className="font-display text-2xl font-bold text-foreground md:text-3xl">Wishlist</h1>
      <p className="mt-1 text-sm text-muted">Rooms you&rsquo;ve bookmarked to come back to.</p>

      {savedRooms.length === 0 ? (
        <div className="mt-10 rounded-lg border border-border bg-surface p-8 text-center">
          <p className="text-sm text-muted">
            Nothing saved yet. Tap the bookmark on any room to add it here.
          </p>
          <Link
            href="/"
            className="mt-4 inline-block rounded-md border border-border-strong px-4 py-2 text-sm font-medium text-foreground transition-transform duration-150 ease-out active:scale-[0.97]"
          >
            Browse rooms →
          </Link>
        </div>
      ) : (
        <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {savedRooms.map((room) => (
            <RoomCard key={room.id} room={room} match={matchById(room.matchId)!} />
          ))}
        </div>
      )}
    </main>
  );
}
