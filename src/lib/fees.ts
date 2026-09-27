"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { planSettlement } from "@/lib/settlement/payouts";

// Fees, as people see them: a cut of the winners' profit, never of a stake
// (supabase/migrations/20260927140000_fees_and_hosting.sql). Everything here
// shows numbers from the same planSettlement the payout run uses, so what a
// screen promises is what the settlement pays.

export interface FeeSettings {
  /** Fees are switched on (platform_settings.fees_enabled). */
  live: boolean;
  rivalyBps: number;
  hostBps: number;
}

const OFF: FeeSettings = { live: false, rivalyBps: 0, hostBps: 0 };
let cached: Promise<FeeSettings> | null = null;

/** Today's rates for new rooms — public, so Create Room can say what a host earns. */
export function useFeeSettings(): FeeSettings {
  const [s, setS] = useState<FeeSettings>(OFF);
  useEffect(() => {
    cached ??= Promise.resolve(
      createClient()
        .from("platform_settings")
        .select("fees_enabled, rivaly_fee_bps, host_fee_bps")
        .eq("id", true)
        .maybeSingle(),
    ).then(({ data }) =>
      data?.fees_enabled ? { live: true, rivalyBps: Number(data.rivaly_fee_bps), hostBps: Number(data.host_fee_bps) } : OFF,
    );
    let live = true;
    void cached.then((v) => live && setS(v));
    return () => {
      live = false;
    };
  }, []);
  return s;
}

export const pct = (bps: number) => `${(bps / 100).toLocaleString("en-US", { maximumFractionDigits: 2 })}%`;

/**
 * What a stake would pay if its side wins, given the room as it stands now
 * (plus this stake). Null when nobody's on the other side yet — then a win
 * just returns the stake.
 */
export function estimateWin(opts: {
  stakeCents: number;
  side: "yes" | "no";
  yesCents: number;
  noCents: number;
  feeBps: number;
  hostFeeBps: number;
}): { payoutCents: number; feeCents: number } | null {
  const { stakeCents, side, yesCents, noCents } = opts;
  if (stakeCents <= 0) return null;
  const mine = side === "yes" ? yesCents : noCents;
  const theirs = side === "yes" ? noCents : yesCents;
  if (theirs <= 0) return null;
  // The room as one "other stakes on my side" entry plus mine, against the other side.
  const entries = [
    { id: "me", side, amountCents: stakeCents },
    ...(mine > 0 ? [{ id: "mine", side, amountCents: mine }] : []),
    { id: "theirs", side: side === "yes" ? ("no" as const) : ("yes" as const), amountCents: theirs },
  ];
  const plan = planSettlement(entries, side, { rivalyBps: opts.feeBps, hostBps: opts.hostFeeBps });
  const me = plan.payouts.find((p) => p.entryId === "me")!;
  const myShareOfFees = Math.round(((plan.rivalyCents + plan.hostCents) * stakeCents) / (stakeCents + mine));
  return { payoutCents: me.cents, feeCents: myShareOfFees };
}

export { pendingHostRange } from "./fee-math";
