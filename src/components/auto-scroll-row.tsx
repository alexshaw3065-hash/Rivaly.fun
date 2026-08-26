"use client";

import { useEffect, useRef } from "react";
import type { ReactNode } from "react";

const PX_PER_SEC = 26;
const RESUME_DELAY_MS = 2200;

// Continuous auto-scroll that never blocks a real scroll — a native
// overflow-x-auto track (not a CSS transform), so mouse wheel, trackpad,
// and click-drag all work normally; any of them pauses the auto-advance
// for a couple seconds instead of fighting it. Renders `children` twice
// back to back and corrects scrollLeft by exactly half the track width
// whenever it's crossed, so the loop point is invisible no matter what
// moved it — the rAF tick or the user's own scroll.
export function AutoScrollRow({ children, itemCount }: { children: ReactNode; itemCount: number }) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const pausedUntil = useRef(0);
  const dragState = useRef<{ startX: number; startScrollLeft: number } | null>(null);

  useEffect(() => {
    if (itemCount === 0) return;
    const el = scrollerRef.current;
    if (!el) return;
    // Not a CSS animation, so the site-wide prefers-reduced-motion rule in
    // globals.css doesn't reach this — check it directly instead.
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let last = performance.now();
    let rafId: number;

    function tick(now: number) {
      const dt = now - last;
      last = now;
      if (el && now >= pausedUntil.current && !dragState.current) {
        el.scrollLeft += (PX_PER_SEC * dt) / 1000;
      }
      rafId = requestAnimationFrame(tick);
    }
    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [itemCount]);

  function pause() {
    pausedUntil.current = performance.now() + RESUME_DELAY_MS;
  }

  function onScroll() {
    const el = scrollerRef.current;
    if (!el) return;
    const half = el.scrollWidth / 2;
    if (half <= 0) return;
    if (el.scrollLeft >= half) el.scrollLeft -= half;
    else if (el.scrollLeft < 0) el.scrollLeft += half;
  }

  function onWheel(e: React.WheelEvent) {
    const el = scrollerRef.current;
    if (!el) return;
    if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
      pause();
      el.scrollLeft += e.deltaY;
      e.preventDefault();
    }
  }

  function onPointerDown(e: React.PointerEvent) {
    const el = scrollerRef.current;
    if (!el) return;
    pause();
    dragState.current = { startX: e.clientX, startScrollLeft: el.scrollLeft };
    el.setPointerCapture(e.pointerId);
  }

  function onPointerMove(e: React.PointerEvent) {
    const el = scrollerRef.current;
    if (!el || !dragState.current) return;
    el.scrollLeft = dragState.current.startScrollLeft - (e.clientX - dragState.current.startX);
  }

  function onPointerUp() {
    dragState.current = null;
  }

  if (itemCount === 0) return null;

  return (
    <div
      ref={scrollerRef}
      onScroll={onScroll}
      onWheel={onWheel}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      className="no-scrollbar flex gap-3 overflow-x-auto"
    >
      <div className="flex shrink-0 gap-3">{children}</div>
      <div className="flex shrink-0 gap-3" aria-hidden="true">
        {children}
      </div>
    </div>
  );
}
