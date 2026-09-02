import { createClient } from "@/lib/supabase/server";
import { roomById as mockRoomById } from "@/lib/mock-data";
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
  if (!ROOM_UUID_RE.test(id)) return mockRoomById(id);

  const supabase = await createClient();
  const { data } = await supabase.from("rooms").select(ROOM_COLUMNS).eq("id", id).maybeSingle();
  if (!data) return undefined;
  return mapRoomRow(data as RoomRow);
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
