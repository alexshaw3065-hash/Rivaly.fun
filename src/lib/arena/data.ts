// The Arena's reads and writes, from the browser (RLS and the database
// triggers are the guard — see the arena_v2 migration). Everything here is
// real; there is no sample data anywhere in the Arena.

import { createClient } from "@/lib/supabase/client";
import type { ChatAttachment } from "@/lib/supabase/message-mapper";
import { playerNames } from "@/lib/match-lineups";
import { displayName, toItems, type ArenaAuthor, type ArenaEmoji, type ArenaItem, type FeedRow, type PostItem, type Side } from "./model";

export type FeedScope = "global" | "following";

export async function fetchFeed(opts: {
  scope: FeedScope;
  matchId?: string | null;
  before?: { at: string; id: string } | null;
  limit?: number;
}): Promise<ArenaItem[]> {
  const { data, error } = await createClient().rpc("arena_feed", {
    p_scope: opts.scope,
    p_match: opts.matchId ?? null,
    p_before: opts.before?.at ?? null,
    p_before_id: opts.before?.id ?? null,
    p_limit: opts.limit ?? 20,
  });
  if (error) throw new Error(error.message);
  return toItems((data ?? []) as FeedRow[]);
}

export async function setReaction(target: { kind: "post" | "moment" | "entry"; id: string }, emoji: ArenaEmoji, on: boolean): Promise<boolean> {
  const table = createClient().from("arena_reactions");
  const { error } = on
    ? await table.insert({ target_kind: target.kind, target_id: target.id, emoji })
    : await table.delete().eq("target_kind", target.kind).eq("target_id", target.id).eq("emoji", emoji);
  return !error || error.code === "23505";
}

export interface NewPost {
  id: string;
  body: string;
  attachment: ChatAttachment | null;
  matchId: string | null;
  roomId: string | null;
  side: Side | null;
  momentId: string | null;
  parentId: string | null;
}

const REFUSALS: Record<string, string> = {
  post_rate_limit: "Easy — that's a lot of posts in a minute. Give it a moment.",
  photo_rate_limit: "That's 5 photos in a minute — wait a moment.",
  call_needs_stake: "You can only make a call on a room you've backed, on the side you backed.",
  call_room_not_public: "Calls only work on public rooms.",
  reply_depth: "Replies go one level deep.",
};

/** Saves a post; returns an error message people can read, or null. */
export async function savePost(authorId: string, p: NewPost): Promise<string | null> {
  const { error } = await createClient().from("posts").insert({
    id: p.id,
    author_id: authorId,
    body: p.body,
    attachment: p.attachment,
    match_id: p.matchId,
    room_id: p.roomId,
    side: p.side,
    moment_id: p.momentId,
    parent_id: p.parentId,
  });
  if (!error) return null;
  const key = Object.keys(REFUSALS).find((k) => error.message.includes(k));
  return key ? REFUSALS[key] : "Couldn't post — try again.";
}

export async function deletePost(id: string): Promise<boolean> {
  const { error } = await createClient().from("posts").delete().eq("id", id);
  return !error;
}

export interface Reply {
  id: string;
  author: ArenaAuthor;
  body: string;
  attachment: ChatAttachment | null;
  at: string;
}

type AuthorRow = { id: string; username: string | null; display_name: string; avatar_url: string | null } | null;
const author = (a: AuthorRow, id: string): ArenaAuthor => ({ id, username: a?.username ?? null, name: displayName(a?.display_name, a?.username), avatar: a?.avatar_url ?? null });

export async function fetchReplies(postId: string): Promise<Reply[]> {
  const { data } = await createClient()
    .from("posts")
    .select("id, body, attachment, created_at, author_id, author:profiles!posts_author_id_fkey(id, username, display_name, avatar_url)")
    .eq("parent_id", postId)
    .order("created_at", { ascending: true })
    .limit(100);
  type Row = { id: string; body: string; attachment: ChatAttachment | null; created_at: string; author_id: string; author: AuthorRow };
  return ((data ?? []) as unknown as Row[]).map((r) => ({ id: r.id, body: r.body, attachment: r.attachment, at: r.created_at, author: author(r.author, r.author_id) }));
}

/** One post as a feed item (for its own page), found by paging the feed isn't needed — read it directly. */
export async function fetchPost(id: string, viewerId: string | null): Promise<PostItem | null> {
  const supabase = createClient();
  const { data } = await supabase
    .from("posts")
    .select(
      "id, body, attachment, side, moment_id, reply_count, created_at, author_id, parent_id, match_id, room_id, author:profiles!posts_author_id_fkey(id, username, display_name, avatar_url)",
    )
    .eq("id", id)
    .maybeSingle();
  if (!data) return null;
  const r = data as unknown as {
    id: string; body: string; attachment: ChatAttachment | null; side: Side | null; moment_id: string | null; reply_count: number;
    created_at: string; author_id: string; parent_id: string | null; match_id: string | null; room_id: string | null; author: AuthorRow;
  };
  const [match, room, reactions] = await Promise.all([
    r.match_id ? supabase.from("matches").select("id, home_team, away_team, competition, sport_id, status, home_score, away_score, kickoff_at").eq("id", r.match_id).maybeSingle() : null,
    r.room_id ? supabase.from("rooms").select("id, prediction, status, pool_total_cents, yes_total_cents, no_total_cents, participant_count, resolved_outcome, match_id, settled_at").eq("id", r.room_id).maybeSingle() : null,
    supabase.from("arena_reactions").select("emoji, user_id").eq("target_kind", "post").eq("target_id", r.id),
  ]);
  const m = match?.data as Record<string, unknown> | null | undefined;
  const rm = room?.data as Record<string, unknown> | null | undefined;
  const counts: Record<string, number> = {};
  const mine: ArenaEmoji[] = [];
  for (const x of (reactions.data ?? []) as { emoji: ArenaEmoji; user_id: string }[]) {
    counts[x.emoji] = (counts[x.emoji] ?? 0) + 1;
    if (x.user_id === viewerId) mine.push(x.emoji);
  }
  return {
    kind: "post",
    id: r.id,
    at: r.created_at,
    author: author(r.author, r.author_id),
    body: r.body,
    attachment: r.attachment,
    side: r.side,
    momentId: r.moment_id,
    replies: r.reply_count,
    reactions: counts,
    mine,
    match: m
      ? { id: m.id as string, home: m.home_team as string, away: m.away_team as string, competition: m.competition as string, sportId: (m.sport_id as number) ?? null, status: m.status as string, homeScore: (m.home_score as number) ?? null, awayScore: (m.away_score as number) ?? null, kickoffAt: m.kickoff_at as string }
      : null,
    room: rm
      ? { id: rm.id as string, prediction: rm.prediction as string, status: rm.status as string, pool: Number(rm.pool_total_cents), yes: Number(rm.yes_total_cents), no: Number(rm.no_total_cents), participants: rm.participant_count as number, outcome: (rm.resolved_outcome as string) ?? null, matchId: (rm.match_id as string) ?? null, settledAt: (rm.settled_at as string) ?? null }
      : null,
  };
}

export async function fetchPostsByAuthor(authorId: string, replies: boolean): Promise<(Reply & { parentBody: string | null; parentId: string | null })[]> {
  let q = createClient()
    .from("posts")
    .select("id, body, attachment, created_at, author_id, parent_id, parent:posts!posts_parent_id_fkey(body), author:profiles!posts_author_id_fkey(id, username, display_name, avatar_url)")
    .eq("author_id", authorId)
    .order("created_at", { ascending: false })
    .limit(50);
  q = replies ? q.not("parent_id", "is", null) : q.is("parent_id", null);
  const { data } = await q;
  type Row = { id: string; body: string; attachment: ChatAttachment | null; created_at: string; author_id: string; parent_id: string | null; parent: { body: string } | null; author: AuthorRow };
  return ((data ?? []) as unknown as Row[]).map((r) => ({
    id: r.id, body: r.body, attachment: r.attachment, at: r.created_at, author: author(r.author, r.author_id), parentId: r.parent_id, parentBody: r.parent?.body ?? null,
  }));
}

export async function getFollowedUserIds(viewerId: string): Promise<string[]> {
  const { data } = await createClient().from("follows").select("following_id").eq("follower_id", viewerId);
  return (data ?? []).map((row) => row.following_id as string);
}

/** Rooms you've backed that are still open and public — the ones you can make a call on. */
export async function fetchCallableRooms(userId: string): Promise<{ id: string; prediction: string; side: Side; matchId: string | null }[]> {
  const { data } = await createClient()
    .from("entries")
    .select("side, room:rooms!inner(id, prediction, status, visibility, match_id)")
    .eq("user_id", userId)
    .eq("room.visibility", "public")
    .in("room.status", ["open", "live"])
    .order("created_at", { ascending: false })
    .limit(20);
  type Row = { side: Side; room: { id: string; prediction: string; match_id: string | null } | null };
  const seen = new Set<string>();
  return ((data ?? []) as unknown as Row[])
    .filter((r) => r.room && !seen.has(r.room.id) && seen.add(r.room.id))
    .map((r) => ({ id: r.room!.id, prediction: r.room!.prediction, side: r.side, matchId: r.room!.match_id }));
}

/** Scorer names for moment cards, from each match's line-ups. */
const namesCache = new Map<string, Record<number, string>>();
export async function fetchPlayerNames(matchIds: string[]): Promise<Record<string, Record<number, string>>> {
  const missing = [...new Set(matchIds)].filter((id) => !namesCache.has(id));
  if (missing.length > 0) {
    const { data } = await createClient()
      .from("match_events")
      .select("match_id, action, minute, payload")
      .eq("action", "lineups")
      .in("match_id", missing);
    const byMatch = new Map<string, { action: string; minute: number | null; payload: Record<string, unknown> | null }[]>();
    for (const r of (data ?? []) as { match_id: string; action: string; minute: number | null; payload: Record<string, unknown> | null }[]) {
      byMatch.set(r.match_id, [...(byMatch.get(r.match_id) ?? []), r]);
    }
    for (const id of missing) namesCache.set(id, playerNames(byMatch.get(id) ?? []));
  }
  return Object.fromEntries(matchIds.map((id) => [id, namesCache.get(id) ?? {}]));
}

// ── Leaderboard + leagues ──────────────────────────────────────────────

export type LeaderMetric = "profit" | "gameweek" | "accuracy" | "streak";

export interface LeaderRow {
  userId: string;
  username: string | null;
  name: string;
  avatar: string | null;
  value: number;
  played: number;
}

export async function fetchLeaderboard(metric: LeaderMetric, scope: FeedScope): Promise<LeaderRow[]> {
  const { data, error } = await createClient().rpc("arena_leaderboard", { p_metric: metric, p_scope: scope });
  if (error) throw new Error(error.message);
  type Row = { user_id: string; username: string | null; display_name: string; avatar_url: string | null; value: number | string; played: number };
  return ((data ?? []) as Row[]).map((r) => ({ userId: r.user_id, username: r.username, name: displayName(r.display_name, r.username), avatar: r.avatar_url, value: Number(r.value), played: r.played }));
}

export interface League {
  id: string;
  name: string;
  code: string;
  members: number;
}

export interface TableRow {
  userId: string;
  username: string | null;
  name: string;
  avatar: string | null;
  points: number;
  gameweekPoints: number;
  wins: number;
  played: number;
}

export async function fetchMyLeagues(): Promise<League[]> {
  const { data } = await createClient().from("leagues").select("id, name, code, league_members(count)").order("created_at", { ascending: true });
  type Row = { id: string; name: string; code: string; league_members: { count: number }[] };
  return ((data ?? []) as unknown as Row[]).map((r) => ({ id: r.id, name: r.name, code: r.code, members: r.league_members?.[0]?.count ?? 0 }));
}

export async function fetchLeagueTable(leagueId: string | null): Promise<TableRow[]> {
  const { data, error } = await createClient().rpc("league_table", { p_league: leagueId });
  if (error) throw new Error(error.message);
  type Row = { user_id: string; username: string | null; display_name: string; avatar_url: string | null; points: number; gameweek_points: number; wins: number; played: number };
  return ((data ?? []) as Row[]).map((r) => ({ userId: r.user_id, username: r.username, name: displayName(r.display_name, r.username), avatar: r.avatar_url, points: r.points, gameweekPoints: r.gameweek_points, wins: r.wins, played: r.played }));
}

const LEAGUE_ERRORS: Record<string, string> = {
  league_not_found: "No league with that code — check it and try again.",
  league_full: "That league is full.",
  league_limit: "You're in 20 leagues already — leave one first.",
  not_signed_in: "Sign in first.",
};
const leagueError = (msg: string) => LEAGUE_ERRORS[Object.keys(LEAGUE_ERRORS).find((k) => msg.includes(k)) ?? ""] ?? "Something went wrong — try again.";

export async function createLeague(name: string): Promise<{ league?: { id: string; name: string; code: string }; error?: string }> {
  const { data, error } = await createClient().rpc("create_league", { p_name: name });
  if (error) return { error: error.message.includes("check") ? "Give it a name of 2 to 40 characters." : leagueError(error.message) };
  return { league: (data as { id: string; name: string; code: string }[])[0] };
}

export async function joinLeague(code: string): Promise<{ league?: { id: string; name: string; code: string }; error?: string }> {
  const { data, error } = await createClient().rpc("join_league", { p_code: code });
  if (error) return { error: leagueError(error.message) };
  return { league: (data as { id: string; name: string; code: string }[])[0] };
}

export async function leaveLeague(leagueId: string, userId: string): Promise<boolean> {
  const { error } = await createClient().from("league_members").delete().eq("league_id", leagueId).eq("user_id", userId);
  return !error;
}
