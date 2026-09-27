"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useCurrentUser } from "@/components/current-user-provider";
import { formatMoney } from "@/lib/mock-data";
import { explorerTxUrl } from "@/lib/wallet/constants";
import { pct, useFeeSettings } from "@/lib/fees";

// What you've earned hosting rooms: your cut of each room's winnings, paid
// in the same on-chain run as the winners (room_fees, readable only by you).
// Private — nobody else sees this unless you choose to show it on your profile.

interface Earning {
  roomId: string;
  cents: number;
  signature: string | null;
  at: string;
  prediction: string;
}

export function HostingEarnings() {
  const me = useCurrentUser();
  const fees = useFeeSettings();
  const [rows, setRows] = useState<Earning[] | null>(null);

  useEffect(() => {
    if (!me) return;
    let live = true;
    void createClient()
      .from("room_fees")
      .select("room_id, cents, payout_tx_signature, created_at, room:rooms(prediction)")
      .eq("kind", "host")
      .order("created_at", { ascending: false })
      .limit(50)
      .then(({ data }) => {
        if (!live) return;
        type Row = { room_id: string; cents: number; payout_tx_signature: string | null; created_at: string; room: { prediction: string } | null };
        setRows(
          ((data ?? []) as unknown as Row[]).map((r) => ({
            roomId: r.room_id,
            cents: Number(r.cents),
            signature: r.payout_tx_signature,
            at: r.created_at,
            prediction: r.room?.prediction ?? "A room you hosted",
          })),
        );
      });
    return () => {
      live = false;
    };
  }, [me]);

  if (!me || rows === null) return null;
  if (rows.length === 0) {
    if (!fees.live || fees.hostBps <= 0) return null;
    return (
      <p className="mt-6 text-sm text-muted">
        Host a room and earn {pct(fees.hostBps)} of its winnings, whichever side wins.{" "}
        <Link href="/rooms/create" className="font-medium text-rival-blue">
          Start one →
        </Link>
      </p>
    );
  }

  const total = rows.filter((r) => r.signature).reduce((s, r) => s + r.cents, 0);
  return (
    <div className="mt-10">
      <div className="flex items-baseline justify-between">
        <p className="font-display text-xl font-semibold text-foreground">Hosting</p>
        <p className="text-sm text-muted">
          <span className="font-mono font-semibold text-rival-green">{formatMoney(total)}</span> earned · only you see this
        </p>
      </div>
      <div className="mt-4 flex flex-col divide-y divide-border rounded-lg border border-border bg-surface">
        {rows.map((r) => (
          <div key={r.roomId} className="flex items-center justify-between gap-3 px-4 py-3.5">
            <Link href={`/rooms/${r.roomId}`} className="min-w-0">
              <p className="truncate text-sm text-foreground">{r.prediction}</p>
              <p className="text-xs text-muted">{new Date(r.at).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}</p>
            </Link>
            <div className="shrink-0 text-right">
              <p className="font-mono text-sm font-semibold text-rival-green">+{formatMoney(r.cents)}</p>
              {r.signature ? (
                <a href={explorerTxUrl(r.signature)} target="_blank" rel="noopener noreferrer" className="hover-link text-xs text-muted underline underline-offset-2">
                  Verify ↗
                </a>
              ) : (
                <p className="text-xs text-muted">Paying…</p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
