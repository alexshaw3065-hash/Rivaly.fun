"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { rooms as allRooms, matchById } from "@/lib/mock-data";
import { RoomCard } from "./room-card";
import type { Match, Room } from "@/lib/types";

type FilterTab = "trending" | "new" | "live" | "closing" | "all";

const filters: { id: FilterTab; label: string }[] = [
  { id: "trending", label: "Trending" },
  { id: "new", label: "New" },
  { id: "live", label: "Live" },
  { id: "closing", label: "Closing soon" },
  { id: "all", label: "All" },
];

const PAGE_SIZE = 6;

function applyFilter(tab: FilterTab): Room[] {
  const openRooms = allRooms.filter((r) => r.status !== "settled");
  switch (tab) {
    case "live":
      return openRooms.filter((r) => matchById(r.matchId)?.status === "live");
    case "new":
      return [...openRooms].sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));
    case "trending":
      return [...openRooms].sort((a, b) => b.poolTotalCents - a.poolTotalCents);
    case "closing":
      return [...openRooms]
        .filter((r) => matchById(r.matchId)?.status === "scheduled")
        .sort((a, b) => {
          const ka = matchById(a.matchId)?.kickoffAt ?? "";
          const kb = matchById(b.matchId)?.kickoffAt ?? "";
          return +new Date(ka) - +new Date(kb);
        });
    case "all":
    default:
      return [...openRooms].sort((a, b) =>
        (matchById(a.matchId)?.competition ?? "").localeCompare(matchById(b.matchId)?.competition ?? ""),
      );
  }
}

interface FeedRow {
  room: Room;
  match: Match;
  showHeader: boolean;
}

function buildRows(items: Room[]): FeedRow[] {
  let lastCompetition = "";
  return items.map((room) => {
    const match = matchById(room.matchId)!;
    const showHeader = match.competition !== lastCompetition;
    lastCompetition = match.competition;
    return { room, match, showHeader };
  });
}

// Infinite-scroll pattern per the Polymarket reference: keep appending pages
// on scroll (IntersectionObserver on a sentinel, not a "load more" click),
// and end in a real closing moment once the (finite, mock) data runs out —
// brand mark + "Back to top" — rather than looping forever.
//
// extraFilter is how Search layers its advanced-filter panel (league, entry
// range, status) on top of the same Trending/New/Live/Closing-soon/All
// mechanism, rather than duplicating this whole component. Callers MUST
// memoize it (useCallback, deps on the actual filter criteria) — a fresh
// function identity every render would make every render look like "the
// filter changed" and reset pagination in a loop.
//
// chipRowEnd renders past the (horizontally-scrolling) filter chips, e.g.
// Search's advanced-search/wishlist icons on desktop — the caller owns any
// responsive visibility on the node it passes in (see search/page.tsx).
export function RoomFeed({
  extraFilter,
  chipRowEnd,
}: {
  extraFilter?: (room: Room) => boolean;
  chipRowEnd?: ReactNode;
}) {
  const [tab, setTab] = useState<FilterTab>("trending");
  const [prevTab, setPrevTab] = useState(tab);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const loadingRef = useRef(false);
  const sentinelRef = useRef<HTMLDivElement>(null);

  // Reset pagination when the filter changes — computed during render
  // (React's recommended pattern for "adjust state when a prop changes")
  // rather than via a useEffect + setState, which would trigger an extra
  // commit for no reason.
  if (tab !== prevTab) {
    setPrevTab(tab);
    setVisibleCount(PAGE_SIZE);
  }

  const base = useMemo(() => applyFilter(tab), [tab]);
  const filtered = useMemo(() => (extraFilter ? base.filter(extraFilter) : base), [base, extraFilter]);
  const rows = useMemo(() => buildRows(filtered.slice(0, visibleCount)), [filtered, visibleCount]);
  const done = visibleCount >= filtered.length;

  // extraFilter changing (e.g. the advanced panel was edited) needs the
  // same pagination reset as a tab change.
  const [prevFiltered, setPrevFiltered] = useState(filtered);
  if (filtered !== prevFiltered) {
    setPrevFiltered(filtered);
    if (visibleCount !== PAGE_SIZE) setVisibleCount(PAGE_SIZE);
  }

  useEffect(() => {
    if (done) return;
    const el = sentinelRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !loadingRef.current) {
          loadingRef.current = true;
          window.setTimeout(() => {
            setVisibleCount((c) => Math.min(c + PAGE_SIZE, filtered.length));
            loadingRef.current = false;
          }, 450);
        }
      },
      { rootMargin: "200px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [done, filtered.length]);

  return (
    <div>
      <div className="flex items-center gap-3">
        <div className="no-scrollbar flex min-w-0 flex-1 gap-2 overflow-x-auto pb-1">
          {filters.map((f) => (
            <button
              key={f.id}
              onClick={() => setTab(f.id)}
              className="shrink-0 rounded-full border px-3.5 py-1.5 text-sm active:scale-[0.97]"
              style={{
                borderColor: tab === f.id ? "var(--foreground)" : "var(--border)",
                color: tab === f.id ? "var(--foreground)" : "var(--muted)",
                background: tab === f.id ? "var(--surface-elevated)" : "transparent",
                transition:
                  "transform 150ms ease-out, border-color 150ms ease, color 150ms ease, background-color 150ms ease",
              }}
            >
              {f.label}
            </button>
          ))}
        </div>
        {chipRowEnd}
      </div>

      <div className="mt-6 flex flex-col gap-4">
        {rows.map(({ room, match, showHeader }, i) => (
          <div key={room.id}>
            {showHeader && (
              <p className="mb-3 mt-1 font-mono text-[11px] uppercase tracking-wider text-muted">
                {match.competition}
              </p>
            )}
            <div
              className={i >= visibleCount - PAGE_SIZE ? "stagger-in" : undefined}
              style={
                i >= visibleCount - PAGE_SIZE
                  ? { animationDelay: `${(i - (visibleCount - PAGE_SIZE)) * 40}ms` }
                  : undefined
              }
            >
              <RoomCard room={room} match={match} />
            </div>
          </div>
        ))}
      </div>

      {!done && (
        <div ref={sentinelRef} className="flex justify-center py-8">
          <span
            className="h-5 w-5 animate-spin rounded-full border-2 border-t-transparent"
            style={{ borderColor: "var(--border-strong)", borderTopColor: "transparent" }}
            aria-label="Loading more rooms"
          />
        </div>
      )}

      {done && filtered.length > 0 && (
        <div className="flex flex-col items-center gap-3 py-14 text-center">
          <p className="font-display text-lg font-bold text-foreground">Rivaly</p>
          <p className="text-sm text-muted">You&rsquo;ve seen every room. Go start one.</p>
          <button
            onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
            className="mt-1 rounded-full border border-border-strong px-4 py-2 text-sm text-foreground transition-transform duration-150 ease-out active:scale-[0.97]"
          >
            Back to top ↑
          </button>
        </div>
      )}

      {filtered.length === 0 && (
        <p className="py-14 text-center text-sm text-muted">No rooms match this filter yet.</p>
      )}
    </div>
  );
}
