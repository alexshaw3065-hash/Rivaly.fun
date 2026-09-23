"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useSavedItems } from "@/lib/use-saved-items";
import { matchById, searchTopics } from "@/lib/mock-data";
import { fetchRoomsByIds, type RoomWithMatch } from "@/lib/use-real-rooms";
import { RoomCard } from "@/components/room-card";
import { MatchChip } from "@/components/match-chip";
import { BookmarkButton } from "@/components/bookmark-button";

export default function WishlistPage() {
  const savedItems = useSavedItems();

  // Bookmarked rooms are real rows now — fetched with their real matches.
  // Old bookmarks pointing at removed mock rooms simply don't resolve.
  const roomIdsKey = savedItems
    .filter((it) => it.type === "room")
    .map((it) => it.id)
    .join(",");
  const [savedRooms, setSavedRooms] = useState<RoomWithMatch[]>([]);
  useEffect(() => {
    let cancelled = false;
    fetchRoomsByIds(roomIdsKey ? roomIdsKey.split(",") : []).then((rows) => {
      if (!cancelled) setSavedRooms(rows);
    });
    return () => {
      cancelled = true;
    };
  }, [roomIdsKey]);

  const savedMatches = savedItems
    .filter((it) => it.type === "match")
    .map((it) => matchById(it.id))
    .filter((m): m is NonNullable<typeof m> => Boolean(m));

  // Curated topics resolve against searchTopics; an ad-hoc saved search
  // (bookmarked from the results header, id prefixed "q:" — see
  // search-results-list.tsx) has no catalog entry, so its own text is the
  // label.
  const savedTopics = savedItems
    .filter((it) => it.type === "topic")
    .map(
      (it) =>
        searchTopics.find((t) => t.id === it.id) ?? {
          id: it.id,
          label: it.id.startsWith("q:") ? it.id.slice(2) : it.id,
        },
    );

  const hasAnything = savedRooms.length + savedMatches.length + savedTopics.length > 0;

  return (
    <main className="mx-auto max-w-4xl px-4 py-12 md:px-6">
      <h1 className="font-display text-2xl font-bold text-foreground md:text-3xl">Wishlist</h1>
      <p className="mt-1 text-sm text-muted">Rooms, matches, and topics you&rsquo;ve bookmarked to come back to.</p>

      {!hasAnything ? (
        <div className="mt-10 rounded-lg border border-border bg-surface p-8 text-center">
          <p className="text-sm text-muted">
            Nothing saved yet. Tap the bookmark on any room, match, or search topic to add it here.
          </p>
          <Link
            href="/"
            className="mt-4 inline-block rounded-md border border-border-strong px-4 py-2 text-sm font-medium text-foreground transition-transform duration-150 ease-out active:scale-[0.97]"
          >
            Browse rooms →
          </Link>
        </div>
      ) : (
        <div className="mt-8 flex flex-col gap-10">
          {savedTopics.length > 0 && (
            <section>
              <p className="text-xs font-medium uppercase tracking-wide text-muted">Discussions</p>
              <div className="no-scrollbar mt-3 flex gap-2 overflow-x-auto pb-1">
                {savedTopics.map((topic) => (
                  <div
                    key={topic.id}
                    className="flex shrink-0 items-center gap-1.5 rounded-full border border-border py-1.5 pl-3.5 pr-2"
                  >
                    <Link href="/search" className="text-sm text-foreground">
                      {topic.label}
                    </Link>
                    <BookmarkButton type="topic" id={topic.id} label={topic.label} />
                  </div>
                ))}
              </div>
            </section>
          )}

          {savedRooms.length > 0 && (
            <section>
              <p className="text-xs font-medium uppercase tracking-wide text-muted">Rooms</p>
              <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {savedRooms.map(({ room, match }) => (
                  <RoomCard key={room.id} room={room} match={match} />
                ))}
              </div>
            </section>
          )}

          {savedMatches.length > 0 && (
            <section>
              <p className="text-xs font-medium uppercase tracking-wide text-muted">Matches</p>
              <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {savedMatches.map((match) => (
                  <MatchChip key={match.id} match={match} />
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </main>
  );
}
