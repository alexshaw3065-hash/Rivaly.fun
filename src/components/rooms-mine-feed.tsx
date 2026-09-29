"use client";

import { useEffect, useState } from "react";
import { formatSignedMoney } from "@/lib/mock-data";
import { createClient } from "@/lib/supabase/client";
import { fetchRoomsForProfile, type RoomWithMatch } from "@/lib/use-real-rooms";
import { useCurrentUser } from "./current-user-provider";
import { RoomCard } from "./room-card";
import { EmptyRooms } from "./empty-rooms";

type SubTab = "created" | "joined" | "completed";

interface MyResult {
  isWinner: boolean | null;
  netCents: number;
}

function CompletedRoomCard({ item, result }: { item: RoomWithMatch; result: MyResult | undefined }) {
  return (
    <div className="flex flex-col gap-2">
      {result && result.isWinner !== null && (
        <p className="text-caption font-medium" style={{ color: result.isWinner ? "var(--money)" : "var(--text-secondary)" }}>
          {result.isWinner ? `Won ${formatSignedMoney(result.netCents)}` : "Didn't hit"}
        </p>
      )}
      {item.room.status === "refunded" && <p className="text-caption font-medium text-secondary">Refunded</p>}
      <RoomCard room={item.room} match={item.match} />
    </div>
  );
}

const emptyCopy: Record<SubTab, string> = {
  created: "You haven't created a room yet.",
  joined: "You haven't joined a room yet.",
  completed: "Nothing's settled yet.",
};

const isDone = (status: string) => status === "settled" || status === "refunded" || status === "cancelled";

// My Rooms: everything with your name on it, split the way people actually
// think about their own activity — what you started, what you joined in on,
// and how it all turned out. Real rooms only.
export function RoomsMineFeed() {
  const [sub, setSub] = useState<SubTab>("created");
  const currentUser = useCurrentUser();
  const [data, setData] = useState<{
    userId: string;
    created: RoomWithMatch[];
    joined: RoomWithMatch[];
    results: Map<string, MyResult>;
  } | null>(null);

  useEffect(() => {
    if (!currentUser) return;
    let cancelled = false;
    Promise.all([
      fetchRoomsForProfile(currentUser.id),
      createClient()
        .from("entries")
        .select("room_id, is_winner, payout_cents, amount_cents")
        .eq("user_id", currentUser.id)
        .then((res) => res, () => ({ data: null })),
    ]).then(([rooms, { data: entries }]) => {
      if (cancelled) return;
      const results = new Map<string, MyResult>(
        (entries ?? []).map((e) => [
          e.room_id as string,
          { isWinner: e.is_winner as boolean | null, netCents: (e.payout_cents ?? 0) - (e.amount_cents as number) },
        ]),
      );
      setData({ userId: currentUser.id, ...rooms, results });
    });
    return () => {
      cancelled = true;
    };
  }, [currentUser]);

  if (!currentUser) {
    return <EmptyRooms title="Your rooms live here" body="Sign in, then create a room or join one — it'll show up here." />;
  }
  const mine = data?.userId === currentUser.id ? data : null;
  if (!mine) return <p className="text-body text-secondary">Loading…</p>;

  const activeCreated = mine.created.filter((i) => !isDone(i.room.status));
  const activeJoined = mine.joined.filter((i) => !isDone(i.room.status));
  const completed = [...mine.created, ...mine.joined].filter(
    (i, idx, arr) => isDone(i.room.status) && arr.findIndex((x) => x.room.id === i.room.id) === idx,
  );

  if (activeCreated.length + activeJoined.length + completed.length === 0) {
    return <EmptyRooms title="Nothing here yet" body="Create a room or join one and it'll show up here." />;
  }

  const current = sub === "created" ? activeCreated : sub === "joined" ? activeJoined : completed;

  return (
    <div>
      <div className="flex gap-5">
        {(["created", "joined", "completed"] as const).map((s) => (
          <button
            key={s}
            onClick={() => setSub(s)}
            className="-mb-px border-b-2 pb-2 text-body font-medium capitalize transition-colors duration-150"
            style={{
              borderColor: sub === s ? "var(--foreground)" : "transparent",
              color: sub === s ? "var(--foreground)" : "var(--text-secondary)",
            }}
          >
            {s}
          </button>
        ))}
      </div>

      {current.length > 0 ? (
        <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {current.map((item) =>
            sub === "completed" ? (
              <CompletedRoomCard key={item.room.id} item={item} result={mine.results.get(item.room.id)} />
            ) : (
              <RoomCard key={item.room.id} room={item.room} match={item.match} />
            ),
          )}
        </div>
      ) : (
        <p className="mt-6 text-body text-secondary">{emptyCopy[sub]}</p>
      )}
    </div>
  );
}
