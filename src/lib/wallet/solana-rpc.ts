// Shared Solana JSON-RPC caller, used from both the browser (live balance
// reads in wallet-context.tsx) and the server (deposit reconciliation in
// reconcile.ts). Plain fetch on purpose — no SDK dependency for what is
// three JSON-RPC methods.
//
// The server-only variable wins when present so a provider URL carrying an
// API key (Helius, QuickNode) never has to ship to the browser. In client
// bundles process.env.SOLANA_RPC_URL isn't inlined at all, so it falls
// through to the public one there.
export const RPC_URL =
  process.env.SOLANA_RPC_URL ??
  process.env.NEXT_PUBLIC_SOLANA_RPC_URL ??
  "https://api.devnet.solana.com";

/** The public devnet endpoint — the browser's fallback, and the server's when Helius fails. */
export const PUBLIC_RPC_URL = process.env.NEXT_PUBLIC_SOLANA_RPC_URL ?? "https://api.devnet.solana.com";

export async function solanaRpc<T>(method: string, params: unknown[]): Promise<T> {
  return rpcAt<T>(RPC_URL, method, params);
}

/** The same call against a specific endpoint. */
export async function rpcAt<T>(url: string, method: string, params: unknown[]): Promise<T> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Solana RPC ${method} failed: ${res.status}`);
  const json = await res.json();
  if (json.error) throw new Error(`Solana RPC ${method} failed: ${json.error.message}`);
  return json.result as T;
}

export interface RpcTokenAccount {
  pubkey: string;
  account?: { data?: { parsed?: { info?: { tokenAmount?: { uiAmountString?: string } } } } };
}

export async function getUsdcTokenAccounts(owner: string, mint: string, url: string = RPC_URL): Promise<RpcTokenAccount[]> {
  const result = await rpcAt<{ value: RpcTokenAccount[] }>(url, "getTokenAccountsByOwner", [
    owner,
    { mint },
    // "confirmed", not the default "finalized": finalized trails a landed
    // transfer by 15-30s, which is why balances used to lag after a stake.
    { encoding: "jsonParsed", commitment: "confirmed" },
  ]);
  return result.value ?? [];
}
