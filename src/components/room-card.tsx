"use client";

import Link from "next/link";
import { useState } from "react";
import type { EntrySide, Match } from "@/lib/types";
import { formatMoney, splitPct, kickoffCountdownCompact } from "@/lib/mock-data";
import { splitPctFromTotals, type RoomWithTotals } from "@/lib/supabase/room-mapper";
import { SplitBar } from "./split-bar";
import { LiveBadge } from "./live-badge";
import { BookmarkButton } from "./bookmark-button";
import { ShareButton } from "./share-button";
import { RivalsInRoom } from "./rivals-in-room";

// One-tap predicting, right in the feed — the Fast design principle's own
// words are "one-tap challenges," and V1's whole promise is putting an
// opinion up against someone else's "in under 30 seconds" (mechanism:
// the pill IS the join control, one tap commits, no separate confirm —
// see join-panel.tsx for the two-step version the full room uses, which
// a feed card has no room to replicate). Pill-shaped and always visible,
// not hidden behind a reveal step. No percentage baked in — the split
// bar's own labels above already show Yes/No's percentage, so the pill
// only ever needs to carry the pick itself. A light tint of the side's
// own color sits behind each pill (not fully transparent, not a full
// solid fill either) so the pick reads as a real surface, not just an
// outline.
function PredictPills({ onPick }: { onPick: (side: EntrySide) => void }) {
  return (
    <div className="grid grid-cols-2 gap-2">
      <button
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onPick("yes");
        }}
        className="rounded-full border py-2 text-sm font-semibold active:scale-[0.96]"
        style={{
          borderColor: "var(--rival-blue)",
          color: "var(--rival-blue)",
          background: "color-mix(in srgb, var(--rival-blue) 14%, transparent)",
        }}
      >
        Yes
      </button>
      <button
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onPick("no");
        }}
        className="rounded-full border py-2 text-sm font-semibold active:scale-[0.96]"
        style={{
          borderColor: "var(--danger-red)",
          color: "var(--danger-red)",
          background: "color-mix(in srgb, var(--danger-red) 14%, transparent)",
        }}
      >
        No
      </button>
    </div>
  );
}

export function RoomCard({ room, match }: { room: RoomWithTotals; match: Match }) {
  // Real rooms carry real yes/no totals (see room-mapper.ts) — use the
  // honest math over them instead of splitPct()'s seeded-hash stand-in,
  // which was never meant to apply to anything but the mock roster.
  const leftPct =
    room.yesTotalCents !== undefined
      ? splitPctFromTotals(room.yesTotalCents, room.noTotalCents ?? 0)
      : splitPct(room);
  const countdown = kickoffCountdownCompact(match);
  const [entered, setEntered] = useState<EntrySide | null>(null);

  return (
    <Link
      href={`/rooms/${room.id}`}
      className="group flex flex-col gap-3 rounded-lg border border-border bg-surface p-4 transition-colors duration-150 hover:border-border-strong active:scale-[0.98]"
      style={{ transition: "transform 120ms ease-out, border-color 150ms ease" }}
    >
      <div className="flex items-center justify-between">
        <span className="font-mono text-[11px] uppercase tracking-wider text-muted">
          {match.competition}
        </span>
        {match.status === "live" ? (
          <LiveBadge />
        ) : (
          <span className="font-mono text-[11px] text-muted">
            {countdown && <span className="text-rival-blue">{countdown} · </span>}
            {match.homeTeam.slice(0, 3).toUpperCase()} v {match.awayTeam.slice(0, 3).toUpperCase()}
          </span>
        )}
      </div>

      <p className="text-lg font-medium leading-snug text-foreground">{room.prediction}</p>

      <SplitBar leftPct={leftPct} leftLabel="Yes" rightLabel="No" />

      {entered ? (
        <div className="enter-pop rounded-md border border-border-strong bg-surface-elevated px-3 py-2 text-sm">
          <span className="font-medium text-foreground">You&rsquo;re in</span>
          <span className="text-muted"> — backing </span>
          <span className={entered === "yes" ? "text-rival-blue" : "text-danger-red"}>
            {entered === "yes" ? "Yes" : "No"}
          </span>
        </div>
      ) : (
        <PredictPills onPick={(side) => setEntered(side)} />
      )}

      <div className="mt-1 flex items-center justify-between border-t border-border pt-3 font-mono text-xs text-muted">
        <span>{formatMoney(room.poolTotalCents)} pool</span>
        <div className="flex items-center gap-3">
          <RivalsInRoom roomId={room.id} participantCount={room.participantCount} />
          <ShareButton path={`/rooms/${room.id}`} label="room" />
          <BookmarkButton id={room.id} label="room" />
        </div>
      </div>
    </Link>
  );
}
