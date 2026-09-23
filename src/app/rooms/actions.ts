"use server";

import { createClient } from "@/lib/supabase/server";
import { getMatchById } from "@/lib/supabase/matches";
import { composeMarket, invalidMarketReason, marketFitsSport, MIN_STAKE_FLOOR_CENTS, sportOf, type CreateRoomMarket } from "@/lib/markets";
import type { EntrySide } from "@/lib/types";

export type { CreateRoomMarket };

export interface CreateRoomInput {
  matchId: string;
  market: CreateRoomMarket;
  // The creator's own position: which side of the composed claim they back
  // and for how much. A "No" pick in the UI (e.g. "no red card") is sent as
  // the positive claim ("A red card is shown") with side "no", so every
  // market keeps one canonical Yes definition for settlement.
  side: EntrySide;
  stakeCents: number;
  // Room rules. maxStakeCents null = no upper limit.
  minStakeCents: number;
  maxStakeCents: number | null;
  visibility: "public" | "private";
  allowSpectators: boolean;
}

// `code` lets the UI react to the two failures it can fix in place — sign
// in, or top up — instead of only showing a message.
export type MoneyErrorCode = "not_signed_in" | "insufficient_balance";

export type CreateRoomResult =
  | { ok: true; roomId: string; inviteCode: string }
  | { ok: false; error: string; code?: MoneyErrorCode };

const isCents = (n: unknown): n is number => typeof n === "number" && Number.isInteger(n);

// The money functions (supabase/migrations/*_rivaly_balance.sql) raise short
// machine-readable reasons; this is the one place they become words.
const DB_ERRORS: Record<string, { error: string; code?: MoneyErrorCode }> = {
  not_signed_in: { error: "Sign in to continue.", code: "not_signed_in" },
  insufficient_balance: { error: "Not enough in your balance for that stake.", code: "insufficient_balance" },
  stake_out_of_range: { error: "That stake is outside this room's limits." },
  bad_limits: { error: "Max stake has to be at least the minimum." },
  room_not_found: { error: "Room not found." },
  room_closed: { error: "This room isn't open for entries anymore." },
  already_joined: { error: "You're already in this room." },
  balance_high: { error: "You've already got $100 or more to play with." },
};

function dbError(message: string | undefined, fallback: string): { ok: false; error: string; code?: MoneyErrorCode } {
  const known = message ? DB_ERRORS[message] : undefined;
  return { ok: false, ...(known ?? { error: fallback }) };
}

export async function createRoom(input: CreateRoomInput): Promise<CreateRoomResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Sign in to create a room.", code: "not_signed_in" };

  const { minStakeCents, maxStakeCents, stakeCents } = input;
  if (!isCents(minStakeCents) || minStakeCents < MIN_STAKE_FLOOR_CENTS) {
    return { ok: false, error: "Minimum stake is too low." };
  }
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
  if (match.status === "finished" || match.status === "cancelled") {
    return { ok: false, error: "That match is already over." };
  }
  if (!marketFitsSport(input.market, sportOf(match))) {
    return { ok: false, error: "That market doesn't exist for this match." };
  }

  const composed = composeMarket(input.market, match);

  // One transaction in Postgres: the room, the creator's entry and the stake
  // debit all land together, or none of them do.
  const { data, error } = await supabase
    .rpc("create_room_with_stake", {
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
      p_side: input.side,
      p_stake: stakeCents,
    })
    .single<{ room_id: string; invite_code: string }>();

  if (error || !data) return dbError(error?.message, "Couldn't create the room — try again.");
  return { ok: true, roomId: data.room_id, inviteCode: data.invite_code };
}

export type JoinRoomResult = { ok: true } | { ok: false; error: string; code?: MoneyErrorCode };

export async function joinRoom(roomId: string, side: EntrySide, amountCents: number): Promise<JoinRoomResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Sign in to join a room.", code: "not_signed_in" };
  if (side !== "yes" && side !== "no") return { ok: false, error: "Pick a side." };
  if (!isCents(amountCents) || amountCents < 1) return { ok: false, error: "Enter your stake." };

  // Limits, open status, one-entry-per-person and the balance are all
  // checked inside the function, under a row lock, together with the debit.
  const { error } = await supabase.rpc("join_room_with_stake", { p_room: roomId, p_side: side, p_amount: amountCents });
  if (error) return dbError(error.message, "Couldn't join the room — try again.");
  return { ok: true };
}

export type ClaimResult = { ok: true; balanceCents: number } | { ok: false; error: string; code?: MoneyErrorCode };

/** Devnet only: +$100 test USDC when the balance is under $100. */
export async function claimTestUsdc(): Promise<ClaimResult> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("claim_test_usdc");
  if (error || typeof data !== "number") return dbError(error?.message, "Couldn't add test USDC — try again.");
  return { ok: true, balanceCents: data };
}
