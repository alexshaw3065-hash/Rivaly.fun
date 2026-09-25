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

// Some accounts carry a raw ID as their display name (a wallet sign-up that
// never set one) — show their username instead of a UUID.
const ID_LIKE = /^[0-9a-f]{8}-[0-9a-f]{4}-/i;
function readableName(p: { display_name: string; username: string } | null): string {
  if (!p) return "Rival";
  return p.display_name && !ID_LIKE.test(p.display_name) ? p.display_name : p.username || "Rival";
}

export interface RoomRival {
  userId: string;
  side: EntrySide;
  displayName: string;
  /** For linking to their profile; null if the profile is missing. */
  username: string | null;
  avatarUrl: string | null;
  amountCents: number;
  createdAt: string;
}

/** Who's actually in a room, newest first — the room page's rival stack. */
export async function getRoomRivals(roomId: string, limit = 12): Promise<RoomRival[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("entries")
    .select("user_id, side, amount_cents, created_at, profile:profiles(display_name, username, avatar_url)")
    .eq("room_id", roomId)
    .order("created_at", { ascending: false })
    .limit(limit);
  const rows = (data ?? []) as unknown as {
    user_id: string;
    side: EntrySide;
    amount_cents: number;
    created_at: string;
    profile: { display_name: string; username: string; avatar_url: string | null } | null;
  }[];
  return rows.map((r) => ({
    userId: r.user_id,
    side: r.side,
    displayName: readableName(r.profile),
    username: r.profile?.username || null,
    avatarUrl: r.profile?.avatar_url ?? null,
    amountCents: r.amount_cents,
    createdAt: r.created_at,
  }));
}
