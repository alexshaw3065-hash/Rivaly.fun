"use client";

import { useCallback, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { rooms, matches, profiles, matchById, leagues, type SearchTopic } from "@/lib/mock-data";
import { RoomFeed, type FilterTab } from "@/components/room-feed";
import { SearchRollup } from "@/components/search-rollup";
import { SearchResultsList } from "@/components/search-results-list";
import { SearchIcon, SlidersIcon, BookmarkIcon } from "@/components/icons";
import { addRecentSearch } from "@/lib/use-recent-searches";
import type { Room } from "@/lib/types";

// Scope per docs/masterplan/07-product-blueprint.md#411-search, updated
// for the founder's Polymarket/FOMO reference (2026-08-16): Search is a
// three-state launcher, not a permanent room feed —
//   idle   (no query, nothing browsed yet) -> SearchRollup: Recents,
//           browse shortcuts, topic shortcuts. Home's Rooms tab already
//           owns "show me everything"; Search's job is "get me to the
//           thing I'm thinking of," fast, then get out of the way.
//   browse (a rollup chip/topic was tapped)  -> RoomFeed, filtered.
//   query  (typing)                          -> SearchResultsList, live.
// A "Back" affordance returns browse -> idle; clearing the input returns
// query -> whichever of idle/browse was underneath it.
type RoomStatusFilter = "" | "open" | "live" | "settled";

interface BrowseState {
  tab: FilterTab;
  topic?: SearchTopic;
}

function iconButtonColor(active: boolean) {
  return active ? "var(--rival-blue)" : "var(--muted)";
}

export default function SearchPage() {
  const router = useRouter();
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
      if (min != null && room.entryAmountCents < min) return false;
      if (max != null && room.entryAmountCents > max) return false;
      if (status && room.status !== status) return false;
      return true;
    },
    [entryMin, entryMax, status],
  );

  const roomMatchesAllFilters = useCallback(
    (room: Room) => {
      if (selectedLeagues.length > 0) {
        const competition = matchById(room.matchId)?.competition;
        if (!competition || !selectedLeagues.includes(competition)) return false;
      }
      return entryStatusFilter(room);
    },
    [selectedLeagues, entryStatusFilter],
  );

  const matchedRooms = useMemo(
    () =>
      q
        ? rooms.filter((r) => r.prediction.toLowerCase().includes(q)).filter(roomMatchesAllFilters)
        : [],
    [q, roomMatchesAllFilters],
  );
  const matchedMatches = useMemo(
    () =>
      q
        ? matches.filter(
            (m) =>
              (m.homeTeam.toLowerCase().includes(q) ||
                m.awayTeam.toLowerCase().includes(q) ||
                m.competition.toLowerCase().includes(q)) &&
              (selectedLeagues.length === 0 || selectedLeagues.includes(m.competition)),
          )
        : [],
    [q, selectedLeagues],
  );
  const matchedPeople = useMemo(
    () =>
      q
        ? profiles.filter(
            (p) =>
              p.displayName.toLowerCase().includes(q) || p.username.toLowerCase().includes(q),
          )
        : [],
    [q],
  );

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
        style={{
          color: iconButtonColor(showAdvancedPanel || hasAdvancedFilters),
          transition: "color 150ms ease",
        }}
      >
        <SlidersIcon />
      </button>
      <Link href="/wishlist" aria-label="Wishlist" className="hover-link text-muted transition-colors">
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
      className="flex min-w-0 flex-1 items-center gap-2.5 rounded-full border border-border bg-surface px-4 py-3 focus-within:border-border-strong"
      style={{ transition: "border-color 150ms ease" }}
    >
      <span className="shrink-0 text-muted">
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
    <main className="mx-auto min-w-0 max-w-5xl px-6 pb-40 pt-3 md:pb-12 md:pt-12">
      {/* Mobile roll-up-sheet chrome — a drag handle + an explicit close,
          per the founder's Polymarket/FOMO reference. This takes over the
          screen (nav.tsx hides the app's own top bar and bottom tab bar on
          this route) rather than sitting under them, so it needs its own
          way out: close always returns Home, back only appears mid-browse.
          The actual input isn't up here — it's pinned to the bottom of the
          screen instead (composer-style), see the fixed bar below. */}
      <div className="md:hidden">
        <div className="flex justify-center">
          <span className="h-1 w-9 rounded-full" style={{ background: "var(--border-strong)" }} />
        </div>
        <div className="mt-3 flex items-center justify-between">
          {mode === "browse" ? (
            <button
              onClick={handleBack}
              aria-label="Back to search"
              className="hover-link flex items-center gap-1.5 text-sm font-medium text-foreground transition-colors"
            >
              ← Back
            </button>
          ) : (
            <span />
          )}
          <button
            onClick={() => router.push("/")}
            aria-label="Close search"
            className="hover-link text-lg leading-none text-muted transition-colors"
          >
            ✕
          </button>
        </div>
      </div>

      {/* Desktop keeps the search bar up top, unchanged from before. */}
      <div className="hidden items-center gap-3 md:flex">
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
            (chipRowEnd below) instead — idle and query modes have no chip
            row to move them to, so they stay here. */}
        <div className={`flex shrink-0 items-center gap-3 ${mode === "browse" ? "md:hidden" : ""}`}>
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
              <p className="text-xs font-medium uppercase tracking-wide text-muted">Min entry (₦)</p>
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
              <p className="text-xs font-medium uppercase tracking-wide text-muted">Max entry (₦)</p>
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
            chipRowEnd={<div className="hidden shrink-0 items-center gap-3 md:flex">{advancedSearchIcons}</div>}
          />
        )}
        {mode === "query" && (
          <SearchResultsList query={query} rooms={matchedRooms} matches={matchedMatches} people={matchedPeople} />
        )}
      </div>

      {/* Mobile-only, pinned above where the (now-hidden) bottom tab bar
          would sit — the actual search input, composer-style, per the
          founder's FOMO reference. Always shows the advanced-search/
          wishlist icons next to it (mobile has no chip row to move them to
          in any mode, unlike desktop — see chipRowEnd above). */}
      <div className="fixed inset-x-0 bottom-16 z-20 border-t border-border bg-background/95 px-4 py-3 backdrop-blur-sm md:hidden">
        <div className="flex items-center gap-3">
          {searchInput}
          <div className="flex shrink-0 items-center gap-3">{advancedSearchIcons}</div>
        </div>
      </div>
    </main>
  );
}
