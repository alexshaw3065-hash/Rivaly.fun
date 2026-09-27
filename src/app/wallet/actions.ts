"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { escrowConfigured, sendSignedBatch, signPayoutBatch } from "@/lib/escrow/escrow";

// Claiming host earnings: the whole claimable balance in one transfer from
// escrow to your wallet ($1 minimum). The same safety as winnings: the claim
// is recorded (start_host_claim) before anything is signed, its signature is
// stored before it's sent, and anything that doesn't finish here is settled
// from the chain by the settlement cron (recoverClaims in settle.ts) —
// landed → confirmed, failed/expired → released back to claimable. One claim
// in flight per host, enforced in the database.

const MIN_CLAIM_CENTS = 100;

export type ClaimResult =
  | { ok: true; cents: number; signature: string; landed: boolean }
  | { ok: false; error: string };

export async function claimHostEarnings(): Promise<ClaimResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Sign in to claim." };
  if (!escrowConfigured()) return { ok: false, error: "Claims are paused right now — try again soon." };

  const admin = createAdminClient();
  const { data: profile } = await admin.from("profiles").select("dynamic_wallet_address").eq("id", user.id).maybeSingle();
  const wallet = profile?.dynamic_wallet_address as string | null | undefined;
  if (!wallet) return { ok: false, error: "Your wallet is still being set up — try again in a moment." };

  const { data: started, error: startError } = await admin.rpc("start_host_claim", { p_user: user.id, p_wallet: wallet, p_min_cents: MIN_CLAIM_CENTS });
  if (startError) {
    if (startError.message.includes("claim_in_progress")) return { ok: false, error: "Your last claim is still on its way." };
    if (startError.message.includes("below_minimum")) return { ok: false, error: "You can claim once you've earned $1." };
    return { ok: false, error: "Couldn't start the claim — try again." };
  }
  const claim = (Array.isArray(started) ? started[0] : started) as { claim_id: string; cents: number } | null;
  if (!claim) return { ok: false, error: "Couldn't start the claim — try again." };
  const cents = Number(claim.cents);

  let signed;
  try {
    signed = await signPayoutBatch([{ to: wallet, cents }]);
  } catch {
    // Nothing was signed, so nothing can land: release the balance now.
    await admin.from("fee_claims").update({ status: "failed" }).eq("id", claim.claim_id).eq("status", "pending");
    return { ok: false, error: "Couldn't reach Solana — try again in a moment." };
  }
  await admin
    .from("fee_claims")
    .update({ status: "sent", payout_tx_signature: signed.signature, payout_valid_until_height: signed.lastValidBlockHeight })
    .eq("id", claim.claim_id);

  try {
    await sendSignedBatch(signed);
  } catch {
    // It may still land; the settlement cron checks the chain and either
    // confirms it or releases the balance. Never resend from here.
    return { ok: true, cents, signature: signed.signature, landed: false };
  }
  await admin.from("fee_claims").update({ status: "confirmed", confirmed_at: new Date().toISOString() }).eq("id", claim.claim_id);
  return { ok: true, cents, signature: signed.signature, landed: true };
}
