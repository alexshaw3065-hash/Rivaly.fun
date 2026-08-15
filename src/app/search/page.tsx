"use client";

import { useCallback, useMemo, useState } from "react";
import Link from "next/link";
import { rooms, matches, profiles, matchById } from "@/lib/mock-data";
import { RoomCard } from "@/components/room-card";
import { MatchChip } from "@/components/match-chip";
import { PersonRow } from "@/components/person-row";
import { RoomFeed } from "@/components/room-feed";
import { SearchIcon, TagIcon, SlidersIcon, BookmarkIcon } from "@/components/icons";
import type { Room } from "@/lib/types";

// Scope per docs/masterplan/07-product-blueprint.md#411-search, narrowed to
// Rooms / Matches / People per V1 scope (Creators and Competitions are the
// same underlying data, not separate result types, until V1 grows). Recent
// searches are cut for this pass — nothing to persist them against yet.
type Tab = "all" | "rooms" | "matches" | "people";
type RoomStatusFilter = "" | "open" | "live" | "settled";

const leagues = Array.from(new Set(matches.map((m) => m.competition)));

function iconButtonColor(active: boolean) {
  return active ? "var(--rival-blue)" : "var(--muted)";
}

export default function SearchPage() {
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState<Tab>("all");
  const [showLeaguePanel, setShowLeaguePanel] = useState(false);
  const [showAdvancedPanel, setShowAdvancedPanel] = useState(false);
  const [league, setLeague] = useState<string | null>(null);
  const [entryMin, setEntryMin] = useState("");
  const [entryMax, setEntryMax] = useState("");
  const [status, setStatus] = useState<RoomStatusFilter>("");

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
        ? matches.filter(
            (m) =>
              m.homeTeam.toLowerCase().includes(q) ||
              m.awayTeam.toLowerCase().includes(q) ||
              m.competition.toLowerCase().includes(q),
          )
        : [],
    [q],
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

  const showRooms = tab === "all" || tab === "rooms";
  const showMatches = tab === "all" || tab === "matches";
  const showPeople = tab === "all" || tab === "people";
  const hasResults = matchedRooms.length + matchedMatches.length + matchedPeople.length > 0;

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
            autoFocus
            className="min-w-0 flex-1 bg-transparent text-sm text-foreground placeholder:text-muted focus:outline-none"
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

      <div className="mt-4 flex items-center gap-2">
        <button
          onClick={() => setShowLeaguePanel((v) => !v)}
          aria-pressed={showLeaguePanel || Boolean(league)}
          className="flex shrink-0 items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-sm active:scale-[0.97]"
          style={{
            borderColor: showLeaguePanel || league ? "var(--rival-blue)" : "var(--border)",
            color: iconButtonColor(showLeaguePanel || Boolean(league)),
            background: showLeaguePanel || league ? "var(--rival-blue-dim)" : "transparent",
            transition: "transform 150ms ease-out, border-color 150ms ease, color 150ms ease, background-color 150ms ease",
          }}
        >
          <TagIcon />
          {league ?? "Leagues"}
        </button>
      </div>

      {showLeaguePanel && (
        <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
          {leagues.map((l) => {
            const active = league === l;
            return (
              <button
                key={l}
                onClick={() => setLeague(active ? null : l)}
                className="shrink-0 rounded-full border px-3.5 py-1.5 text-sm active:scale-[0.97]"
                style={{
                  borderColor: active ? "var(--rival-blue)" : "var(--border)",
                  color: active ? "var(--rival-blue)" : "var(--foreground)",
                  background: active ? "var(--rival-blue-dim)" : "transparent",
                  transition: "transform 150ms ease-out, border-color 150ms ease, color 150ms ease, background-color 150ms ease",
                }}
              >
                {l}
              </button>
            );
          })}
        </div>
      )}

      {showAdvancedPanel && (
        <div className="mt-4 flex flex-col gap-4 rounded-lg border border-border bg-surface p-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted">League</p>
            <select
              value={league ?? ""}
              onChange={(e) => setLeague(e.target.value || null)}
              className="mt-2 w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-foreground focus:border-border-strong focus:outline-none"
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
                className="mt-2 w-full rounded-md border border-border bg-surface px-3 py-2 font-mono text-sm text-foreground placeholder:text-muted focus:border-border-strong focus:outline-none"
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
                className="mt-2 w-full rounded-md border border-border bg-surface px-3 py-2 font-mono text-sm text-foreground placeholder:text-muted focus:border-border-strong focus:outline-none"
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

      <div className="mt-5 flex gap-5 border-b border-border">
        {(["all", "rooms", "matches", "people"] as const).map((t) => (
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
      </div>

      {!q ? (
        <div className="mt-10">
          <RoomFeed extraFilter={roomMatchesFilters} />
        </div>
      ) : !hasResults ? (
        <p className="mt-10 text-sm text-muted">No results for &ldquo;{query}&rdquo;.</p>
      ) : (
        <div className="mt-10 flex flex-col gap-10">
          {showRooms && matchedRooms.length > 0 && (
            <section>
              <p className="text-xs font-medium uppercase tracking-wide text-muted">Rooms</p>
              <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {matchedRooms.map((room) => (
                  <RoomCard key={room.id} room={room} match={matchById(room.matchId)!} />
                ))}
              </div>
            </section>
          )}
          {showMatches && matchedMatches.length > 0 && (
            <section>
              <p className="text-xs font-medium uppercase tracking-wide text-muted">Matches</p>
              <div className="mt-3 flex min-w-0 gap-3 overflow-x-auto pb-1">
                {matchedMatches.map((m) => (
                  <MatchChip key={m.id} match={m} />
                ))}
              </div>
            </section>
          )}
          {showPeople && matchedPeople.length > 0 && (
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
