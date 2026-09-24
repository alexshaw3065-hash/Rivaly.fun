"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { preloadMatches } from "@/lib/use-real-matches";

// Warms up the moves people make most — Create Room above all — while the
// phone is idle, so tapping it feels instant: the page's code is fetched and
// the fixtures it lists are already in the shared cache. Waits for the app
// to settle first so it never competes with what's on screen, and skips
// data-saver connections.
export function AppPreloader() {
  const router = useRouter();

  useEffect(() => {
    const conn = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection;
    if (conn?.saveData) return;

    const warm = () => {
      router.prefetch("/rooms/create");
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
