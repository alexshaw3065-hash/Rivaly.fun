"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useLiveWalletBalance } from "@/lib/wallet/use-live-balance";
import { formatUsdc } from "@/lib/wallet/format";
import { WalletActions } from "./wallet-actions";
import { PnlChart, type PnlPoint } from "./profile/pnl-chart";

// Self-only money block: your profit/loss over time (my_pnl — one point per
// settled room, the same per-room profit behind Winnings and the
// leaderboards), then your live on-chain cash ("—" until it's read, never a
// stand-in figure) and deposit/withdraw.
export function ProfilePnl() {
  const live = useLiveWalletBalance();
  const [points, setPoints] = useState<PnlPoint[] | null>(null);
  const [now] = useState(() => Date.now());

  useEffect(() => {
    let cancelled = false;
    void createClient()
      .rpc("my_pnl")
      .then(({ data }) => {
        if (cancelled) return;
        const rows = (data ?? []) as { at: string; profit_cents: number | string }[];
        setPoints(rows.map((r) => ({ at: +new Date(r.at), cents: Number(r.profit_cents) })).filter((p) => Number.isFinite(p.at)));
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="rounded-card bg-surface p-5 edge">
      <PnlChart points={points} now={now} />

      <div className="mt-5 flex items-center justify-between border-t border-line pt-4">
        <div className="flex items-center gap-3">
          <span className="flex h-8 w-8 items-center justify-center rounded-full text-label text-secondary edge-strong">$</span>
          <span className="text-body text-secondary">Total cash</span>
        </div>
        <span className="text-body font-semibold tabular-nums text-foreground">
          {live.isReal && live.hasLoaded ? `${formatUsdc(live.usdcBalance)} USDC` : "—"}
        </span>
      </div>

      <div className="mt-5">
        <WalletActions centered hideBalance />
      </div>
    </div>
  );
}
