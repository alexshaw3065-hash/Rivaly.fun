// Real Arena Feed data — fetched client-side (see arena-feed.tsx) with the
// browser Supabase client, same precedent as the Chat realtime subscription.
// Scoped to exactly the parts of the Feed that don't depend on settlement:
// posts, rival activity, and hot rooms. win_loss/Leagues/Leaderboard all
// need to know who won something, which nothing does yet — those stay
// entirely on mock data.

import { createClient } from "@/lib/supabase/client";
import { mapPostRow, type DisplayPost, type PostRow } from "@/lib/supabase/post-mapper";

export interface DisplayRivalActivity {
  id: string;
  userId: string;
  userName: string;
  userUsername: string | null;
  amountCents: number;
  roomId: string;
  roomPrediction: string;
  participantCount: number;
  createdAt: string;
}

export interface DisplayHotRoom {
  id: string;
  creatorId: string;
  prediction: string;
  participantCount: number;
  poolTotalCents: number;
  createdAt: string;
}

const POST_LIMIT = 20;
const ACTIVITY_LIMIT = 15;
const HOT_ROOM_LIMIT = 6;

export async function getFollowedUserIds(viewerId: string): Promise<string[]> {
  const supabase = createClient();
  const { data } = await supabase.from("follows").select("following_id").eq("follower_id", viewerId);
  return (data ?? []).map((row) => row.following_id as string);
}

export async function getRealPosts(viewerId: string | null): Promise<DisplayPost[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from("posts")
    .select(
      "id, author_id, body, room_id, roast_count, created_at, author:profiles!posts_author_id_fkey(display_name, username)",
    )
    .order("created_at", { ascending: false })
    .limit(POST_LIMIT);
  if (!data) return [];

  const rows = data as unknown as (PostRow & { author: { display_name: string; username: string } | null })[];

  let roastedIds = new Set<string>();
  if (viewerId && rows.length > 0) {
    const { data: roasts } = await supabase
      .from("post_roasts")
      .select("post_id")
      .eq("user_id", viewerId)
      .in(
        "post_id",
        rows.map((r) => r.id),
      );
    roastedIds = new Set((roasts ?? []).map((r) => r.post_id as string));
  }

  return rows.map((row) => mapPostRow(row, row.author, roastedIds.has(row.id)));
}

// Rival activity requires the viewer to be signed in and following someone
// — mirrors buildArenaFeed()'s mock rival_activity filter exactly (recent
// entries from followed users). Every real entry qualifies structurally
// today (nothing settles yet, so there's no "isWinner === null" to filter
// on beyond that always being true).
export async function getRealRivalActivity(viewerId: string | null): Promise<DisplayRivalActivity[]> {
  if (!viewerId) return [];
  const supabase = createClient();
  const followedIds = await getFollowedUserIds(viewerId);
  if (followedIds.length === 0) return [];

  const { data } = await supabase
    .from("entries")
    .select(
      "id, user_id, amount_cents, created_at, room:rooms!inner(id, prediction, participant_count, visibility), author:profiles(display_name, username)",
    )
    .in("user_id", followedIds)
    .eq("room.visibility", "public")
    .order("created_at", { ascending: false })
    .limit(ACTIVITY_LIMIT);
  if (!data) return [];

  type Row = {
    id: string;
    user_id: string;
    amount_cents: number;
    created_at: string;
    room: { id: string; prediction: string; participant_count: number } | null;
    author: { display_name: string; username: string } | null;
  };

  return (data as unknown as Row[])
    .filter((row) => row.room !== null)
    .map((row) => ({
      id: row.id,
      userId: row.user_id,
      userName: row.author?.display_name ?? "A rival",
      userUsername: row.author?.username ?? null,
      amountCents: row.amount_cents,
      roomId: row.room!.id,
      roomPrediction: row.room!.prediction,
      participantCount: row.room!.participant_count,
      createdAt: row.created_at,
    }));
}

// No real time-windowed "momentum" tracking exists yet (mock's
// momentumCount is a fabricated per-room hash) — participant_count is an
// honest, real proxy for "getting attention right now" without inventing a
// tracking system this pass.
export async function getRealHotRooms(): Promise<DisplayHotRoom[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from("rooms")
    .select("id, creator_id, prediction, participant_count, pool_total_cents, created_at")
    .eq("visibility", "public")
    .eq("status", "open")
    .gt("participant_count", 0)
    .order("participant_count", { ascending: false })
    .limit(HOT_ROOM_LIMIT);
  if (!data) return [];

  return data.map((row) => ({
    id: row.id,
    creatorId: row.creator_id,
    prediction: row.prediction,
    participantCount: row.participant_count,
    poolTotalCents: row.pool_total_cents,
    createdAt: row.created_at,
  }));
}
