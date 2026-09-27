import { createAdminClient } from "@/lib/supabase/admin";
import type { EventContext, PlatformEvent } from "./events";

// Server-side reads shared across admin pages. Always called after
// requireAdmin() — these use the service role.

export type Admin = ReturnType<typeof createAdminClient>;

export function db(): Admin {
  return createAdminClient();
}

/** Names for every user/room/match an event list mentions, in three queries. */
export async function eventContext(events: PlatformEvent[]): Promise<EventContext> {
  const admin = db();
  const userIds = new Set<string>();
  const roomIds = new Set<string>();
  const matchIds = new Set<string>();
  for (const e of events) {
    if (e.user_id) userIds.add(e.user_id);
    if (e.room_id) roomIds.add(e.room_id);
    if (e.match_id) matchIds.add(e.match_id);
    const f = (e.metadata as { following_id?: unknown })?.following_id;
    if (typeof f === "string") userIds.add(f);
  }
  const [users, rooms, matches] = await Promise.all([
    userIds.size ? admin.from("profiles").select("id, username, display_name").in("id", [...userIds]) : Promise.resolve({ data: [] }),
    roomIds.size ? admin.from("rooms").select("id, prediction").in("id", [...roomIds]) : Promise.resolve({ data: [] }),
    matchIds.size ? admin.from("matches").select("id, home_team, away_team").in("id", [...matchIds]) : Promise.resolve({ data: [] }),
  ]);
  return {
    users: Object.fromEntries(((users.data ?? []) as { id: string; username: string; display_name: string }[]).map((u) => [u.id, displayName(u)])),
    rooms: Object.fromEntries(((rooms.data ?? []) as { id: string; prediction: string }[]).map((r) => [r.id, r.prediction])),
    matches: Object.fromEntries(((matches.data ?? []) as { id: string; home_team: string; away_team: string }[]).map((m) => [m.id, `${m.home_team} v ${m.away_team}`])),
  };
}

const UUIDISH = /^[0-9a-f]{8}-[0-9a-f]{4}-/i;
export function displayName(u: { username: string; display_name: string }): string {
  return !u.display_name || UUIDISH.test(u.display_name) ? `@${u.username}` : u.display_name;
}

export async function loadEvents(opts: { types?: string[]; userId?: string; roomId?: string; matchId?: string; limit?: number; status?: "failed" }): Promise<PlatformEvent[]> {
  let q = db().from("platform_events").select("*").order("at", { ascending: false }).limit(opts.limit ?? 50);
  if (opts.types?.length) q = q.in("type", opts.types);
  if (opts.userId) q = q.eq("user_id", opts.userId);
  if (opts.roomId) q = q.eq("room_id", opts.roomId);
  if (opts.matchId) q = q.eq("match_id", opts.matchId);
  if (opts.status) q = q.eq("status", opts.status);
  const { data } = await q;
  return (data ?? []) as PlatformEvent[];
}

export async function rpc<T>(fn: string, args: Record<string, unknown> = {}): Promise<T> {
  const { data, error } = await db().rpc(fn, args);
  if (error) throw new Error(`${fn}: ${error.message}`);
  return data as T;
}
