"use client";

import type { ReactNode } from "react";

const CARD_WIDTH = 136;
const GAP = 12;
const PX_PER_SEC = 26;

// Continuous auto-scroll, no swipe needed — distinct from every other
// horizontal row in the app. Renders `children` twice back to back and
// animates the track exactly -50%, so the loop point is invisible. Speed
// scales with itemCount so a longer row doesn't fly past faster.
export function AutoScrollRow({ children, itemCount }: { children: ReactNode; itemCount: number }) {
  if (itemCount === 0) return null;
  const trackWidth = itemCount * (CARD_WIDTH + GAP);
  const durationSec = trackWidth / PX_PER_SEC;

  return (
    <div className="group overflow-hidden">
      <div
        className="flex w-max gap-3 group-hover:[animation-play-state:paused]"
        style={{ animation: `auto-scroll-row ${durationSec}s linear infinite` }}
      >
        <div className="flex shrink-0 gap-3">{children}</div>
        <div className="flex shrink-0 gap-3" aria-hidden="true">
          {children}
        </div>
      </div>
    </div>
  );
}
