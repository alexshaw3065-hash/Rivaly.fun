"use client";

import { useState } from "react";
import { roomsByCreator, roomsJoinedBy, matchById } from "@/lib/mock-data";
import { RoomCard } from "./room-card";

type PositionFilter = "open" | "closed";

// Every room this profile created or joined, deduped — same underlying data
// as Rooms > My Rooms, reframed as one list + a toggle instead of sub-tabs.
export function ProfilePositions({ profileId }: { profileId: string }) {
  const [filter, setFilter] = useState<PositionFilter>("open");

  const all = [...roomsByCreator(profileId), ...roomsJoinedBy(profileId)].filter(
    (r, i, arr) => arr.findIndex((x) => x.id === r.id) === i,
  );
  const rows = all.filter((r) => (filter === "open" ? r.status !== "settled" : r.status === "settled"));

  return (
    <div>
      <div className="flex gap-2">
        {(["open", "closed"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className="rounded-full border px-3.5 py-1.5 text-sm capitalize active:scale-[0.97]"
            style={{
              borderColor: filter === f ? "var(--foreground)" : "var(--border)",
              color: filter === f ? "var(--foreground)" : "var(--muted)",
              background: filter === f ? "var(--surface-elevated)" : "transparent",
              transition: "transform 150ms ease-out, border-color 150ms ease, color 150ms ease",
            }}
          >
            {f}
          </button>
        ))}
      </div>

      {rows.length === 0 ? (
        <p className="py-14 text-center text-sm text-muted">
          No {filter} positions yet.
        </p>
      ) : (
        <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-2">
          {rows.map((room) => {
            const match = matchById(room.matchId);
            if (!match) return null;
            return <RoomCard key={room.id} room={room} match={match} />;
          })}
        </div>
      )}
    </div>
  );
}
