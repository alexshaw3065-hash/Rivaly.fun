// Server-only. The sign-up grant: a new account's starting balance (default
// $5 devnet USDC), sent to its own wallet so it's simply part of the normal
// balance — no bonus bucket, no wagering strings. Sent from a SEPARATE
// Rivaly welcome wallet (WELCOME_SECRET_KEY), never escrow, so escrow
// reconciliation stays exact. Rules live in the database
// (supabase/migrations/20260927260000_signup_grant.sql → start_signup_grant):
// once per account and per wallet, new accounts only, daily cap, admin switch.
//
// Fails closed: no key → nothing sends. Low welcome-wallet balance → the
// reservation is released and the settle cron retries later.

import { Connection, Keypair, LAMPORTS_PER_SOL, PublicKey, Transaction, type Commitment } from "@solana/web3.js";
import {
  createAssociatedTokenAccountIdempotentInstruction,
  createTransferCheckedInstruction,
  getAssociatedTokenAddressSync,
} from "@solana/spl-token";
import bs58 from "bs58";
import { USDC_DECIMALS, USDC_MINT } from "@/lib/wallet/constants";
import { createAdminClient } from "@/lib/supabase/admin";

const RPC_URL = process.env.SOLANA_RPC_URL ?? process.env.NEXT_PUBLIC_SOLANA_RPC_URL ?? "https://api.devnet.solana.com";
const COMMITMENT: Commitment = "confirmed";
const MINT = new PublicKey(USDC_MINT);
const UNITS_PER_CENT = BigInt(10 ** (USDC_DECIMALS - 2));
// Network fee plus a possible recipient token-account rent (~0.002 SOL).
const MIN_SOL = 0.005;

export type GrantResult = "sent" | "off" | "ineligible" | "low_balance" | "failed" | "pending";

let cached: { keypair: Keypair; connection: Connection } | null = null;

export function welcomeConfigured(): boolean {
  return Boolean(process.env.WELCOME_SECRET_KEY);
}

function welcome(): { keypair: Keypair; connection: Connection } {
  if (cached) return cached;
  const raw = process.env.WELCOME_SECRET_KEY?.trim();
  if (!raw) throw new Error("WELCOME_SECRET_KEY isn't set.");
  const bytes = raw.startsWith("[") ? Uint8Array.from(JSON.parse(raw) as number[]) : bs58.decode(raw);
  const keypair = Keypair.fromSecretKey(bytes);
  if (process.env.NEXT_PUBLIC_ESCROW_ADDRESS && keypair.publicKey.toBase58() === process.env.NEXT_PUBLIC_ESCROW_ADDRESS) {
    throw new Error("WELCOME_SECRET_KEY must be its own wallet, not the escrow.");
  }
  cached = { keypair, connection: new Connection(RPC_URL, COMMITMENT) };
  return cached;
}

/** The welcome wallet's address and balances — for /admin → Finance. Null when not configured. */
export async function welcomeWalletStatus(): Promise<{ address: string; usdcCents: number; sol: number } | null> {
  if (!welcomeConfigured()) return null;
  const { keypair, connection } = welcome();
  const ata = getAssociatedTokenAddressSync(MINT, keypair.publicKey);
  const [usdc, lamports] = await Promise.all([
    connection.getTokenAccountBalance(ata, COMMITMENT).then((b) => Number(BigInt(b.value.amount) / UNITS_PER_CENT), () => 0),
    connection.getBalance(keypair.publicKey, COMMITMENT),
  ]);
  return { address: keypair.publicKey.toBase58(), usdcCents: usdc, sol: lamports / LAMPORTS_PER_SOL };
}

const db = () => createAdminClient();

async function setRow(userId: string, patch: Record<string, unknown>) {
  await db().from("signup_grants").update({ ...patch, updated_at: new Date().toISOString() }).eq("user_id", userId);
}

/**
 * Give one user their grant if they're due it. Safe to call as often as you
 * like (every sign-in, wallet sync, cron pass): the database reservation is
 * what decides, so it can never pay twice.
 */
export async function grantSignupBonus(userId: string): Promise<GrantResult> {
  if (!welcomeConfigured()) return "off";
  const { data: existing } = await db().from("signup_grants").select("status").eq("user_id", userId).maybeSingle();
  if (existing && existing.status !== "failed") return existing.status === "confirmed" ? "ineligible" : "pending";

  const { data: reserved, error } = await db().rpc("start_signup_grant", { p_user: userId });
  const row = (reserved as { wallet: string; cents: number }[] | null)?.[0];
  if (error || !row) return "ineligible";

  const { keypair, connection } = welcome();
  try {
    const status = await welcomeWalletStatus();
    if (!status || status.usdcCents < row.cents || status.sol < MIN_SOL) {
      // Release the reservation (it shouldn't count toward today's cap) — the cron retries.
      await db().from("signup_grants").delete().eq("user_id", userId).eq("status", "pending");
      console.warn("[signup-grant] welcome wallet is low — grants paused until it's topped up");
      return "low_balance";
    }

    const owner = new PublicKey(row.wallet);
    const from = getAssociatedTokenAddressSync(MINT, keypair.publicKey);
    const to = getAssociatedTokenAddressSync(MINT, owner);
    const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash(COMMITMENT);
    const tx = new Transaction({ feePayer: keypair.publicKey, blockhash, lastValidBlockHeight }).add(
      createAssociatedTokenAccountIdempotentInstruction(keypair.publicKey, to, owner, MINT),
      createTransferCheckedInstruction(from, MINT, to, keypair.publicKey, BigInt(row.cents) * UNITS_PER_CENT, USDC_DECIMALS),
    );
    tx.sign(keypair);
    const signature = bs58.encode(tx.signature!);
    // Recorded before sending: if confirmation times out, recovery looks it up instead of sending again.
    const { data: prev } = await db().from("signup_grants").select("attempts").eq("user_id", userId).maybeSingle();
    await setRow(userId, { status: "sent", tx_signature: signature, valid_until_height: lastValidBlockHeight, attempts: (prev?.attempts ?? 0) + 1 });

    await connection.sendRawTransaction(tx.serialize(), { preflightCommitment: COMMITMENT });
    const result = await connection.confirmTransaction({ signature, blockhash, lastValidBlockHeight }, COMMITMENT);
    if (result.value.err) {
      await setRow(userId, { status: "failed", error: "failed on-chain" });
      return "failed";
    }
    await setRow(userId, { status: "confirmed", confirmed_at: new Date().toISOString() });
    return "sent";
  } catch (e) {
    const { data: now } = await db().from("signup_grants").select("status").eq("user_id", userId).maybeSingle();
    // Not yet sent → safe to mark failed and retry. Sent → leave it for recovery (it may still land).
    if (now?.status === "pending") await setRow(userId, { status: "failed", error: e instanceof Error ? e.message.slice(0, 200) : "error" });
    return now?.status === "sent" ? "pending" : "failed";
  }
}

/** Resolve grants whose confirmation was never seen, against the chain. */
async function recoverSent(): Promise<number> {
  const { data } = await db().from("signup_grants").select("user_id, tx_signature, valid_until_height, updated_at, status").in("status", ["sent", "pending"]).limit(50);
  if (!data?.length) return 0;
  const { connection } = welcome();
  const height = await connection.getBlockHeight(COMMITMENT);
  let resolved = 0;
  for (const g of data) {
    if (g.status === "pending") {
      // Reserved but the process died before signing — nothing was sent.
      if (Date.now() - new Date(g.updated_at).getTime() > 5 * 60_000) {
        await setRow(g.user_id, { status: "failed", error: "interrupted before sending" });
        resolved++;
      }
      continue;
    }
    const { value } = await connection.getSignatureStatuses([g.tx_signature], { searchTransactionHistory: true });
    const s = value[0];
    if (s && !s.err && (s.confirmationStatus === "confirmed" || s.confirmationStatus === "finalized")) {
      await setRow(g.user_id, { status: "confirmed", confirmed_at: new Date().toISOString() });
      resolved++;
    } else if (s?.err || (!s && g.valid_until_height != null && height > g.valid_until_height)) {
      await setRow(g.user_id, { status: "failed", error: s?.err ? "failed on-chain" : "expired" });
      resolved++;
    }
  }
  return resolved;
}

/**
 * Cron pass (runs with settlement, every minute): recover in-flight grants,
 * then pay anyone eligible who hasn't been — new wallets that arrived late,
 * retries after a failure or a low-balance pause.
 */
export async function runSignupGrants(): Promise<{ recovered: number; sent: number; skipped: string | null }> {
  if (!welcomeConfigured()) return { recovered: 0, sent: 0, skipped: "WELCOME_SECRET_KEY not set" };
  const recovered = await recoverSent();
  const { data: s } = await db().from("platform_settings").select("signup_grant_enabled, signup_grant_since").eq("id", true).maybeSingle();
  if (!s?.signup_grant_enabled) return { recovered, sent: 0, skipped: "switched off" };

  const { data: due } = await db()
    .from("profiles")
    .select("id, signup_grants(status, attempts)")
    .gte("created_at", s.signup_grant_since)
    .not("dynamic_wallet_address", "is", null)
    .is("banned_at", null)
    .order("created_at", { ascending: true })
    .limit(200);
  const todo = (due ?? [])
    .filter((p) => {
      const g = (p.signup_grants as unknown as { status: string; attempts: number } | null) ?? null;
      return !g || (g.status === "failed" && g.attempts < 3);
    })
    .slice(0, 10);

  let sent = 0;
  for (const p of todo) {
    const r = await grantSignupBonus(p.id);
    if (r === "sent") sent++;
    if (r === "low_balance") return { recovered, sent, skipped: "welcome wallet low" };
  }
  return { recovered, sent, skipped: null };
}
