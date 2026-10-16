"use client";

import { useEffect } from "react";

// The phone top bar on scroll: it moves up with the content as you scroll
// down until it's gone, any scroll up brings it straight back down, and when
// the scroll settles it snaps fully open or fully closed (never half-way).
// It always shows near the top of the page.
//
// It only writes state on <html>; globals.css does the moving:
//   data-scrollbar  on while a page uses it
//   --bar-shift     how far the bar has slid up (0 … -height px)
//   data-bar-snap   while the snap animates (finger-follow has no transition)
export function useScrollBar(enabled = true) {
  useEffect(() => {
    if (!enabled) return;
    const phone = window.matchMedia("(max-width: 767px)");
    const root = document.documentElement;
    let last = window.scrollY;
    let shift = 0;
    let settle = 0;
    let frame = 0;

    const height = () => document.querySelector<HTMLElement>(".mobile-topbar")?.offsetHeight ?? 0;
    const write = (snap: boolean) => {
      root.toggleAttribute("data-bar-snap", snap);
      root.style.setProperty("--bar-shift", `${-shift}px`);
    };
    const onScroll = () => {
      if (!phone.matches) return;
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const y = Math.max(0, window.scrollY);
        const h = height();
        shift = y <= 0 ? 0 : Math.min(h, Math.max(0, shift + (y - last)));
        last = y;
        write(false);
        window.clearTimeout(settle);
        settle = window.setTimeout(() => {
          shift = window.scrollY < h || shift < h / 2 ? 0 : h;
          write(true);
        }, 140);
      });
    };

    root.setAttribute("data-scrollbar", "");
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.clearTimeout(settle);
      cancelAnimationFrame(frame);
      root.removeAttribute("data-scrollbar");
      root.removeAttribute("data-bar-snap");
      root.style.removeProperty("--bar-shift");
    };
  }, [enabled]);
}
