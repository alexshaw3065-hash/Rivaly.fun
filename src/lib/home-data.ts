import { unstable_cache } from "next/cache";
import { createClient } from "@supabase/supabase-js";
import { mapMatchRow, MATCH_COLUMNS, type MatchRow } from "@/lib/supabase/match-mapper";
import { mapRoomRow, ROOM_COLUMNS, ROOM_UUID_RE, type RoomRow } from "@/lib/supabase/room-mapper";
import { scoredCompetitionIds } from "@/lib/supabase/scored-competitions";
import type { RoomWithMatch } from "@/lib/use-real-rooms";
import type { Match } from "@/lib/types";

// Home's first data, read on the server so the rooms and matches are in the
// page itself instead of waiting for the browser to load the app and then ask
// (on a mid-range phone that chain took ~6 s). The same queries and mapping
// as the client (use-real-rooms.ts / use-real-matches.ts), with the anon key
// and no cookies: it's the same public data for everyone, so it's cached for
// a few seconds and shared across visitors. The client shows it at once, then
// refreshes it as before.

export interface HomeData {
  rooms: RoomWithMatch[];
  matches: Match[];
}

const PUBLIC_LIMIT = 200;
const PAST_HOURS = 36;
const FUTURE_DAYS = 21;
const MATCH_LIMIT = 500;
const FIRST_ROOMS = 24;
const FIRST_MATCHES = 40;
const FIRST_MATCH_HOURS = 36;

const load = unstable_cache(
  async (): Promise<HomeData> => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !key) return { rooms: [], matches: [] };
    const db = createClient(url, key, { auth: { persistSession: false } });
    const now = Date.now();
    const [roomsRes, scored] = await Promise.all([
      db.from("rooms").select(ROOM_COLUMNS).eq("visibility", "public").in("status", ["open", "live"]).order("created_at", { ascending: false }).limit(PUBLIC_LIMIT),
      scoredCompetitionIds(db),
    ]);
    const roomRows = ((roomsRes.data ?? []) as RoomRow[]).map(mapRoomRow);
    const ids = [...new Set(roomRows.map((r) => r.matchId).filter((id) => ROOM_UUID_RE.test(id)))];
    const [roomMatches, listed] = await Promise.all([
      ids.length ? db.from("matches").select(MATCH_COLUMNS).in("id", ids) : Promise.resolve({ data: [] }),
      scored.length
        ? db
            .from("matches")
            .select(MATCH_COLUMNS)
            .in("competition_id", scored)
            .gte("kickoff_at", new Date(now - PAST_HOURS * 3600_000).toISOString())
            .lte("kickoff_at", new Date(now + FUTURE_DAYS * 86_400_000).toISOString())
            .order("kickoff_at", { ascending: true })
            .limit(MATCH_LIMIT)
        : Promise.resolve({ data: [] }),
    ]);
    const byId = new Map(((roomMatches.data ?? []) as MatchRow[]).map((m) => [m.id, mapMatchRow(m)]));
    const rooms = roomRows.flatMap((room) => {
      const match = byId.get(room.matchId);
      return match ? [{ room, match }] : [];
    });
    // Only what the first screen shows — the hottest and the newest rooms, the
    // matches live now or kicking off soon — so the page stays light; the
    // browser loads the full lists right after, as before.
    const heat = (r: RoomWithMatch) => r.room.participantCount * 1_000_000 + r.room.poolTotalCents;
    const hottest = [...rooms].sort((a, b) => heat(b) - heat(a)).slice(0, FIRST_ROOMS / 2);
    const firstRooms = [...hottest, ...rooms.filter((r) => !hottest.includes(r))].slice(0, FIRST_ROOMS);
    const soon = now + FIRST_MATCH_HOURS * 3600_000;
    const firstMatches = ((listed.data ?? []) as MatchRow[])
      .map(mapMatchRow)
      .filter((m) => m.status === "live" || (m.status === "scheduled" && +new Date(m.kickoffAt) <= soon && +new Date(m.kickoffAt) >= now - 3 * 3600_000))
      .slice(0, FIRST_MATCHES);
    return { rooms: firstRooms, matches: firstMatches };
  },
  ["home-data-v2"],
  { revalidate: 15, tags: ["home"] },
);

/** Never lets Home fail: on any error the page simply loads its data in the browser, as before. */
export async function getHomeData(): Promise<HomeData | null> {
  try {
    return await load();
  } catch {
    return null;
  }
}
