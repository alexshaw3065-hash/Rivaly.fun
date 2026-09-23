"use server";

import { createClient } from "@/lib/supabase/server";
import { getMatchById } from "@/lib/supabase/matches";
import { composeMarket, invalidMarketReason, marketFitsSport, MIN_STAKE_FLOOR_CENTS, sportOf, type CreateRoomMarket } from "@/lib/markets";
import { stakeableFor } from "@/lib/wallet/stakeable";
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

// `code` lets the UI react to the failures it can fix in place — sign in,
// or add USDC to the wallet — instead of only showing a message.
export type MoneyErrorCode = "not_signed_in" | "insufficient_balance" | "no_wallet";

export type CreateRoomResult =
  | { ok: true; roomId: string; inviteCode: string }
  | { ok: false; error: string; code?: MoneyErrorCode };

const isCents = (n: unknown): n is number => typeof n === "number" && Number.isInteger(n);

// The money functions (supabase/migrations/*_rivaly_balance.sql) raise short
// machine-readable reasons; this is the one place they become words.
const DB_ERRORS: Record<string, { error: string; code?: MoneyErrorCode }> = {
  not_signed_in: { error: "Sign in to continue.", code: "not_signed_in" },
  insufficient_balance: { error: "Not enough USDC in your wallet for that stake.", code: "insufficient_balance" },
  stake_out_of_range: { error: "That stake is outside this room's limits." },
  bad_limits: { error: "Max stake has to be at least the minimum." },
  room_not_found: { error: "Room not found." },
  room_closed: { error: "This room isn't open for entries anymore." },
  already_joined: { error: "You're already in this room." },
  stakes_closed: { error: "Stakes are closed — this match has kicked off." },
  match_not_found: { error: "That match isn't open for rooms." },
};

// The stake has to be covered by the user's own wallet (its devnet USDC,
// minus stakes already open elsewhere) — checked here, on the server, right
// before the entry is written. Returns an error result, or null when it fits.
async function walletCovers(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  stakeCents: number,
): Promise<{ ok: false; error: string; code?: MoneyErrorCode } | null> {
  const { data: profile } = await supabase.from("profiles").select("dynamic_wallet_address").eq("id", userId).maybeSingle();
  const address = profile?.dynamic_wallet_address as string | null | undefined;
  if (!address) return { ok: false, error: "Your wallet is still being set up — try again in a moment.", code: "no_wallet" };
  try {
    const { availableCents } = await stakeableFor(supabase, userId, address);
    if (availableCents < stakeCents) {
      return {
        ok: false,
        error: `Your wallet has $${(availableCents / 100).toFixed(2)} free to stake — add USDC or lower the stake.`,
        code: "insufficient_balance",
      };
    }
    return null;
  } catch {
    return { ok: false, error: "Couldn't read your wallet balance — try again." };
  }
}

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

  const short = await walletCovers(supabase, user.id, stakeCents);
  if (short) return short;

  // One transaction in Postgres: the room and the creator's entry land
  // together, or neither does.
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

  const short = await walletCovers(supabase, user.id, amountCents);
  if (short) return short;

  // Limits, open status and one-entry-per-person are checked inside the
  // function, under a row lock on the room.
  const { error } = await supabase.rpc("join_room_with_stake", { p_room: roomId, p_side: side, p_amount: amountCents });
  if (error) return dbError(error.message, "Couldn't join the room — try again.");
  return { ok: true };
}
