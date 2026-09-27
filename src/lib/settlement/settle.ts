// Server-only settlement engine. Runs every minute (see /api/cron/settle)
// and opportunistically when a room is viewed. Every step is idempotent: it
// can run twice, crash half-way, or race another run, and nobody is paid
// twice or skipped. See docs/plans/escrow-wallet-build.md.

import { createAdminClient } from "@/lib/supabase/admin";
import {
  currentBlockHeight,
  escrowConfigured,
  escrowUsdcCents,
  PAYOUTS_PER_TX,
  sendSignedBatch,
  signPayoutBatch,
  transactionState,
} from "@/lib/escrow/escrow";
import type { MarketSideDefinition, MatchStatus } from "@/lib/types";
import { decideSettlement, resolveMarket, type MatchEventFact, type MatchFacts, type Pending } from "./resolve";
import { planSettlement } from "./payouts";

type Admin = ReturnType<typeof createAdminClient>;

export type RoomSettleResult =
  | { roomId: string; state: "skipped" | "open" | "pending" | "paying" | "settled" | "refunded"; detail?: string };

interface RoomRow {
  id: string;
  status: string;
  match_id: string;
  market_side_definition: MarketSideDefinition | null;
  resolved_outcome: "yes" | "no" | "void" | null;
  pending_outcome: "yes" | "no" | null;
  pending_since: string | null;
  creator_id: string;
  fee_bps: number;
  host_fee_bps: number;
  fee_plan: FeePlan | null;
}

const SETTLEMENT_ACTIONS = ["halftime_finalised", "penalty", "var", "var_end", "instant_replay", "instant_replay_end", "action_discarded", "action_amend"];

async function loadMatch(admin: Admin, matchId: string): Promise<{ facts: MatchFacts; kickoffAt: string; events: MatchEventFact[] } | null> {
  const { data: m } = await admin
    .from("matches")
    .select(
      "status, kickoff_at, home_score, away_score, home_score_ht, away_score_ht, home_corners, away_corners, home_yellow_cards, away_yellow_cards, home_red_cards, away_red_cards, home_touchdowns, away_touchdowns, home_field_goals, away_field_goals, went_to_overtime",
    )
    .eq("id", matchId)
    .maybeSingle();
  if (!m) return null;
  // Only the actions the rules read (resolve.ts). A match is ~1000 stored
  // records now that possession states are kept, and one request returns at
  // most 1000 — reading everything could silently drop a late penalty or
  // the half-time whistle.
  const { data: ev } = await admin
    .from("match_events")
    .select("action, occurred_at, payload")
    .eq("match_id", matchId)
    .in("action", SETTLEMENT_ACTIONS);
  // An event the feed later discarded (reported in error) never happened —
  // e.g. a penalty first reported then withdrawn mustn't lock a "penalty"
  // room. The discard itself stays, so correctedSince() still sees it.
  const discarded = new Set<unknown>(
    (ev ?? []).filter((e) => e.action === "action_discarded").map((e) => (e.payload as { _eid?: number } | null)?._eid).filter((id) => typeof id === "number"),
  );
  const kept = (ev ?? []).filter((e) => e.action === "action_discarded" || !discarded.has((e.payload as { _eid?: number } | null)?._eid));
  return {
    kickoffAt: m.kickoff_at,
    facts: {
      status: m.status as MatchStatus,
      homeScore: m.home_score,
      awayScore: m.away_score,
      homeScoreHt: m.home_score_ht,
      awayScoreHt: m.away_score_ht,
      homeCorners: m.home_corners,
      awayCorners: m.away_corners,
      homeYellowCards: m.home_yellow_cards,
      awayYellowCards: m.away_yellow_cards,
      homeRedCards: m.home_red_cards,
      awayRedCards: m.away_red_cards,
      homeTouchdowns: m.home_touchdowns,
      awayTouchdowns: m.away_touchdowns,
      homeFieldGoals: m.home_field_goals,
      awayFieldGoals: m.away_field_goals,
      wentToOvertime: m.went_to_overtime,
    },
    events: kept.map((e) => ({ action: e.action as string, at: +new Date(e.occurred_at as string) })),
  };
}

/** Step 1-2: decide the room, honouring the safety window. Returns the claimed outcome, or null while undecided. */
async function decide(admin: Admin, room: RoomRow, now: number): Promise<{ outcome: "yes" | "no" | "void" | null; state: RoomSettleResult["state"] }> {
  if (room.resolved_outcome) return { outcome: room.resolved_outcome, state: "paying" };

  const match = await loadMatch(admin, room.match_id);
  if (!match) return { outcome: null, state: "skipped" };

  // Stakes close at kickoff: the room goes live and stops taking entries.
  if (room.status === "open" && (match.facts.status !== "scheduled" || +new Date(match.kickoffAt) <= now)) {
    await admin.from("rooms").update({ status: "live" }).eq("id", room.id).eq("status", "open");
  }

  const pending: Pending | null =
    room.pending_outcome && room.pending_since ? { outcome: room.pending_outcome, since: +new Date(room.pending_since) } : null;
  const resolution = resolveMarket(room.market_side_definition, match.facts, match.events);
  const decision = decideSettlement(resolution, pending, match.events, now);

  if (decision.action === "hold") {
    const next = decision.pending;
    const changed = next?.outcome !== pending?.outcome || next?.since !== pending?.since;
    if (changed) {
      await admin
        .from("rooms")
        .update({ pending_outcome: next?.outcome ?? null, pending_since: next ? new Date(next.since).toISOString() : null })
        .eq("id", room.id)
        .is("resolved_outcome", null);
    }
    return { outcome: null, state: next ? "pending" : "open" };
  }

  // Claim the result exactly once — a racing run gets nothing back.
  const { data: claimed } = await admin
    .from("rooms")
    .update({ resolved_outcome: decision.outcome, resolved_at: new Date(now).toISOString(), pending_outcome: null, pending_since: null })
    .eq("id", room.id)
    .is("resolved_outcome", null)
    .select("id")
    .maybeSingle();
  return claimed ? { outcome: decision.outcome, state: "paying" } : { outcome: null, state: "skipped" };
}

interface EntryRow {
  id: string;
  side: "yes" | "no";
  amount_cents: number;
  payout_tx_signature: string | null;
  payout_valid_until_height: number | null;
  profile: { dynamic_wallet_address: string | null } | null;
}

/** A room's fee rates, frozen by the first payout run (rooms.fee_plan). */
interface FeePlan {
  rivalyBps: number;
  hostBps: number;
}

/**
 * Freeze the room's fee rates, once, before anything is paid — so every
 * later run (a retry, a racing run) splits the pool exactly the same way.
 */
async function feePlanFor(admin: Admin, room: RoomRow): Promise<FeePlan> {
  if (room.fee_plan) return room.fee_plan;
  const plan: FeePlan = { rivalyBps: room.fee_bps ?? 0, hostBps: room.host_fee_bps ?? 0 };
  await admin.from("rooms").update({ fee_plan: plan }).eq("id", room.id).is("fee_plan", null);
  const { data: stored } = await admin.from("rooms").select("fee_plan").eq("id", room.id).maybeSingle();
  return (stored?.fee_plan as FeePlan | null) ?? plan;
}

/**
 * Step 3: pay (or refund) every entry, recording each batch's signature
 * before it's sent. The room's fees aren't sent anywhere: they're recorded
 * in room_fees and stay in escrow — the host claims theirs from the wallet
 * (src/app/wallet/actions.ts), Rivaly's is withdrawn from the admin page.
 */
async function pay(admin: Admin, room: RoomRow, outcome: "yes" | "no" | "void"): Promise<RoomSettleResult["state"]> {
  const roomId = room.id;
  const { data } = await admin
    .from("entries")
    .select("id, side, amount_cents, payout_tx_signature, payout_valid_until_height, profile:profiles(dynamic_wallet_address)")
    .eq("room_id", roomId)
    .not("stake_tx_signature", "is", null);
  const entries = (data ?? []) as unknown as EntryRow[];
  const fees = await feePlanFor(admin, room);
  const settlement = planSettlement(
    entries.map((e) => ({ id: e.id, side: e.side, amountCents: e.amount_cents })),
    outcome,
    fees,
  );
  const plan = settlement.payouts;

  // Results first (idempotent): who won, and how much each is owed.
  for (const p of plan) {
    await admin.from("entries").update({ is_winner: p.isWinner, payout_cents: p.cents }).eq("id", p.entryId);
  }
  // Fees earned, recorded once (the plan is frozen, so a re-run writes the same rows).
  const feeRows = [
    ...(settlement.rivalyCents > 0 ? [{ room_id: roomId, kind: "rivaly", recipient_id: null, cents: settlement.rivalyCents }] : []),
    ...(settlement.hostCents > 0 ? [{ room_id: roomId, kind: "host", recipient_id: room.creator_id, cents: settlement.hostCents }] : []),
  ];
  if (feeRows.length > 0) await admin.from("room_fees").upsert(feeRows, { onConflict: "room_id,kind", ignoreDuplicates: true });

  // Anything already sent: landed, failed, or still landing?
  let inFlight = false;
  const height = entries.some((e) => e.payout_tx_signature) ? await currentBlockHeight() : 0;
  const confirmedSigs = new Set<string>();
  for (const e of entries) {
    if (!e.payout_tx_signature) continue;
    const state = confirmedSigs.has(e.payout_tx_signature) ? "confirmed" : await transactionState(e.payout_tx_signature);
    if (state === "confirmed") {
      confirmedSigs.add(e.payout_tx_signature);
      continue;
    }
    const expired = state === "failed" || (e.payout_valid_until_height !== null && height > e.payout_valid_until_height);
    if (expired) {
      await admin.from("entries").update({ payout_tx_signature: null, payout_valid_until_height: null }).eq("id", e.id);
      e.payout_tx_signature = null;
    } else {
      inFlight = true; // may still land — never resend while it could
    }
  }
  if (inFlight) return "paying";

  const byId = new Map(entries.map((e) => [e.id, e]));
  const owedNow = plan
    .filter((p) => p.cents > 0 && !byId.get(p.entryId)?.payout_tx_signature)
    .map((p) => ({ entryId: p.entryId, to: byId.get(p.entryId)?.profile?.dynamic_wallet_address ?? null, cents: p.cents }));
  const unpaid = owedNow.filter((p): p is { entryId: string; to: string; cents: number } => Boolean(p.to));
  // Every staker staked from a wallet, so this shouldn't happen — but if an
  // address is missing, keep the room open rather than close it with money
  // still owed.
  const missing = owedNow.length - unpaid.length;
  if (missing > 0) console.error(`[settlement] room ${roomId}: ${missing} payout(s) have no wallet address`);

  for (let i = 0; i < unpaid.length; i += PAYOUTS_PER_TX) {
    const chunk = unpaid.slice(i, i + PAYOUTS_PER_TX);
    const signed = await signPayoutBatch(chunk.map((c) => ({ to: c.to, cents: c.cents })));
    await admin
      .from("entries")
      .update({ payout_tx_signature: signed.signature, payout_valid_until_height: signed.lastValidBlockHeight })
      .in(
        "id",
        chunk.map((c) => c.entryId),
      );
    try {
      await sendSignedBatch(signed);
    } catch {
      return "paying"; // next run checks this signature on-chain before doing anything else
    }
  }

  if (missing > 0) return "paying";

  // Everyone owed has a confirmed (or just-confirmed) payout — close the room.
  const final = outcome === "void" || plan.every((p) => p.isWinner === null) ? "refunded" : "settled";
  await admin.from("rooms").update({ status: final, settled_at: new Date().toISOString() }).eq("id", roomId).in("status", ["open", "live"]);
  return final;
}

/**
 * Host claims that didn't finish in the request that started them (a crash,
 * a timeout, a slow chain). Decided from the chain: landed → confirmed;
 * failed or expired → released, so the balance is claimable again; still
 * landing → left alone.
 */
async function recoverClaims(admin: Admin): Promise<void> {
  const cutoff = new Date(Date.now() - 2 * 60_000).toISOString();
  const { data } = await admin
    .from("fee_claims")
    .select("id, status, payout_tx_signature, payout_valid_until_height")
    .in("status", ["pending", "sent"])
    .lt("created_at", cutoff)
    .limit(50);
  const claims = (data ?? []) as { id: string; status: string; payout_tx_signature: string | null; payout_valid_until_height: number | null }[];
  if (claims.length === 0) return;
  const height = claims.some((c) => c.payout_tx_signature) ? await currentBlockHeight() : 0;
  for (const c of claims) {
    if (!c.payout_tx_signature) {
      // Never signed: nothing can land.
      await admin.from("fee_claims").update({ status: "failed" }).eq("id", c.id).eq("status", c.status);
      continue;
    }
    const state = await transactionState(c.payout_tx_signature);
    if (state === "confirmed") {
      await admin.from("fee_claims").update({ status: "confirmed", confirmed_at: new Date().toISOString() }).eq("id", c.id);
    } else if (state === "failed" || (c.payout_valid_until_height !== null && height > c.payout_valid_until_height)) {
      await admin.from("fee_claims").update({ status: "failed" }).eq("id", c.id).eq("status", c.status);
    }
  }
}

export async function settleRoom(roomId: string, now = Date.now()): Promise<RoomSettleResult> {
  if (!escrowConfigured()) return { roomId, state: "skipped", detail: "escrow not configured" };
  const admin = createAdminClient();
  const { data: room } = await admin
    .from("rooms")
    .select("id, status, match_id, market_side_definition, resolved_outcome, pending_outcome, pending_since, creator_id, fee_bps, host_fee_bps, fee_plan")
    .eq("id", roomId)
    .maybeSingle<RoomRow>();
  if (!room || !["open", "live"].includes(room.status)) return { roomId, state: "skipped" };

  const { outcome, state } = await decide(admin, room, now);
  if (!outcome) return { roomId, state };
  return { roomId, state: await pay(admin, room, outcome) };
}

/**
 * A stake whose transfer may have landed but whose entry was never written
 * (a crash or timeout mid-submit). Decided from the chain: written already →
 * complete; transfer landed → refund it; never landed → failed.
 */
async function recoverStakes(admin: Admin): Promise<number> {
  const cutoff = new Date(Date.now() - 3 * 60_000).toISOString();
  const { data } = await admin
    .from("stake_intents")
    .select("id, wallet_address, amount_cents, tx_signature, error")
    .eq("status", "submitted")
    .lt("created_at", cutoff)
    .limit(20);
  let handled = 0;
  for (const intent of data ?? []) {
    if (!intent.tx_signature) {
      await admin.from("stake_intents").update({ status: "failed", error: intent.error ?? "never sent" }).eq("id", intent.id);
      continue;
    }
    const { data: entry } = await admin.from("entries").select("room_id").eq("stake_tx_signature", intent.tx_signature).maybeSingle();
    if (entry) {
      await admin.from("stake_intents").update({ status: "completed", room_id: entry.room_id }).eq("id", intent.id);
      continue;
    }
    const refundSig = typeof intent.error === "string" && intent.error.startsWith("refund:") ? intent.error.slice(7) : null;
    if (refundSig) {
      const state = await transactionState(refundSig);
      if (state === "confirmed") await admin.from("stake_intents").update({ status: "failed" }).eq("id", intent.id);
      continue; // still landing (or failed — left for an operator; logged by reconciliation)
    }
    const stakeState = await transactionState(intent.tx_signature);
    if (stakeState === "confirmed") {
      const batch = await signPayoutBatch([{ to: intent.wallet_address, cents: intent.amount_cents }]);
      await admin.from("stake_intents").update({ error: `refund:${batch.signature}` }).eq("id", intent.id);
      await sendSignedBatch(batch).catch(() => undefined);
      handled++;
    } else {
      await admin.from("stake_intents").update({ status: "failed" }).eq("id", intent.id);
    }
  }
  return handled;
}

export interface SettleRunResult {
  rooms: RoomSettleResult[];
  recovered: number;
  escrow?: { balanceCents: number; owedCents: number; ok: boolean };
}

/** One settlement pass over every room that could need attention, within a time budget. */
export async function settleDueRooms(budgetMs = 45_000): Promise<SettleRunResult> {
  if (!escrowConfigured()) return { rooms: [], recovered: 0 };
  const started = Date.now();
  const admin = createAdminClient();
  const { data } = await admin.from("rooms").select("id").in("status", ["open", "live"]).order("created_at").limit(100);

  const rooms: RoomSettleResult[] = [];
  for (const { id } of data ?? []) {
    if (Date.now() - started > budgetMs) break;
    try {
      rooms.push(await settleRoom(id));
    } catch (e) {
      const detail = e instanceof Error ? e.message : String(e);
      rooms.push({ roomId: id, state: "skipped", detail });
      // Visible in /admin → Settlement → Failed (best-effort).
      await admin
        .from("platform_events")
        .insert({ type: "SETTLEMENT_FAILED", room_id: id, source: "settlement", status: "failed", metadata: { error: detail.slice(0, 300) } })
        .then(() => undefined, () => undefined);
    }
  }
  const recovered = await recoverStakes(admin).catch(() => 0);
  await recoverClaims(admin).catch((e) => console.error("[settlement] claim recovery:", e instanceof Error ? e.message : e));

  // Reconciliation: escrow must always hold at least what open rooms owe.
  const { data: owed } = await admin
    .from("entries")
    .select("amount_cents, room:rooms!inner(status)")
    .in("room.status", ["open", "live"])
    .not("stake_tx_signature", "is", null);
  const stakesOwed = ((owed ?? []) as { amount_cents: number }[]).reduce((s, e) => s + e.amount_cents, 0);
  // Fees earned but not yet paid out of escrow (unclaimed, or a claim still landing).
  const { data: feeRows } = await admin.from("room_fees").select("cents, claim:fee_claims(status)");
  const feesOwed = ((feeRows ?? []) as unknown as { cents: number; claim: { status: string } | null }[])
    .filter((f) => f.claim?.status !== "confirmed")
    .reduce((s, f) => s + Number(f.cents), 0);
  const owedCents = stakesOwed + feesOwed;
  const balanceCents = await escrowUsdcCents();
  const ok = balanceCents >= owedCents;
  if (!ok) console.error(`[settlement] escrow short: holds ${balanceCents}c, owes ${owedCents}c (stakes ${stakesOwed}c + unclaimed fees ${feesOwed}c)`);

  return { rooms, recovered, escrow: { balanceCents, owedCents, ok } };
}
