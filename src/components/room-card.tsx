"use client";

import Link from "next/link";
import { useState } from "react";
import type { EntrySide, Match, Room } from "@/lib/types";
import { formatMoney, splitPct } from "@/lib/mock-data";
import { SplitBar } from "./split-bar";
import { LiveBadge } from "./live-badge";
import { BookmarkButton } from "./bookmark-button";
import { ShareButton } from "./share-button";

// One-tap predicting straight from the feed, per founder direction — the
// card's own Yes/No pick, not a link into the room. "Fast" (design
// principles: "one-tap challenges") and the V1 north star ("put my
// opinion up against someone else's in under 30 seconds") both point the
// same way: picking a side IS the one tap, no separate confirm step
// layered on top (mirrors join-panel.tsx's side/join shape, just
// collapsed to one action since the card has no room to spare).
function PredictPicker({
  entryAmountCents,
  onPick,
}: {
  entryAmountCents: number;
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
        className="rounded-md border py-2 text-sm font-medium active:scale-[0.97]"
        style={{ borderColor: "var(--rival-blue)", color: "var(--rival-blue)" }}
      >
        Yes · {formatMoney(entryAmountCents)}
      </button>
      <button
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onPick("no");
        }}
        className="rounded-md border py-2 text-sm font-medium active:scale-[0.97]"
        style={{ borderColor: "var(--danger-red)", color: "var(--danger-red)" }}
      >
        No · {formatMoney(entryAmountCents)}
      </button>
    </div>
  );
}

export function RoomCard({ room, match }: { room: Room; match: Match }) {
  const leftPct = splitPct(room);
  const [predicting, setPredicting] = useState(false);
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
        <div className="flex items-center gap-2">
          {match.status === "live" ? (
            <LiveBadge />
          ) : (
            <span className="font-mono text-[11px] text-muted">
              {match.homeTeam.slice(0, 3).toUpperCase()} v {match.awayTeam.slice(0, 3).toUpperCase()}
            </span>
          )}
          {!entered && (
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setPredicting((p) => !p);
              }}
              aria-pressed={predicting}
              className="shrink-0 rounded-full border px-2.5 py-1 text-xs font-medium active:scale-[0.95]"
              style={{
                borderColor: predicting ? "var(--foreground)" : "var(--border-strong)",
                color: predicting ? "var(--foreground)" : "var(--muted)",
                transition: "border-color 150ms ease, color 150ms ease",
              }}
            >
              Predict
            </button>
          )}
        </div>
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
      ) : predicting ? (
        <PredictPicker
          entryAmountCents={room.entryAmountCents}
          onPick={(side) => {
            setEntered(side);
            setPredicting(false);
          }}
        />
      ) : null}

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
