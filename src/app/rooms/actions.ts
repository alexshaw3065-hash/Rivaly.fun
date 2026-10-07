"use server";

import { randomUUID } from "node:crypto";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getMatchById } from "@/lib/supabase/matches";
import { matchIsScored } from "@/lib/supabase/scored-competitions";
import { composeMarket, invalidMarketReason, marketFitsMatch, MIN_STAKE_FLOOR_CENTS, type CreateRoomMarket } from "@/lib/markets";
import { walletUsdcCents } from "@/lib/wallet/stakeable";
import { buildLineups } from "@/lib/match-lineups";
import {
  buildStakeTransaction,
  cosignAndSend,
  EscrowError,
  escrowConfigured,
  sendSignedBatch,
  signPayoutBatch,
} from "@/lib/escrow/escrow";
import type { EntrySide } from "@/lib/types";

// Every stake is a gasless on-chain transfer from the user's own embedded
// wallet into Rivaly's escrow, in two steps (docs/plans/escrow-wallet-build.md):
//
//   prepareStake — validate everything, then build the exact transfer (the
//                  escrow pays the fee) and remember it as a stake intent.
//   submitStake  — take the user-signed copy, co-sign only if it's
//                  byte-identical, send, confirm; only then write the room /
//                  entry, with the transfer's signature as its receipt.
//
// Intents and entries are written with the service role: an entry must
// never exist without a verified transfer behind it, so clients can't write
// either (see the escrow_phase2 migration).

export type { CreateRoomMarket };

export interface CreateRoomInput {
  matchId: string;
  market: CreateRoomMarket;
  // The creator's own position. A "No" pick in the UI (e.g. "no red card")
  // is sent as the positive claim ("A red card is shown") with side "no", so
  // every market keeps one canonical Yes definition for settlement.
  side: EntrySide;
  stakeCents: number;
  // Room rules. maxStakeCents null = no upper limit.
  minStakeCents: number;
  maxStakeCents: number | null;
  visibility: "public" | "private";
  allowSpectators: boolean;
}

export type StakeRequest =
  | { kind: "create"; room: CreateRoomInput }
  | { kind: "join"; roomId: string; side: EntrySide; amountCents: number };

// `code` lets the UI fix what it can in place — sign in, add USDC.
export type MoneyErrorCode = "not_signed_in" | "insufficient_balance" | "no_wallet";
type Fail = { ok: false; error: string; code?: MoneyErrorCode };

export type PrepareResult = { ok: true; intentId: string; transactionBase64: string } | Fail;
export type SubmitResult = { ok: true; roomId: string; inviteCode: string | null; signature: string } | Fail;

// Matches from competitions we don't get live scores for (see
// scored-competitions.ts) can't settle, so no money goes into them.
const NOT_COVERED = "We can't follow this match live, so rooms aren't open for it.";

// Leave time to read the wallet's confirm screen before kickoff locks stakes.
const KICKOFF_BUFFER_MS = 60_000;

const isCents = (n: unknown): n is number => typeof n === "number" && Number.isInteger(n);

const DB_ERRORS: Record<string, string> = {
  stake_out_of_range: "That stake is outside this room's limits.",
  bad_limits: "Max stake has to be at least the minimum.",
  room_not_found: "Room not found.",
  room_closed: "This room isn't open for entries anymore.",
  already_joined: "You're already in this room.",
  stakes_closed: "Stakes are closed — this match has kicked off.",
  match_not_found: "That match isn't open for rooms.",
};

/** Chain and wallet errors are unreadable; money is the worst place for a stack trace. */
function readable(e: unknown): string {
  if (e instanceof EscrowError) return e.message;
  const raw = e instanceof Error ? e.message : String(e);
  const lower = raw.toLowerCase();
  if (lower.includes("insufficient") || lower.includes("no record of a prior credit")) {
    return "Not enough USDC in your wallet for that stake.";
  }
  if (lower.includes("blockhash") || lower.includes("expired")) return "That took too long to confirm — try again.";
  if (lower.includes("account not found") || lower.includes("invalid account data")) return "Your wallet doesn't hold USDC yet.";
  return "Couldn't send the stake — try again.";
}

interface Validated {
  userId: string;
  wallet: string;
  amountCents: number;
  side: EntrySide;
  roomId: string | null;
  payload: Record<string, unknown>;
}

async function validate(req: StakeRequest): Promise<Validated | Fail> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Sign in to continue.", code: "not_signed_in" };
  if (!escrowConfigured()) return { ok: false, error: "Stakes are paused right now — try again soon." };

  const { data: profile } = await supabase.from("profiles").select("dynamic_wallet_address").eq("id", user.id).maybeSingle();
  const wallet = profile?.dynamic_wallet_address as string | null | undefined;
  if (!wallet) return { ok: false, error: "Your wallet is still being set up — try again in a moment.", code: "no_wallet" };

  const admin = createAdminClient();
  // Operations controls (/admin): account restrictions, pause switches, the platform stake cap.
  const [{ data: restricted }, { data: flags }, { data: settings }] = await Promise.all([
    admin.rpc("is_restricted", { p_user: user.id }),
    admin.from("feature_flags").select("key, enabled").in("key", ["stakes_paused", "room_creation_paused"]),
    admin.from("platform_settings").select("max_stake_cents").eq("id", true).maybeSingle(),
  ]);
  if (restricted) return { ok: false, error: "Your account can't stake right now. Contact support if you think this is a mistake." };
  const flagOn = (k: string) => ((flags ?? []) as { key: string; enabled: boolean }[]).some((f) => f.key === k && f.enabled);
  if (flagOn("stakes_paused")) return { ok: false, error: "Stakes are paused for a moment — try again soon." };
  if (req.kind === "create" && flagOn("room_creation_paused")) return { ok: false, error: "New rooms are paused for a moment — try again soon." };
  const platformMax = (settings?.max_stake_cents as number | null | undefined) ?? null;
  let result: Omit<Validated, "userId" | "wallet">;

  if (req.kind === "create") {
    const input = req.room;
    const { minStakeCents, maxStakeCents, stakeCents } = input;
    if (!isCents(minStakeCents) || minStakeCents < MIN_STAKE_FLOOR_CENTS) return { ok: false, error: "Minimum stake is too low." };
    if (maxStakeCents !== null && (!isCents(maxStakeCents) || maxStakeCents < minStakeCents)) {
      return { ok: false, error: "Max stake has to be at least the minimum." };
    }
    if (!isCents(stakeCents) || stakeCents < minStakeCents || (maxStakeCents !== null && stakeCents > maxStakeCents)) {
      return { ok: false, error: "Your stake has to sit inside the room's limits." };
    }
    if (input.side !== "yes" && input.side !== "no") return { ok: false, error: "Pick a side." };
    const invalid = invalidMarketReason(input.market);
    if (invalid) return { ok: false, error: invalid };

    const match = await getMatchById(input.matchId);
    if (!match) return { ok: false, error: "Couldn't find that match — try again." };
    if (match.status !== "scheduled" || +new Date(match.kickoffAt) - Date.now() < KICKOFF_BUFFER_MS) {
      return { ok: false, error: DB_ERRORS.stakes_closed };
    }
    if (!marketFitsMatch(input.market, match)) return { ok: false, error: "That market doesn't exist for this match." };
    // A room settles from the live score feed; no feed, no room.
    if (!(await matchIsScored(admin, input.matchId))) return { ok: false, error: NOT_COVERED };

    // Anytime goalscorer: the player must be in this match's line-up, on the
    // side picked. The name comes from the line-up, never from the client.
    let market = input.market;
    if (market.type === "anytime_scorer") {
      const { data: rows } = await admin
        .from("match_events")
        .select("action, minute, payload")
        .eq("match_id", input.matchId)
        .eq("action", "lineups")
        .order("occurred_at", { ascending: false })
        .limit(1);
      const lineups = buildLineups((rows ?? []) as { action: string; minute: number | null; payload: Record<string, unknown> | null }[], match.homeTeam, match.awayTeam);
      if (!lineups) return { ok: false, error: "The line-ups aren't out yet — try closer to kick-off." };
      const side = lineups[market.team];
      const player = [...side.lines.flat(), ...side.bench].find((p) => p.id === (market as { playerId: number }).playerId);
      if (!player) return { ok: false, error: "That player isn't in the line-up." };
      market = { ...market, player: player.surname || player.name };
    }

    const composed = composeMarket(market, match);
    result = {
      amountCents: stakeCents,
      side: input.side,
      roomId: null,
      payload: {
        p_match_id: input.matchId,
        p_prediction: composed.prediction,
        p_market_type: composed.marketType,
        p_market_line: composed.marketLine,
        p_market_side_definition: composed.marketSideDefinition,
        p_settlement_mode: composed.settlementMode,
        p_resolution_source: composed.settlementMode === "auto" ? "Official match result" : "Official match scoresheet",
        p_visibility: input.visibility,
        p_allow_spectators: input.allowSpectators,
        p_min_stake: minStakeCents,
        p_max_stake: maxStakeCents,
      },
    };
  } else {
    const { roomId, side, amountCents } = req;
    if (side !== "yes" && side !== "no") return { ok: false, error: "Pick a side." };
    if (!isCents(amountCents) || amountCents < 1) return { ok: false, error: "Enter your stake." };
    // The service role sees private rooms too — holding the invite code is
    // what got the user this far (room_by_invite_code).
    const { data: room } = await admin
      .from("rooms")
      .select("status, match_id, min_stake_cents, max_stake_cents")
      .eq("id", roomId)
      .maybeSingle();
    if (!room) return { ok: false, error: DB_ERRORS.room_not_found };
    if (room.status !== "open") return { ok: false, error: DB_ERRORS.room_closed };
    if (amountCents < room.min_stake_cents || (room.max_stake_cents !== null && amountCents > room.max_stake_cents)) {
      return { ok: false, error: DB_ERRORS.stake_out_of_range };
    }
    const { data: m } = await admin.from("matches").select("status, kickoff_at").eq("id", room.match_id).maybeSingle();
    if (!m || m.status !== "scheduled" || +new Date(m.kickoff_at) - Date.now() < KICKOFF_BUFFER_MS) {
      return { ok: false, error: DB_ERRORS.stakes_closed };
    }
    if (!(await matchIsScored(admin, room.match_id as string))) return { ok: false, error: NOT_COVERED };
    const { data: existing } = await admin.from("entries").select("id").eq("room_id", roomId).eq("user_id", user.id).maybeSingle();
    if (existing) return { ok: false, error: DB_ERRORS.already_joined };
    result = { amountCents, side, roomId, payload: { p_room: roomId } };
  }

  if (platformMax !== null && result.amountCents > platformMax) {
    return { ok: false, error: `Stakes are capped at $${(platformMax / 100).toFixed(2)} right now.` };
  }

  try {
    const cents = await walletUsdcCents(wallet);
    if (cents < result.amountCents) {
      return {
        ok: false,
        error: `Your wallet has $${(cents / 100).toFixed(2)} USDC — add USDC or lower the stake.`,
        code: "insufficient_balance",
      };
    }
  } catch {
    return { ok: false, error: "Couldn't read your wallet balance — try again." };
  }

  return { userId: user.id, wallet, ...result };
}

/** Step 1: validate and build the exact gasless transfer for the user's wallet to sign. */
export async function prepareStake(req: StakeRequest): Promise<PrepareResult> {
  const v = await validate(req);
  if ("ok" in v) return v;

  const intentId = randomUUID();
  let prepared;
  try {
    prepared = await buildStakeTransaction(v.wallet, v.amountCents, intentId);
  } catch (e) {
    return { ok: false, error: readable(e) };
  }

  const { error } = await createAdminClient().from("stake_intents").insert({
    id: intentId,
    user_id: v.userId,
    kind: req.kind,
    room_id: v.roomId,
    payload: v.payload,
    side: v.side,
    amount_cents: v.amountCents,
    wallet_address: v.wallet,
    message_base64: prepared.messageBase64,
    last_valid_block_height: prepared.lastValidBlockHeight,
  });
  if (error) return { ok: false, error: "Couldn't start the stake — try again." };
  return { ok: true, intentId, transactionBase64: prepared.transactionBase64 };
}

/** Sends a stake back to the wallet it came from — used when the entry can't be written after the transfer landed. */
async function refundIntent(intent: { id: string; wallet_address: string; amount_cents: number }): Promise<string | null> {
  const admin = createAdminClient();
  try {
    const batch = await signPayoutBatch([{ to: intent.wallet_address, cents: intent.amount_cents }]);
    await admin.from("stake_intents").update({ error: `refund:${batch.signature}` }).eq("id", intent.id);
    await sendSignedBatch(batch);
    return batch.signature;
  } catch {
    // Left as 'submitted' with its transfer signature: the recovery pass in
    // settlement finds it and finishes the refund.
    return null;
  }
}

/** Step 2: co-sign the user-signed transfer, send it, and only then write the room / entry. */
export async function submitStake(intentId: string, signedTransactionBase64: string): Promise<SubmitResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Sign in to continue.", code: "not_signed_in" };
  const admin = createAdminClient();

  // Claim the intent exactly once — a double tap can't send twice.
  const { data: intent } = await admin
    .from("stake_intents")
    .update({ status: "submitted" })
    .eq("id", intentId)
    .eq("user_id", user.id)
    .eq("status", "prepared")
    .gt("expires_at", new Date().toISOString())
    .select("*")
    .maybeSingle();
  if (!intent) return { ok: false, error: "That stake expired — tap again to retry." };

  let signature: string;
  try {
    signature = await cosignAndSend(
      signedTransactionBase64,
      intent.message_base64,
      intent.wallet_address,
      intent.last_valid_block_height,
      async (sig) => {
        await admin.from("stake_intents").update({ tx_signature: sig }).eq("id", intentId);
      },
    );
  } catch (e) {
    // Not marked failed if a signature was recorded: the transfer may still
    // have landed, and the recovery pass decides from the chain.
    const error = readable(e);
    await admin.from("stake_intents").update({ status: "failed", error }).eq("id", intentId).is("tx_signature", null);
    return { ok: false, error };
  }

  const payload = intent.payload as Record<string, unknown>;
  const write =
    intent.kind === "create"
      ? await admin
          .rpc("create_room_with_stake", {
            p_user: user.id,
            ...payload,
            p_side: intent.side,
            p_stake: intent.amount_cents,
            p_stake_tx: signature,
          })
          .single<{ room_id: string; invite_code: string }>()
      : await admin.rpc("join_room_with_stake", {
          p_user: user.id,
          p_room: payload.p_room,
          p_side: intent.side,
          p_amount: intent.amount_cents,
          p_stake_tx: signature,
        });

  if (write.error) {
    // The money already moved but the entry can't exist (e.g. kickoff passed
    // while the wallet was confirming): send it straight back.
    const refund = await refundIntent(intent);
    if (refund) await admin.from("stake_intents").update({ status: "failed" }).eq("id", intentId);
    const reason = DB_ERRORS[write.error.message] ?? "Couldn't record the stake.";
    return {
      ok: false,
      error: refund ? `${reason} Your $${(intent.amount_cents / 100).toFixed(2)} was sent back to your wallet.` : `${reason} Your refund is on its way.`,
    };
  }

  const created = intent.kind === "create" ? (write.data as { room_id: string; invite_code: string }) : null;
  const roomId = created?.room_id ?? (payload.p_room as string);
  await admin.from("stake_intents").update({ status: "completed", room_id: roomId }).eq("id", intentId);
  return { ok: true, roomId, inviteCode: created?.invite_code ?? null, signature };
}
