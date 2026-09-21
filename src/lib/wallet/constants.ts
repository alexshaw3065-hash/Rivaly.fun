// Solana Devnet only for now — see the deposits/withdrawals plan's
// "Explicitly out of scope" section for the deliberate Mainnet migration
// step (swap this mint + Dynamic's environment + RPC together).
// Circle's own Devnet USDC mint, confirmed via faucet.circle.com.
export const USDC_MINT = "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU";
export const USDC_DECIMALS = 6;

export const SOLANA_EXPLORER_CLUSTER = "devnet";

export function explorerTxUrl(signature: string): string {
  return `https://explorer.solana.com/tx/${signature}?cluster=${SOLANA_EXPLORER_CLUSTER}`;
}

export function explorerAddressUrl(address: string): string {
  return `https://explorer.solana.com/address/${address}?cluster=${SOLANA_EXPLORER_CLUSTER}`;
}
