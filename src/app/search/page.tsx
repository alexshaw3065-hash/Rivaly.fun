"use client";

import { useCallback, useMemo, useState } from "react";
import Link from "next/link";
import { rooms, matches, profiles, matchById, leagues } from "@/lib/mock-data";
import { RoomCard } from "@/components/room-card";
import { MatchChip } from "@/components/match-chip";
import { PersonRow } from "@/components/person-row";
import { RoomsMatchesBrowser } from "@/components/rooms-matches-browser";
import { SearchIcon, SlidersIcon, BookmarkIcon } from "@/components/icons";
import type { Room } from "@/lib/types";

// Scope per docs/masterplan/07-product-blueprint.md#411-search. With no
// query, the whole browse experience (filter icon, Rooms/Matches tabs,
// league sheet, feed) is delegated to RoomsMatchesBrowser — the same
// component Home uses — so there's exactly one place that logic lives.
// With a query, there's no Rooms/Matches tab at all: every matching
// section (rooms, matches, people) just shows if it has results, since
// searching implies "show me anything relevant," not "let me switch modes."
type RoomStatusFilter = "" | "open" | "live" | "settled";

function iconButtonColor(active: boolean) {
  return active ? "var(--rival-blue)" : "var(--muted)";
}

export default function SearchPage() {
  const [query, setQuery] = useState("");
  const [showAdvancedPanel, setShowAdvancedPanel] = useState(false);
  const [selectedLeagues, setSelectedLeagues] = useState<string[]>([]);
  const [entryMin, setEntryMin] = useState("");
  const [entryMax, setEntryMax] = useState("");
  const [status, setStatus] = useState<RoomStatusFilter>("");

  const q = query.trim().toLowerCase();
  const hasAdvancedFilters = selectedLeagues.length > 0 || Boolean(entryMin || entryMax || status);

  // Entry-amount/status only — league is applied separately depending on
  // mode (RoomsMatchesBrowser handles it itself in browse mode; query mode
  // below applies it directly since RoomsMatchesBrowser isn't rendered then).
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
            <button
              onClick={() => {
                setSelectedLeagues([]);
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

      {!q ? (
        <div className="mt-5">
          <RoomsMatchesBrowser
            selectedLeagues={selectedLeagues}
            onLeaguesChange={setSelectedLeagues}
            extraRoomFilter={entryStatusFilter}
          />
        </div>
      ) : !hasResults ? (
        <p className="mt-10 text-sm text-muted">No results for &ldquo;{query}&rdquo;.</p>
      ) : (
        <div className="mt-10 flex flex-col gap-10">
          {matchedRooms.length > 0 && (
            <section>
              <p className="text-xs font-medium uppercase tracking-wide text-muted">Rooms</p>
              <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {matchedRooms.map((room) => (
                  <RoomCard key={room.id} room={room} match={matchById(room.matchId)!} />
                ))}
              </div>
            </section>
          )}
          {matchedMatches.length > 0 && (
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
