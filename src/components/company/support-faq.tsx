"use client";

import { useMemo, useSyncExternalStore, type ReactNode } from "react";
import { SearchIcon } from "./company-icons";

export type FaqTopic = { id: string; title: string; items: { q: string; a: ReactNode; text: string }[] };

// One search for the whole help center page: the box lives in the header
// band, the questions further down, so they share a tiny in-memory store
// (same useSyncExternalStore shape as lib/search-overlay-store.ts).
let current = "";
const listeners = new Set<() => void>();
const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};
function useQuery(): [string, (q: string) => void] {
  const q = useSyncExternalStore(subscribe, () => current, () => "");
  return [
    q,
    (next) => {
      current = next;
      listeners.forEach((l) => l());
    },
  ];
}

/** The search box in Support's header band. */
export function SupportSearch() {
  const [query, setQuery] = useQuery();
  return (
    <label className="flex h-12 max-w-xl items-center gap-3 rounded-control bg-white/15 px-4 text-white transition-colors duration-100 focus-within:bg-white/25">
      <SearchIcon className="h-5 w-5 shrink-0 text-white/80" />
      <span className="sr-only">Search help</span>
      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search for answers…"
        className="min-w-0 flex-1 bg-transparent text-body text-white placeholder:text-white/70 focus:outline-none"
      />
    </label>
  );
}

/**
 * The questions, grouped by topic, each opening in place (Polymarket's help
 * center). Typing in the search keeps only the questions that match; the
 * answers are always in the page's HTML for crawlers.
 */
export function SupportFaq({ topics }: { topics: FaqTopic[] }) {
  const [query] = useQuery();
  const words = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  const shown = useMemo(
    () =>
      topics
        .map((t) => ({ ...t, items: t.items.filter((f) => words.every((w) => `${f.q} ${f.text}`.toLowerCase().includes(w))) }))
        .filter((t) => t.items.length > 0),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [topics, query],
  );

  if (shown.length === 0)
    return (
      <p className="rounded-card bg-surface p-5 text-body text-secondary edge">
        Nothing matches &ldquo;{query.trim()}&rdquo;. Email us below and we&rsquo;ll answer it.
      </p>
    );

  return (
    <div className="flex flex-col gap-10">
      {shown.map((t) => (
        <section key={t.id} id={t.id} className="scroll-mt-[calc(var(--header-height)+24px)]">
          <h2 className="font-display text-title-3 text-foreground">{t.title}</h2>
          <div className="mt-4 overflow-hidden rounded-card bg-surface edge">
            {t.items.map((f) => (
              <details key={f.q} open={words.length > 0} className="group border-t border-line first:border-0">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-4 py-4 text-body font-semibold text-foreground transition-colors duration-100 hover:bg-overlay-1 md:px-5 [&::-webkit-details-marker]:hidden">
                  {f.q}
                  <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden className="shrink-0 text-tertiary transition-transform duration-150 group-open:rotate-180">
                    <path d="M2.5 4.5 6 8l3.5-3.5" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </summary>
                <div className="px-4 pb-4 text-body leading-7 text-foreground/80 md:px-5 [&_a]:font-medium [&_a]:text-yes-ink [&_a]:underline [&_a]:decoration-yes/40 [&_a]:underline-offset-4">
                  {f.a}
                </div>
              </details>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
