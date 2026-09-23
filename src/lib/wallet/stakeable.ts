import type { SupabaseClient } from "@supabase/supabase-js";
import { USDC_MINT } from "./constants";
import { getUsdcTokenAccounts } from "./solana-rpc";

// What a user can stake right now: the devnet USDC actually sitting in their
// Dynamic embedded wallet, minus what they've already staked in rooms that
// haven't finished. Stakes don't move money until escrow is wired (see
// docs/plans/fast-deposit-and-create.md), so without the subtraction the
// same $10 could back ten rooms.
//
// Until then this is a guard against over-committing, not a security
// boundary — the on-chain escrow transfer, verified server-side, becomes
// that. Shared by the server actions (authoritative) and the client (so the
// UI can say "not enough" before anyone taps).

export async function walletUsdcCents(address: string): Promise<number> {
  const accounts = await getUsdcTokenAccounts(address, USDC_MINT);
  const dollars = accounts.reduce((sum, a) => {
    const v = parseFloat(a.account?.data?.parsed?.info?.tokenAmount?.uiAmountString ?? "0");
    return sum + (Number.isFinite(v) ? v : 0);
  }, 0);
  return Math.floor(dollars * 100 + 1e-6);
}

export async function openStakesCents(supabase: SupabaseClient, userId: string): Promise<number> {
  const { data } = await supabase
    .from("entries")
    .select("amount_cents, room:rooms!inner(status)")
    .eq("user_id", userId)
    .in("room.status", ["open", "live"]);
  return ((data ?? []) as { amount_cents: number }[]).reduce((sum, e) => sum + e.amount_cents, 0);
}

export interface Stakeable {
  walletCents: number;
  openStakesCents: number;
  availableCents: number;
}

export async function stakeableFor(supabase: SupabaseClient, userId: string, address: string): Promise<Stakeable> {
  const [walletCents, openCents] = await Promise.all([walletUsdcCents(address), openStakesCents(supabase, userId)]);
  return { walletCents, openStakesCents: openCents, availableCents: Math.max(0, walletCents - openCents) };
}
