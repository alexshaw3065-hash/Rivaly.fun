"use client";

import { useMemo, useState } from "react";
import { rooms, matches, profiles, matchById } from "@/lib/mock-data";
import { RoomCard } from "@/components/room-card";
import { MatchChip } from "@/components/match-chip";
import { PersonRow } from "@/components/person-row";

// Scope per docs/masterplan/07-product-blueprint.md#411-search, narrowed to
// Rooms / Matches / People per V1 scope (Creators and Competitions are the
// same underlying data, not separate result types, until V1 grows). Recent
// searches are cut for this pass — nothing to persist them against yet.
type Tab = "all" | "rooms" | "matches" | "people";

export default function SearchPage() {
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState<Tab>("all");

  const q = query.trim().toLowerCase();

  const matchedRooms = useMemo(
    () => (q ? rooms.filter((r) => r.prediction.toLowerCase().includes(q)) : []),
    [q],
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
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search rooms, matches, people…"
        autoFocus
        className="w-full border-b border-border bg-transparent pb-3 font-display text-2xl font-semibold text-foreground placeholder:text-muted/50 focus:border-foreground focus:outline-none md:text-3xl"
        style={{ transition: "border-color 150ms ease" }}
      />

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
          <p className="font-display text-xl font-semibold text-foreground">Trending rooms</p>
          <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {rooms
              .filter((r) => r.status !== "settled")
              .map((room) => (
                <RoomCard key={room.id} room={room} match={matchById(room.matchId)!} />
              ))}
          </div>
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
              <div className="mt-3 flex gap-3 overflow-x-auto pb-1">
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
