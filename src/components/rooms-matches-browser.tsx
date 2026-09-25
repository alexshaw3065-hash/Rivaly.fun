"use client";

import { useCallback, useMemo, useState } from "react";
import { leagues as mockLeagues } from "@/lib/mock-data";
import { useRealMatches } from "@/lib/use-real-matches";
import { sportOf } from "@/lib/markets";
import { RoomFeed, type FilterTab } from "./room-feed";
import { MatchChip } from "./match-chip";
import { BottomSheet } from "./bottom-sheet";
import { FilterIcon } from "./icons";
import type { Room, Match } from "@/lib/types";

// The [filter icon][Rooms][Matches] content-type switcher, per the
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

// Packs: 2–4 calls bundled into one — hit them all, take the pot. Not built
// yet (no packs table, no multi-match settlement), so the tab shows what one
// will look like, built from real upcoming fixtures and clearly marked as a
// preview. No sign-up or "notify me" button: nothing behind it would work.
function PacksComingSoon({ matches }: { matches: Match[] }) {
  // Football first when there is any (packs are a football idea), in the
  // sport's own language — no "goals" on an NFL game.
  const scheduled = matches.filter((m) => m.status === "scheduled");
  const soccer = scheduled.filter((m) => sportOf(m) === "soccer");
  const upcoming = (soccer.length >= 2 ? soccer : scheduled).slice(0, 3);
  const call = (m: Match, i: number) => {
    const nfl = sportOf(m) === "nfl";
    if (i === 0) return `${m.homeTeam} to win`;
    if (i === 1) return `${nfl ? "Over 44.5 points" : "Over 2.5 goals"} · ${m.homeTeam} v ${m.awayTeam}`;
    return `${nfl ? `${m.awayTeam} to win` : `Both teams score · ${m.homeTeam} v ${m.awayTeam}`}`;
  };
  const calls = upcoming.length ? upcoming.map(call) : ["Home side to win", "Over 2.5 goals", "Both teams score"];
  return (
    <div className="mx-auto flex max-w-md flex-col items-center text-center">
      <div aria-hidden className="relative w-full select-none">
        {/* Two cards peeking behind: a pack is a stack of calls */}
        <div className="absolute inset-x-6 -top-3 h-full rounded-2xl border border-border bg-surface opacity-40" />
        <div className="absolute inset-x-3 -top-1.5 h-full rounded-2xl border border-border bg-surface opacity-70" />
        <div className="relative rounded-2xl border border-border bg-surface p-4 text-left">
          <div className="flex items-center justify-between">
            <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted">{calls.length}-call pack</span>
            <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-rival-blue">Preview</span>
          </div>
          <ul className="mt-3 flex flex-col gap-2">
            {calls.map((c, i) => (
              <li key={i} className="flex items-center gap-2.5 rounded-xl bg-background px-3 py-2.5">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full font-mono text-[10px] font-bold text-muted ring-1 ring-border-strong">{i + 1}</span>
                <span className="min-w-0 truncate text-sm font-semibold text-foreground/80">{c}</span>
              </li>
            ))}
          </ul>
          <div className="mt-3 flex items-center justify-between border-t border-border pt-3 font-mono text-xs text-muted">
            <span>Hit all {calls.length}</span>
            <span>Take the pot</span>
          </div>
        </div>
      </div>
      <p className="mt-6 font-display text-lg font-bold text-foreground">Packs are coming soon</p>
      <p className="mt-1 text-sm text-muted">Bundle 2–4 calls into one. Get them all right and the pot is yours.</p>
    </div>
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
    (room: Room, match: Match) => {
      if (selectedLeagues.length > 0 && !selectedLeagues.includes(match.competition)) return false;
      return extraRoomFilter ? extraRoomFilter(room) : true;
    },
    [selectedLeagues, extraRoomFilter],
  );

  // Real fixtures and live scores, falling back to the seeded roster when the
  // matches table is empty.
  const { matches: liveMatches, isReal } = useRealMatches();

  const matchMatchesLeagues = useCallback(
    (m: Match) => selectedLeagues.length === 0 || selectedLeagues.includes(m.competition),
    [selectedLeagues],
  );
  const browseMatches = useMemo(() => liveMatches.filter(matchMatchesLeagues), [liveMatches, matchMatchesLeagues]);

  // League filter options follow whatever's actually browsable, so the list
  // can't offer a league with no matches behind it.
  const leagues = useMemo(
    () => (isReal ? [...new Set(liveMatches.map((m) => m.competition))].sort() : mockLeagues),
    [isReal, liveMatches],
  );

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
            className="-mb-px flex items-center gap-1.5 border-b-2 pb-2.5 text-sm capitalize transition-colors duration-150"
            style={{
              borderColor: tab === t ? "var(--foreground)" : "transparent",
              color: tab === t ? "var(--foreground)" : "var(--muted)",
            }}
          >
            {t}
            {t === "packs" && (
              <span className="rounded-full px-1.5 py-px font-mono text-[9px] font-semibold uppercase tracking-wider text-rival-blue ring-1 ring-rival-blue/40">
                Soon
              </span>
            )}
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

      {tab === "packs" ? (
        <div className="mt-10">
          <PacksComingSoon matches={liveMatches} />
        </div>
      ) : tab === "rooms" ? (
        <div className="mt-10">
          <RoomFeed
            extraFilter={roomMatchesLeagues}
            tabs={HOME_FILTERS}
            initialTab="trending"
            activeChipBg="var(--border-strong)"
            highlightTabId="live"
          />
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
