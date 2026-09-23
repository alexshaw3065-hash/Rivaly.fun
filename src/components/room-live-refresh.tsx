"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

// Keeps an unfinished room live: re-reads the server-rendered page every
// 15 s so the pool, the YES/NO split, new rivals, "stakes locked" at kickoff
// and the result (early or at the whistle) arrive without a manual refresh.
// Skips while the tab is hidden — no point refreshing what nobody's watching.
export function RoomLiveRefresh({ everyMs = 15_000 }: { everyMs?: number }) {
  const router = useRouter();
  useEffect(() => {
    const id = window.setInterval(() => {
      if (document.visibilityState === "visible") router.refresh();
    }, everyMs);
    return () => window.clearInterval(id);
  }, [router, everyMs]);
  return null;
}
