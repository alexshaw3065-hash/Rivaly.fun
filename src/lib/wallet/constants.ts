// Solana Devnet only for now — see the deposits/withdrawals plan's
// "Explicitly out of scope" section for the deliberate Mainnet migration
// step (swap this mint + Dynamic's environment + RPC together).
// Circle's own Devnet USDC mint, confirmed via faucet.circle.com.
export const USDC_MINT = "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU";
export const USDC_DECIMALS = 6;

export const SOLANA_EXPLORER_CLUSTER = "devnet";

// Balances are read straight from Solana's JSON-RPC rather than through
// Dynamic's balance API: the chain is the authoritative source, it needs no
// extra dependency (plain fetch), and a third-party indexer's Devnet
// coverage isn't something to bet the deposit flow's credibility on — a
// balance that silently reads 0 after a real deposit is the worst possible
// failure here. Public Devnet endpoint by default; point this at Helius (or
// any provider) when the rate limit starts to matter.
export const SOLANA_RPC_URL = process.env.NEXT_PUBLIC_SOLANA_RPC_URL ?? "https://api.devnet.solana.com";

// Sending an SPL token still costs SOL for the network fee, and funding the
// recipient's associated token account (which Dynamic's transfer does
// automatically when it doesn't exist yet) costs ~0.002 SOL of rent. A
// wallet holding only USDC therefore can't withdraw at all — worth saying
// out loud instead of letting it fail as an opaque RPC error.
export const MIN_SOL_FOR_WITHDRAWAL = 0.003;

export function explorerTxUrl(signature: string): string {
  return `https://explorer.solana.com/tx/${signature}?cluster=${SOLANA_EXPLORER_CLUSTER}`;
}

export function explorerAddressUrl(address: string): string {
  return `https://explorer.solana.com/address/${address}?cluster=${SOLANA_EXPLORER_CLUSTER}`;
}
