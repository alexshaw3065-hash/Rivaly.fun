"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { matches as mockMatches } from "@/lib/mock-data";
import type { Match, MatchStatus } from "@/lib/types";

// Read straight from the browser: public.matches has a public select policy
// (fixtures and scores aren't secret, and the app renders them to signed-out
// visitors), so no server round-trip or prop-drilling is needed. Writes are
// service-role only, so nothing here can be spoofed by a client.

// How much of the schedule to show. A fortnight ahead is plenty for browsing,
// and yesterday's results still matter on the day after.
const PAST_HOURS = 36;
const FUTURE_DAYS = 14;
const LIMIT = 200;

interface MatchRow {
  id: string;
  competition: string;
  home_team: string;
  away_team: string;
  kickoff_at: string;
  status: string;
  home_score: number | null;
  away_score: number | null;
}

function mapRow(row: MatchRow): Match {
  return {
    id: row.id,
    competition: row.competition,
    homeTeam: row.home_team,
    awayTeam: row.away_team,
    kickoffAt: row.kickoff_at,
    status: row.status as MatchStatus,
    homeScore: row.home_score,
    awayScore: row.away_score,
  };
}

// Live first, then whatever kicks off soonest — the order someone browsing
// actually wants, rather than raw chronology.
function forDisplay(a: Match, b: Match): number {
  const liveA = a.status === "live" ? 0 : 1;
  const liveB = b.status === "live" ? 0 : 1;
  if (liveA !== liveB) return liveA - liveB;
  return +new Date(a.kickoffAt) - +new Date(b.kickoffAt);
}

export interface RealMatches {
  matches: Match[];
  /** False while the first read is in flight, or when falling back to mock. */
  isReal: boolean;
  isLoading: boolean;
}

/**
 * Real fixtures and scores, with the seeded mock roster as a fallback.
 *
 * Same mock-vs-real convention used elsewhere in the codebase: if the table
 * has no rows (a fresh environment, or the ingester hasn't run), the app keeps
 * working on mock data rather than rendering an empty screen.
 */
export function useRealMatches(): RealMatches {
  const [rows, setRows] = useState<Match[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const inFlight = useRef(false);

  const load = useCallback(async () => {
    if (inFlight.current) return;
    inFlight.current = true;
    try {
      const supabase = createClient();
      const now = Date.now();
      const { data } = await supabase
        .from("matches")
        .select("id, competition, home_team, away_team, kickoff_at, status, home_score, away_score")
        .gte("kickoff_at", new Date(now - PAST_HOURS * 3600_000).toISOString())
        .lte("kickoff_at", new Date(now + FUTURE_DAYS * 86_400_000).toISOString())
        .order("kickoff_at", { ascending: true })
        .limit(LIMIT);
      setRows((data ?? []).map((r) => mapRow(r as MatchRow)));
    } finally {
      inFlight.current = false;
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  // Live updates. The ingester writes one row per change and Supabase fans it
  // out here, so a goal reaches every open client without anyone polling.
  // Re-reading on change is cheaper to reason about than merging payloads,
  // and setState inside a subscription callback is exactly what effects are
  // for.
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel("matches-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "matches" }, () => {
        void load();
      })
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [load]);

  return useMemo(() => {
    const real = rows ?? [];
    if (real.length === 0) {
      return { matches: [...mockMatches].sort(forDisplay), isReal: false, isLoading };
    }
    return { matches: [...real].sort(forDisplay), isReal: true, isLoading: false };
  }, [rows, isLoading]);
}
