import { createClient } from "@/lib/supabase/server";
import { mapMessageRow, MESSAGE_UUID_RE, type DisplayChatMessage, type MessageReaction, type MessageRow } from "@/lib/supabase/message-mapper";

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
    .select("id, room_id, user_id, body, created_at, reply_to, author:profiles(display_name, avatar_url)")
    .eq("room_id", roomId)
    // Newest first then reversed: a busy room opens on its latest chat, not
    // its first 50 messages.
    .order("created_at", { ascending: false })
    .limit(HISTORY_LIMIT);

  if (!data) return [];
  const rows = data as unknown as (MessageRow & { author: { display_name: string; avatar_url: string | null } | null })[];
  return rows.map((row) => mapMessageRow(row, row.author ?? undefined)).reverse();
}

/** Every reaction in the room (a room's chat is small; one query). */
export async function getRoomReactions(roomId: string): Promise<MessageReaction[]> {
  if (!MESSAGE_UUID_RE.test(roomId)) return [];
  const supabase = await createClient();
  const { data } = await supabase.from("message_reactions").select("message_id, user_id, emoji").eq("room_id", roomId).limit(5000);
  return (data ?? []).map((r) => ({ messageId: r.message_id as string, userId: r.user_id as string, emoji: r.emoji as string }));
}

const LOG_LIMIT = 5000;

/** Who said something when — the whole room, for folding the stadium race (room-race.ts). */
export async function getRoomMessageLog(roomId: string): Promise<{ userId: string; at: number }[]> {
  if (!MESSAGE_UUID_RE.test(roomId)) return [];
  const supabase = await createClient();
  const { data } = await supabase
    .from("messages")
    .select("user_id, created_at")
    .eq("room_id", roomId)
    .order("created_at", { ascending: true })
    .limit(LOG_LIMIT);
  return (data ?? []).map((r) => ({ userId: r.user_id as string, at: +new Date(r.created_at as string) }));
}
