// On-chain USDC balances arrive as whole-dollar floats (not cents like the
// rest of the app), so they get their own formatter — always two decimals,
// the way a wallet balance reads.
export function formatUsdc(amount: number): string {
  return `$${amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

// Compact form for tight spaces (the mobile top bar's balance chip) —
// mirrors mock-data.ts's formatMoneyCompact.
export function formatUsdcCompact(amount: number): string {
  if (amount >= 1_000_000) return `$${(amount / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
  if (amount >= 1_000) return `$${(amount / 1_000).toFixed(1).replace(/\.0$/, "")}K`;
  return `$${amount.toFixed(2)}`;
}
