// One person's position in a room, in the numbers a share card shows: what's
// staked, what it pays (or paid), the multiple and the return. Open rooms use
// the pool as it stands and the room's own fees, through the same settlement
// maths that pays out (planSettlement), so the card never promises a number
// the room wouldn't pay. Pure; tested in position.test.ts.

import { planSettlement } from "./settlement/payouts.ts";
import type { EntrySide } from "./types.ts";

export interface PositionRoom {
  status: string;
  yesTotalCents?: number;
  noTotalCents?: number;
  /** Rivaly's and the host's cut of winners' profit, in basis points. */
  feeBps?: number;
  hostFeeBps?: number;
}

export interface PositionStake {
  side: EntrySide;
  amountCents: number;
  isWinner: boolean | null;
  payoutCents: number | null;
}

export type PositionState =
  /** Open or live, someone on the other side: it pays `returnCents` if the side wins. */
  | "open"
  /** Open or live, nobody on the other side yet. */
  | "waiting"
  | "won"
  /** Won, but there was nobody to beat: just the stake back. */
  | "stake-back"
  | "lost"
  | "refunded";

export interface Position {
  state: PositionState;
  side: EntrySide;
  stakeCents: number;
  /** What comes back if it wins (open) or what came back (settled). 0 for a loss. */
  returnCents: number;
  /** returnCents − stake. Negative for a loss. */
  profitCents: number;
  /** returnCents ÷ stake (e.g. 1.95). 0 for a loss. */
  multiple: number;
  /** profit ÷ stake as a whole percent (e.g. 95, −100). */
  roiPct: number;
}

export const isClosedRoom = (status: string) => status === "settled" || status === "refunded" || status === "cancelled";

export function positionOf(room: PositionRoom, stake: PositionStake): Position {
  const base = { side: stake.side, stakeCents: stake.amountCents };
  const done = (state: PositionState, returnCents: number): Position => {
    const profitCents = returnCents - stake.amountCents;
    return {
      ...base,
      state,
      returnCents,
      profitCents,
      multiple: stake.amountCents > 0 ? returnCents / stake.amountCents : 0,
      roiPct: stake.amountCents > 0 ? Math.round((profitCents / stake.amountCents) * 100) : 0,
    };
  };

  if (isClosedRoom(room.status)) {
    if (room.status !== "settled" || stake.isWinner === null) return done("refunded", stake.amountCents);
    if (!stake.isWinner) return done("lost", 0);
    const paid = stake.payoutCents ?? stake.amountCents;
    return done(paid <= stake.amountCents ? "stake-back" : "won", paid);
  }

  const yes = room.yesTotalCents ?? 0;
  const no = room.noTotalCents ?? 0;
  // The room's totals can lag a fresh stake by a moment: never count less on our side than this stake.
  const mine = Math.max(stake.side === "yes" ? yes : no, stake.amountCents);
  const theirs = stake.side === "yes" ? no : yes;
  if (theirs === 0) return done("waiting", stake.amountCents);
  const other: EntrySide = stake.side === "yes" ? "no" : "yes";
  const plan = planSettlement(
    [
      { id: "me", side: stake.side, amountCents: stake.amountCents },
      ...(mine > stake.amountCents ? [{ id: "rest", side: stake.side, amountCents: mine - stake.amountCents }] : []),
      { id: "them", side: other, amountCents: theirs },
    ],
    stake.side,
    { rivalyBps: room.feeBps ?? 0, hostBps: room.hostFeeBps ?? 0 },
  );
  return done("open", plan.payouts.find((p) => p.entryId === "me")?.cents ?? stake.amountCents);
}
