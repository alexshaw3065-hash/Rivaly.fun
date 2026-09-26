// The Arena feed's shapes and the pure rules around them — no Supabase, no
// React — so they're unit-tested (model.test.ts) and shared by every card.
// Rows come from the arena_feed() database function
// (supabase/migrations/20260926090000_arena_v2.sql).

import type { ChatAttachment } from "../supabase/message-mapper.ts";
import type { MarketSideDefinition } from "../types.ts";
import { resolveMarket, type MatchFacts, type Outcome } from "../settlement/resolve.ts";

export const ARENA_EMOJI = ["🔥", "😂", "🎯", "🤡", "🧢"] as const;
export type ArenaEmoji = (typeof ARENA_EMOJI)[number];
export type Reactions = Partial<Record<ArenaEmoji, number>>;
export type Side = "yes" | "no";

export interface ArenaAuthor {
  id: string;
  username: string | null;
  name: string;
  avatar: string | null;
}

export interface ArenaMatch {
  id: string;
  home: string;
  away: string;
  competition: string;
  sportId: number | null;
  status: string;
  homeScore: number | null;
  awayScore: number | null;
  kickoffAt: string;
}

export interface ArenaRoom {
  id: string;
  prediction: string;
  status: string;
  pool: number;
  yes: number;
  no: number;
  participants: number;
  outcome: string | null;
  matchId: string | null;
  settledAt: string | null;
}

export interface MomentPayload {
  home?: number;
  away?: number;
  side?: "home" | "away";
  outcome?: string;
  playerId?: number;
  type?: string;
  /** The score just before this moment (scoring moments only). */
  prevHome?: number;
  prevAway?: number;
}

interface Base {
  id: string;
  at: string;
  reactions: Reactions;
  mine: ArenaEmoji[];
}

export interface PostItem extends Base {
  kind: "post";
  author: ArenaAuthor;
  body: string;
  attachment: ChatAttachment | null;
  side: Side | null;
  match: ArenaMatch | null;
  room: ArenaRoom | null;
  momentId: string | null;
  replies: number;
}

export interface ReceiptItem extends Base {
  kind: "receipt";
  author: ArenaAuthor;
  body: string;
  attachment: ChatAttachment | null;
  side: Side;
  calledAt: string;
  match: ArenaMatch | null;
  room: ArenaRoom;
  won: boolean;
  rematchMatchId: string | null;
}

export interface EntryItem extends Base {
  kind: "entry";
  author: ArenaAuthor;
  side: Side;
  amount: number;
  room: ArenaRoom;
  match: ArenaMatch | null;
}

export interface SettledItem extends Base {
  kind: "settled";
  room: ArenaRoom;
  match: ArenaMatch | null;
  winners: { author: ArenaAuthor; payout: number | null; stake: number }[];
}

export interface HotItem extends Base {
  kind: "hot";
  room: ArenaRoom;
  match: ArenaMatch | null;
  recent: number;
}

export interface MomentItem extends Base {
  kind: "moment";
  action: string;
  minute: number | null;
  payload: MomentPayload;
  match: ArenaMatch;
  rooms: number;
  takes: number;
}

export type ArenaItem = PostItem | ReceiptItem | EntryItem | SettledItem | HotItem | MomentItem;
export type ArenaKind = ArenaItem["kind"];

export interface FeedRow {
  kind: string;
  id: string;
  at: string;
  data: Record<string, unknown> | null;
}

const UUIDISH = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Some early accounts carry an id as their display name — show their handle instead. */
export function displayName(name: string | null | undefined, username: string | null | undefined): string {
  if (name && !UUIDISH.test(name)) return name;
  return username ? `@${username}` : "A rival";
}

const cleanAuthor = (a: unknown): ArenaAuthor | unknown => {
  if (!a || typeof a !== "object") return a;
  const x = a as ArenaAuthor;
  return { ...x, name: displayName(x.name, x.username) };
};

const KINDS = new Set<ArenaKind>(["post", "receipt", "entry", "settled", "hot", "moment"]);

/** Database rows → typed items. Unknown kinds (a newer server) are skipped, never crash the feed. */
export function toItems(rows: FeedRow[]): ArenaItem[] {
  const out: ArenaItem[] = [];
  for (const r of rows) {
    if (!KINDS.has(r.kind as ArenaKind) || !r.data) continue;
    const d = r.data;
    const mine = Array.isArray(d.mine) ? (d.mine as string[]).filter(isEmoji) : [];
    const reactions = (d.reactions && typeof d.reactions === "object" ? d.reactions : {}) as Reactions;
    const winners = Array.isArray(d.winners) ? (d.winners as { author: unknown }[]).map((w) => ({ ...w, author: cleanAuthor(w.author) })) : undefined;
    out.push({ ...(d as object), ...(d.author ? { author: cleanAuthor(d.author) } : {}), ...(winners ? { winners } : {}), kind: r.kind, id: r.id, at: r.at, reactions, mine } as ArenaItem);
  }
  return out;
}

export const isEmoji = (e: string): e is ArenaEmoji => (ARENA_EMOJI as readonly string[]).includes(e);

/** The target a reaction is stored against, per card kind. */
export function reactionTarget(item: ArenaItem): { kind: "post" | "moment" | "entry"; id: string } | null {
  switch (item.kind) {
    case "post":
    case "receipt":
      return { kind: "post", id: item.id };
    case "moment":
      return { kind: "moment", id: item.id };
    case "entry":
      return { kind: "entry", id: item.id };
    default:
      return null;
  }
}

/** Toggle one of your reactions, shown at once (and rolled back by calling it again). */
export function toggleReaction<T extends { reactions: Reactions; mine: ArenaEmoji[] }>(item: T, emoji: ArenaEmoji): T {
  const had = item.mine.includes(emoji);
  const count = (item.reactions[emoji] ?? 0) + (had ? -1 : 1);
  const reactions = { ...item.reactions };
  if (count > 0) reactions[emoji] = count;
  else delete reactions[emoji];
  return { ...item, reactions, mine: had ? item.mine.filter((e) => e !== emoji) : [...item.mine, emoji] };
}

/** Paging cursor: the last item's (at, id). */
export function cursorOf(items: ArenaItem[]): { at: string; id: string } | null {
  const last = items[items.length - 1];
  return last ? { at: last.at, id: last.id } : null;
}

const keyOf = (i: ArenaItem) => `${i.kind}:${i.id}`;

/** Fresh items from the top of the feed that aren't on screen yet (a post and its receipt are different items). */
export function newerThan(current: ArenaItem[], fresh: ArenaItem[]): ArenaItem[] {
  const seen = new Set(current.map(keyOf));
  return fresh.filter((i) => !seen.has(keyOf(i)));
}

/** Append a page, dropping anything already shown (a new item can shift the page boundary). */
export function appendPage(current: ArenaItem[], page: ArenaItem[]): ArenaItem[] {
  return [...current, ...newerThan(current, page)];
}

/** "3 new · 1 goal" — what the new-items pill says. */
export function newItemsLabel(items: ArenaItem[]): string {
  const goals = items.filter((i) => i.kind === "moment" && (i.action === "goal" || i.action === "touchdown")).length;
  const n = items.length;
  const base = `${n} new`;
  if (goals === 0) return base;
  const word = items.some((i) => i.kind === "moment" && i.action === "touchdown") && goals === 1 ? "touchdown" : goals === 1 ? "goal" : "goals";
  return `${base} · ${goals} ${word}`;
}

export const isNfl = (m: { sportId: number | null } | null | undefined) => m?.sportId === 6;

export type MomentTone = "goal" | "card" | "var" | "whistle";

/** What a big moment says, for both sports. Player names come from the line-ups when known. */
export function momentHeadline(item: Pick<MomentItem, "action" | "payload" | "match">, names?: Record<number, string>): { title: string; tone: MomentTone; detail: string | null } {
  const p = item.payload;
  const player = p.playerId !== undefined ? names?.[p.playerId] : undefined;
  const team = p.side === "home" ? item.match.home : p.side === "away" ? item.match.away : null;
  const who = [player, team].filter(Boolean).join(" · ") || null;
  switch (item.action) {
    case "goal":
      return { title: p.type === "Own" || p.type === "OwnGoal" ? "Own goal" : p.type === "Penalty" ? "Penalty scored" : "Goal", tone: "goal", detail: who };
    case "penalty":
      return { title: "Penalty", tone: "var", detail: team };
    case "red_card":
      return { title: p.type === "SecondYellow" ? "Second yellow — off" : "Red card", tone: "card", detail: who };
    case "var_end":
      return { title: p.outcome === "Overturned" ? "VAR — overturned" : "VAR — decision stands", tone: "var", detail: null };
    case "game_finalised":
      return { title: "Full time", tone: "whistle", detail: null };
    case "touchdown":
      return { title: "Touchdown", tone: "goal", detail: [player, team, p.type ? `${p.type}` : null].filter(Boolean).join(" · ") || null };
    case "field_goal":
      return { title: "Field goal", tone: "goal", detail: who };
    default:
      return { title: item.action.replace(/_/g, " "), tone: "whistle", detail: null };
  }
}

/** Who took the side you'd take against them, and which side "fading" means. */
export const opposite = (s: Side): Side => (s === "yes" ? "no" : "yes");

/** Share of the pool on one side, 0–1 (0.5 when empty, so bars sit even). */
export function sideShare(room: Pick<ArenaRoom, "yes" | "no">, side: Side): number {
  const total = room.yes + room.no;
  if (total <= 0) return 0.5;
  return (side === "yes" ? room.yes : room.no) / total;
}

/** "2m", "3h", "4d", then a date. */
export function ago(iso: string, now = Date.now()): string {
  const s = Math.max(0, Math.round((now - new Date(iso).getTime()) / 1000));
  if (s < 60) return "now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d`;
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

const FIRST_HALF_STATS = new Set<string>(["halftime_result", "halftime_correct_score", "halftime_total_goals", "first_half_points"]);

/** A public room on a match, with the market rules that settle it. */
export interface MatchRoom {
  id: string;
  prediction: string;
  status: string;
  outcome: string | null;
  pool: number;
  participants: number;
  def: MarketSideDefinition | null;
}

/**
 * Which open rooms this moment just decided — asked of the same rules that
 * settle rooms (resolveMarket), comparing the match just before and just
 * after. A football goal is always one goal, so the score before is the score
 * after minus one; NFL points vary, so it uses the previous scoring moment.
 */
export function decidedBy(moment: Pick<MomentItem, "action" | "payload" | "at" | "minute">, rooms: MatchRoom[]): { room: MatchRoom; outcome: Outcome }[] {
  const p = moment.payload;
  if (p.home === undefined || p.away === undefined) return [];
  let beforeHome = p.prevHome;
  let beforeAway = p.prevAway;
  if (moment.action === "goal") {
    beforeHome = p.home - (p.side === "home" ? 1 : 0);
    beforeAway = p.away - (p.side === "away" ? 1 : 0);
  }
  const at = Date.parse(moment.at);
  const facts = (home: number, away: number, finished: boolean): MatchFacts => ({ status: finished ? "finished" : "live", homeScore: home, awayScore: away, homeScoreHt: null, awayScoreHt: null });
  const finalWhistle = moment.action === "game_finalised";
  const out: { room: MatchRoom; outcome: Outcome }[] = [];
  // First-half markets read the live score as the half-time score, so only
  // trust them for moments we know happened in the first half.
  const firstHalf = typeof moment.minute === "number" && moment.minute <= 45;
  for (const room of rooms) {
    if (!room.def || room.status === "cancelled") continue;
    if (FIRST_HALF_STATS.has(room.def.stat) && !firstHalf) continue;
    const after = resolveMarket(room.def, facts(p.home, p.away, finalWhistle), [{ action: moment.action, at }]);
    if (after.kind !== "locked" && after.kind !== "final") continue;
    if (!finalWhistle) {
      if (beforeHome === undefined || beforeAway === undefined) continue;
      const before = resolveMarket(room.def, facts(beforeHome, beforeAway, false), []);
      if (before.kind !== "open") continue;
    }
    out.push({ room, outcome: after.outcome });
  }
  return out;
}
