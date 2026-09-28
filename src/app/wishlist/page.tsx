"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useSavedItems } from "@/lib/use-saved-items";
import { searchTopics } from "@/lib/mock-data";
import { createClient } from "@/lib/supabase/client";
import { mapMatchRow, MATCH_COLUMNS, type MatchRow } from "@/lib/supabase/match-mapper";
import type { Match } from "@/lib/types";
import { fetchRoomsByIds, type RoomWithMatch } from "@/lib/use-real-rooms";
import { RoomCard } from "@/components/room-card";
import { MatchChip } from "@/components/match-chip";
import { BookmarkButton } from "@/components/bookmark-button";
import { Card, EmptyState } from "@/components/ui/surfaces";
import { ButtonLink } from "@/components/ui/button";

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

  // Bookmarked matches, read from the real fixtures table.
  const matchIdsKey = savedItems
    .filter((it) => it.type === "match")
    .map((it) => it.id)
    .join(",");
  const [savedMatches, setSavedMatches] = useState<Match[]>([]);
  useEffect(() => {
    let cancelled = false;
    const ids = matchIdsKey ? matchIdsKey.split(",").filter((id) => /^[0-9a-f-]{36}$/i.test(id)) : [];
    const load = ids.length
      ? createClient()
          .from("matches")
          .select(MATCH_COLUMNS)
          .in("id", ids)
          .then(({ data }) => (data ?? []).map((r) => mapMatchRow(r as MatchRow)))
      : Promise.resolve([] as Match[]);
    void load.then((rows) => {
      if (!cancelled) setSavedMatches(rows);
    });
    return () => {
      cancelled = true;
    };
  }, [matchIdsKey]);

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
      <h1 className="text-title-1 font-display text-foreground">Wishlist</h1>
      <p className="mt-2 text-body text-secondary">Rooms, matches, and topics you&rsquo;ve bookmarked to come back to.</p>

      {!hasAnything ? (
        <Card padded={false} className="mt-8">
          <EmptyState
            title="Nothing saved yet"
            body="Tap the bookmark on any room, match, or search topic to add it here."
            action={
              <ButtonLink href="/" variant="secondary" size="md">
                Browse rooms →
              </ButtonLink>
            }
          />
        </Card>
      ) : (
        <div className="mt-8 flex flex-col gap-8">
          {savedTopics.length > 0 && (
            <section>
              <p className="text-label font-semibold text-secondary">Discussions</p>
              <div className="no-scrollbar mt-3 flex gap-2 overflow-x-auto pb-1">
                {savedTopics.map((topic) => (
                  <div
                    key={topic.id}
                    className="flex h-9 shrink-0 items-center gap-1.5 rounded-full pl-3 pr-2 edge-strong"
                  >
                    <Link href="/search" className="text-label text-foreground">
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
              <p className="text-label font-semibold text-secondary">Rooms</p>
              <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {savedRooms.map(({ room, match }) => (
                  <RoomCard key={room.id} room={room} match={match} />
                ))}
              </div>
            </section>
          )}

          {savedMatches.length > 0 && (
            <section>
              <p className="text-label font-semibold text-secondary">Matches</p>
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
