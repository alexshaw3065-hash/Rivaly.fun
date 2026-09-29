"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { fetchRoomsForProfile, type RoomWithMatch } from "@/lib/use-real-rooms";
import { planSettlement } from "@/lib/settlement/payouts";
import { formatMoney } from "@/lib/mock-data";
import type { EntrySide } from "@/lib/types";
import { RoomCard } from "./room-card";
import { RoomCardShape } from "./loading-shapes";

export type PositionFilter = "open" | "closed";

/** This profile's own stake in a room: which side, how much, and how it ended. */
export interface ProfileStake {
  side: EntrySide;
  amountCents: number;
  isWinner: boolean | null;
  payoutCents: number | null;
}

// Every real room this profile created or joined, deduped — same data as
// Rooms > My Rooms — plus their stake in each (readable for public rooms,
// the same stakes a room shows anyone). One hook for both the tab's "(n)"
// count and the list, so the two can never disagree.
export function useProfilePositions(profileId: string): { items: RoomWithMatch[]; stakes: Record<string, ProfileStake>; isLoading: boolean } {
  const [state, setState] = useState<{ id: string; items: RoomWithMatch[]; stakes: Record<string, ProfileStake> } | null>(null);
  useEffect(() => {
    let cancelled = false;
    const entries = createClient()
      .from("entries")
      .select("room_id, side, amount_cents, is_winner, payout_cents")
      .eq("user_id", profileId)
      .then(
        ({ data }) => data ?? [],
        () => [],
      );
    Promise.all([fetchRoomsForProfile(profileId), entries]).then(([{ created, joined }, rows]) => {
      if (cancelled) return;
      const all = [...created, ...joined].filter((r, i, arr) => arr.findIndex((x) => x.room.id === r.room.id) === i);
      const stakes: Record<string, ProfileStake> = {};
      for (const r of rows as { room_id: string; side: EntrySide; amount_cents: number; is_winner: boolean | null; payout_cents: number | null }[]) {
        stakes[r.room_id] = { side: r.side, amountCents: r.amount_cents, isWinner: r.is_winner, payoutCents: r.payout_cents };
      }
      setState({ id: profileId, items: all, stakes });
    });
    return () => {
      cancelled = true;
    };
  }, [profileId]);
  const mine = state?.id === profileId;
  return { items: mine ? state.items : [], stakes: mine ? state.stakes : {}, isLoading: !mine };
}

const isClosed = (status: string) => status === "settled" || status === "refunded" || status === "cancelled";

// Open: what the stake would pay if its side won, from the room's pot as it
// stands (the settlement's own maths and the room's own fee). Closed: how it
// actually ended.
function StakeLine({ item, stake }: { item: RoomWithMatch; stake: ProfileStake }) {
  const { room } = item;
  const side = <span className={`font-bold ${stake.side === "yes" ? "text-yes-ink" : "text-no-ink"}`}>{stake.side.toUpperCase()}</span>;
  let result: React.ReactNode;
  if (isClosed(room.status)) {
    result =
      room.status === "refunded" || stake.isWinner === null ? (
        <span className="text-secondary">refunded</span>
      ) : stake.isWinner && (stake.payoutCents ?? 0) <= stake.amountCents ? (
        // Won, but nobody was on the other side: just the stake back.
        <span className="text-secondary">stake back</span>
      ) : stake.isWinner ? (
        <span className="font-semibold text-money-ink">won +{formatMoney(Math.max(0, (stake.payoutCents ?? 0) - stake.amountCents))}</span>
      ) : (
        <span className="text-secondary">lost {formatMoney(stake.amountCents)}</span>
      );
  } else {
    const yes = room.yesTotalCents ?? 0;
    const no = room.noTotalCents ?? 0;
    const mine = Math.max(stake.side === "yes" ? yes : no, stake.amountCents);
    const theirs = stake.side === "yes" ? no : yes;
    if (theirs === 0) {
      result = <span className="text-secondary">waiting for a rival</span>;
    } else {
      const other: EntrySide = stake.side === "yes" ? "no" : "yes";
      const plan = planSettlement(
        [
          { id: "me", side: stake.side, amountCents: stake.amountCents },
          ...(mine > stake.amountCents ? [{ id: "rest", side: stake.side, amountCents: mine - stake.amountCents }] : []),
          { id: "them", side: other, amountCents: theirs },
        ],
        stake.side,
        { rivalyBps: room.feeBps ?? 0, hostBps: room.hostFeeBps ?? 0 },
      );
      const payout = plan.payouts.find((p) => p.entryId === "me")?.cents ?? stake.amountCents;
      result = (
        <>
          <span className="text-secondary">to win</span> <span className="font-semibold text-money-ink">+{formatMoney(payout - stake.amountCents)}</span>
        </>
      );
    }
  }
  return (
    <p className="mt-2 flex flex-wrap items-center gap-x-1.5 px-1 text-caption tabular-nums">
      {side}
      <span className="text-foreground">{formatMoney(stake.amountCents)} staked</span>
      <span aria-hidden className="text-tertiary">·</span>
      {result}
    </p>
  );
}

export function ProfilePositions({
  items,
  stakes = {},
  isLoading,
  filter,
}: {
  items: RoomWithMatch[];
  stakes?: Record<string, ProfileStake>;
  isLoading: boolean;
  filter: PositionFilter;
}) {
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
      {rows.map((item) => (
        <div key={item.room.id}>
          <RoomCard room={item.room} match={item.match} />
          {stakes[item.room.id] && <StakeLine item={item} stake={stakes[item.room.id]} />}
        </div>
      ))}
    </div>
  );
}
