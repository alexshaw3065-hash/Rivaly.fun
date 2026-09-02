"use server";

import { createClient } from "@/lib/supabase/server";
import type { EntrySide } from "@/lib/types";

const CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no 0/O/1/I — avoids ambiguous codes read aloud or handwritten

function randomInviteCode(): string {
  let suffix = "";
  for (let i = 0; i < 4; i++) suffix += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
  return `RIVAL-${suffix}`;
}

export interface CreateRoomInput {
  matchId: string;
  prediction: string;
  entryAmountCents: number;
  visibility: "public" | "private";
  resolutionSource?: string;
}

export type CreateRoomResult =
  | { ok: true; roomId: string; inviteCode: string }
  | { ok: false; error: string };

export async function createRoom(input: CreateRoomInput): Promise<CreateRoomResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Sign in to create a room." };

  if (!input.prediction.trim()) return { ok: false, error: "Say what you think will happen." };
  if (input.entryAmountCents <= 0) return { ok: false, error: "Pick an entry amount." };

  // invite_code has a unique constraint — retry a few times on the rare
  // collision rather than failing the whole creation over it.
  for (let attempt = 0; attempt < 5; attempt++) {
    const inviteCode = randomInviteCode();
    const { data, error } = await supabase
      .from("rooms")
      .insert({
        creator_id: user.id,
        match_id: input.matchId,
        prediction: input.prediction.trim(),
        entry_amount_cents: input.entryAmountCents,
        visibility: input.visibility,
        resolution_source: input.resolutionSource ?? "Official match result",
        invite_code: inviteCode,
      })
      .select("id")
      .single();

    if (!error && data) return { ok: true, roomId: data.id, inviteCode };
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
