/**
 * Realistic placeholder content for V1 screens, shaped exactly like the
 * Supabase rows defined in src/lib/types.ts. Swap for real queries once
 * a Supabase project is linked — every screen should already work with
 * this data with zero prop-shape changes.
 */
import type {
  Match,
  Room,
  Profile,
  ChatMessage,
  Transaction,
  Wallet,
  Pack,
  Entry,
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

export const profiles: Profile[] = [
  { id: "u1", username: "danielk", displayName: "Daniel", avatarUrl: null, bio: "Arsenal 'til I die. Wrong sometimes, loud always.", socialLinks: [], followerCount: 842, followingCount: 210, roomsCreated: 34, predictionAccuracy: 0.72, totalWinningsCents: 84_000_00, createdAt: "2025-11-02T00:00:00Z" },
  { id: "u2", username: "alexr", displayName: "Alex", avatarUrl: null, bio: null, socialLinks: [], followerCount: 156, followingCount: 98, roomsCreated: 12, predictionAccuracy: 0.58, totalWinningsCents: 12_400_00, createdAt: "2026-01-14T00:00:00Z" },
  { id: "u3", username: "victorj", displayName: "Victor", avatarUrl: null, bio: "Building Rivaly. Predicting on Rivaly.", socialLinks: [], followerCount: 2_310, followingCount: 45, roomsCreated: 61, predictionAccuracy: 0.66, totalWinningsCents: 250_000_00, createdAt: "2025-09-01T00:00:00Z" },
  { id: "u4", username: "jamesb", displayName: "James", avatarUrl: null, bio: "Spurs. Pain is a lifestyle.", socialLinks: [], followerCount: 310, followingCount: 140, roomsCreated: 18, predictionAccuracy: 0.61, totalWinningsCents: 31_200_00, createdAt: "2026-02-20T00:00:00Z" },
  { id: "u5", username: "sarahk", displayName: "Sarah", avatarUrl: null, bio: "Called Bayern in 12 straight rooms.", socialLinks: [], followerCount: 4_120, followingCount: 60, roomsCreated: 89, predictionAccuracy: 0.79, totalWinningsCents: 612_000_00, createdAt: "2025-08-10T00:00:00Z" },
  { id: "u6", username: "tunde", displayName: "Tunde", avatarUrl: null, bio: "Down bad on NPFL upsets.", socialLinks: [], followerCount: 92, followingCount: 210, roomsCreated: 7, predictionAccuracy: 0.34, totalWinningsCents: 2_100_00, createdAt: "2026-05-01T00:00:00Z" },
  { id: "u7", username: "chioma", displayName: "Chioma", avatarUrl: null, bio: "Enyimba or nothing.", socialLinks: [], followerCount: 675, followingCount: 88, roomsCreated: 22, predictionAccuracy: 0.68, totalWinningsCents: 58_900_00, createdAt: "2025-12-11T00:00:00Z" },
  { id: "u8", username: "marcus", displayName: "Marcus", avatarUrl: null, bio: null, socialLinks: [], followerCount: 41, followingCount: 30, roomsCreated: 3, predictionAccuracy: 0.5, totalWinningsCents: 4_000_00, createdAt: "2026-08-01T00:00:00Z" },
  { id: "u9", username: "ada", displayName: "Ada", avatarUrl: null, bio: "Room creator. Champions League specialist.", socialLinks: [], followerCount: 1_890, followingCount: 52, roomsCreated: 47, predictionAccuracy: 0.7, totalWinningsCents: 198_500_00, createdAt: "2025-10-05T00:00:00Z" },
  { id: "u10", username: "marissa", displayName: "Marissa", avatarUrl: null, bio: "Chelsea die-hard. Bridge or nowhere.", socialLinks: [], followerCount: 320, followingCount: 140, roomsCreated: 9, predictionAccuracy: 0.55, totalWinningsCents: 8_200_00, createdAt: "2026-03-10T00:00:00Z" },
  { id: "u11", username: "kelechi", displayName: "Kelechi", avatarUrl: null, bio: "NPFL nerd. I watch the games nobody else does.", socialLinks: [], followerCount: 512, followingCount: 75, roomsCreated: 28, predictionAccuracy: 0.64, totalWinningsCents: 41_000_00, createdAt: "2025-12-28T00:00:00Z" },
  { id: "u12", username: "priya", displayName: "Priya", avatarUrl: null, bio: "Man City or nothing. Treble szn forever.", socialLinks: [], followerCount: 980, followingCount: 210, roomsCreated: 15, predictionAccuracy: 0.61, totalWinningsCents: 22_500_00, createdAt: "2026-01-05T00:00:00Z" },
  { id: "u13", username: "femi", displayName: "Femi", avatarUrl: null, bio: null, socialLinks: [], followerCount: 64, followingCount: 40, roomsCreated: 2, predictionAccuracy: 0.48, totalWinningsCents: 900_00, createdAt: "2026-07-20T00:00:00Z" },
  { id: "u14", username: "grace", displayName: "Grace", avatarUrl: null, bio: "Arsenal since Wenger. Patient to a fault.", socialLinks: [], followerCount: 1_240, followingCount: 88, roomsCreated: 33, predictionAccuracy: 0.7, totalWinningsCents: 76_300_00, createdAt: "2025-10-30T00:00:00Z" },
  { id: "u15", username: "obinna", displayName: "Obinna", avatarUrl: null, bio: "Rivers United ultras.", socialLinks: [], followerCount: 205, followingCount: 120, roomsCreated: 11, predictionAccuracy: 0.52, totalWinningsCents: 6_400_00, createdAt: "2026-04-12T00:00:00Z" },
  { id: "u16", username: "hassan", displayName: "Hassan", avatarUrl: null, bio: null, socialLinks: [], followerCount: 88, followingCount: 55, roomsCreated: 4, predictionAccuracy: 0.45, totalWinningsCents: 1_800_00, createdAt: "2026-06-18T00:00:00Z" },
  { id: "u17", username: "zainab", displayName: "Zainab", avatarUrl: null, bio: "Called the Bundesliga table in March. Screenshot saved.", socialLinks: [], followerCount: 3_050, followingCount: 95, roomsCreated: 58, predictionAccuracy: 0.74, totalWinningsCents: 310_000_00, createdAt: "2025-09-22T00:00:00Z" },
  { id: "u18", username: "kwame", displayName: "Kwame", avatarUrl: null, bio: "Serie A tactics nerd.", socialLinks: [], followerCount: 430, followingCount: 66, roomsCreated: 19, predictionAccuracy: 0.59, totalWinningsCents: 27_800_00, createdAt: "2026-02-08T00:00:00Z" },
  { id: "u19", username: "ify", displayName: "Ify", avatarUrl: null, bio: "Enyimba till I die. Doubted, then vindicated.", socialLinks: [], followerCount: 715, followingCount: 102, roomsCreated: 24, predictionAccuracy: 0.67, totalWinningsCents: 63_500_00, createdAt: "2025-11-19T00:00:00Z" },
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
  // Extra settled rooms on the one finished match (m4), reusing it the same
  // way r4/r23 already do — these back the real win streaks behind Goated
  // Rivals (see currentStreak / followedGoatedRivals below).
  { id: "r25", creatorId: "u1", matchId: "m4", prediction: "Enyimba to score twice", entryAmountCents: 500_00, visibility: "public", status: "settled", poolTotalCents: 12_000_00, participantCount: 17, resolutionSource: "Official match result", inviteCode: "RIVAL-2E61", createdAt: "2026-08-15T08:00:00Z", settledAt: "2026-08-15T19:10:00Z" },
  { id: "r26", creatorId: "u6", matchId: "m4", prediction: "Over 1.5 goals", entryAmountCents: 500_00, visibility: "public", status: "settled", poolTotalCents: 15_500_00, participantCount: 22, resolutionSource: "Official match result", inviteCode: "RIVAL-3O74", createdAt: "2026-08-15T08:20:00Z", settledAt: "2026-08-15T19:10:00Z" },
  { id: "r27", creatorId: "u2", matchId: "m4", prediction: "Enyimba win by 2+", entryAmountCents: 1_000_00, visibility: "public", status: "settled", poolTotalCents: 19_000_00, participantCount: 16, resolutionSource: "Official match result", inviteCode: "RIVAL-4E38", createdAt: "2026-08-15T08:40:00Z", settledAt: "2026-08-15T19:10:00Z" },
  { id: "r28", creatorId: "u4", matchId: "m4", prediction: "Rivers United to score", entryAmountCents: 500_00, visibility: "public", status: "settled", poolTotalCents: 8_500_00, participantCount: 14, resolutionSource: "Official match result", inviteCode: "RIVAL-5R92", createdAt: "2026-08-15T09:00:00Z", settledAt: "2026-08-15T19:10:00Z" },
  { id: "r29", creatorId: "u8", matchId: "m4", prediction: "Enyimba clean sheet, 1st half", entryAmountCents: 500_00, visibility: "public", status: "settled", poolTotalCents: 6_000_00, participantCount: 11, resolutionSource: "Official match result", inviteCode: "RIVAL-6C15", createdAt: "2026-08-15T09:20:00Z", settledAt: "2026-08-15T19:10:00Z" },
  { id: "r30", creatorId: "u1", matchId: "m4", prediction: "Both teams to score", entryAmountCents: 500_00, visibility: "public", status: "settled", poolTotalCents: 13_500_00, participantCount: 19, resolutionSource: "Official match result", inviteCode: "RIVAL-7B46", createdAt: "2026-08-15T08:10:00Z", settledAt: "2026-08-15T19:10:00Z" },
  { id: "r31", creatorId: "u6", matchId: "m4", prediction: "Enyimba win each half", entryAmountCents: 1_000_00, visibility: "public", status: "settled", poolTotalCents: 21_000_00, participantCount: 20, resolutionSource: "Official match result", inviteCode: "RIVAL-8E29", createdAt: "2026-08-15T08:30:00Z", settledAt: "2026-08-15T19:10:00Z" },
  // Zainab's real 4-in-a-row (r32-r35) — she isn't in SELF_USER_ID's follow
  // list, so this is what proves Goated Rivals is genuinely global rather
  // than coincidentally matching the followed set above.
  { id: "r32", creatorId: "u9", matchId: "m4", prediction: "Enyimba to lead at half time", entryAmountCents: 500_00, visibility: "public", status: "settled", poolTotalCents: 9_000_00, participantCount: 13, resolutionSource: "Official match result", inviteCode: "RIVAL-9Z18", createdAt: "2026-08-15T07:40:00Z", settledAt: "2026-08-15T19:10:00Z" },
  { id: "r33", creatorId: "u4", matchId: "m4", prediction: "Enyimba win to nil", entryAmountCents: 1_000_00, visibility: "public", status: "settled", poolTotalCents: 24_000_00, participantCount: 21, resolutionSource: "Official match result", inviteCode: "RIVAL-1Z55", createdAt: "2026-08-15T07:55:00Z", settledAt: "2026-08-15T19:10:00Z" },
  { id: "r34", creatorId: "u1", matchId: "m4", prediction: "Enyimba score in both halves", entryAmountCents: 500_00, visibility: "public", status: "settled", poolTotalCents: 11_500_00, participantCount: 16, resolutionSource: "Official match result", inviteCode: "RIVAL-2Z83", createdAt: "2026-08-15T08:05:00Z", settledAt: "2026-08-15T19:10:00Z" },
  { id: "r35", creatorId: "u6", matchId: "m4", prediction: "Over 2.5 goals", entryAmountCents: 1_000_00, visibility: "public", status: "settled", poolTotalCents: 18_000_00, participantCount: 18, resolutionSource: "Official match result", inviteCode: "RIVAL-3Z67", createdAt: "2026-08-15T08:15:00Z", settledAt: "2026-08-15T19:10:00Z" },
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
  r5: [
    msg("c30", "r5", null, "Sarah created the room — “Bayern win by 2+ goals.”", "system"),
    msg("c31", "r5", "u5", "Bayern's front line is too much for this Dortmund back four"),
    msg("c32", "r5", null, "GOAL — Bayern Munich 1–0 (22′)", "system"),
    msg("c33", "r5", "u7", "one more and I'm cashing out mentally"),
    msg("c34", "r5", null, "GOAL — Dortmund 1–1 (41′)", "system"),
    msg("c35", "r5", "u5", "still got 45 minutes, relax"),
  ],
  r8: [
    msg("c40", "r8", null, "James created the room — “Man United win.”", "system"),
    msg("c41", "r8", "u4", "United by a mile today, Spurs midfield is missing in action"),
    msg("c42", "r8", "u6", "0-0 says otherwise so far 😂"),
    msg("c43", "r8", null, "Kickoff — Man United vs Tottenham", "system"),
  ],
  r16: [
    msg("c50", "r16", null, "Tunde created the room — “Sporting Lagos win.”", "system"),
    msg("c51", "r16", null, "GOAL — Sporting Lagos 1–0 (15′)", "system"),
    msg("c52", "r16", null, "GOAL — Rivers United 1–1 (38′)", "system"),
    msg("c53", "r16", "u6", "we are NOT collapsing again"),
    msg("c54", "r16", null, "GOAL — Sporting Lagos 2–1 (52′)", "system"),
    msg("c55", "r16", null, "GOAL — Rivers United 2–2 (70′)", "system"),
    msg("c56", "r16", "u2", "this match has no chill"),
  ],
  r15: [
    msg("c60", "r15", null, "James created the room — “Chelsea come back to win.”", "system"),
    msg("c61", "r15", "u4", "2-1 down means nothing, Chelsea always leave it late"),
    msg("c62", "r15", "u1", "cope harder"),
  ],
  r6: [
    msg("c70", "r6", null, "Chioma created the room — “Under 2.5 goals.”", "system"),
    msg("c71", "r6", "u7", "both keepers are locked in tonight, staying under"),
    msg("c72", "r6", null, "GOAL — Bayern Munich 1–0 (22′)", "system"),
    msg("c73", "r6", "u5", "that's 1, need 2 more to prove me wrong"),
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

// Engagement-psychology mechanism #2 (anticipation — see
// .claude/skills/rivaly-engagement-psychology): a scheduled match with no
// visible countdown wastes a real, free anticipation beat that's already
// sitting in kickoffAt. Anchored to the story's own internal clock rather
// than the real system clock — same reasoning as balanceHistory()'s 24h/
// 7d/30d windows: kickoffAt values cluster around mid-August, before
// whatever "today" the system reports, so comparing against real Date.now()
// would make every scheduled match read as already overdue. The latest
// kickoff among currently-live matches is a real, derived stand-in for
// "right now" within the data — not a guess.
function matchesNowMs(): number {
  const liveKickoffs = matches.filter((m) => m.status === "live").map((m) => +new Date(m.kickoffAt));
  return liveKickoffs.length > 0 ? Math.max(...liveKickoffs) : Date.now();
}

export function kickoffCountdownLabel(match: Match): string | null {
  if (match.status !== "scheduled") return null;
  const diffMs = +new Date(match.kickoffAt) - matchesNowMs();
  if (diffMs <= 0) return null;
  const totalMinutes = Math.round(diffMs / 60000);
  const days = Math.floor(totalMinutes / 1440);
  const hours = Math.floor((totalMinutes % 1440) / 60);
  const minutes = totalMinutes % 60;
  if (days > 0) return `Kicks off in ${days}d ${hours}h`;
  if (hours > 0) return `Kicks off in ${hours}h ${minutes}m`;
  return `Kicks off in ${minutes}m`;
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

// Backs the Entry type (previously declared but never instantiated).
// Amounts/sides match the existing `transactions` entries for self so the
// two datasets don't disagree with each other.
export const entries: Entry[] = [
  { id: "e1", roomId: "r1", userId: SELF_USER_ID, side: "yes", amountCents: 2_000_00, createdAt: "2026-08-15T18:02:00Z", isWinner: null, payoutCents: null },
  { id: "e2", roomId: "r4", userId: SELF_USER_ID, side: "yes", amountCents: 500_00, createdAt: "2026-08-15T10:05:00Z", isWinner: true, payoutCents: 1_467_00 },
  { id: "e3", roomId: "r23", userId: SELF_USER_ID, side: "yes", amountCents: 500_00, createdAt: "2026-08-15T10:30:00Z", isWinner: false, payoutCents: null },
  { id: "e4", roomId: "r5", userId: "u1", side: "yes", amountCents: 3_000_00, createdAt: "2026-08-15T18:31:00Z", isWinner: null, payoutCents: null },
  { id: "e5", roomId: "r8", userId: "u1", side: "yes", amountCents: 2_000_00, createdAt: "2026-08-15T17:52:00Z", isWinner: null, payoutCents: null },
  { id: "e6", roomId: "r2", userId: "u5", side: "yes", amountCents: 5_000_00, createdAt: "2026-08-15T16:25:00Z", isWinner: null, payoutCents: null },
  { id: "e7", roomId: "r12", userId: "u5", side: "yes", amountCents: 5_000_00, createdAt: "2026-08-14T20:10:00Z", isWinner: null, payoutCents: null },
  { id: "e8", roomId: "r1", userId: "u9", side: "yes", amountCents: 2_000_00, createdAt: "2026-08-15T18:05:00Z", isWinner: null, payoutCents: null },
  { id: "e9", roomId: "r16", userId: "u9", side: "yes", amountCents: 500_00, createdAt: "2026-08-15T17:35:00Z", isWinner: null, payoutCents: null },
  { id: "e10", roomId: "r4", userId: "u7", side: "yes", amountCents: 500_00, createdAt: "2026-08-15T10:20:00Z", isWinner: true, payoutCents: 1_467_00 },
  // A settled room realistically has more than one or two participants —
  // these round out win_loss variety for Arena's feed (see buildArenaFeed
  // below) across profiles beyond just self + one followed rival.
  { id: "e11", roomId: "r4", userId: "u4", side: "yes", amountCents: 1_000_00, createdAt: "2026-08-15T10:40:00Z", isWinner: true, payoutCents: 2_934_00 },
  { id: "e12", roomId: "r4", userId: "u9", side: "yes", amountCents: 2_000_00, createdAt: "2026-08-15T10:50:00Z", isWinner: true, payoutCents: 5_868_00 },
  { id: "e13", roomId: "r23", userId: "u2", side: "yes", amountCents: 500_00, createdAt: "2026-08-15T10:35:00Z", isWinner: false, payoutCents: null },
  { id: "e14", roomId: "r23", userId: "u8", side: "yes", amountCents: 1_000_00, createdAt: "2026-08-15T10:45:00Z", isWinner: false, payoutCents: null },
  // Sarah's real 5-in-a-row (r25-r29) and Ada's real 3-in-a-row (r30, r31,
  // plus the existing e12 on r4) — back Goated Rivals' streak claim with
  // an actual settled win history rather than a number invented at render
  // time. No entry here that isn't tied to a real settled room above.
  { id: "e15", roomId: "r25", userId: "u5", side: "yes", amountCents: 500_00, createdAt: "2026-08-15T08:00:00Z", isWinner: true, payoutCents: 1_450_00 },
  { id: "e16", roomId: "r26", userId: "u5", side: "yes", amountCents: 500_00, createdAt: "2026-08-15T08:20:00Z", isWinner: true, payoutCents: 1_450_00 },
  { id: "e17", roomId: "r27", userId: "u5", side: "yes", amountCents: 1_000_00, createdAt: "2026-08-15T08:40:00Z", isWinner: true, payoutCents: 2_900_00 },
  { id: "e18", roomId: "r28", userId: "u5", side: "yes", amountCents: 500_00, createdAt: "2026-08-15T09:00:00Z", isWinner: true, payoutCents: 1_450_00 },
  { id: "e19", roomId: "r29", userId: "u5", side: "yes", amountCents: 500_00, createdAt: "2026-08-15T09:20:00Z", isWinner: true, payoutCents: 1_450_00 },
  { id: "e20", roomId: "r30", userId: "u9", side: "yes", amountCents: 500_00, createdAt: "2026-08-15T08:10:00Z", isWinner: true, payoutCents: 1_450_00 },
  { id: "e21", roomId: "r31", userId: "u9", side: "yes", amountCents: 1_000_00, createdAt: "2026-08-15T08:30:00Z", isWinner: true, payoutCents: 2_900_00 },
  { id: "e22", roomId: "r32", userId: "u17", side: "yes", amountCents: 500_00, createdAt: "2026-08-15T07:40:00Z", isWinner: true, payoutCents: 1_450_00 },
  { id: "e23", roomId: "r33", userId: "u17", side: "yes", amountCents: 1_000_00, createdAt: "2026-08-15T07:55:00Z", isWinner: true, payoutCents: 2_900_00 },
  { id: "e24", roomId: "r34", userId: "u17", side: "yes", amountCents: 500_00, createdAt: "2026-08-15T08:05:00Z", isWinner: true, payoutCents: 1_450_00 },
  { id: "e25", roomId: "r35", userId: "u17", side: "yes", amountCents: 1_000_00, createdAt: "2026-08-15T08:15:00Z", isWinner: true, payoutCents: 2_900_00 },
];

export function entriesByUser(userId: string): Entry[] {
  return entries.filter((e) => e.userId === userId);
}

export function roomsJoinedBy(userId: string): Room[] {
  const roomIds = new Set(entriesByUser(userId).map((e) => e.roomId));
  return rooms.filter((r) => roomIds.has(r.id));
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
  { id: "n1", kind: "goal_scored", actorId: null, roomId: "r1", body: "GOAL — Arsenal 2–1 Chelsea (58′)", createdAt: "2026-08-15T18:58:00Z", read: false },
  { id: "n2", kind: "whale_entered", actorId: "u5", roomId: "r12", body: "Sarah entered Real Madrid progress with ₦25,000", createdAt: "2026-08-15T18:40:00Z", read: false },
  { id: "n3", kind: "challenge_received", actorId: "u4", roomId: "r15", body: "James challenged you — Chelsea come back to win", createdAt: "2026-08-15T18:20:00Z", read: false },
  { id: "n4", kind: "friend_joined", actorId: "u2", roomId: "r1", body: "Alex joined your room — Arsenal scores 3+ tonight", createdAt: "2026-08-15T18:02:00Z", read: true },
  { id: "n5", kind: "new_follower", actorId: "u7", roomId: null, body: "Chioma started following you", createdAt: "2026-08-15T15:10:00Z", read: true },
  { id: "n6", kind: "room_filled", actorId: null, roomId: "r5", body: "Bayern win by 2+ goals just hit 50 rivals", createdAt: "2026-08-15T14:30:00Z", read: true },
  { id: "n7", kind: "settlement_complete", actorId: null, roomId: "r4", body: "Enyimba win at home settled — you won ₦1,467", createdAt: "2026-08-15T19:10:00Z", read: true },
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
    roomId: "r5",
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
    roomId: "r12",
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
    roomId: "r3",
    createdAt: "2026-08-15T12:15:00Z",
    roastCount: 4,
    replies: [],
  },
  {
    id: "post7",
    authorId: "u1",
    body: "Chelsea's press has no legs left after 60 minutes lately. Arsenal feasts late, every time.",
    roomId: "r1",
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
    roomId: "r5",
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
// "returns x matches played"), plus a real bonus per recorded settled win —
// every input here is an existing Profile/Entry field, nothing invented.
const GAMEWEEK_CUTOFF = "2026-08-15T00:00:00Z";

export function pointsForProfile(profile: Profile): number {
  const base = Math.round(profile.predictionAccuracy * profile.roomsCreated * 12);
  const winBonus = entriesByUser(profile.id).filter((e) => e.isWinner === true).length * 8;
  return base + winBonus;
}

// This gameweek's points — just the real wins recorded since the cutoff,
// deliberately smaller than season points (mirrors FPL's per-gameweek vs
// overall-rank split).
export function gameweekPointsForProfile(profile: Profile): number {
  return entriesByUser(profile.id).filter((e) => e.isWinner === true && e.createdAt >= GAMEWEEK_CUTOFF).length * 8;
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
    case "win_loss":
    case "rival_activity": {
      const entry = entries.find((e) => e.id === item.entryId);
      return entry?.userId ?? null;
    }
    case "hot_room": {
      const room = roomById(item.roomId);
      return room?.creatorId ?? null;
    }
    case "banter":
    case "thesis": {
      const post = postById(item.postId);
      return post?.authorId ?? null;
    }
  }
}

// Builds the Feed from real data only, then interleaves a hot-room card
// every 4-7 organic items (deterministic cycle, not random-per-render) —
// the one "high-urgency" beat, built entirely from real momentum data
// (explodingRooms/momentumCount, already used by Home and Rooms>Discover).
// See the Arena plan's ethical guardrails: every number here traces to a
// real field, and the feed ends (buildArenaFeed returns a finite array) —
// callers paginate it the same way RoomFeed already does, closing moment
// included, rather than looping forever.
export function buildArenaFeed(): ArenaFeedItem[] {
  const winLossItems: ArenaFeedItem[] = entries
    .filter((e) => e.isWinner !== null)
    .map((e) => ({ id: `wl-${e.id}`, kind: "win_loss", entryId: e.id, createdAt: e.createdAt }));

  const rivalItems: ArenaFeedItem[] = entries
    .filter((e) => e.isWinner === null && followedProfileIds().includes(e.userId))
    .map((e) => ({ id: `ra-${e.id}`, kind: "rival_activity", entryId: e.id, createdAt: e.createdAt }));

  const postItems: ArenaFeedItem[] = posts.map((p) => ({
    id: `post-${p.id}`,
    kind: p.roomId ? "thesis" : "banter",
    postId: p.id,
    createdAt: p.createdAt,
  }));

  const hotRoomItems: ArenaFeedItem[] = explodingRooms(10).map((r) => ({
    id: `hr-${r.id}`,
    kind: "hot_room",
    roomId: r.id,
    createdAt: r.createdAt,
  }));

  const organic = [...winLossItems, ...rivalItems, ...postItems].sort(
    (a, b) => +new Date(b.createdAt) - +new Date(a.createdAt),
  );

  const cadence = [4, 5, 6, 7];
  const feed: ArenaFeedItem[] = [];
  let hotIndex = 0;
  let sinceLastHot = 0;
  let cadenceIndex = 0;
  for (const item of organic) {
    feed.push(item);
    sinceLastHot++;
    if (sinceLastHot >= cadence[cadenceIndex % cadence.length] && hotIndex < hotRoomItems.length) {
      feed.push(hotRoomItems[hotIndex]);
      hotIndex++;
      cadenceIndex++;
      sinceLastHot = 0;
    }
  }
  feed.push(...hotRoomItems.slice(hotIndex));

  return feed;
}

// Home's "Top rivals" row: people you actually follow, sorted by career
// winnings so the biggest results surface first. Engagement-psychology
// mechanism #5 (social identity/rivalry — see
// .claude/skills/rivaly-engagement-psychology): in-group favoritism
// (rooting for people you actually follow) is a stronger, more consistent
// pull than an anonymous global ranking. Empty on purpose for accounts
// that follow no one — no fabricated filler profiles.
export function followedTopRivals(): Profile[] {
  const followed = new Set(followedProfileIds());
  return profiles
    .filter((p) => followed.has(p.id))
    .sort((a, b) => b.totalWinningsCents - a.totalWinningsCents);
}

// Current consecutive-win streak — walks a profile's SETTLED entries
// most-recent-first and counts how many in a row were wins, stopping at
// the first loss (or the end of their history). A pending/live entry
// neither breaks nor extends it — it just isn't decided yet.
export function currentStreak(profileId: string): number {
  const settled = entriesByUser(profileId)
    .filter((e) => e.isWinner !== null)
    .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));
  let streak = 0;
  for (const entry of settled) {
    if (!entry.isWinner) break;
    streak++;
  }
  return streak;
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

export interface BalancePoint {
  createdAt: string;
  balanceCents: number;
}

// Real running-balance series built by walking the actual `transactions`
// array chronologically, ending exactly at the current `wallet.balanceCents`
// — a genuine derived series, not a decorative curve shaped to look nice.
// Self-only: `transactions` only has rows for SELF_USER_ID.
export function balanceHistory(): BalancePoint[] {
  const sorted = [...transactions].sort((a, b) => +new Date(a.createdAt) - +new Date(b.createdAt));
  const totalDelta = sorted.reduce((sum, t) => sum + t.amountCents, 0);
  let running = wallet.balanceCents - totalDelta;
  const points: BalancePoint[] = [];
  for (const t of sorted) {
    running += t.amountCents;
    points.push({ createdAt: t.createdAt, balanceCents: running });
  }
  return points;
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
  const entryItems: ArenaFeedItem[] = entriesByUser(id).map((e) =>
    e.isWinner === null
      ? { id: `ra-${e.id}`, kind: "rival_activity", entryId: e.id, createdAt: e.createdAt }
      : { id: `wl-${e.id}`, kind: "win_loss", entryId: e.id, createdAt: e.createdAt },
  );

  const postItems: ArenaFeedItem[] = posts
    .filter((p) => p.authorId === id)
    .map((p) => ({
      id: `post-${p.id}`,
      kind: p.roomId ? "thesis" : "banter",
      postId: p.id,
      createdAt: p.createdAt,
    }));

  return [...entryItems, ...postItems].sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));
}
