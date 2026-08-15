"use client";

import { useCallback, useMemo, useState } from "react";
import Link from "next/link";
import { rooms, matches, profiles, matchById } from "@/lib/mock-data";
import { RoomCard } from "@/components/room-card";
import { MatchChip } from "@/components/match-chip";
import { PersonRow } from "@/components/person-row";
import { RoomFeed } from "@/components/room-feed";
import { BottomSheet } from "@/components/bottom-sheet";
import { SearchIcon, SlidersIcon, TagIcon, BookmarkIcon } from "@/components/icons";
import type { Room, Match } from "@/lib/types";

// Scope per docs/masterplan/07-product-blueprint.md#411-search. Rooms/
// Matches are the two browse modes (per the founder's FOMO reference —
// Tokens/Perps as a content-type switcher, not a query-result filter), so
// they now govern both the no-query browse view and query results. People
// results aren't behind a tab — they just show up when relevant, since
// there's no "browse all people" mode to switch into.
type Tab = "rooms" | "matches";
type RoomStatusFilter = "" | "open" | "live" | "settled";

// Two extra entries beyond what's in mock data — real tournaments users
// would expect to filter by even before any room/match references them.
const leagues = [...new Set(matches.map((m) => m.competition)), "World Cup", "Friendlies"];

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

export default function SearchPage() {
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState<Tab>("rooms");
  const [showLeagueSheet, setShowLeagueSheet] = useState(false);
  const [showAdvancedPanel, setShowAdvancedPanel] = useState(false);
  const [league, setLeague] = useState<string | null>(null);
  const [draftLeague, setDraftLeague] = useState<string | null>(null);
  const [prevSheetOpen, setPrevSheetOpen] = useState(false);
  const [entryMin, setEntryMin] = useState("");
  const [entryMax, setEntryMax] = useState("");
  const [status, setStatus] = useState<RoomStatusFilter>("");

  // Reset the sheet's draft selection to the applied league each time it
  // opens — computed during render (see room-feed.tsx for why, same
  // pattern) rather than a useEffect.
  if (showLeagueSheet !== prevSheetOpen) {
    setPrevSheetOpen(showLeagueSheet);
    if (showLeagueSheet) setDraftLeague(league);
  }

  const q = query.trim().toLowerCase();
  const hasAdvancedFilters = Boolean(league || entryMin || entryMax || status);

  const roomMatchesFilters = useCallback(
    (room: Room) => {
      if (league && matchById(room.matchId)?.competition !== league) return false;
      const min = entryMin ? Number(entryMin) * 100 : null;
      const max = entryMax ? Number(entryMax) * 100 : null;
      if (min != null && room.entryAmountCents < min) return false;
      if (max != null && room.entryAmountCents > max) return false;
      if (status && room.status !== status) return false;
      return true;
    },
    [league, entryMin, entryMax, status],
  );

  const matchMatchesLeague = useCallback(
    (m: Match) => !league || m.competition === league,
    [league],
  );

  const matchedRooms = useMemo(
    () =>
      q
        ? rooms.filter((r) => r.prediction.toLowerCase().includes(q)).filter(roomMatchesFilters)
        : [],
    [q, roomMatchesFilters],
  );
  const matchedMatches = useMemo(
    () =>
      q
        ? matches
            .filter(
              (m) =>
                m.homeTeam.toLowerCase().includes(q) ||
                m.awayTeam.toLowerCase().includes(q) ||
                m.competition.toLowerCase().includes(q),
            )
            .filter(matchMatchesLeague)
        : [],
    [q, matchMatchesLeague],
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

  const browseMatches = useMemo(() => matches.filter(matchMatchesLeague), [matchMatchesLeague]);
  const hasResults = matchedRooms.length + matchedMatches.length + matchedPeople.length > 0;

  // No autoFocus on this input, and every text/number input in the app is
  // text-base (16px) or larger — mobile Safari/Chrome auto-zoom the whole
  // page in on focusing a field smaller than 16px so it stays legible, and
  // that zoom level then persists across client-side navigation. This
  // input had both (autoFocus + text-sm) and was the actual cause of the
  // "loads zoomed in, has to be pinched out" bug reported on a real device.
  return (
    <main className="mx-auto min-w-0 max-w-5xl px-6 py-12">
      <div className="flex items-center gap-3">
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
            placeholder="Search rooms, matches, people…"
            className="min-w-0 flex-1 bg-transparent text-base text-foreground placeholder:text-muted focus:outline-none"
          />
        </div>
        <div className="flex shrink-0 items-center gap-3">
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
          <Link
            href="/wishlist"
            aria-label="Wishlist"
            className="hover-link text-muted transition-colors"
          >
            <BookmarkIcon />
          </Link>
        </div>
      </div>

      {showAdvancedPanel && (
        <div className="mt-4 flex flex-col gap-4 rounded-lg border border-border bg-surface p-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted">League</p>
            <select
              value={league ?? ""}
              onChange={(e) => setLeague(e.target.value || null)}
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
            <button
              onClick={() => {
                setLeague(null);
                setEntryMin("");
                setEntryMax("");
                setStatus("");
              }}
              className="hover-link self-start text-sm text-muted transition-colors"
            >
              Clear filters
            </button>
          )}
        </div>
      )}

      {/* Filter icon + Rooms/Matches — the content-type switcher, styled
          after the founder's FOMO reference (their filter-icon-leading-
          Tokens/Perps tab row). Tapping the icon opens the league sheet
          below rather than an inline chip row. */}
      <div className="mt-5 flex items-center gap-4 border-b border-border">
        <button
          onClick={() => setShowLeagueSheet(true)}
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

      <BottomSheet open={showLeagueSheet} onClose={() => setShowLeagueSheet(false)} title="Filter by league">
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
            setLeague(draftLeague);
            setShowLeagueSheet(false);
          }}
          className="mt-5 w-full rounded-md bg-foreground py-3 text-sm font-medium text-background transition-transform duration-150 ease-out active:scale-[0.97]"
        >
          Confirm
        </button>
      </BottomSheet>

      {!q ? (
        tab === "rooms" ? (
          <div className="mt-10">
            <RoomFeed extraFilter={roomMatchesFilters} />
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
        )
      ) : !hasResults ? (
        <p className="mt-10 text-sm text-muted">No results for &ldquo;{query}&rdquo;.</p>
      ) : (
        <div className="mt-10 flex flex-col gap-10">
          {tab === "rooms" && matchedRooms.length > 0 && (
            <section>
              <p className="text-xs font-medium uppercase tracking-wide text-muted">Rooms</p>
              <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {matchedRooms.map((room) => (
                  <RoomCard key={room.id} room={room} match={matchById(room.matchId)!} />
                ))}
              </div>
            </section>
          )}
          {tab === "matches" && matchedMatches.length > 0 && (
            <section>
              <p className="text-xs font-medium uppercase tracking-wide text-muted">Matches</p>
              <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {matchedMatches.map((m) => (
                  <MatchChip key={m.id} match={m} />
                ))}
              </div>
            </section>
          )}
          {matchedPeople.length > 0 && (
            <section>
              <p className="text-xs font-medium uppercase tracking-wide text-muted">People</p>
              <div className="mt-3 flex flex-col gap-2">
                {matchedPeople.map((p) => (
                  <PersonRow key={p.id} profile={p} />
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </main>
  );
}
