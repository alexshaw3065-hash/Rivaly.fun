import { createClient } from "@/lib/supabase/server";
import type { EntrySide } from "@/lib/types";

/**
 * The signed-in user's own entry in a real room, if any — lets the room
 * page render "You're in — backing Yes" correctly on a fresh page load
 * (not just right after clicking Join, which local-only useState could
 * already do but lost on refresh). Only meaningful for real (UUID) rooms;
 * mock rooms have no real entries table backing them.
 */
export async function getMyEntryForRoom(roomId: string): Promise<EntrySide | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("entries")
    .select("side")
    .eq("room_id", roomId)
    .eq("user_id", user.id)
    .maybeSingle();

  return (data?.side as EntrySide | undefined) ?? null;
}
