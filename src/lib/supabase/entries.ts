import { createClient } from "@/lib/supabase/server";
import type { EntrySide } from "@/lib/types";

export interface MyEntry {
  side: EntrySide;
  amountCents: number;
  isWinner: boolean | null;
  payoutCents: number | null;
  stakeTxSignature: string | null;
  payoutTxSignature: string | null;
}

/**
 * The signed-in user's own entry in a room, if any — side, stake, result and
 * both on-chain receipts (the stake into escrow, the payout back), so the
 * room page can show "you're in", the win/loss moment, and "Verify on
 * Solana" links on a fresh load.
 */
export async function getMyEntryForRoom(roomId: string): Promise<MyEntry | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("entries")
    .select("side, amount_cents, is_winner, payout_cents, stake_tx_signature, payout_tx_signature")
    .eq("room_id", roomId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!data) return null;
  return {
    side: data.side as EntrySide,
    amountCents: data.amount_cents,
    isWinner: data.is_winner,
    payoutCents: data.payout_cents,
    stakeTxSignature: data.stake_tx_signature,
    payoutTxSignature: data.payout_tx_signature,
  };
}

export interface RoomRival {
  userId: string;
  side: EntrySide;
  displayName: string;
  avatarUrl: string | null;
}

/** Who's actually in a room, newest first — the room page's rival stack. */
export async function getRoomRivals(roomId: string, limit = 12): Promise<RoomRival[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("entries")
    .select("user_id, side, profile:profiles(display_name, avatar_url)")
    .eq("room_id", roomId)
    .order("created_at", { ascending: false })
    .limit(limit);
  const rows = (data ?? []) as unknown as {
    user_id: string;
    side: EntrySide;
    profile: { display_name: string; avatar_url: string | null } | null;
  }[];
  return rows.map((r) => ({
    userId: r.user_id,
    side: r.side,
    displayName: r.profile?.display_name ?? "Rival",
    avatarUrl: r.profile?.avatar_url ?? null,
  }));
}
