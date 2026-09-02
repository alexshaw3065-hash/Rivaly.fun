"use client";

import Link from "next/link";
import { useState } from "react";
import type { EntrySide, Match, Room } from "@/lib/types";
import { formatMoney, splitPct, estimatedPayoutPerNaira } from "@/lib/mock-data";
import { SplitBar } from "./split-bar";
import { LiveBadge } from "./live-badge";
import { BookmarkButton } from "./bookmark-button";
import { ShareButton } from "./share-button";

// One-tap predicting, right in the feed — the Fast design principle's own
// words are "one-tap challenges," and V1's whole promise is putting an
// opinion up against someone else's "in under 30 seconds" (mechanism:
// the pill IS the join control, one tap commits, no separate confirm —
// see join-panel.tsx for the two-step version the full room uses, which
// a feed card has no room to replicate). Pill-shaped and always visible,
// not hidden behind a reveal step. Each pill carries its own side's
// percentage directly ("Yes 73%") — the same number the split bar's own
// labels used to show above it, which is why those are switched off here
// (SplitBar's showLabels={false}) rather than shown twice.
function PredictPills({
  leftPct,
  rightPct,
  onPick,
}: {
  leftPct: number;
  rightPct: number;
  onPick: (side: EntrySide) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-2">
      <button
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onPick("yes");
        }}
        className="rounded-full border py-2 text-sm font-semibold active:scale-[0.96]"
        style={{ borderColor: "var(--rival-blue)", color: "var(--rival-blue)" }}
      >
        Yes {leftPct}%
      </button>
      <button
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onPick("no");
        }}
        className="rounded-full border py-2 text-sm font-semibold active:scale-[0.96]"
        style={{ borderColor: "var(--danger-red)", color: "var(--danger-red)" }}
      >
        No {rightPct}%
      </button>
    </div>
  );
}

export function RoomCard({ room, match }: { room: Room; match: Match }) {
  const leftPct = splitPct(room);
  const rightPct = 100 - leftPct;
  const yesReturn = estimatedPayoutPerNaira(leftPct);
  const noReturn = estimatedPayoutPerNaira(rightPct);
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
            {match.homeTeam.slice(0, 3).toUpperCase()} v {match.awayTeam.slice(0, 3).toUpperCase()}
          </span>
        )}
      </div>

      <p className="text-lg font-medium leading-snug text-foreground">{room.prediction}</p>

      <SplitBar leftPct={leftPct} leftLabel="Yes" rightLabel="No" showLabels={false} />

      {entered ? (
        <div className="enter-pop rounded-md border border-border-strong bg-surface-elevated px-3 py-2 text-sm">
          <span className="font-medium text-foreground">You&rsquo;re in</span>
          <span className="text-muted"> — backing </span>
          <span className={entered === "yes" ? "text-rival-blue" : "text-danger-red"}>
            {entered === "yes" ? "Yes" : "No"}
          </span>
        </div>
      ) : (
        <div className="flex flex-col gap-1.5">
          <PredictPills leftPct={leftPct} rightPct={rightPct} onPick={(side) => setEntered(side)} />
          {/* Expected return at entry — pari-mutuel math (estimatedPayoutPerNaira
              in mock-data.ts), informational only, separate from the pills above
              it so the price and the action aren't the same control. */}
          <div className="grid grid-cols-2 gap-2 font-mono text-[11px] text-muted">
            <span className="text-center">
              ₦1 → <span className="font-bold text-rival-green">₦{yesReturn.toFixed(2)}</span>
            </span>
            <span className="text-center">
              ₦1 → <span className="font-bold text-rival-green">₦{noReturn.toFixed(2)}</span>
            </span>
          </div>
        </div>
      )}

      <div className="mt-1 flex items-center justify-between border-t border-border pt-3 font-mono text-xs text-muted">
        <span>{formatMoney(room.poolTotalCents)} pool</span>
        <div className="flex items-center gap-3">
          <span>{room.participantCount} rivals</span>
          <ShareButton path={`/rooms/${room.id}`} label="room" />
          <BookmarkButton id={room.id} label="room" />
        </div>
      </div>
    </Link>
  );
}
