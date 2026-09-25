"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { scoredCompetitionIds } from "@/lib/supabase/scored-competitions";
import { matches as mockMatches } from "@/lib/mock-data";
import { mapMatchRow, MATCH_COLUMNS, type MatchRow } from "@/lib/supabase/match-mapper";
import type { Match } from "@/lib/types";

// Read straight from the browser: public.matches has a public select policy
// (fixtures and scores aren't secret, and the app renders them to signed-out
// visitors), so no server round-trip or prop-drilling is needed. Writes are
// service-role only, so nothing here can be spoofed by a client.

// How much of the schedule to show. A fortnight ahead is plenty for browsing,
// and yesterday's results still matter on the day after.
const PAST_HOURS = 36;
const FUTURE_DAYS = 14;
const LIMIT = 200;

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

// One shared cache for the fixtures, so Create Room (and anything else that
// lists matches) opens with them already there instead of a loading state:
// preloadMatches() fills it in the background before anyone taps (see
// app-preloader.tsx), and every hook instance reads and refreshes it.
const FRESH_MS = 60_000;
let cache: { rows: Match[]; at: number } | null = null;
let pending: Promise<Match[]> | null = null;

async function fetchMatches(): Promise<Match[]> {
  const now = Date.now();
  const supabase = createClient();
  // Only competitions we get live scores for — a room on anything else could
  // never settle (see scored-competitions.ts).
  const scored = await scoredCompetitionIds(supabase);
  if (scored.length === 0) return [];
  const { data } = await supabase
    .from("matches")
    .select(MATCH_COLUMNS)
    .in("competition_id", scored)
    .gte("kickoff_at", new Date(now - PAST_HOURS * 3600_000).toISOString())
    .lte("kickoff_at", new Date(now + FUTURE_DAYS * 86_400_000).toISOString())
    .order("kickoff_at", { ascending: true })
    .limit(LIMIT);
  return (data ?? []).map((r) => mapMatchRow(r as MatchRow));
}

/** Fetch into the shared cache (deduplicated). `force` ignores freshness. */
export function preloadMatches(force = false): Promise<Match[]> {
  if (!force && cache && Date.now() - cache.at < FRESH_MS) return Promise.resolve(cache.rows);
  if (pending) return pending;
  pending = fetchMatches()
    .then((rows) => {
      cache = { rows, at: Date.now() };
      return rows;
    })
    .finally(() => {
      pending = null;
    });
  return pending;
}

/**
 * Real fixtures and scores, with the seeded mock roster as a fallback.
 *
 * Same mock-vs-real convention used elsewhere in the codebase: if the table
 * has no rows (a fresh environment, or the ingester hasn't run), the app keeps
 * working on mock data rather than rendering an empty screen.
 */
export function useRealMatches(): RealMatches {
  // Start from the shared cache when it's there — no loading flash.
  const [rows, setRows] = useState<Match[] | null>(() => cache?.rows ?? null);
  const [isLoading, setIsLoading] = useState(() => cache === null);

  const load = useCallback(async (force = false) => {
    try {
      setRows(await preloadMatches(force));
    } catch {
      // keep what we have
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Refresh on mount (instant if the preloader already filled the cache).
  // Deferred a tick: setState must not run synchronously in an effect body.
  useEffect(() => {
    const t = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(t);
  }, [load]);

  // Live updates. The ingester writes one row per change and Supabase fans it
  // out here, so a goal reaches every open client without anyone polling.
  // Re-reading on change is cheaper to reason about than merging payloads,
  // and setState inside a subscription callback is exactly what effects are
  // for.
  useEffect(() => {
    const supabase = createClient();
    // A unique name per hook instance: several surfaces (search, the create
    // flow) can be mounted at once, and the client hands back the SAME
    // channel for a repeated name — adding a listener to an already-
    // subscribed channel throws.
    const channel = supabase
      .channel(`matches-live:${Math.random().toString(36).slice(2)}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "matches" }, () => {
        void load(true);
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
