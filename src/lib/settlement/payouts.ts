// Who gets paid what when a room settles — pure, tested (payouts.test.ts).
// Only type imports: Node runs this directly under `node --test`.

import type { Outcome } from "./resolve";

export interface StakeEntry {
  id: string;
  side: "yes" | "no";
  amountCents: number;
}

export interface PlannedPayout {
  entryId: string;
  cents: number;
  /** null = refunded (void room or nobody backed the winning side). */
  isWinner: boolean | null;
}

/**
 * Winners split the whole pool pro rata to their stake — Rivaly takes
 * nothing. Cents are floored per winner and the leftover cent or two goes to
 * the largest winning stake (earliest wins a tie), so exactly the pool is
 * paid out. A void room, or one where nobody backed the winning side, refunds
 * every stake in full.
 */
export function planPayouts(entries: StakeEntry[], outcome: Outcome | "void"): PlannedPayout[] {
  const pool = entries.reduce((s, e) => s + e.amountCents, 0);
  const winners = outcome === "void" ? [] : entries.filter((e) => e.side === outcome);
  const winningTotal = winners.reduce((s, e) => s + e.amountCents, 0);

  if (winningTotal === 0) {
    return entries.map((e) => ({ entryId: e.id, cents: e.amountCents, isWinner: null }));
  }

  const shares = new Map<string, number>();
  let paid = 0;
  for (const w of winners) {
    const share = Math.floor((w.amountCents * pool) / winningTotal);
    shares.set(w.id, share);
    paid += share;
  }
  const largest = winners.reduce((best, w) => (w.amountCents > best.amountCents ? w : best), winners[0]);
  shares.set(largest.id, (shares.get(largest.id) ?? 0) + (pool - paid));

  return entries.map((e) =>
    shares.has(e.id) ? { entryId: e.id, cents: shares.get(e.id)!, isWinner: true } : { entryId: e.id, cents: 0, isWinner: false },
  );
}
