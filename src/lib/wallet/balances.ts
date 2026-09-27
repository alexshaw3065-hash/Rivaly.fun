import { USDC_MINT } from "./constants";
import { getUsdcTokenAccounts, rpcAt } from "./solana-rpc";

export interface Balances {
  usdc: number;
  sol: number;
}

/** A wallet's USDC and SOL, read from one RPC endpoint. */
export async function readBalancesAt(url: string, address: string): Promise<Balances> {
  const [tokenAccounts, lamports] = await Promise.all([
    getUsdcTokenAccounts(address, USDC_MINT, url),
    rpcAt<{ value: number }>(url, "getBalance", [address, { commitment: "confirmed" }]),
  ]);
  // A wallet can legitimately hold more than one token account for the same
  // mint, so sum rather than taking the first.
  const usdc = tokenAccounts.reduce((total, entry) => {
    const amount = parseFloat(entry.account?.data?.parsed?.info?.tokenAmount?.uiAmountString ?? "0");
    return total + (Number.isFinite(amount) ? amount : 0);
  }, 0);
  return { usdc, sol: (lamports.value ?? 0) / 1_000_000_000 };
}
