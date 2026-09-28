"use client";

import { useMemo } from "react";
import type { SearchTopic } from "@/lib/mock-data";
import { useRealMatches } from "@/lib/use-real-matches";
import type { Match } from "@/lib/types";
import { TeamCrest } from "./team-crest";
import { useRecentSearches, removeRecentSearch, clearRecentSearches } from "@/lib/use-recent-searches";
import {
  SearchIcon,
  TrendingIcon,
  NewIcon,
  LiveIcon,
  ClockIcon,
  PoolIcon,
  ScalesIcon,
  ForYouIcon,
} from "./icons";
import { filters, type FilterTab } from "./room-feed";

// One glyph per Browse tab — see icons.tsx for why each shape was chosen.
// Partial, not a full Record<FilterTab, ...>: this list only ever renders
// the plain `filters` set (never Home's extra "most-rivals" tab), so there's
// no icon to maintain for a tab that can't appear here.
const FILTER_ICONS: Partial<Record<FilterTab, typeof TrendingIcon>> = {
  trending: TrendingIcon,
  new: NewIcon,
  live: LiveIcon,
  closing: ClockIcon,
  pools: PoolIcon,
  "close-call": ScalesIcon,
  personal: ForYouIcon,
};


interface TopicTile {
  topic: SearchTopic;
  count: number;
  sample?: Match;
  live?: boolean;
}

/** Teams playing right now, then whoever kicks off soonest — real fixtures, not a made-up popularity ranking. */
function useTrendingTerms(count: number): string[] {
  const { matches } = useRealMatches();
  return useMemo(() => {
    const terms: string[] = [];
    const order = [...matches.filter((m) => m.status === "live"), ...matches.filter((m) => m.status === "scheduled")];
    for (const m of order) {
      for (const team of [m.homeTeam, m.awayTeam]) if (!terms.includes(team)) terms.push(team);
      if (terms.length >= count) break;
    }
    return terms.slice(0, count);
  }, [matches, count]);
}

/** Topics = the leagues that actually have games coming up (plus "Live now"). */
function useTopicTiles(): TopicTile[] {
  const { matches, isReal } = useRealMatches();
  return useMemo(() => {
    if (!isReal) return [];
    const upcoming = matches.filter((m) => m.status === "scheduled" || m.status === "live");
    const byLeague = new Map<string, Match[]>();
    for (const m of upcoming) byLeague.set(m.competition, [...(byLeague.get(m.competition) ?? []), m]);
    const tiles: TopicTile[] = [];
    const live = upcoming.filter((m) => m.status === "live");
    if (live.length > 0) tiles.push({ topic: { id: "live", label: "Live now" }, count: live.length, live: true });
    [...byLeague.entries()]
      .sort((a, b) => b[1].length - a[1].length)
      .forEach(([league, ms]) => tiles.push({ topic: { id: league, label: league, league }, count: ms.length, sample: ms[0] }));
    return tiles.slice(0, 10);
  }, [matches, isReal]);
}

// The idle state of Search — no query typed yet. Purely presentational —
// the caller (search/page.tsx, desktop-search-box.tsx, search-bar-link.tsx)
// owns what happens on selection, so this same component works as both a
// full-page state and a compact dropdown.
//
// The full page keeps Recents/Browse/Discussions. The compact dropdown
// (Home's search bar, desktop's header combobox) instead mirrors
// Polymarket's own mobile search exactly, per founder direction: Recents
// (if any) then a plain "Trending" list — a term, a trend arrow, nothing
// else. Trending terms are real (team names from matches that are live
// right now, then the next kickoffs — see useTrendingTerms), not an invented
// popularity ranking; there's no real search-analytics backend to rank
// against.
export function SearchRollup({
  onSelectRecent,
  onSelectTab,
  onSelectTopic,
  compact = false,
}: {
  onSelectRecent: (term: string) => void;
  onSelectTab: (tab: FilterTab) => void;
  onSelectTopic: (topic: SearchTopic) => void;
  compact?: boolean;
}) {
  const recents = useRecentSearches();
  const topics = useTopicTiles();
  const trending = useTrendingTerms(6);

  if (compact) {
    return (
      <div className="flex flex-col gap-8">
        {recents.length > 0 && (
          <section>
            <div className="flex items-center justify-between">
              <p className="text-label font-semibold text-secondary">Recents</p>
              <button
                onClick={() => clearRecentSearches()}
                className="hover-link text-label text-secondary transition-colors"
              >
                Clear all
              </button>
            </div>
            <div className="mt-3 flex flex-col">
              {recents.slice(0, 5).map((term) => (
                <div key={term} className="flex min-h-11 items-center gap-3">
                  <span className="shrink-0 text-secondary">
                    <SearchIcon />
                  </span>
                  <button
                    onClick={() => onSelectRecent(term)}
                    className="min-w-0 flex-1 truncate text-left text-body text-foreground"
                  >
                    {term}
                  </button>
                  <button
                    onClick={() => removeRecentSearch(term)}
                    aria-label={`Remove "${term}" from recents`}
                    className="hover-link flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-secondary transition-colors"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          </section>
        )}

        {trending.length > 0 && (
          <section>
            <p className="text-label font-semibold text-secondary">Trending</p>
            <div className="mt-3 flex flex-col">
              {trending.map((term) => (
                <button
                  key={term}
                  onClick={() => onSelectRecent(term)}
                  className="flex min-h-11 items-center gap-3 text-left"
                >
                  <span className="shrink-0 text-secondary">
                    <TrendingIcon />
                  </span>
                  <span className="min-w-0 flex-1 truncate text-body text-foreground">{term}</span>
                </button>
              ))}
            </div>
          </section>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      {recents.length > 0 && (
        <section>
          <div className="flex items-center justify-between">
            <p className="text-label font-semibold text-secondary">Recents</p>
            <button
              onClick={() => clearRecentSearches()}
              className="hover-link text-label text-secondary transition-colors"
            >
              Clear all
            </button>
          </div>
          <div className="mt-3 flex flex-col">
            {recents.map((term) => (
              <div key={term} className="flex min-h-11 items-center gap-3">
                <span className="shrink-0 text-secondary">
                  <SearchIcon />
                </span>
                <button
                  onClick={() => onSelectRecent(term)}
                  className="min-w-0 flex-1 truncate text-left text-body text-foreground"
                >
                  {term}
                </button>
                {/* Always visible, not hover-revealed — group-hover never
                    fires on touch, which would leave mobile with no way to
                    remove a single recent (only Clear all). */}
                <button
                  onClick={() => removeRecentSearch(term)}
                  aria-label={`Remove "${term}" from recents`}
                  className="hover-link flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-secondary transition-colors"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      <section>
        <p className="text-label font-semibold text-secondary">Browse</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {filters.map((f) => {
            const Icon = FILTER_ICONS[f.id];
            return (
              <button
                key={f.id}
                onClick={() => onSelectTab(f.id)}
                className="flex h-10 items-center gap-2 rounded-full bg-surface px-4 text-label font-semibold text-foreground edge transition-[transform,background-color] duration-100 ease-out hover:bg-surface-elevated active:scale-[0.97]"
              >
                {/* Monochrome, like Polymarket's own chips — the glyph shapes do the telling. */}
                {Icon && (
                  <span className="text-foreground/80 [&_svg]:h-5 [&_svg]:w-5">
                    <Icon />
                  </span>
                )}
                {f.label}
              </button>
            );
          })}
        </div>
      </section>

      {topics.length > 0 && (
        <section>
          <p className="text-label font-semibold text-secondary">Topics</p>
          <div className="mt-3 grid grid-cols-2 gap-2">
            {topics.map(({ topic, count, sample, live }) => (
              <button
                key={topic.id}
                onClick={() => onSelectTopic(topic)}
                className="flex h-14 min-w-0 items-center gap-3 rounded-card bg-surface px-3 text-left edge transition-[transform,background-color] duration-100 ease-out hover:bg-surface-elevated active:scale-[0.97]"
              >
                {live ? (
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-control bg-no-tint text-no-ink [&_svg]:h-5 [&_svg]:w-5">
                    <LiveIcon />
                  </span>
                ) : (
                  <span className="relative h-9 w-9 shrink-0 rounded-control bg-background">
                    {sample && (
                      <>
                        <span className="absolute left-0.5 top-0.5">
                          <TeamCrest name={sample.homeTeam} size={18} />
                        </span>
                        <span className="absolute bottom-0.5 right-0.5">
                          <TeamCrest name={sample.awayTeam} size={18} />
                        </span>
                      </>
                    )}
                  </span>
                )}
                <span className="min-w-0">
                  <span className="block truncate text-label font-semibold text-foreground">{topic.label}</span>
                  <span className="block truncate text-caption text-secondary">
                    {count} {live ? "live" : count === 1 ? "game" : "games"}
                  </span>
                </span>
              </button>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
