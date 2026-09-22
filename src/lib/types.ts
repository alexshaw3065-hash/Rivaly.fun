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

// The set a profile can connect — kept small and deliberately football/
// crypto-adjacent rather than Reddit's full 20-platform list (Shopify,
// OnlyFans, Kickstarter, etc. don't fit Rivaly).
export type SocialPlatform = "x" | "discord" | "telegram" | "instagram" | "tiktok" | "youtube";

export interface SocialLink {
  platform: SocialPlatform;
  handle: string;
}

export interface Profile {
  id: UserId;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  bio: string | null;
  socialLinks: SocialLink[]; // max 5, same cap Reddit uses
  followerCount: number;
  followingCount: number;
  roomsCreated: number;
  predictionAccuracy: number; // 0-1
  totalWinningsCents: number;
  createdAt: string;
  // null for the seeded mock roster (never went through Dynamic) and for
  // real signups where Dynamic hasn't finished provisioning the embedded
  // wallet yet — see dynamic-actions.ts's self-healing note. Non-null is
  // the signal the wallet UI uses to read a real on-chain balance instead
  // of the mock one (see src/lib/wallet/use-live-balance.ts).
  dynamicWalletAddress: string | null;
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

// Tier 1 (winner/total_goals/both_score) resolves automatically from
// matches.home_score/away_score — no human step. Tier 3 (custom) is a
// free-text claim the creator confirms after the match. See the create-room
// plan for the full tiering — settlementMode below is the queryable fact of
// which one a given room is.
export type MarketType = "winner" | "total_goals" | "both_score" | "custom";
export type SettlementMode = "auto" | "creator_confirms";

// Structured shape of what "Yes" resolves to for a Tier 1 room. Deliberately
// mirrors TxLINE's own TraderPredicate/StatTerm shape (confirmed against the
// real on-chain IDL) so a later on-chain-settlement effort has a straight
// path in without another migration.
export interface MarketSideDefinition {
  stat: "total_goals" | "winner" | "both_score";
  comparison?: "over" | "under";
  // total_goals: the line, e.g. 2.5. winner: which team "Yes" claims wins —
  // 1 for home, 2 for away (same Participant1/Participant2 convention used
  // throughout the TxLINE integration), never a draw — entries.side is a
  // hard yes/no, so a 3-way market isn't representable without a bigger
  // schema change. both_score: unused.
  threshold?: number;
}

/**
 * The resolution condition and source must always be known to users before
 * they enter a room. See docs/masterplan/09-competitive-research.md#5.12.
 */
export interface Room {
  id: RoomId;
  creatorId: UserId;
  matchId: MatchId;
  prediction: string; // e.g. "Arsenal wins" — server-composed for Tier 1, creator-typed for custom
  entryAmountCents: number;
  visibility: RoomVisibility;
  status: RoomStatus;
  poolTotalCents: number;
  participantCount: number;
  resolutionSource: string;
  inviteCode: string;
  createdAt: string;
  settledAt: string | null;
  marketType: MarketType;
  marketLine: number | null;
  marketSideDefinition: MarketSideDefinition | null;
  settlementMode: SettlementMode;
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

/**
 * Arena's banter/thesis content — see docs/masterplan/07-product-blueprint.md
 * §4.13 (Arena, formerly "Following"). `roomId` is set for thesis posts (a
 * conviction argument attached to a real room) and null for plain banter.
 * Replies are user-generated peer roasting, not system copy — the platform's
 * own voice never mocks anyone (docs/masterplan/06-emotion-design.md's
 * Losing rule).
 */
export interface PostReply {
  authorId: UserId;
  body: string;
  createdAt: string;
}

export interface Post {
  id: string;
  authorId: UserId;
  body: string;
  roomId: RoomId | null;
  createdAt: string;
  roastCount: number;
  replies: PostReply[];
}

/**
 * Arena Feed items reference existing data (entries, rooms, posts) rather
 * than duplicating it — every number a card shows is traceable back to a
 * real field, never fabricated. See buildArenaFeed() in mock-data.ts.
 */
export type ArenaFeedItemKind = "win_loss" | "hot_room" | "rival_activity" | "banter" | "thesis";

interface ArenaFeedItemBase {
  id: string;
  createdAt: string;
}

export interface ArenaWinLossItem extends ArenaFeedItemBase {
  kind: "win_loss";
  entryId: EntryId;
}

export interface ArenaHotRoomItem extends ArenaFeedItemBase {
  kind: "hot_room";
  roomId: RoomId;
}

export interface ArenaRivalActivityItem extends ArenaFeedItemBase {
  kind: "rival_activity";
  entryId: EntryId;
}

export interface ArenaPostItem extends ArenaFeedItemBase {
  kind: "banter" | "thesis";
  postId: string;
}

export type ArenaFeedItem =
  | ArenaWinLossItem
  | ArenaHotRoomItem
  | ArenaRivalActivityItem
  | ArenaPostItem;

/**
 * Points-only (no entry fee, no prize pool) FPL-style league — see
 * docs/masterplan/08-v1-scope.md. Joined the same way private rooms are:
 * an invite code.
 */
export interface PredictionLeague {
  id: string;
  name: string;
  code: string;
  memberIds: UserId[];
  createdAt: string;
}
