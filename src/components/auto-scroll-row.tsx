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
//
// If `children` contains RivalDivider markers (data-section-next on their
// root element), this also tracks which "section" currently sits at the
// track's left edge and reports it via onActiveSectionChange — that's how
// the h2 above the row (see page.tsx) knows to switch from "Top rivals"
// to "Goated rivals" to "Hall of fame" as the row scrolls past each
// divider, instead of staying stuck on the first section's name forever.
export function AutoScrollRow({
  children,
  itemCount,
  initialSectionLabel,
  onActiveSectionChange,
  paused = false,
}: {
  children: ReactNode;
  itemCount: number;
  initialSectionLabel?: string;
  onActiveSectionChange?: (label: string) => void;
  /** Hold still (e.g. while a card's details are open). */
  paused?: boolean;
}) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const firstCopyRef = useRef<HTMLDivElement>(null);
  const pausedUntil = useRef(0);
  const dragState = useRef<{ startX: number; startScrollLeft: number; pointerId: number; dragging: boolean } | null>(null);
  const suppressClick = useRef(false);
  const pausedProp = useRef(paused);
  useEffect(() => {
    pausedProp.current = paused;
  }, [paused]);
  const activeLabelRef = useRef<string | undefined>(initialSectionLabel);

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
      if (el && now >= pausedUntil.current && !dragState.current && !pausedProp.current) {
        el.scrollLeft += (PX_PER_SEC * dt) / 1000;
      }
      rafId = requestAnimationFrame(tick);
    }
    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [itemCount]);

  // Report the starting section once on mount (scrollLeft starts at 0, so
  // whatever's first is active before any scroll event has fired).
  useEffect(() => {
    if (initialSectionLabel) onActiveSectionChange?.(initialSectionLabel);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function updateActiveSection() {
    if (!onActiveSectionChange || !scrollerRef.current || !firstCopyRef.current) return;
    const scrollLeft = scrollerRef.current.scrollLeft;
    const markers = firstCopyRef.current.querySelectorAll<HTMLElement>("[data-section-next]");
    let label = initialSectionLabel;
    markers.forEach((marker) => {
      if (marker.offsetLeft <= scrollLeft + 1) label = marker.dataset.sectionNext;
    });
    if (label && label !== activeLabelRef.current) {
      activeLabelRef.current = label;
      onActiveSectionChange(label);
    }
  }

  function pause() {
    pausedUntil.current = performance.now() + RESUME_DELAY_MS;
  }

  function onScroll() {
    const el = scrollerRef.current;
    if (!el) return;
    const half = el.scrollWidth / 2;
    if (half > 0) {
      if (el.scrollLeft >= half) el.scrollLeft -= half;
      else if (el.scrollLeft < 0) el.scrollLeft += half;
    }
    updateActiveSection();
  }

  // Vertical wheel scrolls the row sideways. Attached natively with
  // passive: false — React's onWheel is passive, so preventDefault there is
  // ignored and logs an error on every wheel tick.
  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
        pausedUntil.current = performance.now() + RESUME_DELAY_MS;
        el.scrollLeft += e.deltaY;
        e.preventDefault();
      }
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [itemCount]);

  // The pointer is only captured once it has actually moved a few pixels, so
  // a plain tap still reaches the card under it; the click that ends a real
  // drag is swallowed so dragging never opens a card by accident.
  function onPointerDown(e: React.PointerEvent) {
    const el = scrollerRef.current;
    if (!el) return;
    pause();
    suppressClick.current = false;
    dragState.current = { startX: e.clientX, startScrollLeft: el.scrollLeft, pointerId: e.pointerId, dragging: false };
  }

  function onPointerMove(e: React.PointerEvent) {
    const el = scrollerRef.current;
    const drag = dragState.current;
    if (!el || !drag) return;
    const dx = e.clientX - drag.startX;
    if (!drag.dragging && Math.abs(dx) > 6) {
      drag.dragging = true;
      el.setPointerCapture(drag.pointerId);
    }
    if (drag.dragging) el.scrollLeft = drag.startScrollLeft - dx;
  }

  function onPointerUp() {
    if (dragState.current?.dragging) suppressClick.current = true;
    dragState.current = null;
  }

  if (itemCount === 0) return null;

  return (
    <div
      ref={scrollerRef}
      onScroll={onScroll}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onClickCapture={(e) => {
        if (suppressClick.current) {
          e.preventDefault();
          e.stopPropagation();
          suppressClick.current = false;
        }
      }}
      className="no-scrollbar flex gap-3 overflow-x-auto"
    >
      <div ref={firstCopyRef} className="flex shrink-0 gap-3">
        {children}
      </div>
      <div className="flex shrink-0 gap-3" aria-hidden="true">
        {children}
      </div>
    </div>
  );
}
