import { USDC_MINT } from "./constants";
import { getUsdcTokenAccounts } from "./solana-rpc";

// What a user can stake: the devnet USDC actually in their Dynamic embedded
// wallet. Stakes are real transfers into escrow now, so money already staked
// has left the wallet — nothing else to subtract. Shared by the server
// (authoritative check before building a stake) and the client.
export async function walletUsdcCents(address: string): Promise<number> {
  const accounts = await getUsdcTokenAccounts(address, USDC_MINT);
  const dollars = accounts.reduce((sum, a) => {
    const v = parseFloat(a.account?.data?.parsed?.info?.tokenAmount?.uiAmountString ?? "0");
    return sum + (Number.isFinite(v) ? v : 0);
  }, 0);
  return Math.floor(dollars * 100 + 1e-6);
}
