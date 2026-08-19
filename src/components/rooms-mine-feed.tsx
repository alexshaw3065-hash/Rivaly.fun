"use client";

import { useState } from "react";
import {
  SELF_USER_ID,
  roomsByCreator,
  roomsJoinedBy,
  entriesByUser,
  matchById,
  formatSignedMoney,
} from "@/lib/mock-data";
import { RoomCard } from "./room-card";
import type { Room } from "@/lib/types";

type SubTab = "created" | "joined" | "completed";

function CompletedRoomCard({ room }: { room: Room }) {
  const entry = entriesByUser(SELF_USER_ID).find((e) => e.roomId === room.id);
  return (
    <div className="flex flex-col gap-2">
      {entry && entry.isWinner !== null && (
        <p
          className="text-xs font-medium"
          style={{ color: entry.isWinner ? "var(--rival-green)" : "var(--muted)" }}
        >
          {entry.isWinner ? `Won ${formatSignedMoney(entry.payoutCents ?? 0)}` : "Didn't hit"}
        </p>
      )}
      <RoomCard room={room} match={matchById(room.matchId)!} />
    </div>
  );
}

const emptyCopy: Record<SubTab, string> = {
  created: "You haven't created a room yet.",
  joined: "You haven't joined a room yet.",
  completed: "Nothing's settled yet.",
};

// My Rooms: everything with your name on it, split the way people
// actually think about their own activity — what you started, what you
// joined in on, and how it all turned out.
export function RoomsMineFeed() {
  const [sub, setSub] = useState<SubTab>("created");

  const created = roomsByCreator(SELF_USER_ID);
  const joined = roomsJoinedBy(SELF_USER_ID).filter((r) => r.creatorId !== SELF_USER_ID);

  const activeCreated = created.filter((r) => r.status !== "settled");
  const activeJoined = joined.filter((r) => r.status !== "settled");

  const completedIds = new Set(
    [...created, ...joined].filter((r) => r.status === "settled").map((r) => r.id),
  );
  const completed = [...created, ...joined].filter(
    (r, i, arr) => completedIds.has(r.id) && arr.findIndex((x) => x.id === r.id) === i,
  );

  const hasAnything = activeCreated.length + activeJoined.length + completed.length > 0;

  if (!hasAnything) {
    return (
      <div className="rounded-lg border border-border bg-surface p-8 text-center">
        <p className="text-sm text-muted">
          Nothing here yet. Create a room or join one to see it show up.
        </p>
      </div>
    );
  }

  const current = sub === "created" ? activeCreated : sub === "joined" ? activeJoined : completed;

  return (
    <div>
      <div className="flex gap-5">
        {(["created", "joined", "completed"] as const).map((s) => (
          <button
            key={s}
            onClick={() => setSub(s)}
            className="-mb-px border-b-2 pb-2 text-sm font-medium capitalize transition-colors duration-150"
            style={{
              borderColor: sub === s ? "var(--foreground)" : "transparent",
              color: sub === s ? "var(--foreground)" : "var(--muted)",
            }}
          >
            {s}
          </button>
        ))}
      </div>

      {current.length > 0 ? (
        <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {current.map((room) =>
            sub === "completed" ? (
              <CompletedRoomCard key={room.id} room={room} />
            ) : (
              <RoomCard key={room.id} room={room} match={matchById(room.matchId)!} />
            ),
          )}
        </div>
      ) : (
        <p className="mt-6 text-sm text-muted">{emptyCopy[sub]}</p>
      )}
    </div>
  );
}
