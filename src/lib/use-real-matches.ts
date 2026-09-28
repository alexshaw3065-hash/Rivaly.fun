"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { scoredCompetitionIds } from "@/lib/supabase/scored-competitions";
import { mapMatchRow, MATCH_COLUMNS, type MatchRow } from "@/lib/supabase/match-mapper";
import type { Match } from "@/lib/types";

// Read straight from the browser: public.matches has a public select policy
// (fixtures and scores aren't secret, and the app renders them to signed-out
// visitors), so no server round-trip or prop-drilling is needed. Writes are
// service-role only, so nothing here can be spoofed by a client.

// How much of the schedule to show: three weeks ahead (see FUTURE_DAYS),
// and yesterday's results still matter on the day after.
const PAST_HOURS = 36;
const FUTURE_DAYS = 21; // three weeks — covers an international break (Create Room lists the same span)
const LIMIT = 500; // seven football leagues + the NFL over three weeks runs past 200

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
  /** False until the first read has landed. */
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

// Live scores: ONE realtime channel for the whole app however many screens
// read fixtures, and at most one re-read every 10s however often the feed
// writes (a live NFL clock updates every few seconds — re-downloading 500
// fixtures per update, per screen, burns data on a slow phone connection).
const RELOAD_GAP_MS = 10_000;
const listeners = new Set<() => void>();
let liveChannel: { remove: () => void } | null = null;
let reloadTimer: ReturnType<typeof setTimeout> | null = null;
let lastReload = 0;

function scheduleReload() {
  if (reloadTimer) return;
  reloadTimer = setTimeout(() => {
    reloadTimer = null;
    lastReload = Date.now();
    void preloadMatches(true)
      .then(() => listeners.forEach((l) => l()))
      .catch(() => undefined);
  }, Math.max(0, lastReload + RELOAD_GAP_MS - Date.now()));
}

function subscribeLive(listener: () => void): () => void {
  listeners.add(listener);
  if (!liveChannel) {
    const supabase = createClient();
    // A fresh name each time: the client hands back the SAME channel for a
    // repeated name, and one still closing can't take a new listener.
    const channel = supabase
      .channel(`matches-live:${Math.random().toString(36).slice(2)}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "matches" }, scheduleReload)
      .subscribe();
    liveChannel = { remove: () => void supabase.removeChannel(channel) };
  }
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0 && liveChannel) {
      liveChannel.remove();
      liveChannel = null;
    }
  };
}

/** Real fixtures and scores. No fixtures means an empty list — never sample matches. */
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
  // out to the app's one shared channel (subscribeLive), which re-reads and
  // tells every mounted reader.
  useEffect(() => subscribeLive(() => setRows(cache?.rows ?? null)), []);

  return useMemo(() => ({ matches: [...(rows ?? [])].sort(forDisplay), isReal: rows !== null, isLoading: rows === null && isLoading }), [rows, isLoading]);
}
