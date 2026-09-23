"use server";

import { createClient } from "@/lib/supabase/server";
import { getMatchById } from "@/lib/supabase/matches";
import type { EntrySide, MarketSideDefinition, MarketType } from "@/lib/types";

const CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no 0/O/1/I — avoids ambiguous codes read aloud or handwritten

function randomInviteCode(): string {
  let suffix = "";
  for (let i = 0; i < 4; i++) suffix += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
  return `RIVAL-${suffix}`;
}

// Discriminated by market type so the caller can't send a total_goals room
// with no line, or a custom room with no prediction text — the shape itself
// rules those out, no separate validation needed for "did they send the
// right fields."
export type CreateRoomMarket =
  | { type: "winner"; outcome: "home" | "draw" | "away" }
  | { type: "total_goals"; comparison: "over" | "under"; line: number }
  | { type: "both_score" }
  | { type: "correct_score"; homeGoals: number; awayGoals: number }
  // Favorite-only framing (the picked team wins by more than `line`), not a
  // full two-sided spread — a deliberate scope call, not a missing feature:
  // it's a real, correctly-settleable handicap market without doubling the
  // number of taps to also pick favorite-vs-underdog framing.
  | { type: "handicap"; team: "home" | "away"; line: number }
  | { type: "custom"; prediction: string };

export interface CreateRoomInput {
  matchId: string;
  entryAmountCents: number;
  visibility: "public" | "private";
  market: CreateRoomMarket;
}

export type CreateRoomResult =
  | { ok: true; roomId: string; inviteCode: string }
  | { ok: false; error: string };

// Server-composed, never trusted from the client — `prediction` is the one
// string every existing surface (room cards, chat, search) already renders,
// so composing it here instead of on the client means nothing downstream
// needs to change to understand the new structured markets.
function composeMarket(
  market: CreateRoomMarket,
  match: { homeTeam: string; awayTeam: string },
): { prediction: string; marketType: MarketType; marketLine: number | null; marketSideDefinition: MarketSideDefinition | null; settlementMode: "auto" | "creator_confirms" } {
  switch (market.type) {
    case "winner": {
      const label =
        market.outcome === "draw" ? "Draw" : market.outcome === "home" ? match.homeTeam : match.awayTeam;
      return {
        prediction: market.outcome === "draw" ? `${match.homeTeam} v ${match.awayTeam} ends in a draw` : `${label} wins`,
        marketType: "winner",
        marketLine: null,
        marketSideDefinition: { stat: "winner", outcome: market.outcome },
        settlementMode: "auto",
      };
    }
    case "total_goals":
      return {
        prediction: `Total goals ${market.comparison} ${market.line}`,
        marketType: "total_goals",
        marketLine: market.line,
        marketSideDefinition: { stat: "total_goals", comparison: market.comparison, threshold: market.line },
        settlementMode: "auto",
      };
    case "both_score":
      return {
        prediction: "Both teams to score",
        marketType: "both_score",
        marketLine: null,
        marketSideDefinition: { stat: "both_score" },
        settlementMode: "auto",
      };
    case "correct_score":
      return {
        prediction: `${match.homeTeam} ${market.homeGoals}-${market.awayGoals} ${match.awayTeam}`,
        marketType: "correct_score",
        marketLine: null,
        marketSideDefinition: { stat: "correct_score", homeGoals: market.homeGoals, awayGoals: market.awayGoals },
        settlementMode: "auto",
      };
    case "handicap": {
      const team = market.team === "home" ? match.homeTeam : match.awayTeam;
      const margin = Math.ceil(market.line);
      return {
        prediction: `${team} wins by ${margin}+`,
        marketType: "handicap",
        marketLine: market.line,
        marketSideDefinition: { stat: "handicap", team: market.team, threshold: market.line },
        settlementMode: "auto",
      };
    }
    case "custom":
      return {
        prediction: market.prediction.trim(),
        marketType: "custom",
        marketLine: null,
        marketSideDefinition: null,
        settlementMode: "creator_confirms",
      };
  }
}

export async function createRoom(input: CreateRoomInput): Promise<CreateRoomResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Sign in to create a room." };

  if (input.entryAmountCents <= 0) return { ok: false, error: "Pick an entry amount." };
  if (input.market.type === "custom" && !input.market.prediction.trim()) {
    return { ok: false, error: "Say what you think will happen." };
  }
  if (input.market.type === "total_goals" && !(input.market.line > 0)) {
    return { ok: false, error: "Pick a real goals line." };
  }
  if (input.market.type === "handicap" && !(input.market.line > 0)) {
    return { ok: false, error: "Pick a real handicap line." };
  }
  if (
    input.market.type === "correct_score" &&
    (!Number.isInteger(input.market.homeGoals) ||
      !Number.isInteger(input.market.awayGoals) ||
      input.market.homeGoals < 0 ||
      input.market.awayGoals < 0)
  ) {
    return { ok: false, error: "Pick a real scoreline." };
  }

  const match = await getMatchById(input.matchId);
  if (!match) return { ok: false, error: "Couldn't find that match — try again." };

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
        entry_amount_cents: input.entryAmountCents,
        visibility: input.visibility,
        resolution_source: "Official match result",
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
      // undo the primary action that already succeeded. The creator's
      // stated claim is implicitly "Yes" (masterplan: "what do you
      // believe?" — the prediction is stated as true), so they back it
      // immediately rather than needing a separate join step afterward.
      const side: EntrySide = "yes";
      await supabase.from("entries").insert({
        room_id: data.id,
        user_id: user.id,
        side,
        amount_cents: input.entryAmountCents,
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

export async function joinRoom(roomId: string, side: EntrySide): Promise<JoinRoomResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Sign in to join a room." };

  // The real stake is whatever the room says it is — never trust an
  // amount from the client. Also the pre-check that gives a clean error
  // message; the RLS policy's own entry_amount_cents match and the DB's
  // unique(room_id, user_id) constraint are the real backstops either way.
  const { data: room } = await supabase
    .from("rooms")
    .select("status, entry_amount_cents")
    .eq("id", roomId)
    .maybeSingle();
  if (!room) return { ok: false, error: "Room not found." };
  if (room.status !== "open") return { ok: false, error: "This room isn't open for entries anymore." };

  const { error } = await supabase.from("entries").insert({
    room_id: roomId,
    user_id: user.id,
    side,
    amount_cents: room.entry_amount_cents,
  });

  if (error) {
    if (error.message.toLowerCase().includes("duplicate")) {
      return { ok: false, error: "You're already in this room." };
    }
    return { ok: false, error: "Couldn't join the room — try again." };
  }

  return { ok: true };
}
