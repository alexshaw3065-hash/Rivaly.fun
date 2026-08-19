/**
 * Realistic placeholder content for V1 screens, shaped exactly like the
 * Supabase rows defined in src/lib/types.ts. Swap for real queries once
 * a Supabase project is linked — every screen should already work with
 * this data with zero prop-shape changes.
 */
import type { Match, Room, Profile, ChatMessage, Transaction, Wallet, Pack } from "./types";

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

export const profiles: Profile[] = [
  { id: "u1", username: "danielk", displayName: "Daniel", avatarUrl: null, bio: "Arsenal 'til I die. Wrong sometimes, loud always.", followerCount: 842, followingCount: 210, roomsCreated: 34, predictionAccuracy: 0.72, totalWinningsCents: 84_000_00, createdAt: "2025-11-02T00:00:00Z" },
  { id: "u2", username: "alexr", displayName: "Alex", avatarUrl: null, bio: null, followerCount: 156, followingCount: 98, roomsCreated: 12, predictionAccuracy: 0.58, totalWinningsCents: 12_400_00, createdAt: "2026-01-14T00:00:00Z" },
  { id: "u3", username: "victorj", displayName: "Victor", avatarUrl: null, bio: "Building Rivaly. Predicting on Rivaly.", followerCount: 2_310, followingCount: 45, roomsCreated: 61, predictionAccuracy: 0.66, totalWinningsCents: 250_000_00, createdAt: "2025-09-01T00:00:00Z" },
  { id: "u4", username: "jamesb", displayName: "James", avatarUrl: null, bio: "Spurs. Pain is a lifestyle.", followerCount: 310, followingCount: 140, roomsCreated: 18, predictionAccuracy: 0.61, totalWinningsCents: 31_200_00, createdAt: "2026-02-20T00:00:00Z" },
  { id: "u5", username: "sarahk", displayName: "Sarah", avatarUrl: null, bio: "Called Bayern in 12 straight rooms.", followerCount: 4_120, followingCount: 60, roomsCreated: 89, predictionAccuracy: 0.79, totalWinningsCents: 612_000_00, createdAt: "2025-08-10T00:00:00Z" },
  { id: "u6", username: "tunde", displayName: "Tunde", avatarUrl: null, bio: "Down bad on NPFL upsets.", followerCount: 92, followingCount: 210, roomsCreated: 7, predictionAccuracy: 0.34, totalWinningsCents: 2_100_00, createdAt: "2026-05-01T00:00:00Z" },
  { id: "u7", username: "chioma", displayName: "Chioma", avatarUrl: null, bio: "Enyimba or nothing.", followerCount: 675, followingCount: 88, roomsCreated: 22, predictionAccuracy: 0.68, totalWinningsCents: 58_900_00, createdAt: "2025-12-11T00:00:00Z" },
  { id: "u8", username: "marcus", displayName: "Marcus", avatarUrl: null, bio: null, followerCount: 41, followingCount: 30, roomsCreated: 3, predictionAccuracy: 0.5, totalWinningsCents: 4_000_00, createdAt: "2026-08-01T00:00:00Z" },
  { id: "u9", username: "ada", displayName: "Ada", avatarUrl: null, bio: "Room creator. Champions League specialist.", followerCount: 1_890, followingCount: 52, roomsCreated: 47, predictionAccuracy: 0.7, totalWinningsCents: 198_500_00, createdAt: "2025-10-05T00:00:00Z" },
];

export const rooms: Room[] = [
  { id: "r1", creatorId: "u1", matchId: "m1", prediction: "Arsenal scores 3+ tonight", entryAmountCents: 2_000_00, visibility: "public", status: "live", poolTotalCents: 84_000_00, participantCount: 24, resolutionSource: "Official match result", inviteCode: "RIVAL-7X92", createdAt: "2026-08-15T18:00:00Z", settledAt: null },
  { id: "r2", creatorId: "u3", matchId: "m2", prediction: "Man City win by 2+ goals", entryAmountCents: 5_000_00, visibility: "public", status: "open", poolTotalCents: 210_000_00, participantCount: 41, resolutionSource: "Official match result", inviteCode: "RIVAL-4K18", createdAt: "2026-08-15T16:20:00Z", settledAt: null },
  { id: "r3", creatorId: "u2", matchId: "m3", prediction: "El Clasico ends in a draw", entryAmountCents: 1_000_00, visibility: "public", status: "open", poolTotalCents: 38_000_00, participantCount: 19, resolutionSource: "Official match result", inviteCode: "RIVAL-9Q05", createdAt: "2026-08-15T12:00:00Z", settledAt: null },
  { id: "r4", creatorId: "u1", matchId: "m4", prediction: "Enyimba win at home", entryAmountCents: 500_00, visibility: "public", status: "settled", poolTotalCents: 22_000_00, participantCount: 15, resolutionSource: "Official match result", inviteCode: "RIVAL-2P77", createdAt: "2026-08-15T10:00:00Z", settledAt: "2026-08-15T19:10:00Z" },
  { id: "r5", creatorId: "u5", matchId: "m5", prediction: "Bayern win by 2+ goals", entryAmountCents: 3_000_00, visibility: "public", status: "live", poolTotalCents: 156_000_00, participantCount: 52, resolutionSource: "Official match result", inviteCode: "RIVAL-3B41", createdAt: "2026-08-15T18:30:00Z", settledAt: null },
  { id: "r6", creatorId: "u7", matchId: "m5", prediction: "Under 2.5 goals", entryAmountCents: 1_500_00, visibility: "public", status: "live", poolTotalCents: 46_500_00, participantCount: 31, resolutionSource: "Official match result", inviteCode: "RIVAL-6U29", createdAt: "2026-08-15T18:40:00Z", settledAt: null },
  { id: "r7", creatorId: "u9", matchId: "m6", prediction: "PSG keep a clean sheet", entryAmountCents: 2_500_00, visibility: "public", status: "open", poolTotalCents: 62_500_00, participantCount: 25, resolutionSource: "Official match result", inviteCode: "RIVAL-7P83", createdAt: "2026-08-15T14:10:00Z", settledAt: null },
  { id: "r8", creatorId: "u4", matchId: "m7", prediction: "Man United win", entryAmountCents: 2_000_00, visibility: "public", status: "live", poolTotalCents: 98_000_00, participantCount: 49, resolutionSource: "Official match result", inviteCode: "RIVAL-8M55", createdAt: "2026-08-15T17:50:00Z", settledAt: null },
  { id: "r9", creatorId: "u6", matchId: "m7", prediction: "Both teams to score", entryAmountCents: 1_000_00, visibility: "public", status: "live", poolTotalCents: 29_000_00, participantCount: 29, resolutionSource: "Official match result", inviteCode: "RIVAL-9B17", createdAt: "2026-08-15T17:55:00Z", settledAt: null },
  { id: "r10", creatorId: "u5", matchId: "m8", prediction: "Napoli win at home", entryAmountCents: 4_000_00, visibility: "public", status: "open", poolTotalCents: 124_000_00, participantCount: 31, resolutionSource: "Official match result", inviteCode: "RIVAL-1N64", createdAt: "2026-08-15T13:30:00Z", settledAt: null },
  { id: "r11", creatorId: "u7", matchId: "m9", prediction: "Kano Pillars hold Enyimba to a draw", entryAmountCents: 500_00, visibility: "public", status: "open", poolTotalCents: 14_500_00, participantCount: 29, resolutionSource: "Official match result", inviteCode: "RIVAL-2K90", createdAt: "2026-08-15T09:15:00Z", settledAt: null },
  { id: "r12", creatorId: "u9", matchId: "m10", prediction: "Real Madrid progress", entryAmountCents: 5_000_00, visibility: "public", status: "open", poolTotalCents: 340_000_00, participantCount: 68, resolutionSource: "Official match result", inviteCode: "RIVAL-3R71", createdAt: "2026-08-14T20:00:00Z", settledAt: null },
  { id: "r13", creatorId: "u3", matchId: "m10", prediction: "Man City score first", entryAmountCents: 2_000_00, visibility: "public", status: "open", poolTotalCents: 88_000_00, participantCount: 44, resolutionSource: "Official match result", inviteCode: "RIVAL-4M38", createdAt: "2026-08-14T21:00:00Z", settledAt: null },
  { id: "r14", creatorId: "u1", matchId: "m11", prediction: "Chelsea beat Liverpool", entryAmountCents: 3_000_00, visibility: "public", status: "open", poolTotalCents: 69_000_00, participantCount: 23, resolutionSource: "Official match result", inviteCode: "RIVAL-5C46", createdAt: "2026-08-14T11:00:00Z", settledAt: null },
  { id: "r15", creatorId: "u4", matchId: "m1", prediction: "Chelsea come back to win", entryAmountCents: 1_000_00, visibility: "public", status: "live", poolTotalCents: 21_000_00, participantCount: 21, resolutionSource: "Official match result", inviteCode: "RIVAL-6C58", createdAt: "2026-08-15T18:20:00Z", settledAt: null },
  { id: "r16", creatorId: "u6", matchId: "m12", prediction: "Sporting Lagos win", entryAmountCents: 500_00, visibility: "public", status: "live", poolTotalCents: 18_000_00, participantCount: 36, resolutionSource: "Official match result", inviteCode: "RIVAL-7S64", createdAt: "2026-08-15T17:30:00Z", settledAt: null },
  { id: "r17", creatorId: "u2", matchId: "m3", prediction: "Barcelona win", entryAmountCents: 2_000_00, visibility: "public", status: "open", poolTotalCents: 54_000_00, participantCount: 27, resolutionSource: "Official match result", inviteCode: "RIVAL-8B72", createdAt: "2026-08-15T11:00:00Z", settledAt: null },
  { id: "r18", creatorId: "u8", matchId: "m6", prediction: "Marseille upset PSG", entryAmountCents: 1_000_00, visibility: "public", status: "open", poolTotalCents: 17_000_00, participantCount: 17, resolutionSource: "Official match result", inviteCode: "RIVAL-9M80", createdAt: "2026-08-15T15:00:00Z", settledAt: null },
  { id: "r19", creatorId: "u5", matchId: "m8", prediction: "Juventus win away", entryAmountCents: 3_000_00, visibility: "public", status: "open", poolTotalCents: 87_000_00, participantCount: 29, resolutionSource: "Official match result", inviteCode: "RIVAL-1J93", createdAt: "2026-08-15T13:45:00Z", settledAt: null },
  { id: "r20", creatorId: "u7", matchId: "m2", prediction: "Liverpool win", entryAmountCents: 2_000_00, visibility: "public", status: "open", poolTotalCents: 76_000_00, participantCount: 38, resolutionSource: "Official match result", inviteCode: "RIVAL-2L15", createdAt: "2026-08-15T16:40:00Z", settledAt: null },
  { id: "r21", creatorId: "u9", matchId: "m9", prediction: "Enyimba win away", entryAmountCents: 500_00, visibility: "public", status: "open", poolTotalCents: 11_000_00, participantCount: 22, resolutionSource: "Official match result", inviteCode: "RIVAL-3E27", createdAt: "2026-08-15T09:30:00Z", settledAt: null },
  { id: "r22", creatorId: "u4", matchId: "m11", prediction: "Over 2.5 goals", entryAmountCents: 1_500_00, visibility: "public", status: "open", poolTotalCents: 42_000_00, participantCount: 28, resolutionSource: "Official match result", inviteCode: "RIVAL-4O39", createdAt: "2026-08-14T12:00:00Z", settledAt: null },
  { id: "r23", creatorId: "u6", matchId: "m4", prediction: "Under 2.5 goals", entryAmountCents: 500_00, visibility: "public", status: "settled", poolTotalCents: 9_500_00, participantCount: 19, resolutionSource: "Official match result", inviteCode: "RIVAL-5U41", createdAt: "2026-08-15T10:30:00Z", settledAt: "2026-08-15T19:10:00Z" },
  { id: "r24", creatorId: "u1", matchId: "m5", prediction: "Dortmund hold on for a draw", entryAmountCents: 2_000_00, visibility: "public", status: "live", poolTotalCents: 58_000_00, participantCount: 29, resolutionSource: "Official match result", inviteCode: "RIVAL-6D53", createdAt: "2026-08-15T18:35:00Z", settledAt: null },
];

// Combo/parlay-style bundles — a curated statement of conviction across
// several matches, not a sportsbook bet-slip. See Pack in types.ts.
export const packs: Pack[] = [
  {
    id: "p1",
    creatorId: "u5",
    legs: [
      { matchId: "m1", prediction: "Arsenal scores 3+" },
      { matchId: "m5", prediction: "Bayern win by 2+" },
      { matchId: "m10", prediction: "Real Madrid progress" },
    ],
    entryAmountCents: 2_000_00,
    poolTotalCents: 96_000_00,
    participantCount: 18,
    payoutMultiplier: 4.8,
    status: "live",
    createdAt: "2026-08-15T17:00:00Z",
  },
  {
    id: "p2",
    creatorId: "u3",
    legs: [
      { matchId: "m2", prediction: "Man City win by 2+" },
      { matchId: "m7", prediction: "Man United win" },
    ],
    entryAmountCents: 1_000_00,
    poolTotalCents: 41_000_00,
    participantCount: 27,
    payoutMultiplier: 2.6,
    status: "open",
    createdAt: "2026-08-15T16:00:00Z",
  },
  {
    id: "p3",
    creatorId: "u9",
    legs: [
      { matchId: "m8", prediction: "Napoli win at home" },
      { matchId: "m6", prediction: "PSG keep a clean sheet" },
      { matchId: "m10", prediction: "Real Madrid progress" },
      { matchId: "m3", prediction: "El Clasico ends in a draw" },
    ],
    entryAmountCents: 3_000_00,
    poolTotalCents: 132_000_00,
    participantCount: 14,
    payoutMultiplier: 7.2,
    status: "open",
    createdAt: "2026-08-15T14:30:00Z",
  },
  {
    id: "p4",
    creatorId: "u1",
    legs: [
      { matchId: "m4", prediction: "Enyimba win at home" },
      { matchId: "m12", prediction: "Sporting Lagos win" },
    ],
    entryAmountCents: 500_00,
    poolTotalCents: 18_500_00,
    participantCount: 22,
    payoutMultiplier: 3.1,
    status: "settled",
    createdAt: "2026-08-15T09:00:00Z",
  },
  {
    id: "p5",
    creatorId: "u7",
    legs: [
      { matchId: "m11", prediction: "Chelsea beat Liverpool" },
      { matchId: "m9", prediction: "Kano Pillars hold Enyimba to a draw" },
      { matchId: "m2", prediction: "Man City win by 2+" },
    ],
    entryAmountCents: 1_500_00,
    poolTotalCents: 54_000_00,
    participantCount: 19,
    payoutMultiplier: 5.4,
    status: "open",
    createdAt: "2026-08-14T22:00:00Z",
  },
];

export function packById(id: string): Pack | undefined {
  return packs.find((p) => p.id === id);
}

function msg(
  id: string,
  roomId: string,
  userId: string | null,
  body: string,
  kind: ChatMessage["kind"] = "message",
): ChatMessage {
  return { id, roomId, userId, kind, body, createdAt: "2026-08-15T18:00:00Z" };
}

const roomMessages: Record<string, ChatMessage[]> = {
  r1: [
    msg("c1", "r1", null, "Daniel created the room — “Arsenal scores 3+ tonight.”", "system"),
    msg("c2", "r1", null, "Alex joined. Backing No.", "system"),
    msg("c3", "r1", "u2", "no chance, chelsea's defense is done for the night"),
    msg("c4", "r1", null, "Kickoff — Arsenal vs Chelsea", "system"),
    msg("c5", "r1", null, "GOAL — Arsenal 1–0 (12′)", "system"),
    msg("c6", "r1", "u1", "told you 😤"),
    msg("c7", "r1", null, "GOAL — Chelsea 1–1 (34′)", "system"),
    msg("c8", "r1", "u3", "here we go"),
    msg("c9", "r1", null, "GOAL — Arsenal 2–1 (58′)", "system"),
    msg("c10", "r1", "u2", "one more and I owe daniel dinner"),
    msg("c11", "r1", null, "67′ — still time", "system"),
  ],
  r4: [
    msg("c20", "r4", null, "Daniel created the room — “Enyimba win at home.”", "system"),
    msg("c21", "r4", "u1", "Rivers United have no answer at home to Enyimba"),
    msg("c22", "r4", null, "Match finished — Enyimba 3–1 Rivers United", "system"),
    msg("c23", "r4", null, "Room settled — Daniel called it right", "system"),
  ],
};

export function getRoomMessages(roomId: string): ChatMessage[] {
  return roomMessages[roomId] ?? [];
}

export function roomById(id: string): Room | undefined {
  return rooms.find((r) => r.id === id);
}

export const wallet: Wallet = {
  userId: "u3",
  balanceCents: 45_000_00,
  pendingCents: 0,
  escrowCents: 2_500_00,
};

export const transactions: Transaction[] = [
  { id: "t1", userId: "u3", type: "payout", status: "completed", amountCents: 1_467_00, roomId: "r4", createdAt: "2026-08-15T19:10:00Z" },
  { id: "t2", userId: "u3", type: "entry", status: "completed", amountCents: -500_00, roomId: "r4", createdAt: "2026-08-15T10:05:00Z" },
  { id: "t3", userId: "u3", type: "entry", status: "completed", amountCents: -2_000_00, roomId: "r1", createdAt: "2026-08-15T18:02:00Z" },
  { id: "t4", userId: "u3", type: "deposit", status: "completed", amountCents: 20_000_00, roomId: null, createdAt: "2026-08-14T09:00:00Z" },
  { id: "t5", userId: "u3", type: "withdrawal", status: "completed", amountCents: -10_000_00, roomId: null, createdAt: "2026-08-10T14:20:00Z" },
  { id: "t6", userId: "u3", type: "deposit", status: "completed", amountCents: 40_000_00, roomId: null, createdAt: "2026-08-01T12:00:00Z" },
];

export function matchById(id: string): Match | undefined {
  return matches.find((m) => m.id === id);
}

export function profileById(id: string): Profile | undefined {
  return profiles.find((p) => p.id === id);
}

export function profileByUsername(username: string): Profile | undefined {
  return profiles.find((p) => p.username === username);
}

export function roomsByCreator(userId: string): Room[] {
  return rooms.filter((r) => r.creatorId === userId);
}

export function formatMoney(cents: number): string {
  return `₦${Math.round(cents / 100).toLocaleString("en-NG")}`;
}

// Compact form for tight spaces (the mobile top bar's balance chip) —
// ₦45,000 -> ₦45K, ₦1,250,000 -> ₦1.3M.
export function formatMoneyCompact(cents: number): string {
  const naira = Math.round(cents / 100);
  if (naira >= 1_000_000) return `₦${(naira / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
  if (naira >= 1_000) return `₦${(naira / 1_000).toFixed(0)}K`;
  return `₦${naira}`;
}

export function formatSignedMoney(cents: number): string {
  const sign = cents >= 0 ? "+" : "−";
  return `${sign}₦${Math.round(Math.abs(cents) / 100).toLocaleString("en-NG")}`;
}

// Deterministic mock YES/NO split so the same room shows the same number
// everywhere. Swap for a real entry-side aggregate once rooms are wired
// to Supabase.
export function splitPct(room: Room): number {
  const seed = room.id.charCodeAt(room.id.length - 1);
  return 50 + (seed % 30);
}

// "Rivals joined in the last hour" — what makes a room feel like it's
// exploding right now rather than just popular. Deterministic per room id.
export function momentumCount(room: Room): number {
  const seed = room.id.charCodeAt(room.id.length - 1);
  return 3 + (seed % 14);
}

// The signature-artifact set for the "Exploding Now" hero: the rooms with
// the highest recent-joins-to-total ratio, i.e. actually accelerating, not
// just the biggest pools (that's what "Trending" in the filter chips is for).
export function explodingRooms(count: number): Room[] {
  return [...rooms]
    .filter((r) => r.status !== "settled")
    .sort((a, b) => momentumCount(b) / b.participantCount - momentumCount(a) / a.participantCount)
    .slice(0, count);
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
  const magnitude = Math.round(profile.totalWinningsCents * 0.08) + 20_000;
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

// Curated shortcuts for the Search page's idle "rollup" state — a jump
// straight into a league (or "live right now"), not a real query. `id` is
// what gets stored if the user bookmarks the topic (see use-saved-items.ts);
// `league` is what RoomFeed's extraFilter matches against, omitted for the
// one non-league topic ("Live now" spans every league).
export interface SearchTopic {
  id: string;
  label: string;
  league?: string;
}

export const searchTopics: SearchTopic[] = [
  { id: "live", label: "Live now" },
  { id: "premier-league", label: "Premier League", league: "Premier League" },
  { id: "champions-league", label: "Champions League", league: "Champions League" },
  { id: "la-liga", label: "La Liga", league: "La Liga" },
  { id: "bundesliga", label: "Bundesliga", league: "Bundesliga" },
  { id: "serie-a", label: "Serie A", league: "Serie A" },
  { id: "npfl", label: "NPFL", league: "NPFL" },
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
  { id: "n1", kind: "goal_scored", actorId: null, roomId: "r1", body: "GOAL — Arsenal 2–1 Chelsea (58′)", createdAt: "2026-08-15T18:58:00Z", read: false },
  { id: "n2", kind: "whale_entered", actorId: "u5", roomId: "r12", body: "Sarah entered Real Madrid progress with ₦25,000", createdAt: "2026-08-15T18:40:00Z", read: false },
  { id: "n3", kind: "challenge_received", actorId: "u4", roomId: "r15", body: "James challenged you — Chelsea come back to win", createdAt: "2026-08-15T18:20:00Z", read: false },
  { id: "n4", kind: "friend_joined", actorId: "u2", roomId: "r1", body: "Alex joined your room — Arsenal scores 3+ tonight", createdAt: "2026-08-15T18:02:00Z", read: true },
  { id: "n5", kind: "new_follower", actorId: "u7", roomId: null, body: "Chioma started following you", createdAt: "2026-08-15T15:10:00Z", read: true },
  { id: "n6", kind: "room_filled", actorId: null, roomId: "r5", body: "Bayern win by 2+ goals just hit 50 rivals", createdAt: "2026-08-15T14:30:00Z", read: true },
  { id: "n7", kind: "settlement_complete", actorId: null, roomId: "r4", body: "Enyimba win at home settled — you won ₦1,467", createdAt: "2026-08-15T19:10:00Z", read: true },
  { id: "n8", kind: "new_follower", actorId: "u8", roomId: null, body: "Marcus started following you", createdAt: "2026-08-14T09:00:00Z", read: true },
];
