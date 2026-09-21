// USDC is a real USD-pegged stablecoin, not Naira — labelling it "USDC"
// instead of reusing mock-data.ts's ₦ formatters is the honest call here.
// Inventing a live USDC→NGN conversion would mean displaying a number
// nobody can verify against anything real; that's the opposite of "Trust
// Must Be Visible" (masterplan principle #5).
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
