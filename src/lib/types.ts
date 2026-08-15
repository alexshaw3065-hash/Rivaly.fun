/**
 * Core domain types for Rivaly's V1 scope.
 * See docs/masterplan/08-v1-scope.md for what V1 actually includes, and
 * docs/masterplan/07-product-blueprint.md for the full long-term surface area.
 *
 * These mirror the Supabase schema once it exists — update both together.
 */

export type UserId = string;
export type RoomId = string;
export type MatchId = string;
export type EntryId = string;
export type TransactionId = string;
export type PackId = string;

export interface Profile {
  id: UserId;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  bio: string | null;
  followerCount: number;
  followingCount: number;
  roomsCreated: number;
  predictionAccuracy: number; // 0-1
  totalWinningsCents: number;
  createdAt: string;
}

export type MatchStatus = "scheduled" | "live" | "finished" | "postponed" | "cancelled";

export interface Match {
  id: MatchId;
  competition: string;
  homeTeam: string;
  awayTeam: string;
  kickoffAt: string;
  status: MatchStatus;
  homeScore: number | null;
  awayScore: number | null;
}

export type RoomVisibility = "public" | "private";
export type RoomStatus = "open" | "live" | "settled" | "cancelled" | "refunded";

/**
 * The resolution condition and source must always be known to users before
 * they enter a room. See docs/masterplan/09-competitive-research.md#5.12.
 */
export interface Room {
  id: RoomId;
  creatorId: UserId;
  matchId: MatchId;
  prediction: string; // e.g. "Arsenal wins"
  entryAmountCents: number;
  visibility: RoomVisibility;
  status: RoomStatus;
  poolTotalCents: number;
  participantCount: number;
  resolutionSource: string;
  inviteCode: string;
  createdAt: string;
  settledAt: string | null;
}

export type EntrySide = "yes" | "no";

export interface Entry {
  id: EntryId;
  roomId: RoomId;
  userId: UserId;
  side: EntrySide;
  amountCents: number;
  createdAt: string;
  isWinner: boolean | null; // null until room settles
  payoutCents: number | null;
}

export type TransactionType = "deposit" | "withdrawal" | "entry" | "payout" | "refund" | "fee";
export type TransactionStatus = "pending" | "completed" | "failed";

export interface Transaction {
  id: TransactionId;
  userId: UserId;
  type: TransactionType;
  status: TransactionStatus;
  amountCents: number;
  roomId: RoomId | null;
  createdAt: string;
}

export interface Wallet {
  userId: UserId;
  balanceCents: number;
  pendingCents: number;
  escrowCents: number;
}

export interface Follow {
  followerId: UserId;
  followingId: UserId;
  createdAt: string;
}

/**
 * A "pack" bundles 2-4 individual predictions (each tied to its own match)
 * into a single conviction ticket — per masterplan 07-product-blueprint.md
 * §5.8 "Express Predictions." Framed as "I have conviction across these
 * events," not a sportsbook bet-slip builder: no odds math shown per leg,
 * just the combined payout multiplier if every leg hits.
 */
export interface PackLeg {
  matchId: MatchId;
  prediction: string;
}

export interface Pack {
  id: PackId;
  creatorId: UserId;
  legs: PackLeg[];
  entryAmountCents: number;
  poolTotalCents: number;
  participantCount: number;
  payoutMultiplier: number; // combined return if every leg hits, e.g. 4.2
  status: RoomStatus;
  createdAt: string;
}

export type ChatMessageKind = "message" | "system";

export interface ChatMessage {
  id: string;
  roomId: RoomId;
  userId: UserId | null; // null for system messages
  kind: ChatMessageKind;
  body: string;
  createdAt: string;
}
