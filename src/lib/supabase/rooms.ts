import { createClient } from "@/lib/supabase/server";
import type { Room } from "@/lib/types";
import {
  mapRoomRow,
  ROOM_COLUMNS,
  ROOM_UUID_RE,
  type RoomRow,
  type RoomWithTotals,
} from "@/lib/supabase/room-mapper";

export type { RoomWithTotals };
export { splitPctFromTotals } from "@/lib/supabase/room-mapper";

export async function getRoomById(id: string): Promise<RoomWithTotals | undefined> {
  if (!ROOM_UUID_RE.test(id)) return undefined;

  const supabase = await createClient();
  const { data } = await supabase.from("rooms").select(ROOM_COLUMNS).eq("id", id).maybeSingle();
  if (!data) return undefined;
  return mapRoomRow(data as RoomRow);
}

/** A room opened by its invite code — works for private rooms the viewer isn't in yet. */
export async function getRoomByInviteCode(code: string): Promise<RoomWithTotals | undefined> {
  const supabase = await createClient();
  const { data } = await supabase.rpc("room_by_invite_code", { p_code: code });
  const row = (data as RoomRow[] | null)?.[0];
  return row ? mapRoomRow(row) : undefined;
}

/** Real rooms created by this user (mock creators stay on roomsByCreator() in mock-data.ts). */
export async function realRoomsByCreator(userId: string): Promise<Room[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("rooms")
    .select(ROOM_COLUMNS)
    .eq("creator_id", userId)
    .order("created_at", { ascending: false });
  return (data ?? []).map((row) => mapRoomRow(row as RoomRow));
}
