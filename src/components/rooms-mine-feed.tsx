"use client";

import { useEffect, useState } from "react";
import {
  SELF_USER_ID,
  roomsByCreator,
  roomsJoinedBy,
  entriesByUser,
  matchById,
  formatSignedMoney,
} from "@/lib/mock-data";
import { createClient } from "@/lib/supabase/client";
import { ROOM_COLUMNS, mapRoomRow, type RoomRow } from "@/lib/supabase/room-mapper";
import { useCurrentUser } from "./current-user-provider";
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
// joined in on, and how it all turned out. "Created" merges the mock
// roster (still SELF_USER_ID = "u3", unrelated to whoever is really
// signed in) with any real rooms the actual current user has created —
// two genuinely different lists, concatenated, not one replacing the
// other. Fetched client-side (not a server helper) since this is a
// client component and rooms.ts's server helpers can't be imported here.
export function RoomsMineFeed() {
  const [sub, setSub] = useState<SubTab>("created");
  const currentUser = useCurrentUser();
  const [realCreated, setRealCreated] = useState<Room[]>([]);

  // Reset when who's signed in changes (including signing out) — computed
  // during render rather than via a useEffect + setState, same convention
  // room-feed.tsx already uses for the same reason: avoids the extra
  // cascading-render effect that resetting inside the fetch effect itself
  // would cause.
  const [prevUserId, setPrevUserId] = useState<string | null>(null);
  if ((currentUser?.id ?? null) !== prevUserId) {
    setPrevUserId(currentUser?.id ?? null);
    setRealCreated([]);
  }

  useEffect(() => {
    if (!currentUser) return;
    let cancelled = false;
    const supabase = createClient();
    supabase
      .from("rooms")
      .select(ROOM_COLUMNS)
      .eq("creator_id", currentUser.id)
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        if (!cancelled) setRealCreated((data ?? []).map((row) => mapRoomRow(row as RoomRow)));
      });
    return () => {
      cancelled = true;
    };
  }, [currentUser]);

  const created = [...realCreated, ...roomsByCreator(SELF_USER_ID)];
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
          {current.map((room) => {
            const match = matchById(room.matchId);
            if (!match) return null;
            return sub === "completed" ? (
              <CompletedRoomCard key={room.id} room={room} />
            ) : (
              <RoomCard key={room.id} room={room} match={match} />
            );
          })}
        </div>
      ) : (
        <p className="mt-6 text-sm text-muted">{emptyCopy[sub]}</p>
      )}
    </div>
  );
}
