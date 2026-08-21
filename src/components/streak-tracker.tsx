"use client";

import { useEffect } from "react";
import { checkInToday } from "@/lib/use-daily-streak";

// Mounted once, app-wide (see nav.tsx) — records today's visit the moment
// the app opens, regardless of which page. Renders nothing; the actual
// streak count is read reactively via useDailyStreak() wherever it's shown
// (currently just Profile's achievements sheet).
export function StreakTracker() {
  useEffect(() => {
    checkInToday();
  }, []);
  return null;
}
