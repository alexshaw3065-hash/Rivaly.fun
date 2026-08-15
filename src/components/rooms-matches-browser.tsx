"use client";

import { useCallback, useMemo, useState } from "react";
import { matches, matchById, leagues } from "@/lib/mock-data";
import { RoomFeed } from "./room-feed";
import { MatchChip } from "./match-chip";
import { BottomSheet } from "./bottom-sheet";
import { TagIcon } from "./icons";
import type { Room, Match } from "@/lib/types";

// The [filter icon][Rooms][Matches] content-type switcher, per the
// founder's FOMO reference (their filter-icon-leading Tokens/Perps row).
// Shared by Home and Search's no-query browse view so the pattern — and
// its league-filtering behavior — only lives in one place. `league` is
// owned by the parent (not this component) because Search's advanced-
// search panel also reads/writes it via its own League <select>; Home just
// keeps a plain useState for it since it has no other UI touching league.
type Tab = "rooms" | "matches";

function iconButtonColor(active: boolean) {
  return active ? "var(--rival-blue)" : "var(--muted)";
}

function Checkbox({ checked }: { checked: boolean }) {
  return (
    <span
      className="flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-[4px] border"
      style={{
        borderColor: checked ? "var(--rival-blue)" : "var(--border-strong)",
        background: checked ? "var(--rival-blue)" : "transparent",
        transition: "background-color 150ms ease, border-color 150ms ease",
      }}
    >
      {checked && (
        <svg viewBox="0 0 12 12" width="10" height="10" fill="none" aria-hidden>
          <path d="M2 6.2 4.8 9 10 3" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )}
    </span>
  );
}

export function RoomsMatchesBrowser({
  league,
  onLeagueChange,
  extraRoomFilter,
}: {
  league: string | null;
  onLeagueChange: (league: string | null) => void;
  extraRoomFilter?: (room: Room) => boolean;
}) {
  const [tab, setTab] = useState<Tab>("rooms");
  const [showSheet, setShowSheet] = useState(false);
  const [draftLeague, setDraftLeague] = useState(league);
  const [prevOpen, setPrevOpen] = useState(showSheet);

  // Reset the sheet's draft selection to the applied league each time it
  // opens — computed during render (see room-feed.tsx for why) rather
  // than a useEffect.
  if (showSheet !== prevOpen) {
    setPrevOpen(showSheet);
    if (showSheet) setDraftLeague(league);
  }

  const roomMatchesLeague = useCallback(
    (room: Room) => {
      if (league && matchById(room.matchId)?.competition !== league) return false;
      return extraRoomFilter ? extraRoomFilter(room) : true;
    },
    [league, extraRoomFilter],
  );

  const matchMatchesLeague = useCallback((m: Match) => !league || m.competition === league, [league]);
  const browseMatches = useMemo(() => matches.filter(matchMatchesLeague), [matchMatchesLeague]);

  return (
    <div>
      <div className="flex items-center gap-4 border-b border-border">
        <button
          onClick={() => setShowSheet(true)}
          aria-label="Filter by league"
          aria-pressed={Boolean(league)}
          className="pb-2.5"
          style={{ color: iconButtonColor(Boolean(league)), transition: "color 150ms ease" }}
        >
          <TagIcon />
        </button>
        {(["rooms", "matches"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className="-mb-px border-b-2 pb-2.5 text-sm capitalize transition-colors duration-150"
            style={{
              borderColor: tab === t ? "var(--foreground)" : "transparent",
              color: tab === t ? "var(--foreground)" : "var(--muted)",
            }}
          >
            {t}
          </button>
        ))}
        {league && (
          <span className="ml-auto shrink-0 pb-2.5 font-mono text-xs text-rival-blue">{league}</span>
        )}
      </div>

      <BottomSheet open={showSheet} onClose={() => setShowSheet(false)} title="Filter by league">
        <div className="flex max-h-[50vh] flex-col gap-1 overflow-y-auto">
          <button
            onClick={() => setDraftLeague(null)}
            className="flex items-center justify-between rounded-lg px-3 py-3 text-left transition-colors duration-150 hover:bg-surface-elevated"
          >
            <span className="text-sm text-foreground">All leagues</span>
            <Checkbox checked={draftLeague === null} />
          </button>
          {leagues.map((l) => (
            <button
              key={l}
              onClick={() => setDraftLeague(l)}
              className="flex items-center justify-between rounded-lg px-3 py-3 text-left transition-colors duration-150 hover:bg-surface-elevated"
            >
              <span className="text-sm text-foreground">{l}</span>
              <Checkbox checked={draftLeague === l} />
            </button>
          ))}
        </div>
        <button
          onClick={() => {
            onLeagueChange(draftLeague);
            setShowSheet(false);
          }}
          className="mt-5 w-full rounded-md bg-foreground py-3 text-sm font-medium text-background transition-transform duration-150 ease-out active:scale-[0.97]"
        >
          Confirm
        </button>
      </BottomSheet>

      {tab === "rooms" ? (
        <div className="mt-10">
          <RoomFeed extraFilter={roomMatchesLeague} />
        </div>
      ) : (
        <div className="mt-10">
          {browseMatches.length === 0 ? (
            <p className="text-sm text-muted">No matches for this league yet.</p>
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {browseMatches.map((m) => (
                <MatchChip key={m.id} match={m} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
