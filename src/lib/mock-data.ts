/**
 * Realistic placeholder content for V1 screens, shaped exactly like the
 * Supabase rows defined in src/lib/types.ts. Swap for real queries once
 * a Supabase project is linked — every screen should already work with
 * this data with zero prop-shape changes.
 */
import type {
  Match,
  Profile,
  Follow,
  Post,
  PostReply,
  ArenaFeedItem,
  PredictionLeague,
} from "./types";

// The self-profile stand-in until auth exists. Kept next to `wallet` since
// wallet.userId already encodes this — exported explicitly so the Rooms
// tab (My Rooms, Following) doesn't have to guess or re-derive it.
export const SELF_USER_ID = "u3";

export const matches: Match[] = [
  { id: "m1", competition: "Premier League", homeTeam: "Arsenal", awayTeam: "Chelsea", kickoffAt: "2026-08-15T19:30:00Z", status: "live", homeScore: 2, awayScore: 1 },
  { id: "m2", competition: "Premier League", homeTeam: "Man City", awayTeam: "Liverpool", kickoffAt: "2026-08-15T21:00:00Z", status: "scheduled", homeScore: null, awayScore: null },
  { id: "m3", competition: "La Liga", homeTeam: "Real Madrid", awayTeam: "Barcelona", kickoffAt: "2026-08-16T19:00:00Z", status: "scheduled", homeScore: null, awayScore: null },
  { id: "m4", competition: "NPFL", homeTeam: "Enyimba", awayTeam: "Rivers United", kickoffAt: "2026-08-15T17:00:00Z", status: "finished", homeScore: 3, awayScore: 1 },
  { id: "m5", competition: "Bundesliga", homeTeam: "Bayern Munich", awayTeam: "Dortmund", kickoffAt: "2026-08-15T19:45:00Z", status: "live", homeScore: 1, awayScore: 1 },
  { id: "m6", competition: "Ligue 1", homeTeam: "PSG", awayTeam: "Marseille", kickoffAt: "2026-08-16T20:00:00Z", status: "scheduled", homeScore: null, awayScore: null },
  { id: "m7", competition: "Premier League", homeTeam: "Man United", awayTeam: "Tottenham", kickoffAt: "2026-08-15T19:00:00Z", status: "live", homeScore: 0, awayScore: 0 },
  { id: "m8", competition: "Serie A", homeTeam: "Napoli", awayTeam: "Juventus", kickoffAt: "2026-08-16T18:45:00Z", status: "scheduled", homeScore: null, awayScore: null },
  { id: "m9", competition: "NPFL", homeTeam: "Kano Pillars", awayTeam: "Enyimba", kickoffAt: "2026-08-17T16:00:00Z", status: "scheduled", homeScore: null, awayScore: null },
  { id: "m10", competition: "Champions League", homeTeam: "Real Madrid", awayTeam: "Man City", kickoffAt: "2026-08-19T19:00:00Z", status: "scheduled", homeScore: null, awayScore: null },
  { id: "m11", competition: "Premier League", homeTeam: "Chelsea", awayTeam: "Liverpool", kickoffAt: "2026-08-22T16:30:00Z", status: "scheduled", homeScore: null, awayScore: null },
  { id: "m12", competition: "NPFL", homeTeam: "Sporting Lagos", awayTeam: "Rivers United", kickoffAt: "2026-08-15T18:00:00Z", status: "live", homeScore: 2, awayScore: 2 },
];

// Seeded roster never went through Dynamic — dynamicWalletAddress is always
// null here, injected once below rather than repeated on every literal.
const seedProfiles: Omit<Profile, "dynamicWalletAddress">[] = [
  { id: "u1", username: "danielk", displayName: "Daniel", avatarUrl: null, bio: "Arsenal 'til I die. Wrong sometimes, loud always.", socialLinks: [], followerCount: 842, followingCount: 210, roomsCreated: 34, predictionAccuracy: 0.72, totalWinningsCents: 84_000, createdAt: "2025-11-02T00:00:00Z" },
  { id: "u2", username: "alexr", displayName: "Alex", avatarUrl: null, bio: null, socialLinks: [], followerCount: 156, followingCount: 98, roomsCreated: 12, predictionAccuracy: 0.58, totalWinningsCents: 12_400, createdAt: "2026-01-14T00:00:00Z" },
  { id: "u3", username: "victorj", displayName: "Victor", avatarUrl: null, bio: "Building Rivaly. Predicting on Rivaly.", socialLinks: [], followerCount: 2_310, followingCount: 45, roomsCreated: 61, predictionAccuracy: 0.66, totalWinningsCents: 250_000, createdAt: "2025-09-01T00:00:00Z" },
  { id: "u4", username: "jamesb", displayName: "James", avatarUrl: null, bio: "Spurs. Pain is a lifestyle.", socialLinks: [], followerCount: 310, followingCount: 140, roomsCreated: 18, predictionAccuracy: 0.61, totalWinningsCents: 31_200, createdAt: "2026-02-20T00:00:00Z" },
  { id: "u5", username: "sarahk", displayName: "Sarah", avatarUrl: null, bio: "Called Bayern in 12 straight rooms.", socialLinks: [], followerCount: 4_120, followingCount: 60, roomsCreated: 89, predictionAccuracy: 0.79, totalWinningsCents: 612_000, createdAt: "2025-08-10T00:00:00Z" },
  { id: "u6", username: "tunde", displayName: "Tunde", avatarUrl: null, bio: "Down bad on NPFL upsets.", socialLinks: [], followerCount: 92, followingCount: 210, roomsCreated: 7, predictionAccuracy: 0.34, totalWinningsCents: 2_100, createdAt: "2026-05-01T00:00:00Z" },
  { id: "u7", username: "chioma", displayName: "Chioma", avatarUrl: null, bio: "Enyimba or nothing.", socialLinks: [], followerCount: 675, followingCount: 88, roomsCreated: 22, predictionAccuracy: 0.68, totalWinningsCents: 58_900, createdAt: "2025-12-11T00:00:00Z" },
  { id: "u8", username: "marcus", displayName: "Marcus", avatarUrl: null, bio: null, socialLinks: [], followerCount: 41, followingCount: 30, roomsCreated: 3, predictionAccuracy: 0.5, totalWinningsCents: 4_000, createdAt: "2026-08-01T00:00:00Z" },
  { id: "u9", username: "ada", displayName: "Ada", avatarUrl: null, bio: "Room creator. Champions League specialist.", socialLinks: [], followerCount: 1_890, followingCount: 52, roomsCreated: 47, predictionAccuracy: 0.7, totalWinningsCents: 198_500, createdAt: "2025-10-05T00:00:00Z" },
  { id: "u10", username: "marissa", displayName: "Marissa", avatarUrl: null, bio: "Chelsea die-hard. Bridge or nowhere.", socialLinks: [], followerCount: 320, followingCount: 140, roomsCreated: 9, predictionAccuracy: 0.55, totalWinningsCents: 8_200, createdAt: "2026-03-10T00:00:00Z" },
  { id: "u11", username: "kelechi", displayName: "Kelechi", avatarUrl: null, bio: "NPFL nerd. I watch the games nobody else does.", socialLinks: [], followerCount: 512, followingCount: 75, roomsCreated: 28, predictionAccuracy: 0.64, totalWinningsCents: 41_000, createdAt: "2025-12-28T00:00:00Z" },
  { id: "u12", username: "priya", displayName: "Priya", avatarUrl: null, bio: "Man City or nothing. Treble szn forever.", socialLinks: [], followerCount: 980, followingCount: 210, roomsCreated: 15, predictionAccuracy: 0.61, totalWinningsCents: 22_500, createdAt: "2026-01-05T00:00:00Z" },
  { id: "u13", username: "femi", displayName: "Femi", avatarUrl: null, bio: null, socialLinks: [], followerCount: 64, followingCount: 40, roomsCreated: 2, predictionAccuracy: 0.48, totalWinningsCents: 900, createdAt: "2026-07-20T00:00:00Z" },
  { id: "u14", username: "grace", displayName: "Grace", avatarUrl: null, bio: "Arsenal since Wenger. Patient to a fault.", socialLinks: [], followerCount: 1_240, followingCount: 88, roomsCreated: 33, predictionAccuracy: 0.7, totalWinningsCents: 76_300, createdAt: "2025-10-30T00:00:00Z" },
  { id: "u15", username: "obinna", displayName: "Obinna", avatarUrl: null, bio: "Rivers United ultras.", socialLinks: [], followerCount: 205, followingCount: 120, roomsCreated: 11, predictionAccuracy: 0.52, totalWinningsCents: 6_400, createdAt: "2026-04-12T00:00:00Z" },
  { id: "u16", username: "hassan", displayName: "Hassan", avatarUrl: null, bio: null, socialLinks: [], followerCount: 88, followingCount: 55, roomsCreated: 4, predictionAccuracy: 0.45, totalWinningsCents: 1_800, createdAt: "2026-06-18T00:00:00Z" },
  { id: "u17", username: "zainab", displayName: "Zainab", avatarUrl: null, bio: "Called the Bundesliga table in March. Screenshot saved.", socialLinks: [], followerCount: 3_050, followingCount: 95, roomsCreated: 58, predictionAccuracy: 0.74, totalWinningsCents: 310_000, createdAt: "2025-09-22T00:00:00Z" },
  { id: "u18", username: "kwame", displayName: "Kwame", avatarUrl: null, bio: "Serie A tactics nerd.", socialLinks: [], followerCount: 430, followingCount: 66, roomsCreated: 19, predictionAccuracy: 0.59, totalWinningsCents: 27_800, createdAt: "2026-02-08T00:00:00Z" },
  { id: "u19", username: "ify", displayName: "Ify", avatarUrl: null, bio: "Enyimba till I die. Doubted, then vindicated.", socialLinks: [], followerCount: 715, followingCount: 102, roomsCreated: 24, predictionAccuracy: 0.67, totalWinningsCents: 63_500, createdAt: "2025-11-19T00:00:00Z" },
];

export const profiles: Profile[] = seedProfiles.map((p) => ({ ...p, dynamicWalletAddress: null }));

export function matchById(id: string): Match | undefined {
  return matches.find((m) => m.id === id);
}

// Real time. (This used to read "now" from the old sample matches' kickoff
// times, which put every real countdown weeks off — a match that had already
// kicked off showed "39d 5h".)
function matchesNowMs(): number {
  return Date.now();
}

// Shared by both label variants below so the date math (and the "what
// counts as now" reasoning above) lives in exactly one place.
function kickoffCountdownParts(match: Match): { days: number; hours: number; minutes: number } | null {
  if (match.status !== "scheduled") return null;
  const diffMs = +new Date(match.kickoffAt) - matchesNowMs();
  if (diffMs <= 0) return null;
  const totalMinutes = Math.round(diffMs / 60000);
  return {
    days: Math.floor(totalMinutes / 1440),
    hours: Math.floor((totalMinutes % 1440) / 60),
    minutes: totalMinutes % 60,
  };
}

export function kickoffCountdownLabel(match: Match): string | null {
  const p = kickoffCountdownParts(match);
  if (!p) return null;
  if (p.days > 0) return `Kicks off in ${p.days}d ${p.hours}h`;
  if (p.hours > 0) return `Kicks off in ${p.hours}h ${p.minutes}m`;
  return `Kicks off in ${p.minutes}m`;
}

// Bare form ("6d 12h", no "Kicks off in") for space-constrained spots like
// RoomCard's top row, which already carries the competition label and
// match code on the same line.
export function kickoffCountdownCompact(match: Match): string | null {
  const p = kickoffCountdownParts(match);
  if (!p) return null;
  if (p.days > 0) return `${p.days}d ${p.hours}h`;
  if (p.hours > 0) return `${p.hours}h ${p.minutes}m`;
  return `${p.minutes}m`;
}

export function profileById(id: string): Profile | undefined {
  return profiles.find((p) => p.id === id);
}

export function profileByUsername(username: string): Profile | undefined {
  return profiles.find((p) => p.username === username);
}

// Who you follow (self only, for now — see SELF_USER_ID). Powers Rooms >
// Following (rooms created/joined by people you follow) and Arena's Feed >
// Following toggle (arenaItemSubjectId below) — two different lenses on the
// same graph, per the founder's own reasoning for keeping "Following"
// scoped multiple ways rather than one shared page.
export const follows: Follow[] = [
  { followerId: SELF_USER_ID, followingId: "u1", createdAt: "2025-11-10T00:00:00Z" },
  { followerId: SELF_USER_ID, followingId: "u5", createdAt: "2025-09-20T00:00:00Z" },
  { followerId: SELF_USER_ID, followingId: "u9", createdAt: "2025-10-15T00:00:00Z" },
  { followerId: SELF_USER_ID, followingId: "u7", createdAt: "2026-01-05T00:00:00Z" },
];

export function followedProfileIds(): string[] {
  return follows.filter((f) => f.followerId === SELF_USER_ID).map((f) => f.followingId);
}

// Real, derived "trending" search terms for the compact search dropdown
// (see search-rollup.tsx) — team names from matches with real action
// happening right now (status "live"), not an invented popularity
// ranking. Deterministic order (by match array order), so it doesn't
// reshuffle on every render.
export function trendingSearchTerms(count: number): string[] {
  const terms: string[] = [];
  for (const m of matches) {
    if (m.status !== "live") continue;
    if (!terms.includes(m.homeTeam)) terms.push(m.homeTeam);
    if (!terms.includes(m.awayTeam)) terms.push(m.awayTeam);
  }
  return terms.slice(0, count);
}

// Rivaly settles in USDC — every amount in the app is US cents, shown as
// dollars. Whole-dollar amounts drop the ".00" (a $25 stake reads as $25),
// anything with cents keeps both decimals ($14.67, never $14.7).
export function formatMoney(cents: number): string {
  const dollars = cents / 100;
  const whole = Number.isInteger(dollars);
  return `$${dollars.toLocaleString("en-US", { minimumFractionDigits: whole ? 0 : 2, maximumFractionDigits: 2 })}`;
}

// Compact form for cards and tight spaces — $450 -> $450, $12,500 ->
// $12.5K, $1,250,000 -> $1.3M, $2,400,000,000 -> $2.4B. Under $1K it's the
// exact amount (cents kept), so small pools never round away.
export function formatMoneyCompact(cents: number): string {
  const dollars = cents / 100;
  const short = (n: number, unit: string) => `$${n.toFixed(n >= 100 ? 0 : 1).replace(/\.0$/, "")}${unit}`;
  if (dollars >= 1_000_000_000) return short(dollars / 1_000_000_000, "B");
  if (dollars >= 1_000_000) return short(dollars / 1_000_000, "M");
  if (dollars >= 1_000) return short(dollars / 1_000, "K");
  return formatMoney(cents);
}

export function formatSignedMoney(cents: number): string {
  const sign = cents >= 0 ? "+" : "−";
  return `${sign}${formatMoney(Math.abs(cents))}`;
}

// Net profit/loss for the "For Rivals" strip on Home. Deliberately separate
// from Profile.totalWinningsCents (a cumulative, always-positive stat used
// on the Profile screen) — P/L can go negative, which is the point: it's
// what makes a rival worth challenging or avoiding. Deterministic per
// profile id so it doesn't reshuffle on every render.
export function rivalPnlCents(profile: Profile): number {
  const seed = profile.id.charCodeAt(profile.id.length - 1);
  const sign = seed % 3 === 0 ? -1 : 1;
  // Scaled off their real totalWinnings so the ordering still tracks who's
  // actually good (a modulo here would erase that and collide on round
  // numbers — Sarah's 79% accuracy should not be showing up worst).
  const magnitude = Math.round(profile.totalWinningsCents * 0.08) + 200;
  return sign * magnitude;
}

export function topRivals(count: number): Profile[] {
  return [...profiles].sort((a, b) => rivalPnlCents(b) - rivalPnlCents(a)).slice(0, count);
}

// All-time career leaders (totalWinningsCents), not the weekly-style P/L
// topRivals uses — a genuinely different ranking, per the FOMO "Hall of
// Fame" reference (distinct from "Weekly Top Trades").
export function goatedRivals(count: number): Profile[] {
  return [...profiles].sort((a, b) => b.totalWinningsCents - a.totalWinningsCents).slice(0, count);
}

// Two entries beyond what's in mock data — real tournaments users would
// expect to filter by even before any room/match references them. Shared
// by Home and Search's league bottom sheet (rooms-matches-browser.tsx).
export const leagues = [...new Set(matches.map((m) => m.competition)), "World Cup", "Friendlies"];

// Curated shortcuts for the Search page's idle "rollup" state — the
// "Discussions" row (per the founder's hand sketch: UCL night, Live now,
// EPL weekend, LaLiga, efc…). These read as moments people are already
// talking about, not a dry league picklist — a jump straight into that
// moment, not a real query. `id` is what gets stored if the user bookmarks
// the topic (see use-saved-items.ts); `league` is what RoomFeed's
// extraFilter matches against, omitted for the one non-league topic
// ("Live now" spans every league).
export interface SearchTopic {
  id: string;
  label: string;
  league?: string;
}

export const searchTopics: SearchTopic[] = [
  { id: "live", label: "Live now" },
  { id: "champions-league", label: "UCL night", league: "Champions League" },
  { id: "premier-league", label: "EPL weekend", league: "Premier League" },
  { id: "la-liga", label: "La Liga", league: "La Liga" },
  { id: "bundesliga", label: "Bundesliga", league: "Bundesliga" },
  { id: "serie-a", label: "Serie A night", league: "Serie A" },
  { id: "npfl", label: "NPFL derby", league: "NPFL" },
];

export type NotificationKind =
  | "friend_joined"
  | "challenge_received"
  | "goal_scored"
  | "whale_entered"
  | "room_filled"
  | "settlement_complete"
  | "new_follower";

export interface NotificationItem {
  id: string;
  kind: NotificationKind;
  actorId: string | null;
  roomId: string | null;
  body: string;
  createdAt: string;
  read: boolean;
}

// Per docs/masterplan/07-product-blueprint.md#410-notifications.
export const notifications: NotificationItem[] = [
  { id: "n5", kind: "new_follower", actorId: "u7", roomId: null, body: "Chioma started following you", createdAt: "2026-08-15T15:10:00Z", read: true },
  { id: "n8", kind: "new_follower", actorId: "u8", roomId: null, body: "Marcus started following you", createdAt: "2026-08-14T09:00:00Z", read: true },
];

// ============================================================================
// Arena — the fourth nav tab (formerly "Following"). See
// docs/masterplan/07-product-blueprint.md §4.13 and the Arena implementation
// plan for the full research/scope rationale. Every social-proof/urgency
// number surfaced from this section must trace back to a real field here —
// never a fabricated count.
// ============================================================================

// Banter (roomId null) and thesis (roomId set — a conviction argument
// attached to a real room) posts. Text + emoji only, no image pipeline yet.
export const posts: Post[] = [
  {
    id: "post1",
    authorId: "u1",
    body: "Arsenal fans deserve a trophy just for showing up every week 😭",
    roomId: null,
    createdAt: "2026-08-15T19:05:00Z",
    roastCount: 14,
    replies: [
      { authorId: "u2", body: "the trophy is called suffering", createdAt: "2026-08-15T19:07:00Z" },
      { authorId: "u9", body: "at least you show up lol", createdAt: "2026-08-15T19:11:00Z" },
    ],
  },
  {
    id: "post2",
    authorId: "u5",
    body: "Bayern could play with 9 men and still win by 2. not up for debate",
    roomId: null,
    createdAt: "2026-08-15T18:32:00Z",
    roastCount: 9,
    replies: [{ authorId: "u7", body: "the arrogance 😭 respect it though", createdAt: "2026-08-15T18:40:00Z" }],
  },
  {
    id: "post3",
    authorId: "u7",
    body: "Enyimba's away form is genuinely a crime against football",
    roomId: null,
    createdAt: "2026-08-15T11:00:00Z",
    roastCount: 6,
    replies: [],
  },
  {
    id: "post4",
    authorId: "u9",
    body: "Man City missing two starters at the back and Madrid have pace to burn on the counter. I'm not fading this.",
    roomId: null,
    createdAt: "2026-08-14T21:00:00Z",
    roastCount: 21,
    replies: [
      { authorId: "u3", body: "took the words out my mouth", createdAt: "2026-08-14T21:05:00Z" },
      { authorId: "u1", body: "City still find a way somehow", createdAt: "2026-08-14T21:20:00Z" },
    ],
  },
  {
    id: "post5",
    authorId: "u4",
    body: "Spurs finished 4th in my heart every season, that's the real table",
    roomId: null,
    createdAt: "2026-08-15T13:00:00Z",
    roastCount: 11,
    replies: [{ authorId: "u6", body: "bro really said that with his chest", createdAt: "2026-08-15T13:04:00Z" }],
  },
  {
    id: "post6",
    authorId: "u2",
    body: "El Clasico is for the culture, the football is secondary at this point",
    roomId: null,
    createdAt: "2026-08-15T12:15:00Z",
    roastCount: 4,
    replies: [],
  },
  {
    id: "post7",
    authorId: "u1",
    body: "Chelsea's press has no legs left after 60 minutes lately. Arsenal feasts late, every time.",
    roomId: null,
    createdAt: "2026-08-15T18:10:00Z",
    roastCount: 17,
    replies: [{ authorId: "u2", body: "we'll see about that 👀", createdAt: "2026-08-15T18:15:00Z" }],
  },
  {
    id: "post8",
    authorId: "u6",
    body: "NPFL upsets have taken my last 3 rooms. genuinely cursed",
    roomId: null,
    createdAt: "2026-08-15T09:00:00Z",
    roastCount: 8,
    replies: [{ authorId: "u7", body: "read the room next time 😂", createdAt: "2026-08-15T09:10:00Z" }],
  },
  {
    id: "post9",
    authorId: "u9",
    body: "Champions League nights just hit different, no cap",
    roomId: null,
    createdAt: "2026-08-14T20:30:00Z",
    roastCount: 5,
    replies: [],
  },
  {
    id: "post10",
    authorId: "u5",
    body: "Dortmund's back line has shipped 2+ in 4 of their last 5. This isn't close.",
    roomId: null,
    createdAt: "2026-08-15T18:35:00Z",
    roastCount: 12,
    replies: [],
  },
];

export function postById(id: string): Post | undefined {
  return posts.find((p) => p.id === id);
}

// Points-only leagues (no entry fee, no prize pool — see the Arena
// implementation plan's masterplan-scope resolution). Global auto-includes
// every profile; the rest are joined by code, same pattern as private rooms.
export const predictionLeagues: PredictionLeague[] = [
  {
    id: "l1",
    name: "Global League",
    code: "GLOBAL",
    memberIds: profiles.map((p) => p.id),
    createdAt: "2025-08-01T00:00:00Z",
  },
  {
    id: "l2",
    name: "Naija Ballers",
    code: "LEAGUE-9F21",
    memberIds: ["u1", "u6", "u7", "u9"],
    createdAt: "2026-07-01T00:00:00Z",
  },
  {
    id: "l3",
    name: "Rivaly OGs",
    code: "LEAGUE-4K80",
    memberIds: ["u5", "u2", "u4"],
    createdAt: "2026-06-15T00:00:00Z",
  },
];

export function leagueById(id: string): PredictionLeague | undefined {
  return predictionLeagues.find((l) => l.id === id);
}

export function leagueByCode(code: string): PredictionLeague | undefined {
  return predictionLeagues.find((l) => l.code.toUpperCase() === code.toUpperCase());
}

export function leaguesForUser(userId: string): PredictionLeague[] {
  return predictionLeagues.filter((l) => l.memberIds.includes(userId));
}

// Season points: scales with accuracy x volume (the FPL equivalent of
// "returns x matches played") — every input is an existing Profile field.
// The per-win bonus it used to add came from mock rooms' entries, which are
// gone; real settled wins will feed it once rooms settle for real.
export function pointsForProfile(profile: Profile): number {
  return Math.round(profile.predictionAccuracy * profile.roomsCreated * 12);
}

// This gameweek's points — real wins since the gameweek started. Zero
// until real rooms settle (mock rooms, which faked these, were removed).
export function gameweekPointsForProfile(profile: Profile): number {
  void profile;
  return 0;
}

export interface LeagueStanding {
  profile: Profile;
  seasonPoints: number;
  gameweekPoints: number;
}

export function leagueStandings(league: PredictionLeague): LeagueStanding[] {
  return league.memberIds
    .map(profileById)
    .filter((p): p is Profile => Boolean(p))
    .map((profile) => ({
      profile,
      seasonPoints: pointsForProfile(profile),
      gameweekPoints: gameweekPointsForProfile(profile),
    }))
    .sort((a, b) => b.seasonPoints - a.seasonPoints);
}

// Which profile a feed item is "about," for the Global/Following toggle —
// resolves through the real underlying record for every item kind rather
// than storing a duplicate authorId on the feed item itself.
export function arenaItemSubjectId(item: ArenaFeedItem): string | null {
  switch (item.kind) {
    // Only real entries/rooms produce these now, and the feed resolves
    // their subjects from the real rows directly.
    case "win_loss":
    case "rival_activity":
    case "hot_room":
      return null;
    case "banter":
    case "thesis": {
      const post = postById(item.postId);
      return post?.authorId ?? null;
    }
  }
}

// The mock half of Arena's feed: banter posts only. Win/loss, rival
// activity and hot-room cards came from mock rooms and their entries, which
// are gone — those items now only ever come from real rooms (see
// src/lib/supabase/arena.ts). Finite array; callers paginate it.
export function buildArenaFeed(): ArenaFeedItem[] {
  return posts
    .map((p): ArenaFeedItem => ({ id: `post-${p.id}`, kind: "banter", postId: p.id, createdAt: p.createdAt }))
    .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));
}

// Home's "Top rivals" row: people you actually follow, sorted by career
// winnings so the biggest results surface first. Engagement-psychology
// mechanism #5 (social identity/rivalry — see
// .claude/skills/rivaly-engagement-psychology): in-group favoritism
// (rooting for people you actually follow) is a stronger, more consistent
// pull than an anonymous global ranking. Empty on purpose for accounts
// that follow no one — no fabricated filler profiles.
export function followedTopRivals(count: number): Profile[] {
  const followed = new Set(followedProfileIds());
  return profiles
    .filter((p) => followed.has(p.id))
    .sort((a, b) => b.totalWinningsCents - a.totalWinningsCents)
    .slice(0, count);
}

// Current consecutive-win streak — walks a profile's SETTLED entries
// most-recent-first and counts how many in a row were wins, stopping at
// the first loss (or the end of their history). A pending/live entry
// neither breaks nor extends it — it just isn't decided yet.
// Zero until real rooms settle — the settled entries it used to walk
// belonged to mock rooms, which were removed rather than left faking a
// streak nobody actually earned.
export function currentStreak(profileId: string): number {
  void profileId;
  return 0;
}

// Home's "Goated rivals" row: the platform's actual hottest streaks right
// now (3+ in a row) — deliberately global, not scoped to who you follow,
// per founder direction ("Goated" is a hall-of-fame moment worth seeing
// regardless of your follow list, unlike Top Rivals' in-group framing).
// Engagement-psychology mechanism #6 (loss aversion & streaks — see
// .claude/skills/rivaly-engagement-psychology): a visible hot streak is
// what makes someone worth watching or challenging right now. Real,
// derived from settled entries — empty when nobody clears the bar.
const GOATED_STREAK_THRESHOLD = 3;
export function goatedStreakRivals(count: number): Profile[] {
  return profiles
    .filter((p) => currentStreak(p.id) >= GOATED_STREAK_THRESHOLD)
    .sort((a, b) => currentStreak(b.id) - currentStreak(a.id))
    .slice(0, count);
}

export interface AuthoredReply {
  post: Post;
  reply: PostReply;
}

// Every reply a profile has actually posted, across all Posts, with its
// parent post for context — powers Profile's Replies tab.
export function repliesByAuthor(profileId: string): AuthoredReply[] {
  const result: AuthoredReply[] = [];
  for (const post of posts) {
    for (const reply of post.replies) {
      if (reply.authorId === profileId) result.push({ post, reply });
    }
  }
  return result.sort((a, b) => +new Date(b.reply.createdAt) - +new Date(a.reply.createdAt));
}

// Mirrors buildArenaFeed()'s item-construction logic but scoped to one
// author's own Entries and Posts, so it plugs directly into the same
// ArenaFeedCard switcher — a personal activity log, not the global feed.
export function activityForProfile(id: string): ArenaFeedItem[] {
  return posts
    .filter((p) => p.authorId === id)
    .map((p): ArenaFeedItem => ({ id: `post-${p.id}`, kind: "banter", postId: p.id, createdAt: p.createdAt }))
    .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));
}
