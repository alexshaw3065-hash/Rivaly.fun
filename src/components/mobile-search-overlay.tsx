"use client";

import { useRef, useState } from "react";
import { useSearchOverlayOpen, closeSearchOverlay } from "@/lib/search-overlay-store";
import { SearchBody } from "./search-body";

// A true overlay, not a route — the underlying page never unmounts, it
// just sits behind this fixed sheet. That's what makes dragging down
// reveal the actual page you were on (the founder's core complaint about
// the old /search-as-a-page approach: scrolling past the sheet's own
// content hit blank space because there was genuinely no page behind it).
// `top: 12px` leaves a small gap at the very top — screen bezel breathing
// room, matching Polymarket's own reference, not a reserved app-chrome
// slot. Drag-to-dismiss only arms when the inner content is scrolled to
// its own top (scrollRef), so a normal scroll through results doesn't
// accidentally start a dismiss.
export function MobileSearchOverlay() {
  const open = useSearchOverlayOpen();
  const [dragY, setDragY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const dragStartY = useRef(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  // This component never unmounts when the overlay closes (it just renders
  // null below), so dragY/isDragging would otherwise carry over from one
  // open to the next — e.g. an interrupted drag that never reached
  // touchend leaves a stale translateY, and the sheet reopens visibly
  // offset. Reset both whenever `open` flips, in either direction.
  const [prevOpen, setPrevOpen] = useState(open);
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (dragY !== 0) setDragY(0);
    if (isDragging) setIsDragging(false);
  }

  if (!open) return null;

  function onTouchStart(e: React.TouchEvent) {
    if ((scrollRef.current?.scrollTop ?? 0) > 0) return;
    dragStartY.current = e.touches[0].clientY;
    setIsDragging(true);
  }
  function onTouchMove(e: React.TouchEvent) {
    if (!isDragging) return;
    if ((scrollRef.current?.scrollTop ?? 0) > 0) {
      setIsDragging(false);
      setDragY(0);
      return;
    }
    setDragY(Math.max(e.touches[0].clientY - dragStartY.current, 0));
  }
  function onTouchEnd() {
    if (isDragging && dragY > 100) {
      closeSearchOverlay();
    }
    setIsDragging(false);
    setDragY(0);
  }

  return (
    <div
      className="fixed inset-x-0 bottom-0 z-30 flex flex-col rounded-t-2xl bg-background md:hidden"
      style={{
        top: 12,
        transform: `translateY(${dragY}px)`,
        transition: isDragging ? "none" : "transform 220ms cubic-bezier(0.32, 0.72, 0, 1)",
      }}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
      <button
        onClick={closeSearchOverlay}
        aria-label="Close search"
        className="flex w-full shrink-0 justify-center py-2"
      >
        <span className="h-1 w-9 rounded-full" style={{ background: "var(--border-strong)" }} />
      </button>

      <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto px-6 pb-8 pt-2">
        <SearchBody />
      </div>
    </div>
  );
}
