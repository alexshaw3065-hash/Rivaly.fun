"use server";

import { createClient } from "@/lib/supabase/server";
import { getMatchById } from "@/lib/supabase/matches";
import { composeMarket, invalidMarketReason, MIN_STAKE_FLOOR_CENTS, type CreateRoomMarket } from "@/lib/markets";
import type { EntrySide } from "@/lib/types";

const CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no 0/O/1/I — avoids ambiguous codes read aloud or handwritten

function randomInviteCode(): string {
  let suffix = "";
  for (let i = 0; i < 4; i++) suffix += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
  return `RIVAL-${suffix}`;
}

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

export type CreateRoomResult =
  | { ok: true; roomId: string; inviteCode: string }
  | { ok: false; error: string };

const isCents = (n: unknown): n is number => typeof n === "number" && Number.isInteger(n);

export async function createRoom(input: CreateRoomInput): Promise<CreateRoomResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Sign in to create a room." };

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

  const composed = composeMarket(input.market, match);

  // invite_code has a unique constraint — retry a few times on the rare
  // collision rather than failing the whole creation over it.
  for (let attempt = 0; attempt < 5; attempt++) {
    const inviteCode = randomInviteCode();
    const { data, error } = await supabase
      .from("rooms")
      .insert({
        creator_id: user.id,
        match_id: input.matchId,
        prediction: composed.prediction,
        // Kept for the surfaces that still read a single entry amount (room
        // card, JoinPanel) — the minimum is always a valid entry.
        entry_amount_cents: minStakeCents,
        min_stake_cents: minStakeCents,
        max_stake_cents: maxStakeCents,
        visibility: input.visibility,
        // Spectators only mean something for public rooms — private rooms
        // are already invisible to non-members.
        allow_spectators: input.visibility === "public" ? input.allowSpectators : false,
        resolution_source: composed.settlementMode === "auto" ? "Official match result" : "Official match scoresheet",
        invite_code: inviteCode,
        market_type: composed.marketType,
        market_line: composed.marketLine,
        market_side_definition: composed.marketSideDefinition,
        settlement_mode: composed.settlementMode,
      })
      .select("id")
      .single();

    if (!error && data) {
      // Best-effort: the room itself is already valid and shareable even if
      // this fails, same reasoning as the wallet self-heal in
      // dynamic-actions.ts — the follow-up write's own failure shouldn't
      // undo the primary action that already succeeded.
      await supabase.from("entries").insert({
        room_id: data.id,
        user_id: user.id,
        side: input.side,
        amount_cents: stakeCents,
      });
      return { ok: true, roomId: data.id, inviteCode };
    }
    if (error && !error.message.toLowerCase().includes("duplicate")) {
      return { ok: false, error: "Couldn't create the room — try again." };
    }
  }

  return { ok: false, error: "Couldn't generate a unique invite code — try again." };
}

export type JoinRoomResult = { ok: true } | { ok: false; error: string };

export async function joinRoom(roomId: string, side: EntrySide, amountCents?: number): Promise<JoinRoomResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Sign in to join a room." };

  // The room's own limits decide what's a valid stake — the RLS policy's
  // min/max check and the DB's unique(room_id, user_id) constraint are the
  // real backstops; this is the pre-check that gives a clean error message.
  // No amount = the room's minimum, which is always valid.
  const { data: room } = await supabase
    .from("rooms")
    .select("status, entry_amount_cents, min_stake_cents, max_stake_cents")
    .eq("id", roomId)
    .maybeSingle();
  if (!room) return { ok: false, error: "Room not found." };
  if (room.status !== "open") return { ok: false, error: "This room isn't open for entries anymore." };

  const stake = amountCents ?? room.min_stake_cents ?? room.entry_amount_cents;
  if (
    !isCents(stake) ||
    stake < room.min_stake_cents ||
    (room.max_stake_cents !== null && stake > room.max_stake_cents)
  ) {
    return { ok: false, error: "That stake is outside this room's limits." };
  }

  const { error } = await supabase.from("entries").insert({
    room_id: roomId,
    user_id: user.id,
    side,
    amount_cents: stake,
  });

  if (error) {
    if (error.message.toLowerCase().includes("duplicate")) {
      return { ok: false, error: "You're already in this room." };
    }
    return { ok: false, error: "Couldn't join the room — try again." };
  }

  return { ok: true };
}
