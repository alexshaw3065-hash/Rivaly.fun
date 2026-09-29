"use client";

import { useCallback, useMemo, useState } from "react";
import { useRealMatches } from "@/lib/use-real-matches";
import { sportOf } from "@/lib/markets";
import { RoomFeed, type FilterTab } from "./room-feed";
import { MatchChip } from "./match-chip";
import { Badge, Card, ListGroup, ListRow } from "./ui/surfaces";
import { Sheet } from "./ui/sheet";
import { Tabs } from "./ui/controls";
import { Button } from "./ui/button";
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

function Checkbox({ checked }: { checked: boolean }) {
  return (
    <span
      className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-tag border transition-[background-color,border-color] duration-100 ${
        checked ? "border-yes bg-yes text-white" : "border-line-strong"
      }`}
    >
      {checked && (
        <svg viewBox="0 0 12 12" width="11" height="11" fill="none" aria-hidden>
          <path d="M2 6.2 4.8 9 10 3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
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
        <div className="absolute inset-x-6 -top-3 h-full rounded-card bg-surface opacity-40 edge" />
        <div className="absolute inset-x-3 -top-1.5 h-full rounded-card bg-surface opacity-70 edge" />
        <Card className="relative text-left">
          <div className="flex items-center justify-between">
            <Badge>{calls.length}-call pack</Badge>
            <Badge tone="yes">Preview</Badge>
          </div>
          <ul className="mt-3 flex flex-col gap-2">
            {calls.map((c, i) => (
              <li key={i} className="flex items-center gap-3 rounded-control bg-background px-3 py-3">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-micro font-bold tabular-nums text-secondary outline outline-1 -outline-offset-1 outline-line-strong">{i + 1}</span>
                <span className="min-w-0 truncate text-label font-semibold text-foreground/80">{c}</span>
              </li>
            ))}
          </ul>
          <div className="mt-4 flex items-center justify-between text-caption text-secondary">
            <span>Hit all {calls.length}</span>
            <span>Take the pot</span>
          </div>
        </Card>
      </div>
      <p className="mt-6 text-title-3 font-display text-foreground">Packs are coming soon</p>
      <p className="mt-2 text-body text-secondary">Bundle 2–4 calls into one. Get them all right and the pot is yours.</p>
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
  const { matches: liveMatches } = useRealMatches();

  const matchMatchesLeagues = useCallback(
    (m: Match) => selectedLeagues.length === 0 || selectedLeagues.includes(m.competition),
    [selectedLeagues],
  );
  const browseMatches = useMemo(() => liveMatches.filter(matchMatchesLeagues), [liveMatches, matchMatchesLeagues]);

  // League filter options follow whatever's actually browsable, so the list
  // can't offer a league with no matches behind it.
  const leagues = useMemo(
    () => [...new Set(liveMatches.map((m) => m.competition))].sort(),
    [liveMatches],
  );

  const summary = summarizeLeagues(selectedLeagues);

  return (
    <div>
      <div className="flex items-end gap-4 border-b border-line">
        <button
          onClick={() => setShowSheet(true)}
          aria-label="Filter by league"
          aria-pressed={selectedLeagues.length > 0}
          className={`relative pb-3 transition-colors duration-100 before:absolute before:-inset-3 ${selectedLeagues.length > 0 ? "text-yes-ink" : "text-secondary hover:text-foreground"}`}
        >
          <FilterIcon />
        </button>
        <Tabs
          track={false}
          className="min-w-0 flex-1"
          value={tab}
          onChange={setTab}
          tabs={[
            { id: "rooms", label: "Rooms" },
            { id: "matches", label: "Matches" },
            {
              id: "packs",
              label: (
                <span className="inline-flex items-center gap-2">
                  Packs <Badge tone="yes">Soon</Badge>
                </span>
              ),
            },
          ]}
        />
        {summary && <span className="ml-auto shrink-0 pb-3 text-label font-semibold text-yes-ink">{summary}</span>}
      </div>

      <Sheet
        open={showSheet}
        onOpenChange={setShowSheet}
        title="Filter by league"
        footer={
          <Button
            variant="inverse"
            size="cta"
            onClick={() => {
              onLeaguesChange(draftLeagues);
              setShowSheet(false);
            }}
          >
            Confirm
          </Button>
        }
      >
        <ListGroup>
          <ListRow title="All leagues" trailing={<Checkbox checked={draftLeagues.length === 0} />} onClick={() => setDraftLeagues([])} />
          {leagues.map((l) => (
            <ListRow key={l} title={l} trailing={<Checkbox checked={draftLeagues.includes(l)} />} onClick={() => toggleDraftLeague(l)} />
          ))}
        </ListGroup>
      </Sheet>

      {tab === "packs" ? (
        <div className="mt-8">
          <PacksComingSoon matches={liveMatches} />
        </div>
      ) : tab === "rooms" ? (
        <div className="mt-4">
          <RoomFeed extraFilter={roomMatchesLeagues} tabs={HOME_FILTERS} initialTab="trending" highlightTabId="live" />
        </div>
      ) : (
        <div className="mt-4">
          {browseMatches.length === 0 ? (
            <p className="py-8 text-center text-body text-secondary">No matches for this league yet.</p>
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
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
