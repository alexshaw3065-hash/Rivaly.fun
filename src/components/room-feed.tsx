"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { byHeat, usePublicRooms, type RoomWithMatch } from "@/lib/use-real-rooms";
import { splitPctFromTotals } from "@/lib/supabase/room-mapper";
import { RoomCard } from "./room-card";
import { EmptyRooms } from "./empty-rooms";
import { TvIcon } from "./icons";
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
// and everyone else omit it and get the full default list. `activeChipBg`
// is the same idea for styling: defaults to the original subtle
// --surface-elevated fill everywhere, so Home can opt into a stronger
// --border-strong fill without that bleeding into Search's identical
// chip row (a real bug caught after shipping — the color lived in this
// shared component with no per-caller gate the first time). `highlightTabId`
// is a third per-caller opt-in: that one chip gets a permanent red-tinted
// treatment (same --danger-red LiveBadge already uses elsewhere) whether
// or not it's the selected tab — Home uses this to make "Live" stand out
// from the rest of its row at a glance, since a live match is the most
// urgent thing on the page. Undefined (the default) means no chip gets
// this, so Search/Rooms are unaffected unless a caller explicitly opts in.
export function RoomFeed({
  extraFilter,
  chipRowEnd,
  initialTab = "trending",
  tab: controlledTab,
  onTabChange,
  hideChips = false,
  tabs = filters,
  activeChipBg = "var(--surface-elevated)",
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
  activeChipBg?: string;
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
          <div className="no-scrollbar flex min-w-0 flex-1 gap-2 overflow-x-auto pb-1">
            {tabs.map((f) => {
              const selected = tab === f.id;
              const highlighted = f.id === highlightTabId;
              return (
                <button
                  key={f.id}
                  onClick={() => setTab(f.id)}
                  className="flex shrink-0 items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-sm active:scale-[0.97]"
                  style={{
                    borderColor: selected ? "var(--foreground)" : highlighted ? "var(--danger-red)" : "var(--border)",
                    color: selected ? "var(--foreground)" : highlighted ? "var(--danger-red)" : "var(--muted)",
                    background: selected
                      ? activeChipBg
                      : highlighted
                        ? "color-mix(in srgb, var(--danger-red) 15%, transparent)"
                        : "transparent",
                    transition:
                      "transform 150ms ease-out, border-color 150ms ease, color 150ms ease, background-color 150ms ease",
                  }}
                >
                  {/* TvIcon rides along with highlightTabId ("live" on
                      Home) rather than its own prop — the same signal
                      that makes this chip red-tinted also marks it as
                      the one with something to actually watch. */}
                  {highlighted && <TvIcon />}
                  {f.label}
                </button>
              );
            })}
          </div>
          {chipRowEnd}
        </div>
      )}

      <div className={hideChips ? "flex flex-col gap-4" : "mt-6 flex flex-col gap-4"}>
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

      {!isLoading && items.length === 0 && (emptyFiltered ?? <EmptyRooms />)}
      {items.length > 0 && filtered.length === 0 && (emptyFiltered ?? <p className="py-14 text-center text-sm text-muted">No rooms match this filter yet.</p>)}
    </div>
  );
}
