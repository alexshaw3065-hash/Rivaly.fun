"use client";

import { useEffect, useRef } from "react";
import { useHideOnScroll } from "@/lib/use-hide-on-scroll";

// The Arena's header (the tabs, plus the feed's filter row on Feed): pinned
// under the app bar (the 64px header on desktop), it slides away as you scroll
// down through the feed and comes back on any scroll up (use-hide-on-scroll.ts).
export function PinnedHeader({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  useHideOnScroll(ref);
  // On phones, sit exactly under the app bar, whatever its height (signed in or out, notch).
  useEffect(() => {
    const bar = document.querySelector<HTMLElement>(".mobile-topbar");
    if (bar && ref.current && window.matchMedia("(max-width: 767px)").matches) ref.current.style.top = `${bar.offsetHeight}px`;
  }, []);
  return (
    <div ref={ref} className="sticky top-[57px] z-[9] -mx-4 flex flex-col gap-4 bg-background px-4 pb-3 md:top-16 md:mx-0 md:px-0">
      {children}
    </div>
  );
}
