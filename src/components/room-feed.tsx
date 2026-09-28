"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { byHeat, usePublicRooms, type RoomWithMatch } from "@/lib/use-real-rooms";
import { splitPctFromTotals } from "@/lib/supabase/room-mapper";
import { RoomCard } from "./room-card";
import { EmptyRooms } from "./empty-rooms";
import { TvIcon } from "./icons";
import { Chip } from "./ui/controls";
import { Button } from "./ui/button";
import type { Match } from "@/lib/types";

// Six, not five — matches the founder's Polymarket reference (their Browse
// row is New/Trending/Popular/Liquid/Ending Soon/Competitive), but every
// label and signal here is Rivaly's own rather than a straight port: no
// "Liquid" (that's a trading-pair concept, not a prediction-room one).
// "Big pools" takes over what Trending used to mean (sort by pool size);
// Trending itself becomes momentum (recent joins relative to room size) —
// the same signal explodingRooms() uses for Home's hero carousel, so
// "trending" means the same thing everywhere in the app. "Too close to
// call" is Rivaly's answer to Polymarket's "Competitive": the rooms where
// the Yes/No split is nearest 50/50 — the ones that best embody "who
// thinks differently than you," not just a copy of a finance concept.
export type FilterTab =
  | "trending"
  | "new"
  | "live"
  | "closing"
  | "pools"
  | "close-call"
  | "personal"
  | "most-rivals";

export const filters: { id: FilterTab; label: string }[] = [
  { id: "trending", label: "Trending" },
  { id: "new", label: "New" },
  { id: "live", label: "Live" },
  { id: "closing", label: "Closing soon" },
  { id: "pools", label: "Big pools" },
  { id: "close-call", label: "Too close to call" },
  { id: "personal", label: "For You" },
];

const PAGE_SIZE = 6;

const closeness = ({ room }: RoomWithMatch) =>
  Math.abs(splitPctFromTotals(room.yesTotalCents ?? 0, room.noTotalCents ?? 0) - 50);

// Every sort reads a real field on a real room — "Trending" is the same
// honest heat order Home uses (rivals in, then pool, then newest), not a
// per-hour momentum number there's no data behind.
function applyFilter(items: RoomWithMatch[], tab: FilterTab): RoomWithMatch[] {
  switch (tab) {
    case "live":
      return items.filter((i) => i.match.status === "live");
    case "new":
      return [...items].sort((a, b) => +new Date(b.room.createdAt) - +new Date(a.room.createdAt));
    // "For You" aliases to Trending until there's real preference data.
    case "trending":
    case "personal":
      return [...items].sort(byHeat);
    case "closing":
      return items
        .filter((i) => i.match.status === "scheduled")
        .sort((a, b) => +new Date(a.match.kickoffAt) - +new Date(b.match.kickoffAt));
    case "pools":
      return [...items].sort((a, b) => b.room.poolTotalCents - a.room.poolTotalCents);
    case "close-call":
      return [...items].sort((a, b) => closeness(a) - closeness(b));
    case "most-rivals":
      return [...items].sort((a, b) => b.room.participantCount - a.room.participantCount);
    default:
      return items;
  }
}

interface FeedRow extends RoomWithMatch {
  showHeader: boolean;
}

function buildRows(items: RoomWithMatch[]): FeedRow[] {
  let lastCompetition = "";
  return items.map((item) => {
    const showHeader = item.match.competition !== lastCompetition;
    lastCompetition = item.match.competition;
    return { ...item, showHeader };
  });
}

// Infinite-scroll pattern per the Polymarket reference: keep appending pages
// on scroll (IntersectionObserver on a sentinel, not a "load more" click),
// and end in a real closing moment once the (finite) real rooms run out —
// brand mark + "Back to top" — rather than looping forever.
//
// extraFilter is how Search layers its advanced-filter panel (league, entry
// range, status) on top of the same six-tab mechanism above, rather than
// duplicating this whole component. Callers MUST
// memoize it (useCallback, deps on the actual filter criteria) — a fresh
// function identity every render would make every render look like "the
// filter changed" and reset pagination in a loop.
//
// chipRowEnd renders past the (horizontally-scrolling) filter chips, e.g.
// Search's advanced-search/wishlist icons on desktop — the caller owns any
// responsive visibility on the node it passes in (see search/page.tsx).
// Controlled/uncontrolled hybrid: pass `tab` + `onTabChange` when a caller
// wants to drive the filter with its own UI (Rooms > Discover's pump.fun-
// style pill + dropdown, which needs `hideChips` too, since it replaces
// this row entirely instead of sitting next to it). Every other caller
// (Search, Home) keeps the plain uncontrolled chip row, untouched.
//
// `tabs` overrides which chips render (and in what order) without
// touching the shared `filters` constant every other caller still uses —
// Home passes its own 5-chip set (see rooms-matches-browser.tsx); Search
// and everyone else omit it and get the full default list. `highlightTabId`
// is a per-caller opt-in: that one chip keeps a red live tint whether or not
// it's selected — Home uses this to make "Live" stand out from the rest of
// its row at a glance, since a live match is the most urgent thing on the
// page. Undefined (the default) means no chip gets this.
export function RoomFeed({
  extraFilter,
  chipRowEnd,
  initialTab = "trending",
  tab: controlledTab,
  onTabChange,
  hideChips = false,
  tabs = filters,
  highlightTabId,
  emptyFiltered,
}: {
  extraFilter?: (room: RoomWithMatch["room"], match: Match) => boolean;
  chipRowEnd?: ReactNode;
  initialTab?: FilterTab;
  tab?: FilterTab;
  onTabChange?: (tab: FilterTab) => void;
  hideChips?: boolean;
  tabs?: { id: FilterTab; label: string }[];
  highlightTabId?: FilterTab;
  /** Replaces "No rooms match this filter yet" — e.g. a start-a-room call on one match. */
  emptyFiltered?: ReactNode;
}) {
  const [internalTab, setInternalTab] = useState<FilterTab>(initialTab);
  const tab = controlledTab ?? internalTab;
  const setTab = onTabChange ?? setInternalTab;
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

  const { items, isLoading } = usePublicRooms();
  const base = useMemo(() => applyFilter(items, tab), [items, tab]);
  const filtered = useMemo(() => (extraFilter ? base.filter((i) => extraFilter(i.room, i.match)) : base), [base, extraFilter]);
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
      {!hideChips && (
        <div className="flex items-center gap-3">
          <div className="no-scrollbar flex min-w-0 flex-1 gap-2 overflow-x-auto py-1">
            {tabs.map((f) => {
              const highlighted = f.id === highlightTabId;
              // TvIcon rides along with highlightTabId ("live" on Home): the
              // chip that's tinted red is the one with something to watch.
              return (
                <Chip
                  key={f.id}
                  selected={tab === f.id}
                  tone={highlighted ? "live" : "default"}
                  leading={highlighted ? <span className="[&_svg]:h-4 [&_svg]:w-4"><TvIcon /></span> : undefined}
                  onClick={() => setTab(f.id)}
                >
                  {f.label}
                </Chip>
              );
            })}
          </div>
          {chipRowEnd}
        </div>
      )}

      <div className={hideChips ? "flex flex-col gap-3" : "mt-4 flex flex-col gap-3"}>
        {rows.map(({ room, match, showHeader }, i) => (
          <div key={room.id}>
            {showHeader && (
              <p className={`mb-3 text-label font-semibold text-secondary ${i > 0 ? "mt-5" : ""}`}>{match.competition}</p>
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
          <span className="h-5 w-5 animate-spin rounded-full border-2 border-line-strong border-t-transparent" aria-label="Loading more rooms" />
        </div>
      )}

      {done && filtered.length > 0 && (
        <div className="flex flex-col items-center gap-3 py-14 text-center">
          <p className="text-title-3 font-display text-foreground">Rivaly</p>
          <p className="text-body text-secondary">You&rsquo;ve seen every room. Go start one.</p>
          <Button variant="secondary" size="sm" className="mt-1 rounded-full px-4" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}>
            Back to top ↑
          </Button>
        </div>
      )}

      {!isLoading && items.length === 0 && (emptyFiltered ?? <EmptyRooms />)}
      {items.length > 0 && filtered.length === 0 && (emptyFiltered ?? <p className="py-12 text-center text-body text-secondary">No rooms match this filter yet.</p>)}
    </div>
  );
}
