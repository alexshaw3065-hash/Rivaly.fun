"use server";

import { createClient } from "@/lib/supabase/server";
import { USDC_DECIMALS, USDC_MINT } from "./constants";
import { getUsdcTokenAccounts, solanaRpc } from "./solana-rpc";

// Closes the one gap the wallet's transaction log couldn't cover on its own:
// a deposit sent straight to the receive address happens entirely outside
// this app, so there's no completion callback to hook a row onto. This
// reconciles the log against the chain instead — the chain is the record,
// and this just catches the log up to it.
//
// Runs on the server against the signed-in user's own profile address, so
// nothing here trusts client input: the client can't name an address, an
// amount, or a signature. Every field is derived from the transaction as
// the chain reports it, which also means this correctly picks up
// withdrawals made from the wallet outside Rivaly, not only deposits.
//
// Deliberately not a Helius webhook: the user-visible outcome (rows in the
// history list) is identical, and this needs no third-party account, no
// webhook secret, no per-signup address registration, and no service-role
// insert path. Pointing SOLANA_RPC_URL at Helius makes this faster and more
// reliable for free, without moving the logic off our side.
const SIGNATURE_SCAN_LIMIT = 40;
// The public devnet RPC rate-limits getTransaction hard. Two at a time, and a
// refused one is retried gently — then skipped, never failing the batch: the
// next load picks it up (it's still missing from the log).
const FETCH_CONCURRENCY = 2;
const RETRY_DELAYS_MS = [700, 1800];
const ESCROW = process.env.NEXT_PUBLIC_ESCROW_ADDRESS;

interface TokenBalanceEntry {
  owner?: string;
  mint?: string;
  uiTokenAmount?: { uiAmountString?: string };
}

interface ParsedTransaction {
  blockTime?: number | null;
  meta?: {
    err?: unknown;
    preTokenBalances?: TokenBalanceEntry[];
    postTokenBalances?: TokenBalanceEntry[];
  } | null;
}

function usdcHeldBy(rows: TokenBalanceEntry[] | undefined, owner: string): number {
  for (const row of rows ?? []) {
    if (row.owner === owner && row.mint === USDC_MINT) {
      const parsed = parseFloat(row.uiTokenAmount?.uiAmountString ?? "0");
      return Number.isFinite(parsed) ? parsed : 0;
    }
  }
  // No entry means the token account didn't exist at that point, which is
  // genuinely a zero balance rather than missing data.
  return 0;
}

function counterpartyOf(tx: ParsedTransaction, owner: string): string | null {
  const balances = [...(tx.meta?.preTokenBalances ?? []), ...(tx.meta?.postTokenBalances ?? [])];
  // A payout batch touches every winner's account — the escrow is the real
  // other side, so it wins over whichever winner happens to be listed first.
  if (ESCROW && balances.some((row) => row.mint === USDC_MINT && row.owner === ESCROW)) return ESCROW;
  for (const row of balances) {
    if (row.mint === USDC_MINT && row.owner && row.owner !== owner) return row.owner;
  }
  return null;
}

async function inChunks<T, R>(items: T[], size: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const out: R[] = [];
  for (let i = 0; i < items.length; i += size) {
    out.push(...(await Promise.all(items.slice(i, i + size).map(fn))));
  }
  return out;
}

export async function reconcileWalletTransactions(): Promise<{ inserted: number }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { inserted: 0 };

  const { data: profile } = await supabase
    .from("profiles")
    .select("dynamic_wallet_address")
    .eq("id", user.id)
    .maybeSingle();

  const owner = profile?.dynamic_wallet_address as string | null | undefined;
  if (!owner) return { inserted: 0 };

  try {
    // Signatures are read off the USDC token account rather than the wallet
    // itself, so this scans only USDC-relevant history instead of every SOL
    // transaction the wallet has ever been part of.
    const tokenAccounts = await getUsdcTokenAccounts(owner, USDC_MINT);
    if (tokenAccounts.length === 0) return { inserted: 0 };

    const signatureLists = await Promise.all(
      tokenAccounts.map((account) =>
        solanaRpc<{ signature: string; err: unknown }[]>("getSignaturesForAddress", [
          account.pubkey,
          { limit: SIGNATURE_SCAN_LIMIT },
        ]),
      ),
    );

    const candidates = [
      ...new Set(
        signatureLists
          .flat()
          .filter((entry) => !entry.err)
          .map((entry) => entry.signature),
      ),
    ];
    if (candidates.length === 0) return { inserted: 0 };

    const { data: known } = await supabase
      .from("wallet_transactions")
      .select("tx_signature")
      .eq("user_id", user.id)
      .in("tx_signature", candidates);
    const alreadyLogged = new Set((known ?? []).map((row) => row.tx_signature as string));

    const missing = candidates.filter((signature) => !alreadyLogged.has(signature));
    if (missing.length === 0) return { inserted: 0 };

    const fetched = await inChunks(missing, FETCH_CONCURRENCY, async (signature) => {
      for (let attempt = 0; ; attempt++) {
        try {
          const tx = await solanaRpc<ParsedTransaction | null>("getTransaction", [
            signature,
            { encoding: "jsonParsed", maxSupportedTransactionVersion: 0 },
          ]);
          return { signature, tx };
        } catch {
          if (attempt >= RETRY_DELAYS_MS.length) return { signature, tx: null };
          await new Promise((r) => setTimeout(r, RETRY_DELAYS_MS[attempt]));
        }
      }
    });

    const rows = fetched
      .map(({ signature, tx }) => {
        if (!tx || tx.meta?.err) return null;
        const delta =
          usdcHeldBy(tx.meta?.postTokenBalances, owner) - usdcHeldBy(tx.meta?.preTokenBalances, owner);
        const amountMicros = Math.round(Math.abs(delta) * 10 ** USDC_DECIMALS);
        // A transaction can touch the token account without changing the
        // balance (an approval, or creating the account). Nothing moved, so
        // there's nothing to log — and amount_micros > 0 is enforced anyway.
        if (amountMicros === 0) return null;
        return {
          user_id: user.id,
          type: delta > 0 ? "deposit" : "withdrawal",
          amount_micros: amountMicros,
          counterparty_address: counterpartyOf(tx, owner),
          tx_signature: signature,
          // The real on-chain time, not when this happened to run, so the
          // history reads as the actual sequence of events.
          created_at: tx.blockTime
            ? new Date(tx.blockTime * 1000).toISOString()
            : new Date().toISOString(),
        };
      })
      .filter((row): row is NonNullable<typeof row> => row !== null);

    if (rows.length === 0) return { inserted: 0 };

    // ignoreDuplicates makes two concurrent reconciles harmless — the
    // (user_id, tx_signature) unique constraint decides, and the loser no-ops
    // instead of erroring. Per person, not global: one payout transaction
    // belongs in every winner's history. Still RLS-scoped: user_id is the
    // session's own id.
    const { data: written, error } = await supabase
      .from("wallet_transactions")
      .upsert(rows, { onConflict: "user_id,tx_signature", ignoreDuplicates: true })
      .select("id");
    if (error) return { inserted: 0 };

    return { inserted: written?.length ?? 0 };
  } catch {
    // RPC hiccup or rate limit. The balance is read independently and stays
    // correct, so a failed reconcile only means the list catches up later.
    return { inserted: 0 };
  }
}
