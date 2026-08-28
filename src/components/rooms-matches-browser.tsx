"use client";

import { useCallback, useMemo, useState } from "react";
import { matches, matchById, leagues, packs } from "@/lib/mock-data";
import { RoomFeed, type FilterTab } from "./room-feed";
import { MatchChip } from "./match-chip";
import { PackCard } from "./pack-card";
import { BottomSheet } from "./bottom-sheet";
import { FilterIcon } from "./icons";
import type { Room, Match, Pack } from "@/lib/types";

// The [filter icon][Rooms][Matches][Packs] content-type switcher, per the
// founder's FOMO reference (their filter-icon-leading Tokens/Perps row).
// Home-only (per founder direction — Search stays a plain search, see
// search/page.tsx) so the league-filtering behavior only lives in one
// place. `selectedLeagues` is still owned by the parent rather than this
// component, matching Home's plain useState for it.
//
// Multi-select: "All leagues" is exclusive (picking it clears everything
// else); specific leagues toggle independently and combine with each
// other — an empty array means "All leagues."
type Tab = "rooms" | "matches" | "packs";

// Home's own filter-chip set — per founder direction, Home shows a
// shorter, differently-ordered row than Search's full 7-tab default
// (see `filters` in room-feed.tsx), with "Live" deliberately the 3rd of
// 5 (dead center) and "Most rivals" (sort by real participantCount) new
// to this row specifically. Passed via RoomFeed's `tabs` prop, which
// this component alone uses — nowhere else is affected.
const HOME_FILTERS: { id: FilterTab; label: string }[] = [
  { id: "trending", label: "Trending" },
  { id: "new", label: "New" },
  { id: "live", label: "Live" },
  { id: "most-rivals", label: "Most rivals" },
  { id: "closing", label: "Closing soon" },
];

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

function summarizeLeagues(selected: string[]): string | null {
  if (selected.length === 0) return null;
  if (selected.length === 1) return selected[0];
  return `${selected.length} leagues`;
}

export function RoomsMatchesBrowser({
  selectedLeagues,
  onLeaguesChange,
  extraRoomFilter,
}: {
  selectedLeagues: string[];
  onLeaguesChange: (leagues: string[]) => void;
  extraRoomFilter?: (room: Room) => boolean;
}) {
  const [tab, setTab] = useState<Tab>("rooms");
  const [showSheet, setShowSheet] = useState(false);
  const [draftLeagues, setDraftLeagues] = useState(selectedLeagues);
  const [prevOpen, setPrevOpen] = useState(showSheet);

  // Reset the sheet's draft selection to the applied leagues each time it
  // opens — computed during render (see room-feed.tsx for why) rather
  // than a useEffect.
  if (showSheet !== prevOpen) {
    setPrevOpen(showSheet);
    if (showSheet) setDraftLeagues(selectedLeagues);
  }

  function toggleDraftLeague(l: string) {
    setDraftLeagues((prev) => (prev.includes(l) ? prev.filter((x) => x !== l) : [...prev, l]));
  }

  const roomMatchesLeagues = useCallback(
    (room: Room) => {
      if (selectedLeagues.length > 0) {
        const competition = matchById(room.matchId)?.competition;
        if (!competition || !selectedLeagues.includes(competition)) return false;
      }
      return extraRoomFilter ? extraRoomFilter(room) : true;
    },
    [selectedLeagues, extraRoomFilter],
  );

  const matchMatchesLeagues = useCallback(
    (m: Match) => selectedLeagues.length === 0 || selectedLeagues.includes(m.competition),
    [selectedLeagues],
  );
  const browseMatches = useMemo(() => matches.filter(matchMatchesLeagues), [matchMatchesLeagues]);

  // A pack matches the league filter if any of its legs does — it's still
  // relevant to "show me Premier League stuff" even if one leg is Serie A.
  const packMatchesLeagues = useCallback(
    (p: Pack) =>
      selectedLeagues.length === 0 ||
      p.legs.some((leg) => {
        const competition = matchById(leg.matchId)?.competition;
        return competition && selectedLeagues.includes(competition);
      }),
    [selectedLeagues],
  );
  const browsePacks = useMemo(() => packs.filter(packMatchesLeagues), [packMatchesLeagues]);

  const summary = summarizeLeagues(selectedLeagues);

  return (
    <div>
      <div className="flex items-center gap-4 border-b border-border">
        <button
          onClick={() => setShowSheet(true)}
          aria-label="Filter by league"
          aria-pressed={selectedLeagues.length > 0}
          className="pb-2.5"
          style={{ color: iconButtonColor(selectedLeagues.length > 0), transition: "color 150ms ease" }}
        >
          <FilterIcon />
        </button>
        {(["rooms", "matches", "packs"] as const).map((t) => (
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
        {summary && (
          <span className="ml-auto shrink-0 pb-2.5 font-mono text-xs text-rival-blue">{summary}</span>
        )}
      </div>

      <BottomSheet open={showSheet} onClose={() => setShowSheet(false)} title="Filter by league">
        <div className="flex max-h-[50vh] flex-col gap-1 overflow-y-auto">
          <button
            onClick={() => setDraftLeagues([])}
            className="flex items-center justify-between rounded-lg px-3 py-3 text-left transition-colors duration-150 hover:bg-surface-elevated"
          >
            <span className="text-sm text-foreground">All leagues</span>
            <Checkbox checked={draftLeagues.length === 0} />
          </button>
          {leagues.map((l) => (
            <button
              key={l}
              onClick={() => toggleDraftLeague(l)}
              className="flex items-center justify-between rounded-lg px-3 py-3 text-left transition-colors duration-150 hover:bg-surface-elevated"
            >
              <span className="text-sm text-foreground">{l}</span>
              <Checkbox checked={draftLeagues.includes(l)} />
            </button>
          ))}
        </div>
        <button
          onClick={() => {
            onLeaguesChange(draftLeagues);
            setShowSheet(false);
          }}
          className="mt-5 w-full rounded-md bg-foreground py-3 text-sm font-medium text-background transition-transform duration-150 ease-out active:scale-[0.97]"
        >
          Confirm
        </button>
      </BottomSheet>

      {tab === "rooms" ? (
        <div className="mt-10">
          <RoomFeed
            extraFilter={roomMatchesLeagues}
            tabs={HOME_FILTERS}
            initialTab="trending"
            activeChipBg="var(--border-strong)"
            highlightTabId="live"
          />
        </div>
      ) : tab === "matches" ? (
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
      ) : (
        <div className="mt-10">
          {browsePacks.length === 0 ? (
            <p className="text-sm text-muted">No packs for this league yet.</p>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {browsePacks.map((p) => (
                <PackCard key={p.id} pack={p} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
