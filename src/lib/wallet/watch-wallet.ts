"use client";

import { USDC_MINT } from "./constants";
import { RPC_URL } from "./solana-rpc";

/**
 * Calls `onChange` (debounced) whenever the wallet's SOL account or its USDC
 * token account changes on-chain, via the RPC websocket. Works for money
 * moved from anywhere — Rivaly stakes and payouts, the faucet, another app.
 * The USDC account is watched by its derived address, so a wallet that has
 * never held USDC still fires the moment its first deposit creates it.
 * Returns the cleanup. Solana's SDK is loaded here on demand (not in the
 * app's first download), so the watch starts a moment after sign-in.
 */
export function watchWallet(owner: string, onChange: () => void): () => void {
  let stopped = false;
  let stop = () => {};
  let timer: number | undefined;
  const fire = () => {
    window.clearTimeout(timer);
    timer = window.setTimeout(onChange, 250);
  };

  void (async () => {
    const [{ Connection, PublicKey }, { getAssociatedTokenAddressSync }] = await Promise.all([import("@solana/web3.js"), import("@solana/spl-token")]);
    if (stopped) return;
    const ownerKey = new PublicKey(owner);
    const usdcAccount = getAssociatedTokenAddressSync(new PublicKey(USDC_MINT), ownerKey, true);
    const connection = new Connection(RPC_URL, { commitment: "confirmed" });
    const subs = [connection.onAccountChange(usdcAccount, fire, { commitment: "confirmed" }), connection.onAccountChange(ownerKey, fire, { commitment: "confirmed" })];
    stop = () => subs.forEach((id) => void connection.removeAccountChangeListener(id).catch(() => undefined));
  })().catch(() => undefined);

  return () => {
    stopped = true;
    window.clearTimeout(timer);
    stop();
  };
}
