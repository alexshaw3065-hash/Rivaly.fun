"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { mapMatchRow, MATCH_COLUMNS, type MatchRow } from "@/lib/supabase/match-mapper";
import { mapRoomRow, ROOM_COLUMNS, ROOM_UUID_RE, type RoomRow, type RoomWithTotals } from "@/lib/supabase/room-mapper";
import type { Match } from "@/lib/types";

// Real rooms, each with its real match. rooms.match_id is text (no FK — it
// predates the matches table), so the two are fetched separately and joined
// here rather than embedded in one select. Every room surface (Home, Rooms,
// Search, Profile, Wishlist) reads through this, so a card always gets a
// real match — never the mock roster's.

export interface RoomWithMatch {
  room: RoomWithTotals;
  match: Match;
}

async function withMatches(rows: RoomRow[]): Promise<RoomWithMatch[]> {
  const rooms = rows.map(mapRoomRow);
  const ids = [...new Set(rooms.map((r) => r.matchId).filter((id) => ROOM_UUID_RE.test(id)))];
  if (ids.length === 0) return [];
  const { data } = await createClient().from("matches").select(MATCH_COLUMNS).in("id", ids);
  const byId = new Map((data ?? []).map((m) => [m.id, mapMatchRow(m as MatchRow)]));
  return rooms.flatMap((room) => {
    const match = byId.get(room.matchId);
    return match ? [{ room, match }] : [];
  });
}

const PUBLIC_LIMIT = 200;
const CACHE_MS = 30_000;
let publicCache: { at: number; promise: Promise<RoomWithMatch[]> } | null = null;

/** Open and live public rooms, newest first. Cached briefly so a page with several room sections makes one read. */
export function fetchPublicRooms(): Promise<RoomWithMatch[]> {
  if (publicCache && Date.now() - publicCache.at < CACHE_MS) return publicCache.promise;
  const promise = (async () => {
    const { data } = await createClient()
      .from("rooms")
      .select(ROOM_COLUMNS)
      .eq("visibility", "public")
      .in("status", ["open", "live"])
      .order("created_at", { ascending: false })
      .limit(PUBLIC_LIMIT);
    return withMatches((data ?? []) as RoomRow[]);
  })();
  publicCache = { at: Date.now(), promise };
  return promise;
}

/** Rooms a profile created, and rooms they entered without creating. */
export async function fetchRoomsForProfile(profileId: string): Promise<{ created: RoomWithMatch[]; joined: RoomWithMatch[] }> {
  if (!ROOM_UUID_RE.test(profileId)) return { created: [], joined: [] };
  const supabase = createClient();
  const [createdRes, joinedRes] = await Promise.all([
    supabase.from("rooms").select(ROOM_COLUMNS).eq("creator_id", profileId).order("created_at", { ascending: false }),
    supabase
      .from("entries")
      .select(`room:rooms!inner(${ROOM_COLUMNS})`)
      .eq("user_id", profileId)
      .neq("room.creator_id", profileId),
  ]);
  const joinedRows = ((joinedRes.data ?? []) as unknown as { room: RoomRow | null }[]).flatMap((r) => (r.room ? [r.room] : []));
  const [created, joined] = await Promise.all([
    withMatches((createdRes.data ?? []) as RoomRow[]),
    withMatches(joinedRows),
  ]);
  return { created, joined };
}

/** Specific rooms by id (bookmarks), in the order asked for. */
export async function fetchRoomsByIds(ids: string[]): Promise<RoomWithMatch[]> {
  const real = ids.filter((id) => ROOM_UUID_RE.test(id));
  if (real.length === 0) return [];
  const { data } = await createClient().from("rooms").select(ROOM_COLUMNS).in("id", real);
  const items = await withMatches((data ?? []) as RoomRow[]);
  return real.flatMap((id) => items.filter((i) => i.room.id === id));
}

export function usePublicRooms(): { items: RoomWithMatch[]; isLoading: boolean } {
  const [items, setItems] = useState<RoomWithMatch[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  useEffect(() => {
    let cancelled = false;
    fetchPublicRooms().then((rows) => {
      if (cancelled) return;
      setItems(rows);
      setIsLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, []);
  return { items, isLoading };
}

/**
 * The honest "heat" ordering: most rivals in, then the biggest pool, then
 * the newest. No momentum-per-hour number — that was a seeded stand-in on
 * the mock roster, and there's no join-timestamp series to derive it from.
 */
export function byHeat(a: RoomWithMatch, b: RoomWithMatch): number {
  return (
    b.room.participantCount - a.room.participantCount ||
    b.room.poolTotalCents - a.room.poolTotalCents ||
    +new Date(b.room.createdAt) - +new Date(a.room.createdAt)
  );
}

/** Rooms whose call, teams or competition contain the (lower-cased) query. */
export function searchRooms(items: RoomWithMatch[], q: string): RoomWithMatch[] {
  if (!q) return [];
  return items.filter(
    ({ room, match }) =>
      room.prediction.toLowerCase().includes(q) ||
      match.homeTeam.toLowerCase().includes(q) ||
      match.awayTeam.toLowerCase().includes(q) ||
      match.competition.toLowerCase().includes(q),
  );
}
