/**
 * Realistic placeholder content for V1 screens, shaped exactly like the
 * Supabase rows defined in src/lib/types.ts. Swap for real queries once
 * a Supabase project is linked — every screen should already work with
 * this data with zero prop-shape changes.
 */
import type { Match, Room, Profile, ChatMessage, Transaction, Wallet } from "./types";

export const matches: Match[] = [
  {
    id: "m1",
    competition: "Premier League",
    homeTeam: "Arsenal",
    awayTeam: "Chelsea",
    kickoffAt: "2026-08-15T19:30:00Z",
    status: "live",
    homeScore: 2,
    awayScore: 1,
  },
  {
    id: "m2",
    competition: "Premier League",
    homeTeam: "Man City",
    awayTeam: "Liverpool",
    kickoffAt: "2026-08-15T21:00:00Z",
    status: "scheduled",
    homeScore: null,
    awayScore: null,
  },
  {
    id: "m3",
    competition: "La Liga",
    homeTeam: "Real Madrid",
    awayTeam: "Barcelona",
    kickoffAt: "2026-08-16T19:00:00Z",
    status: "scheduled",
    homeScore: null,
    awayScore: null,
  },
  {
    id: "m4",
    competition: "NPFL",
    homeTeam: "Enyimba",
    awayTeam: "Rivers United",
    kickoffAt: "2026-08-15T17:00:00Z",
    status: "finished",
    homeScore: 3,
    awayScore: 1,
  },
];

export const profiles: Profile[] = [
  {
    id: "u1",
    username: "danielk",
    displayName: "Daniel",
    avatarUrl: null,
    bio: "Arsenal 'til I die. Wrong sometimes, loud always.",
    followerCount: 842,
    followingCount: 210,
    roomsCreated: 34,
    predictionAccuracy: 0.72,
    totalWinningsCents: 84_000_00,
    createdAt: "2025-11-02T00:00:00Z",
  },
  {
    id: "u2",
    username: "alexr",
    displayName: "Alex",
    avatarUrl: null,
    bio: null,
    followerCount: 156,
    followingCount: 98,
    roomsCreated: 12,
    predictionAccuracy: 0.58,
    totalWinningsCents: 12_400_00,
    createdAt: "2026-01-14T00:00:00Z",
  },
  {
    id: "u3",
    username: "victorj",
    displayName: "Victor",
    avatarUrl: null,
    bio: "Building Rivaly. Predicting on Rivaly.",
    followerCount: 2_310,
    followingCount: 45,
    roomsCreated: 61,
    predictionAccuracy: 0.66,
    totalWinningsCents: 250_000_00,
    createdAt: "2025-09-01T00:00:00Z",
  },
];

export const rooms: Room[] = [
  {
    id: "r1",
    creatorId: "u1",
    matchId: "m1",
    prediction: "Arsenal scores 3+ tonight",
    entryAmountCents: 2_000_00,
    visibility: "public",
    status: "live",
    poolTotalCents: 84_000_00,
    participantCount: 24,
    resolutionSource: "Official match result",
    inviteCode: "RIVAL-7X92",
    createdAt: "2026-08-15T18:00:00Z",
    settledAt: null,
  },
  {
    id: "r2",
    creatorId: "u3",
    matchId: "m2",
    prediction: "Man City win by 2+ goals",
    entryAmountCents: 5_000_00,
    visibility: "public",
    status: "open",
    poolTotalCents: 210_000_00,
    participantCount: 41,
    resolutionSource: "Official match result",
    inviteCode: "RIVAL-4K18",
    createdAt: "2026-08-15T16:20:00Z",
    settledAt: null,
  },
  {
    id: "r3",
    creatorId: "u2",
    matchId: "m3",
    prediction: "El Clasico ends in a draw",
    entryAmountCents: 1_000_00,
    visibility: "public",
    status: "open",
    poolTotalCents: 38_000_00,
    participantCount: 19,
    resolutionSource: "Official match result",
    inviteCode: "RIVAL-9Q05",
    createdAt: "2026-08-15T12:00:00Z",
    settledAt: null,
  },
  {
    id: "r4",
    creatorId: "u1",
    matchId: "m4",
    prediction: "Enyimba win at home",
    entryAmountCents: 500_00,
    visibility: "public",
    status: "settled",
    poolTotalCents: 22_000_00,
    participantCount: 15,
    resolutionSource: "Official match result",
    inviteCode: "RIVAL-2P77",
    createdAt: "2026-08-15T10:00:00Z",
    settledAt: "2026-08-15T19:10:00Z",
  },
];

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

// Deterministic mock YES/NO split so the same room shows the same number
// everywhere. Swap for a real entry-side aggregate once rooms are wired
// to Supabase.
export function splitPct(room: Room): number {
  const seed = room.id.charCodeAt(room.id.length - 1);
  return 50 + (seed % 30);
}
