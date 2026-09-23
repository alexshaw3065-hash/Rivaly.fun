"use client";

import { Connection, PublicKey } from "@solana/web3.js";
import { getAssociatedTokenAddressSync } from "@solana/spl-token";
import { USDC_MINT } from "./constants";
import { RPC_URL } from "./solana-rpc";

/**
 * Calls `onChange` (debounced) whenever the wallet's SOL account or its USDC
 * token account changes on-chain, via the RPC websocket. Works for money
 * moved from anywhere — Rivaly stakes and payouts, the faucet, another app.
 * The USDC account is watched by its derived address, so a wallet that has
 * never held USDC still fires the moment its first deposit creates it.
 * Returns the cleanup.
 */
export function watchWallet(owner: string, onChange: () => void): () => void {
  let ownerKey: PublicKey;
  let usdcAccount: PublicKey;
  try {
    ownerKey = new PublicKey(owner);
    usdcAccount = getAssociatedTokenAddressSync(new PublicKey(USDC_MINT), ownerKey, true);
  } catch {
    return () => {};
  }

  const connection = new Connection(RPC_URL, { commitment: "confirmed" });
  let timer: number | undefined;
  const fire = () => {
    window.clearTimeout(timer);
    timer = window.setTimeout(onChange, 250);
  };

  const subs = [connection.onAccountChange(usdcAccount, fire, { commitment: "confirmed" }), connection.onAccountChange(ownerKey, fire, { commitment: "confirmed" })];

  return () => {
    window.clearTimeout(timer);
    subs.forEach((id) => void connection.removeAccountChangeListener(id).catch(() => undefined));
  };
}
