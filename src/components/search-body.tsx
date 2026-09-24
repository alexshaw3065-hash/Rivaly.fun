"use client";

import { useCallback, useMemo, useState } from "react";
import Link from "next/link";
import type { SearchTopic } from "@/lib/mock-data";
import { useSearchResults } from "@/lib/use-search-results";
import { useRealMatches } from "@/lib/use-real-matches";
import { RoomFeed, type FilterTab } from "@/components/room-feed";
import { SearchRollup } from "@/components/search-rollup";
import { SearchResultsList } from "@/components/search-results-list";
import { SearchIcon, SlidersIcon, BookmarkIcon } from "@/components/icons";
import { addRecentSearch } from "@/lib/use-recent-searches";
import type { Match, Room } from "@/lib/types";

// The actual search UI — input, advanced filters, and the idle/browse/query
// states — with no opinion on what contains it. Used two ways: /search/
// page.tsx renders it in normal page flow (desktop's real experience, and
// mobile's fallback for a direct/refreshed visit), and
// mobile-search-overlay.tsx renders it inside a fixed, draggable sheet that
// sits on top of whatever page you were already on. Self-contained (owns
// its own state) so neither caller has to wire anything through.
type RoomStatusFilter = "" | "open" | "live" | "settled";

interface BrowseState {
  tab: FilterTab;
  topic?: SearchTopic;
}

function iconButtonColor(active: boolean) {
  return active ? "var(--rival-blue)" : "var(--muted)";
}

export function SearchBody() {
  const [query, setQuery] = useState("");
  const [showAdvancedPanel, setShowAdvancedPanel] = useState(false);
  const [selectedLeagues, setSelectedLeagues] = useState<string[]>([]);
  const [entryMin, setEntryMin] = useState("");
  const [entryMax, setEntryMax] = useState("");
  const [status, setStatus] = useState<RoomStatusFilter>("");
  const [browse, setBrowse] = useState<BrowseState | null>(null);

  const q = query.trim().toLowerCase();
  const mode: "idle" | "browse" | "query" = q ? "query" : browse ? "browse" : "idle";
  const hasAdvancedFilters = selectedLeagues.length > 0 || Boolean(entryMin || entryMax || status);

  const entryStatusFilter = useCallback(
    (room: Room) => {
      const min = entryMin ? Number(entryMin) * 100 : null;
      const max = entryMax ? Number(entryMax) * 100 : null;
      // A room's entry range is min..max stake now; "min entry" filters on
      // the cheapest way in, "max entry" on the room's own minimum too.
      if (min != null && room.minStakeCents < min) return false;
      if (max != null && room.minStakeCents > max) return false;
      if (status && room.status !== status) return false;
      return true;
    },
    [entryMin, entryMax, status],
  );

  const roomMatchesAllFilters = useCallback(
    (room: Room, match: Match) => {
      if (selectedLeagues.length > 0 && !selectedLeagues.includes(match.competition)) return false;
      return entryStatusFilter(room);
    },
    [selectedLeagues, entryStatusFilter],
  );

  const search = useSearchResults(query, selectedLeagues);
  const matchedRooms = useMemo(
    () => search.rooms.filter(({ room, match }) => roomMatchesAllFilters(room, match)),
    [search.rooms, roomMatchesAllFilters],
  );
  const matchedMatches = search.matches;
  const matchedPeople = search.people;
  // Leagues that actually have fixtures, for the advanced filter.
  const { matches: allMatches } = useRealMatches();
  const leagues = useMemo(() => [...new Set(allMatches.map((m) => m.competition))].sort(), [allMatches]);

  function resetBrowseFilters() {
    setSelectedLeagues([]);
    setEntryMin("");
    setEntryMax("");
    setStatus("");
    setShowAdvancedPanel(false);
  }

  function handleSelectTab(tab: FilterTab) {
    setBrowse({ tab });
  }

  function handleSelectTopic(topic: SearchTopic) {
    if (topic.id === "live") {
      setStatus("live");
      setSelectedLeagues([]);
    } else if (topic.league) {
      setSelectedLeagues([topic.league]);
      setStatus("");
    }
    setBrowse({ tab: "trending", topic });
  }

  function handleSelectRecent(term: string) {
    addRecentSearch(term);
    setQuery(term);
  }

  function handleBack() {
    setBrowse(null);
    resetBrowseFilters();
  }

  function commitSearch() {
    if (query.trim()) addRecentSearch(query);
  }

  const advancedSearchIcons = (
    <>
      <button
        onClick={() => setShowAdvancedPanel((v) => !v)}
        aria-label="Advanced search"
        aria-pressed={showAdvancedPanel || hasAdvancedFilters}
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition-[color,background-color,transform] duration-150 active:scale-90 [&_svg]:h-[19px] [&_svg]:w-[19px] hover:bg-surface"
        style={{
          color: iconButtonColor(showAdvancedPanel || hasAdvancedFilters),
          background: showAdvancedPanel || hasAdvancedFilters ? "var(--rival-blue-dim)" : undefined,
        }}
      >
        <SlidersIcon />
      </button>
      <Link href="/wishlist" aria-label="Wishlist" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition-[color,background-color,transform] duration-150 active:scale-90 [&_svg]:h-[19px] [&_svg]:w-[19px] text-muted hover:bg-surface hover:text-foreground">
        <BookmarkIcon />
      </Link>
    </>
  );

  // No autoFocus on this input, and every text/number input in the app is
  // text-base (16px) or larger — mobile Safari/Chrome auto-zoom the whole
  // page in on focusing a field smaller than 16px so it stays legible, and
  // that zoom level then persists across client-side navigation. This
  // input had both (autoFocus + text-sm) and was the actual cause of the
  // "loads zoomed in, has to be pinched out" bug reported on a real device.
  const searchInput = (
    <div
      className="flex h-11 min-w-0 flex-1 items-center gap-2.5 rounded-full border border-border bg-surface px-4 focus-within:border-rival-blue"
      style={{ transition: "border-color 150ms ease" }}
    >
      <span className="shrink-0 text-muted [&_svg]:h-[19px] [&_svg]:w-[19px]">
        <SearchIcon />
      </span>
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") commitSearch();
        }}
        onBlur={commitSearch}
        placeholder="Search rooms, matches, people…"
        className="min-w-0 flex-1 bg-transparent text-base text-foreground placeholder:text-muted focus:outline-none"
      />
    </div>
  );

  return (
    <div>
      <div className="flex items-center gap-1.5">
        {mode === "browse" && (
          <button
            onClick={handleBack}
            aria-label="Back to search"
            className="hover-link shrink-0 text-foreground transition-colors"
          >
            ←
          </button>
        )}
        {searchInput}
        {/* Browse mode moves these two down onto RoomFeed's filter-chip row
            (chipRowEnd below) on desktop instead — mobile has no chip row
            to move them to in any mode, so they always stay here. */}
        <div className={`flex shrink-0 items-center ${mode === "browse" ? "md:hidden" : ""}`}>
          {advancedSearchIcons}
        </div>
      </div>

      {showAdvancedPanel && (
        <div className="mt-4 flex flex-col gap-4 rounded-lg border border-border bg-surface p-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted">League</p>
            <select
              value={selectedLeagues.length === 1 ? selectedLeagues[0] : ""}
              onChange={(e) => setSelectedLeagues(e.target.value ? [e.target.value] : [])}
              className="mt-2 w-full rounded-md border border-border bg-surface px-3 py-2 text-base text-foreground focus:border-border-strong focus:outline-none"
            >
              <option value="">Any league</option>
              {leagues.map((l) => (
                <option key={l} value={l}>
                  {l}
                </option>
              ))}
            </select>
          </div>

          <div className="flex gap-3">
            <div className="flex-1">
              <p className="text-xs font-medium uppercase tracking-wide text-muted">Min entry ($)</p>
              <input
                type="number"
                min="0"
                value={entryMin}
                onChange={(e) => setEntryMin(e.target.value)}
                placeholder="0"
                className="mt-2 w-full rounded-md border border-border bg-surface px-3 py-2 font-mono text-base text-foreground placeholder:text-muted focus:border-border-strong focus:outline-none"
              />
            </div>
            <div className="flex-1">
              <p className="text-xs font-medium uppercase tracking-wide text-muted">Max entry ($)</p>
              <input
                type="number"
                min="0"
                value={entryMax}
                onChange={(e) => setEntryMax(e.target.value)}
                placeholder="No max"
                className="mt-2 w-full rounded-md border border-border bg-surface px-3 py-2 font-mono text-base text-foreground placeholder:text-muted focus:border-border-strong focus:outline-none"
              />
            </div>
          </div>

          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted">Status</p>
            <div className="mt-2 flex gap-2">
              {(["open", "live", "settled"] as const).map((s) => {
                const active = status === s;
                return (
                  <button
                    key={s}
                    onClick={() => setStatus(active ? "" : s)}
                    className="rounded-md border px-3.5 py-1.5 text-sm capitalize active:scale-[0.97]"
                    style={{
                      borderColor: active ? "var(--rival-blue)" : "var(--border)",
                      color: active ? "var(--rival-blue)" : "var(--foreground)",
                      background: active ? "var(--rival-blue-dim)" : "transparent",
                      transition: "transform 150ms ease-out, border-color 150ms ease, color 150ms ease, background-color 150ms ease",
                    }}
                  >
                    {s}
                  </button>
                );
              })}
            </div>
          </div>

          {hasAdvancedFilters && (
            <button onClick={resetBrowseFilters} className="hover-link self-start text-sm text-muted transition-colors">
              Clear filters
            </button>
          )}
        </div>
      )}

      <div className="mt-6 md:mt-10">
        {mode === "idle" && (
          <SearchRollup
            onSelectRecent={handleSelectRecent}
            onSelectTab={handleSelectTab}
            onSelectTopic={handleSelectTopic}
          />
        )}
        {mode === "browse" && (
          <RoomFeed
            key={browse?.topic?.id ?? browse?.tab}
            extraFilter={roomMatchesAllFilters}
            initialTab={browse?.tab}
            chipRowEnd={<div className="hidden shrink-0 items-center md:flex">{advancedSearchIcons}</div>}
          />
        )}
        {mode === "query" && (
          <SearchResultsList query={query} rooms={matchedRooms} matches={matchedMatches} people={matchedPeople} />
        )}
      </div>
    </div>
  );
}
