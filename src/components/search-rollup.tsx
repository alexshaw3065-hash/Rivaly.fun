"use client";

import { searchTopics, trendingSearchTerms, type SearchTopic } from "@/lib/mock-data";
import { useRecentSearches, removeRecentSearch, clearRecentSearches } from "@/lib/use-recent-searches";
import { BookmarkButton } from "./bookmark-button";
import { SearchIcon, TrendingIcon } from "./icons";
import { filters, type FilterTab } from "./room-feed";
import { ScrollFadeRow } from "./scroll-fade-row";

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
// right now — see trendingSearchTerms in mock-data.ts), not an invented
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

  if (compact) {
    const trending = trendingSearchTerms(6);
    return (
      <div className="flex flex-col gap-8">
        {recents.length > 0 && (
          <section>
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium uppercase tracking-wide text-muted">Recents</p>
              <button
                onClick={() => clearRecentSearches()}
                className="hover-link text-xs text-muted transition-colors"
              >
                Clear all
              </button>
            </div>
            <div className="mt-3 flex flex-col">
              {recents.slice(0, 5).map((term) => (
                <div key={term} className="flex items-center gap-3 py-2">
                  <span className="shrink-0 text-muted">
                    <SearchIcon />
                  </span>
                  <button
                    onClick={() => onSelectRecent(term)}
                    className="min-w-0 flex-1 truncate text-left text-sm text-foreground"
                  >
                    {term}
                  </button>
                  <button
                    onClick={() => removeRecentSearch(term)}
                    aria-label={`Remove "${term}" from recents`}
                    className="hover-link shrink-0 text-muted transition-colors"
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
            <p className="text-xs font-medium uppercase tracking-wide text-muted">Trending</p>
            <div className="mt-3 flex flex-col">
              {trending.map((term) => (
                <button
                  key={term}
                  onClick={() => onSelectRecent(term)}
                  className="flex items-center gap-3 py-2 text-left"
                >
                  <span className="shrink-0 text-muted">
                    <TrendingIcon />
                  </span>
                  <span className="min-w-0 flex-1 truncate text-sm text-foreground">{term}</span>
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
            <p className="text-xs font-medium uppercase tracking-wide text-muted">Recents</p>
            <button
              onClick={() => clearRecentSearches()}
              className="hover-link text-xs text-muted transition-colors"
            >
              Clear all
            </button>
          </div>
          <div className="mt-3 flex flex-col">
            {recents.map((term) => (
              <div key={term} className="flex items-center gap-3 py-2">
                <span className="shrink-0 text-muted">
                  <SearchIcon />
                </span>
                <button
                  onClick={() => onSelectRecent(term)}
                  className="min-w-0 flex-1 truncate text-left text-sm text-foreground"
                >
                  {term}
                </button>
                {/* Always visible, not hover-revealed — group-hover never
                    fires on touch, which would leave mobile with no way to
                    remove a single recent (only Clear all). */}
                <button
                  onClick={() => removeRecentSearch(term)}
                  aria-label={`Remove "${term}" from recents`}
                  className="hover-link shrink-0 text-muted transition-colors"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      <section>
        {/* Six, not the old five — see room-feed.tsx for why each one is
            there. Still a horizontally-scrolling row: six pills read fine
            on one line and a scroll here doesn't hide anything important
            (unlike Discussions below, where every item matters). */}
        <p className="text-xs font-medium uppercase tracking-wide text-muted">Browse</p>
        <ScrollFadeRow wrapperClassName="mt-3" className="no-scrollbar flex gap-2 overflow-x-auto pb-1">
          {filters.map((f) => (
            <button
              key={f.id}
              onClick={() => onSelectTab(f.id)}
              className="shrink-0 rounded-full border border-border px-3.5 py-1.5 text-sm text-foreground transition-colors duration-150 active:scale-[0.97]"
              style={{ transition: "transform 150ms ease-out, border-color 150ms ease" }}
            >
              {f.label}
            </button>
          ))}
        </ScrollFadeRow>
      </section>

      <section>
        {/* flex-wrap, not overflow-x-auto — the founder's sketch lays these
            out so nothing needs a horizontal swipe to discover; there are
            few enough (7) that wrapping to two or three rows still reads
            as one glanceable group. */}
        <p className="text-xs font-medium uppercase tracking-wide text-muted">Discussions</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {searchTopics.map((topic) => (
            <div
              key={topic.id}
              className="flex shrink-0 items-center gap-1.5 rounded-full border border-border py-1.5 pl-3.5 pr-2"
            >
              <button
                onClick={() => onSelectTopic(topic)}
                className="text-sm text-foreground active:scale-[0.97]"
              >
                {topic.label}
              </button>
              <BookmarkButton type="topic" id={topic.id} label={topic.label} />
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
