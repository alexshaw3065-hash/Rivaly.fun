import type { ChatMessage } from "@/lib/types";

// Environment-agnostic (no server or browser Supabase client import) —
// used by both the server-side initial fetch (rooms/[roomId]/page.tsx)
// and the client-side realtime subscription (chat-composer.tsx), same
// reasoning as room-mapper.ts.

export interface MessageRow {
  id: string;
  room_id: string;
  user_id: string;
  body: string;
  created_at: string;
}

/**
 * A real message carries its author's display name/avatar denormalized
 * onto it (from the initial embedded-join fetch, or a small client-side
 * cache for realtime arrivals — see chat-composer.tsx) so ChatMessageRow
 * never needs its own async profile lookup. authorName undefined means
 * "look this up the old (mock) way" — chat-message.tsx falls back to
 * profileById for mock rooms, which never set these fields at all.
 */
export type DisplayChatMessage = ChatMessage & {
  authorName?: string;
  authorAvatarUrl?: string | null;
};

export function mapMessageRow(
  row: MessageRow,
  author?: { display_name: string; avatar_url: string | null },
): DisplayChatMessage {
  return {
    id: row.id,
    roomId: row.room_id,
    userId: row.user_id,
    kind: "message",
    body: row.body,
    createdAt: row.created_at,
    authorName: author?.display_name,
    authorAvatarUrl: author?.avatar_url,
  };
}

export const MESSAGE_UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
