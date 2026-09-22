// Solana Devnet only for now — see the deposits/withdrawals plan's
// "Explicitly out of scope" section for the deliberate Mainnet migration
// step (swap this mint + Dynamic's environment + RPC together).
// Circle's own Devnet USDC mint, confirmed via faucet.circle.com.
export const USDC_MINT = "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU";
export const USDC_DECIMALS = 6;

export const SOLANA_EXPLORER_CLUSTER = "devnet";

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
