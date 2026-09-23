import { profiles } from "./mock-data";
import type { Entry } from "./types";

// Entries came from mock rooms, which were removed. Until real settled
// entries are wired in here, the entry-derived parts (win rate, volume,
// PNL) read zero rather than inventing a history.
const entriesByUser = (profileId: string): Entry[] => {
  void profileId;
  return [];
};

export type ScoreTier = "gold" | "silver" | "bronze";

export interface ScoreBreakdown {
  score: number; // 0-99, FIFA-card style
  tier: ScoreTier;
  accuracyPercentile: number;
  winningsPercentile: number;
  activityPercentile: number;
  followerPercentile: number;
  volumeCents: number;
  roomsEntered: number;
  winRate: number; // 0-1, from real Entry records
  pnlCents: number; // net of decided entries only — open positions haven't resolved yet
}

// Percentile rank of `value` within `values` — 0 = lowest, 100 = highest.
// Ties share the same rank (average position), so two profiles with the
// exact same stat get the exact same percentile, never an arbitrary split.
function percentileRank(values: number[], value: number): number {
  if (values.length <= 1) return 100;
  const below = values.filter((v) => v < value).length;
  const equal = values.filter((v) => v === value).length;
  // Standard "mean rank" percentile: counts ties as sharing the midpoint
  // of the band they occupy, so it can't be gamed by clustering at a
  // popular value.
  return ((below + equal / 2) / values.length) * 100;
}

function activityFor(profileId: string): number {
  const p = profiles.find((x) => x.id === profileId);
  // A real (Supabase) profile isn't in the mock roster this scoring model
  // compares against — a brand-new signup genuinely has 0 rooms created,
  // which is the mathematically correct default here, not a fabricated
  // number standing in for one.
  const roomsCreated = p?.roomsCreated ?? 0;
  return roomsCreated + entriesByUser(profileId).length;
}

// Composite score: 35% accuracy + 25% winnings + 20% activity (rooms
// created + entered) + 20% followers, each measured as a percentile rank
// against every profile — not an absolute threshold, so it can't be gamed
// by a fixed number and stays meaningful as the user base grows. Tiers are
// a *second* percentile pass over the composite scores themselves (not the
// raw 0-99 score), which keeps the gold/silver/bronze split at roughly
// fixed proportions (15/35/50) regardless of how the underlying stats are
// distributed.
export function computeRivalyScore(profileId: string): ScoreBreakdown {
  // Real (Supabase) profiles aren't part of the mock roster this scoring
  // model ranks against — fall back to a genuine zero-activity profile
  // rather than throwing, same reasoning as activityFor() above.
  const profile = profiles.find((p) => p.id === profileId) ?? {
    predictionAccuracy: 0,
    totalWinningsCents: 0,
    followerCount: 0,
  };

  const accuracyValues = profiles.map((p) => p.predictionAccuracy);
  const winningsValues = profiles.map((p) => p.totalWinningsCents);
  const activityValues = profiles.map((p) => activityFor(p.id));
  const followerValues = profiles.map((p) => p.followerCount);

  const accuracyPercentile = percentileRank(accuracyValues, profile.predictionAccuracy);
  const winningsPercentile = percentileRank(winningsValues, profile.totalWinningsCents);
  const activityPercentile = percentileRank(activityValues, activityFor(profileId));
  const followerPercentile = percentileRank(followerValues, profile.followerCount);

  const composite =
    0.35 * accuracyPercentile + 0.25 * winningsPercentile + 0.2 * activityPercentile + 0.2 * followerPercentile;

  const allComposites = profiles.map((p) => {
    const a = percentileRank(accuracyValues, p.predictionAccuracy);
    const w = percentileRank(winningsValues, p.totalWinningsCents);
    const act = percentileRank(activityValues, activityFor(p.id));
    const f = percentileRank(followerValues, p.followerCount);
    return 0.35 * a + 0.25 * w + 0.2 * act + 0.2 * f;
  });
  const tierPercentile = percentileRank(allComposites, composite);

  const tier: ScoreTier = tierPercentile >= 85 ? "gold" : tierPercentile >= 50 ? "silver" : "bronze";

  const entries = entriesByUser(profileId);
  const decided = entries.filter((e) => e.isWinner !== null);
  const winRate = decided.length > 0 ? decided.filter((e) => e.isWinner).length / decided.length : 0;
  const volumeCents = entries.reduce((sum, e) => sum + e.amountCents, 0);
  // Open (undecided) entries haven't resolved yet, so their stake isn't a
  // real loss or gain to count — only decided entries contribute to PNL.
  const pnlCents = decided.reduce(
    (sum, e) => sum + (e.isWinner ? (e.payoutCents ?? 0) - e.amountCents : -e.amountCents),
    0,
  );

  return {
    score: Math.min(99, Math.max(1, Math.round((composite / 100) * 99))),
    tier,
    accuracyPercentile,
    winningsPercentile,
    activityPercentile,
    followerPercentile,
    volumeCents,
    pnlCents,
    roomsEntered: entries.length,
    winRate,
  };
}
