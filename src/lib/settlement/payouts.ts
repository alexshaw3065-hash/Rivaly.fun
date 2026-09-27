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

// ── Fees (founder decision 2026-09-27) ───────────────────────────────

/** A room's fee rates, fixed when the room is created (basis points: 100 = 1%). */
export interface FeeRates {
  /** Rivaly's cut of the winners' profit. */
  rivalyBps: number;
  /** The room host's cut of the winners' profit. */
  hostBps: number;
}

export const NO_FEES: FeeRates = { rivalyBps: 0, hostBps: 0 };

export interface SettlementPlan {
  payouts: PlannedPayout[];
  /** Winners' profit: the losing side's money they take. Fees are a share of this, never of stakes. */
  profitCents: number;
  rivalyCents: number;
  hostCents: number;
}

/**
 * Like planPayouts, with fees: a cut of the winners' profit only — never of
 * anyone's stake — so a winner always gets back at least what they put in,
 * losers pay nothing beyond the stake already in the pool, and a refunded
 * room pays no fee at all. Each fee is floored; every cent left goes to the
 * winners (the largest stake takes the leftover), so the pool is paid out
 * exactly: winners + Rivaly + host = pool.
 */
export function planSettlement(entries: StakeEntry[], outcome: Outcome | "void", rates: FeeRates = NO_FEES): SettlementPlan {
  const pool = entries.reduce((s, e) => s + e.amountCents, 0);
  const winners = outcome === "void" ? [] : entries.filter((e) => e.side === outcome);
  const winningTotal = winners.reduce((s, e) => s + e.amountCents, 0);

  if (winningTotal === 0) {
    return { payouts: planPayouts(entries, outcome), profitCents: 0, rivalyCents: 0, hostCents: 0 };
  }

  const profitCents = pool - winningTotal;
  const bps = (n: number) => Math.max(0, Math.min(Math.floor(n), 2500)); // never more than 25% each, whatever's stored
  const rivalyCents = Math.floor((profitCents * bps(rates.rivalyBps)) / 10_000);
  const hostCents = Math.floor((profitCents * bps(rates.hostBps)) / 10_000);
  const distributable = pool - rivalyCents - hostCents;

  const shares = new Map<string, number>();
  let paid = 0;
  for (const w of winners) {
    const share = Math.floor((w.amountCents * distributable) / winningTotal);
    shares.set(w.id, share);
    paid += share;
  }
  const largest = winners.reduce((best, w) => (w.amountCents > best.amountCents ? w : best), winners[0]);
  shares.set(largest.id, (shares.get(largest.id) ?? 0) + (distributable - paid));

  return {
    payouts: entries.map((e) =>
      shares.has(e.id) ? { entryId: e.id, cents: shares.get(e.id)!, isWinner: true } : { entryId: e.id, cents: 0, isWinner: false },
    ),
    profitCents,
    rivalyCents,
    hostCents,
  };
}
