"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { searchRooms, usePublicRooms } from "@/lib/use-real-rooms";
import { useRealMatches } from "@/lib/use-real-matches";
import type { Profile } from "@/lib/types";

// One search for every search surface (the mobile sheet, Home's pill, the
// desktop header box) — real rooms, real fixtures and real people, instead
// of each surface filtering the demo roster on its own.

const PEOPLE_LIMIT = 8;

function toProfile(r: Record<string, unknown>): Profile {
  return {
    id: r.id as string,
    username: r.username as string,
    displayName: (r.display_name as string) || (r.username as string),
    avatarUrl: (r.avatar_url as string | null) ?? null,
    bio: (r.bio as string | null) ?? null,
    socialLinks: [],
    followerCount: Number(r.follower_count ?? 0),
    followingCount: Number(r.following_count ?? 0),
    roomsCreated: Number(r.rooms_created_count ?? 0),
    predictionAccuracy: Number(r.prediction_accuracy ?? 0),
    totalWinningsCents: Number(r.total_winnings_cents ?? 0),
    createdAt: r.created_at as string,
    dynamicWalletAddress: null, // never needed (or exposed) in search
  };
}

/** `%` and `_` are wildcards in ILIKE, and `,()` would break the or() filter. */
const likeSafe = (q: string) => q.replace(/[%_,()\\]/g, " ").trim();

function usePeopleSearch(q: string): Profile[] {
  const [result, setResult] = useState<{ q: string; people: Profile[] }>({ q: "", people: [] });
  useEffect(() => {
    // "@warren" should find warren — usernames are shown with an @, so people type one.
    const term = likeSafe(q).replace(/^@+/, "");
    if (term.length < 2) return;
    let cancelled = false;
    // A short pause while typing, so a burst of keystrokes is one query.
    const id = window.setTimeout(() => {
      createClient()
        .from("profiles")
        .select("id, username, display_name, avatar_url, bio, follower_count, following_count, rooms_created_count, prediction_accuracy, total_winnings_cents, created_at")
        .or(`username.ilike.%${term}%,display_name.ilike.%${term}%`)
        .order("follower_count", { ascending: false })
        .limit(PEOPLE_LIMIT)
        .then(
          ({ data }) => !cancelled && setResult({ q, people: (data ?? []).map((r) => toProfile(r as Record<string, unknown>)) }),
          () => !cancelled && setResult({ q, people: [] }),
        );
    }, 180);
    return () => {
      cancelled = true;
      window.clearTimeout(id);
    };
  }, [q]);
  return likeSafe(q).replace(/^@+/, "").length >= 2 && result.q === q ? result.people : [];
}

export function useSearchResults(query: string, selectedLeagues: string[] = []) {
  const q = query.trim().toLowerCase();
  const { items: publicRooms } = usePublicRooms();
  const { matches, isReal } = useRealMatches();

  const rooms = useMemo(() => searchRooms(publicRooms, q), [publicRooms, q]);
  const matchResults = useMemo(
    () =>
      q && isReal
        ? matches.filter(
            (m) =>
              (m.homeTeam.toLowerCase().includes(q) ||
                m.awayTeam.toLowerCase().includes(q) ||
                m.competition.toLowerCase().includes(q)) &&
              (selectedLeagues.length === 0 || selectedLeagues.includes(m.competition)),
          )
        : [],
    [q, isReal, matches, selectedLeagues],
  );
  const people = usePeopleSearch(q);

  return { rooms, matches: matchResults, people };
}
