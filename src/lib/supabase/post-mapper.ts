// Environment-agnostic (no server/browser Supabase client import) — shared
// row type + mapper for Arena's real posts, same reasoning as
// message-mapper.ts. Fetched entirely client-side (see arena.ts), so this
// file only ever needs to be import-safe for the browser, but keeping it
// client-import-free like the others costs nothing and stays consistent.

export interface PostRow {
  id: string;
  author_id: string;
  body: string;
  room_id: string | null;
  roast_count: number;
  created_at: string;
}

export interface DisplayPost {
  id: string;
  authorId: string;
  authorName: string;
  authorUsername: string | null;
  body: string;
  roomId: string | null;
  createdAt: string;
  roastCount: number;
  roastedByViewer: boolean;
}

export function mapPostRow(
  row: PostRow,
  author: { display_name: string; username: string } | null,
  roastedByViewer: boolean,
): DisplayPost {
  return {
    id: row.id,
    authorId: row.author_id,
    authorName: author?.display_name ?? "A rival",
    authorUsername: author?.username ?? null,
    body: row.body,
    roomId: row.room_id,
    createdAt: row.created_at,
    roastCount: row.roast_count,
    roastedByViewer,
  };
}

export const POST_UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
