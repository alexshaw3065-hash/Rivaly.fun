import { createClient } from "@/lib/supabase/server";
import { mapMessageRow, MESSAGE_UUID_RE, type DisplayChatMessage, type MessageRow } from "@/lib/supabase/message-mapper";

const HISTORY_LIMIT = 50;

/**
 * Real rooms only (mock rooms and their seeded chat were removed). Embeds
 * the author's display_name/avatar_url in the same query (a real
 * Postgres join, not N+1 lookups) so ChatMessageRow gets everything it
 * needs without an async profile fetch per row.
 */
export async function getRoomMessages(roomId: string): Promise<DisplayChatMessage[]> {
  if (!MESSAGE_UUID_RE.test(roomId)) return [];

  const supabase = await createClient();
  const { data } = await supabase
    .from("messages")
    .select("id, room_id, user_id, body, created_at, author:profiles(display_name, avatar_url)")
    .eq("room_id", roomId)
    .order("created_at", { ascending: true })
    .limit(HISTORY_LIMIT);

  if (!data) return [];
  const rows = data as unknown as (MessageRow & { author: { display_name: string; avatar_url: string | null } | null })[];
  return rows.map((row) => mapMessageRow(row, row.author ?? undefined));
}
