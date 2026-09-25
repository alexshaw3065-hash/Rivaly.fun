"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { klipyCustomerId, klipyEnabled, klipyGifs, type KlipyGif } from "@/lib/klipy";

// Football first: one tap to the reactions a match actually needs.
const SHORTCUTS = ["Goal", "VAR", "Offside", "Celebrate", "Crying", "Referee", "Laughing"];

/**
 * The GIF tray: trending until you type, then Klipy search (debounced, and
 * cached, so the same search never costs twice). Results stay in Klipy's
 * order — laid out in two columns, left to right.
 */
export function GifPicker({ userId, onPick }: { userId: string | undefined; onPick: (gif: KlipyGif, q: string) => void }) {
  const [q, setQ] = useState("");
  const [term, setTerm] = useState("");
  const [gifs, setGifs] = useState<KlipyGif[]>([]);
  const [page, setPage] = useState(1);
  const [hasNext, setHasNext] = useState(false);
  // Which request last finished (and how) — loading is simply "not this one yet".
  const [settled, setSettled] = useState<{ key: string; error: string | null } | null>(null);
  const requestKey = `${term}|${page}`;
  const loading = klipyEnabled && settled?.key !== requestKey;
  const error = settled?.error ?? null;
  const scroller = useRef<HTMLDivElement>(null);
  const sentinel = useRef<HTMLDivElement>(null);

  // A new search starts from the top.
  useEffect(() => {
    const t = setTimeout(() => {
      setTerm(q.trim());
      setPage(1);
      scroller.current?.scrollTo({ top: 0 });
    }, 350);
    return () => clearTimeout(t);
  }, [q]);

  useEffect(() => {
    if (!klipyEnabled) return;
    let live = true;
    const key = `${term}|${page}`;
    void klipyCustomerId(userId)
      .then((id) => klipyGifs(term, id, page))
      .then((r) => {
        if (!live) return;
        setGifs((prev) => (page === 1 ? r.gifs : [...prev, ...r.gifs]));
        setHasNext(r.hasNext);
        setSettled({ key, error: null });
      })
      .catch((e: unknown) => {
        if (!live) return;
        if (page === 1) setGifs([]);
        setHasNext(false);
        setSettled({ key, error: e instanceof Error ? e.message : "Couldn't load GIFs." });
      });
    return () => {
      live = false;
    };
  }, [term, page, userId]);

  // Next page when the bottom comes into view.
  useEffect(() => {
    const el = sentinel.current;
    if (!el || !hasNext || loading) return;
    const io = new IntersectionObserver((entries) => entries[0]?.isIntersecting && setPage((p) => p + 1), { root: scroller.current, rootMargin: "200px" });
    io.observe(el);
    return () => io.disconnect();
  }, [hasNext, loading, gifs.length]);

  // Two columns, filled in order into whichever is shorter.
  const columns = useMemo(() => {
    const cols: KlipyGif[][] = [[], []];
    const heights = [0, 0];
    for (const g of gifs) {
      const i = heights[0] <= heights[1] ? 0 : 1;
      cols[i].push(g);
      heights[i] += g.thumb.h / Math.max(1, g.thumb.w);
    }
    return cols;
  }, [gifs]);

  if (!klipyEnabled) return <p className="py-6 text-center text-sm text-muted">GIFs aren&apos;t set up yet.</p>;

  return (
    <div>
      <label className="flex h-9 items-center gap-2 rounded-full bg-background px-3 ring-1 ring-border focus-within:ring-rival-blue">
        <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden className="shrink-0 text-muted">
          <circle cx="6" cy="6" r="4.5" stroke="currentColor" strokeWidth="1.6" fill="none" />
          <path d="m9.5 9.5 3 3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search KLIPY"
          enterKeyHint="search"
          className="min-w-0 flex-1 bg-transparent text-[15px] text-foreground placeholder:text-muted focus:outline-none"
        />
        {q && (
          <button type="button" onClick={() => setQ("")} aria-label="Clear search" className="flex h-5 w-5 items-center justify-center rounded-full bg-foreground/10 text-muted">
            <svg width="8" height="8" viewBox="0 0 10 10" aria-hidden>
              <path d="M2 2l6 6M8 2 2 8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          </button>
        )}
      </label>
      <div className="no-scrollbar -mx-3 mt-2 flex gap-1.5 overflow-x-auto px-3">
        {SHORTCUTS.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setQ(s)}
            className="h-7 shrink-0 rounded-full px-3 text-[13px] ring-1 ring-border transition-colors duration-150"
            style={{
              background: term.toLowerCase() === s.toLowerCase() ? "var(--foreground)" : "transparent",
              color: term.toLowerCase() === s.toLowerCase() ? "var(--background)" : "var(--foreground)",
            }}
          >
            {s}
          </button>
        ))}
      </div>
      <div ref={scroller} className="no-scrollbar mt-2 h-[232px] overflow-y-auto overscroll-contain rounded-lg">
        {error && gifs.length === 0 ? (
          <p className="py-10 text-center text-sm text-muted">{error}</p>
        ) : !loading && gifs.length === 0 ? (
          <p className="py-10 text-center text-sm text-muted">No GIFs for &ldquo;{term}&rdquo;.</p>
        ) : (
          <div className="flex gap-1.5">
            {columns.map((col, c) => (
              <div key={c} className="flex min-w-0 flex-1 flex-col gap-1.5">
                {col.map((g) => (
                  <button
                    key={g.slug}
                    type="button"
                    onClick={() => onPick(g, term)}
                    aria-label={g.title}
                    className="relative block w-full overflow-hidden rounded-lg bg-foreground/5 transition-transform duration-150 active:scale-95"
                    style={{ aspectRatio: `${g.thumb.w} / ${g.thumb.h}` }}
                  >
                    {g.lqip && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={g.lqip} alt="" aria-hidden className="absolute inset-0 h-full w-full object-cover" />
                    )}
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={g.thumb.url} alt="" loading="lazy" decoding="async" className="absolute inset-0 h-full w-full object-cover" />
                  </button>
                ))}
                {loading && [0, 1].map((i) => <span key={`s${i}`} className="block h-24 animate-pulse rounded-lg bg-foreground/5" />)}
              </div>
            ))}
          </div>
        )}
        <div ref={sentinel} className="h-px" />
      </div>
    </div>
  );
}
