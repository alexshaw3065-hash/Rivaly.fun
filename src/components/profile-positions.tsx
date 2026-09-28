"use client";

import { useEffect, useState } from "react";
import { fetchRoomsForProfile, type RoomWithMatch } from "@/lib/use-real-rooms";
import { RoomCard } from "./room-card";
import { RoomCardShape } from "./loading-shapes";

export type PositionFilter = "open" | "closed";

// Every real room this profile created or joined, deduped — same data as
// Rooms > My Rooms. One hook for both the tab's "(n)" count and the list,
// so the two can never disagree.
export function useProfilePositions(profileId: string): { items: RoomWithMatch[]; isLoading: boolean } {
  const [state, setState] = useState<{ id: string; items: RoomWithMatch[] } | null>(null);
  useEffect(() => {
    let cancelled = false;
    fetchRoomsForProfile(profileId).then(({ created, joined }) => {
      if (cancelled) return;
      const all = [...created, ...joined].filter((r, i, arr) => arr.findIndex((x) => x.room.id === r.room.id) === i);
      setState({ id: profileId, items: all });
    });
    return () => {
      cancelled = true;
    };
  }, [profileId]);
  const mine = state?.id === profileId;
  return { items: mine ? state.items : [], isLoading: !mine };
}

const isClosed = (status: string) => status === "settled" || status === "refunded" || status === "cancelled";

export function ProfilePositions({ items, isLoading, filter }: { items: RoomWithMatch[]; isLoading: boolean; filter: PositionFilter }) {
  const rows = items.filter(({ room }) => (filter === "open" ? !isClosed(room.status) : isClosed(room.status)));

  if (isLoading)
    return (
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2" aria-busy>
        <RoomCardShape />
        <RoomCardShape />
      </div>
    );
  if (rows.length === 0) return <p className="py-12 text-center text-body text-secondary">No {filter} positions yet.</p>;
  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
      {rows.map(({ room, match }) => (
        <RoomCard key={room.id} room={room} match={match} />
      ))}
    </div>
  );
}
