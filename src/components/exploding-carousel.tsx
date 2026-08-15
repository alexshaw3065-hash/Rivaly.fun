"use client";

import { useEffect, useRef, useState } from "react";
import type { Match, Room } from "@/lib/types";
import { ExplodingRoomCard } from "./exploding-room-card";

const AUTO_ADVANCE_MS = 5000;
const SWIPE_THRESHOLD = 50;

// One card at a time, swipe to move, auto-advances on a timer — pauses
// while the user is actually touching it and for a beat after, per Emil's
// "asymmetric enter/exit" idea: the user's own gesture should never fight
// the auto-advance mid-swipe.
export function ExplodingCarousel({ items }: { items: { room: Room; match: Match }[] }) {
  const [index, setIndex] = useState(0);
  const [dragX, setDragX] = useState(0);
  const [dragging, setDragging] = useState(false);
  const startX = useRef(0);
  const pausedUntil = useRef(0);

  useEffect(() => {
    const id = window.setInterval(() => {
      if (Date.now() < pausedUntil.current) return;
      setIndex((i) => (i + 1) % items.length);
    }, AUTO_ADVANCE_MS);
    return () => window.clearInterval(id);
  }, [items.length]);

  function onPointerDown(e: React.PointerEvent) {
    startX.current = e.clientX;
    setDragging(true);
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }

  function onPointerMove(e: React.PointerEvent) {
    if (!dragging) return;
    setDragX(e.clientX - startX.current);
  }

  function onPointerUp() {
    if (Math.abs(dragX) > SWIPE_THRESHOLD) {
      setIndex((i) => {
        const next = i + (dragX < 0 ? 1 : -1);
        return (next + items.length) % items.length;
      });
    }
    pausedUntil.current = Date.now() + AUTO_ADVANCE_MS;
    setDragging(false);
    setDragX(0);
  }

  return (
    <div>
      <div
        className="touch-pan-y overflow-hidden rounded-xl"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        <div
          className="flex"
          style={{
            transform: `translateX(calc(${-index * 100}% + ${dragX}px))`,
            transition: dragging ? "none" : "transform 380ms cubic-bezier(0.77, 0, 0.175, 1)",
          }}
        >
          {items.map(({ room, match }) => (
            <div key={room.id} className="w-full shrink-0 px-0.5">
              <ExplodingRoomCard room={room} match={match} />
            </div>
          ))}
        </div>
      </div>

      <div className="mt-4 flex items-center justify-center gap-1.5">
        {items.map((item, i) => (
          <button
            key={item.room.id}
            aria-label={`Go to card ${i + 1}`}
            onClick={() => {
              setIndex(i);
              pausedUntil.current = Date.now() + AUTO_ADVANCE_MS;
            }}
            className="h-1.5 rounded-full"
            style={{
              width: i === index ? 16 : 6,
              background: i === index ? "var(--rival-blue)" : "var(--border-strong)",
              transition: "width 250ms ease-out, background-color 250ms ease",
            }}
          />
        ))}
      </div>
    </div>
  );
}
