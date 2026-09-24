"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Match } from "@/lib/types";
import type { RoomWithTotals } from "@/lib/supabase/room-mapper";
import { byHeat, usePublicRooms } from "@/lib/use-real-rooms";
import { useRealMatches } from "@/lib/use-real-matches";
import { ExplodingRoomCard } from "./exploding-room-card";
import { StartRoomSlide } from "./start-room-slide";

const SLIDE_MS = 7000;
/** Fewer hot rooms than this, and the carousel fills up with upcoming fixtures. */
const MIN_SLIDES = 4;

export interface ExplodingSlide {
  key: string;
  match: Match;
  /** Absent for a fixture with no room yet — rendered as "start the first room". */
  room?: RoomWithTotals;
}

const nowMs = () => Date.now();

/**
 * The hottest public rooms, topped up with the soonest upcoming fixtures that
 * don't have a room yet whenever there are fewer than MIN_SLIDES — so the
 * carousel always has something to rotate, and every empty fixture is an
 * invitation to open the first room.
 */
export function useExplodingSlides(): { slides: ExplodingSlide[]; isLoading: boolean } {
  const { items, isLoading } = usePublicRooms();
  const { matches, isReal } = useRealMatches();
  return useMemo(() => {
    const hot: ExplodingSlide[] = [...items].sort(byHeat).slice(0, 6).map(({ room, match }) => ({ key: room.id, room, match }));
    if (hot.length >= MIN_SLIDES || !isReal) return { slides: hot, isLoading };
    const hasRoom = new Set(items.map((i) => i.match.id));
    const soon = nowMs() + 60_000;
    const fixtures: ExplodingSlide[] = matches
      .filter((m) => m.status === "scheduled" && +new Date(m.kickoffAt) > soon && !hasRoom.has(m.id))
      .sort((a, b) => +new Date(a.kickoffAt) - +new Date(b.kickoffAt))
      .slice(0, MIN_SLIDES - hot.length)
      .map((m) => ({ key: `match-${m.id}`, match: m }));
    return { slides: [...hot, ...fixtures], isLoading };
  }, [items, isLoading, matches, isReal]);
}

function Slide({ slide }: { slide: ExplodingSlide }) {
  return slide.room ? <ExplodingRoomCard room={slide.room} match={slide.match} /> : <StartRoomSlide match={slide.match} />;
}

// Apple-homepage-style carousel for the hottest rooms: big slides with the
// neighbours peeking in, native swipe (scroll-snap, so it moves exactly like
// the phone expects), and below it a dot pill whose active dot stretches
// into a bar that fills while the slide is up — the fill finishing is what
// advances it, so the timer and the progress can never disagree. A round
// play/pause sits beside the pill.
//
// Engagement mechanism #2 (anticipation — .claude/skills/rivaly-engagement-
// psychology): the filling bar is a small, honest "next one's coming" beat;
// the rooms themselves carry real kickoff countdowns.
//
// Pauses while a finger is on it and when the tab is hidden; starts paused
// for reduced-motion users (and slides jump instead of glide).
export function ExplodingCarousel({ items }: { items: ExplodingSlide[] }) {
  const scroller = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [held, setHeld] = useState(false);
  const [hidden, setHidden] = useState(false);
  // Bumped each time a fill completes, so the bar restarts even if the move
  // didn't happen (e.g. the tab was hidden mid-scroll) — the next cycle retries.
  const [cycle, setCycle] = useState(0);
  const reduced = useRef(false);
  const count = items.length;

  useEffect(() => {
    reduced.current = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced.current) setPlaying(false);
    const onVis = () => setHidden(document.visibilityState !== "visible");
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, []);

  const goTo = useCallback((i: number) => {
    const el = scroller.current;
    const slide = el?.children[i] as HTMLElement | undefined;
    if (!el || !slide) return;
    el.scrollTo({
      left: slide.offsetLeft - (el.clientWidth - slide.clientWidth) / 2,
      behavior: reduced.current ? "auto" : "smooth",
    });
  }, []);

  // The active slide is whichever sits nearest the middle — follows swipes,
  // dot taps and autoplay alike.
  useEffect(() => {
    const el = scroller.current;
    if (!el) return;
    let frame = 0;
    const onScroll = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const mid = el.scrollLeft + el.clientWidth / 2;
        let best = 0;
        let bestDist = Infinity;
        Array.from(el.children).forEach((child, i) => {
          const c = child as HTMLElement;
          const dist = Math.abs(c.offsetLeft + c.clientWidth / 2 - mid);
          if (dist < bestDist) {
            bestDist = dist;
            best = i;
          }
        });
        setIndex(best);
      });
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      el.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(frame);
    };
  }, [count]); // re-attach when the scroller first appears (1 → many rooms)

  const running = playing && !held && !hidden && count > 1;

  // One hot room is just the card — no peeking, no controls.
  if (count === 1) return <Slide slide={items[0]} />;

  return (
    <div className="min-w-0">
      <div
        ref={scroller}
        className="no-scrollbar relative -mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-[7%] md:-mx-6 md:px-[19%]"
        onPointerDown={() => setHeld(true)}
        onPointerUp={() => setHeld(false)}
        onPointerCancel={() => setHeld(false)}
        onPointerLeave={() => setHeld(false)}
        aria-roledescription="carousel"
      >
        {items.map((slide, i) => (
          <div
            key={slide.key}
            className="w-[86%] shrink-0 snap-center transition-opacity duration-500 ease-out md:w-[62%]"
            style={{ opacity: count > 1 && i !== index ? 0.45 : 1 }}
            aria-roledescription="slide"
            aria-label={`${i + 1} of ${count}`}
          >
            <Slide slide={slide} />
          </div>
        ))}
      </div>

      {count > 1 && (
        <div className="mt-5 flex items-center justify-center gap-2.5">
          <div className="flex h-9 items-center gap-2.5 rounded-full bg-surface-elevated px-4">
            {items.map((item, i) =>
              i === index ? (
                <span key={item.key} className="relative h-2 w-9 overflow-hidden rounded-full bg-border-strong" aria-current="true">
                  {/* Keyed per slide so each one's fill starts fresh; its end advances the carousel. */}
                  <span
                    key={`fill-${index}-${cycle}`}
                    className="carousel-fill absolute inset-y-0 left-0 rounded-full bg-foreground"
                    style={{
                      animationDuration: `${SLIDE_MS}ms`,
                      animationPlayState: running ? "running" : "paused",
                    }}
                    onAnimationEnd={() => {
                      setCycle((c) => c + 1);
                      goTo((index + 1) % count);
                    }}
                  />
                </span>
              ) : (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => goTo(i)}
                  aria-label={`Show room ${i + 1}`}
                  className="h-2 w-2 rounded-full bg-muted/60 transition-[background-color,transform] duration-150 hover:bg-muted active:scale-90"
                />
              ),
            )}
          </div>
          <button
            type="button"
            onClick={() => setPlaying((p) => !p)}
            aria-label={playing ? "Pause" : "Play"}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-surface-elevated text-foreground transition-transform duration-150 ease-out active:scale-90"
          >
            {playing ? (
              <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden>
                <rect x="2" y="1.5" width="2.6" height="9" rx="0.8" fill="currentColor" />
                <rect x="7.4" y="1.5" width="2.6" height="9" rx="0.8" fill="currentColor" />
              </svg>
            ) : (
              <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden>
                <path d="M3 1.8v8.4a.6.6 0 0 0 .9.5l6.7-4.2a.6.6 0 0 0 0-1L3.9 1.3a.6.6 0 0 0-.9.5Z" fill="currentColor" />
              </svg>
            )}
          </button>
        </div>
      )}
    </div>
  );
}
