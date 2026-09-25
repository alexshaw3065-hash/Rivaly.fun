"use client";

import { useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import { preloadMatches } from "@/lib/use-real-matches";

// Whether this page load has moved between pages inside Rivaly — so "back"
// can mean the page before. In memory on purpose: it resets with every full
// load, so a shared link opened fresh never "goes back" to whatever the tab
// showed last time (sessionStorage would outlive the load).
let movedInApp = false;
export const hasInAppHistory = () => movedInApp;

// Warms up the moves people make most — Create Room above all — while the
// phone is idle, so tapping it feels instant: the page's code is fetched and
// the fixtures it lists are already in the shared cache. Waits for the app
// to settle first so it never competes with what's on screen, and skips
// data-saver connections.
export function AppPreloader() {
  const router = useRouter();
  const pathname = usePathname();
  // The path this page load started on; any other path means a move in-app.
  // (A "first run" flag isn't enough: effects run twice in development.)
  const landed = useRef(pathname);

  // Remember that there's an in-app page behind this one. document.referrer
  // can't tell (it never changes on client-side navigation), which is why
  // the room's back button used to guess wrong.
  useEffect(() => {
    if (pathname !== landed.current) movedInApp = true;
  }, [pathname]);

  useEffect(() => {
    const conn = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection;
    if (conn?.saveData) return;

    const warm = () => {
      router.prefetch("/rooms/create");
      router.prefetch("/");
      void preloadMatches().catch(() => undefined);
    };
    const w = window as Window & {
      requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number;
      cancelIdleCallback?: (id: number) => void;
    };
    if (w.requestIdleCallback) {
      const id = w.requestIdleCallback(warm, { timeout: 2500 });
      return () => w.cancelIdleCallback?.(id);
    }
    const t = window.setTimeout(warm, 1200);
    return () => window.clearTimeout(t);
  }, [router]);

  return null;
}
