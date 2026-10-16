"use client";

import { useEffect, type RefObject } from "react";

// A pinned header that gets out of the way while you read, like X's tab row:
// scrolling down slides it up out of view with your finger, any scroll up
// brings it straight back (animated, all at once), and when the scroll settles it snaps fully open or
// fully closed. Within `showWithin` px of the top it's always shown.
// Moves the element itself (transform), so it should be position: sticky.
export function useHideOnScroll(ref: RefObject<HTMLElement | null>, showWithin = 160) {
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
    let last = window.scrollY;
    let shift = 0;
    let settle = 0;
    let frame = 0;

    const apply = (snap: boolean) => {
      el.style.transition = snap && !reduce.matches ? "transform 220ms cubic-bezier(0.23, 1, 0.32, 1)" : "none";
      el.style.transform = shift ? `translateY(${-shift}px)` : "";
    };
    const onScroll = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const y = Math.max(0, window.scrollY);
        // Far enough to clear whatever it's pinned under, too.
        const h = el.offsetHeight + (Number.parseFloat(getComputedStyle(el).top) || 0);
        const dy = y - last;
        last = y;
        // Any real scroll up brings it all the way back, at once (X's tab row).
        if (dy < -4 || y < showWithin) {
          const was = shift;
          shift = 0;
          apply(was > 0);
          return;
        }
        shift = Math.min(h, Math.max(0, shift + dy));
        apply(false);
        window.clearTimeout(settle);
        settle = window.setTimeout(() => {
          const full = el.offsetHeight + (Number.parseFloat(getComputedStyle(el).top) || 0);
          shift = window.scrollY < showWithin || shift < full / 2 ? 0 : full;
          apply(true);
        }, 140);
      });
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.clearTimeout(settle);
      cancelAnimationFrame(frame);
      el.style.transform = "";
      el.style.transition = "";
    };
  }, [ref, showWithin]);
}
