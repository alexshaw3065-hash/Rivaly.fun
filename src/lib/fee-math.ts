// Pure fee arithmetic for the wallet (tested in fee-math.test.ts).

/**
 * What a host's open rooms will earn them, as a range: the host takes a cut
 * of whichever side loses, so it's the smaller side's total if the bigger
 * side wins, up to the bigger side's total if the smaller side does.
 */
export function pendingHostRange(rooms: { yesCents: number; noCents: number; hostFeeBps: number }[]): { min: number; max: number } {
  let min = 0;
  let max = 0;
  for (const r of rooms) {
    const lo = Math.min(r.yesCents, r.noCents);
    const hi = Math.max(r.yesCents, r.noCents);
    // One side empty: whoever wins, there's no losing money to take a cut of
    // (or nobody backed the winner and everyone's refunded) — nothing earned.
    if (lo === 0) continue;
    min += Math.floor((lo * r.hostFeeBps) / 10_000);
    max += Math.floor((hi * r.hostFeeBps) / 10_000);
  }
  return { min, max };
}
