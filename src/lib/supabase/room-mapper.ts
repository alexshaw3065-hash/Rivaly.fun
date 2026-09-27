import type { Room } from "@/lib/types";

// Environment-agnostic (no server or browser Supabase client import) so
// both src/lib/supabase/rooms.ts (server queries) and any client-side
// query (e.g. rooms-mine-feed.tsx, which can't import the server client)
// can share the exact same row shape and mapping logic.

export interface RoomRow {
  id: string;
  creator_id: string;
  match_id: string;
  prediction: string;
  entry_amount_cents: number;
  visibility: "public" | "private";
  status: Room["status"];
  pool_total_cents: number;
  yes_total_cents: number;
  no_total_cents: number;
  participant_count: number;
  resolution_source: string;
  invite_code: string;
  created_at: string;
  settled_at: string | null;
  market_type: Room["marketType"];
  market_line: number | null;
  market_side_definition: Room["marketSideDefinition"];
  settlement_mode: Room["settlementMode"];
  min_stake_cents: number;
  max_stake_cents: number | null;
  allow_spectators: boolean;
  resolved_outcome: "yes" | "no" | "void" | null;
  fee_bps?: number | null;
  host_fee_bps?: number | null;
  fee_plan?: { rivalyBps: number; hostBps: number } | null;
}

/**
 * A real room carries its yes/no totals too — splitPctFromTotals() needs
 * them. Mock rooms leave both undefined (splitPct(room) computes their
 * split its own way, from a seeded hash of the id), so callers can branch
 * on `room.yesTotalCents !== undefined` to know which math to use without
 * needing to separately check whether an id is real or mock.
 */
export type RoomWithTotals = Room & { yesTotalCents?: number; noTotalCents?: number };

export function mapRoomRow(row: RoomRow): RoomWithTotals {
  return {
    id: row.id,
    creatorId: row.creator_id,
    matchId: row.match_id,
    prediction: row.prediction,
    entryAmountCents: row.entry_amount_cents,
    visibility: row.visibility,
    status: row.status,
    poolTotalCents: row.pool_total_cents,
    participantCount: row.participant_count,
    resolutionSource: row.resolution_source,
    inviteCode: row.invite_code,
    createdAt: row.created_at,
    settledAt: row.settled_at,
    yesTotalCents: row.yes_total_cents,
    noTotalCents: row.no_total_cents,
    marketType: row.market_type,
    marketLine: row.market_line,
    marketSideDefinition: row.market_side_definition,
    settlementMode: row.settlement_mode,
    minStakeCents: row.min_stake_cents,
    maxStakeCents: row.max_stake_cents,
    allowSpectators: row.allow_spectators,
    resolvedOutcome: row.resolved_outcome,
    // What the fee actually is: the frozen plan once the room has paid out,
    // otherwise the rates it was created with.
    feeBps: row.fee_plan?.rivalyBps ?? row.fee_bps ?? 0,
    hostFeeBps: row.fee_plan?.hostBps ?? row.host_fee_bps ?? 0,
  };
}

export const ROOM_COLUMNS =
  "id, creator_id, match_id, prediction, entry_amount_cents, visibility, status, pool_total_cents, yes_total_cents, no_total_cents, participant_count, resolution_source, invite_code, created_at, settled_at, market_type, market_line, market_side_definition, settlement_mode, min_stake_cents, max_stake_cents, allow_spectators, resolved_outcome, fee_bps, host_fee_bps, fee_plan";

// Real ids are UUIDs; every mock room id is a short "r1"-style string —
// cheap, reliable way to know which source to query without hitting both.
export const ROOM_UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Same math splitPct() already does for mock rooms (a real share of the
// pool), just computed from the trigger-maintained totals instead of a
// seeded hash of the room id.
export function splitPctFromTotals(yesCents: number, noCents: number): number {
  const total = yesCents + noCents;
  if (total === 0) return 50;
  return Math.round((100 * yesCents) / total);
}
