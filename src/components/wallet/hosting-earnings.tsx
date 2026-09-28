"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useCurrentUser } from "@/components/current-user-provider";
import { formatMoney } from "@/lib/mock-data";
import { explorerTxUrl } from "@/lib/wallet/constants";
import { pct, pendingHostRange, useFeeSettings } from "@/lib/fees";
import { claimHostEarnings } from "@/app/wallet/actions";

// Hosting: what your rooms earn you, as one balance.
//   Pending   — your open and live rooms, rising as people join (you earn a
//               cut of whichever side loses, so it's a range until it settles)
//   Claimable — settled rooms' fees, claimed all at once ($1 minimum) in one
//               transfer to your wallet
// Private: only you see this unless you choose to show earnings on your profile.
//
// Engagement mechanisms (rivaly-engagement-psychology): #2 anticipation — the
// pending number climbs in real time during a match; #7 investment — a
// balance that builds up and is yours to claim.

export interface Earning {
  roomId: string;
  cents: number;
  prediction: string;
  at: string;
  status: "claimable" | "claiming" | "claimed";
  signature: string | null;
}

export interface LiveHosted {
  roomId: string;
  prediction: string;
  min: number;
  max: number;
}

const MIN_CLAIM = 100;

export function HostingEarnings() {
  const me = useCurrentUser();
  const fees = useFeeSettings();
  const [data, setData] = useState<{ earned: Earning[]; live: LiveHosted[]; claimable: number; inFlight: number } | null>(null);
  const [claim, setClaim] = useState<{ state: "idle" | "claiming" } | { state: "done"; cents: number; signature: string } | { state: "error"; message: string }>({ state: "idle" });

  const load = useCallback(async () => {
    if (!me) return;
    const supabase = createClient();
    const [{ data: bal }, { data: fees }, { data: rooms }] = await Promise.all([
      supabase.rpc("my_host_balance"),
      supabase
        .from("room_fees")
        .select("room_id, cents, created_at, room:rooms(prediction), claim:fee_claims(status, payout_tx_signature)")
        .eq("kind", "host")
        .order("created_at", { ascending: false })
        .limit(50),
      supabase
        .from("rooms")
        .select("id, prediction, yes_total_cents, no_total_cents, host_fee_bps")
        .eq("creator_id", me.id)
        .in("status", ["open", "live"])
        .gt("host_fee_bps", 0),
    ]);
    const b = (Array.isArray(bal) ? bal[0] : bal) as { claimable_cents: number; in_flight_cents: number } | null;
    type FeeRow = { room_id: string; cents: number; created_at: string; room: { prediction: string } | null; claim: { status: string; payout_tx_signature: string | null } | null };
    type RoomRow = { id: string; prediction: string; yes_total_cents: number; no_total_cents: number; host_fee_bps: number };
    setData({
      claimable: Number(b?.claimable_cents ?? 0),
      inFlight: Number(b?.in_flight_cents ?? 0),
      earned: ((fees ?? []) as unknown as FeeRow[]).map((f) => ({
        roomId: f.room_id,
        cents: Number(f.cents),
        prediction: f.room?.prediction ?? "A room you hosted",
        at: f.created_at,
        status: f.claim?.status === "confirmed" ? "claimed" : f.claim && f.claim.status !== "failed" ? "claiming" : "claimable",
        signature: f.claim?.status === "confirmed" ? f.claim.payout_tx_signature : null,
      })),
      live: ((rooms ?? []) as RoomRow[]).map((r) => {
        const range = pendingHostRange([{ yesCents: Number(r.yes_total_cents), noCents: Number(r.no_total_cents), hostFeeBps: r.host_fee_bps }]);
        return { roomId: r.id, prediction: r.prediction, ...range };
      }),
    });
  }, [me]);

  useEffect(() => {
    if (!me) return;
    const t = window.setTimeout(() => void load(), 0);
    // Live: your rooms' pools move as people join, and settle into claimable.
    const supabase = createClient();
    const channel = supabase
      .channel(`hosting:${me.id}:${Math.random().toString(36).slice(2)}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "rooms", filter: `creator_id=eq.${me.id}` }, () => void load())
      .subscribe();
    return () => {
      window.clearTimeout(t);
      void supabase.removeChannel(channel);
    };
  }, [me, load]);

  async function onClaim() {
    setClaim({ state: "claiming" });
    const r = await claimHostEarnings();
    if (r.ok) setClaim({ state: "done", cents: r.cents, signature: r.signature });
    else setClaim({ state: "error", message: r.error });
    void load();
  }

  if (!me || !data) return null;
  if (data.earned.length === 0 && data.live.length === 0) {
    if (!fees.live || fees.hostBps <= 0) return null;
    return (
      <p className="mt-6 text-body text-secondary">
        Host a room and earn {pct(fees.hostBps)} of its winnings, whichever side wins.{" "}
        <Link href="/rooms/create" className="font-medium text-yes-ink">
          Start one →
        </Link>
      </p>
    );
  }
  return <HostingList {...data} claim={claim} onClaim={() => void onClaim()} />;
}

type ClaimState = { state: "idle" | "claiming" } | { state: "done"; cents: number; signature: string } | { state: "error"; message: string };

/** The Hosting section itself (display only — also used by previews). */
export function HostingList({
  earned,
  live,
  claimable,
  inFlight,
  claim,
  onClaim,
}: {
  earned: Earning[];
  live: LiveHosted[];
  claimable: number;
  inFlight: number;
  claim: ClaimState;
  onClaim: () => void;
}) {
  const pending = live.reduce((s, r) => ({ min: s.min + r.min, max: s.max + r.max }), { min: 0, max: 0 });
  const canClaim = claimable >= MIN_CLAIM && claim.state !== "claiming";
  const range = (min: number, max: number) => (min === max ? formatMoney(max) : `${formatMoney(min)}–${formatMoney(max)}`);

  return (
    <div className="mt-10">
      <div className="flex items-baseline justify-between">
        <p className="text-title-3 font-display text-foreground">Hosting</p>
        <p className="text-caption text-secondary">only you see this</p>
      </div>

      <div className="mt-4 overflow-hidden rounded-card bg-surface edge">
        {live.length > 0 && (
          <div className="flex items-center justify-between border-b border-line px-4 py-4">
            <div>
              <p className="text-caption text-secondary">Pending · {live.length} live room{live.length === 1 ? "" : "s"}</p>
              <p className="mt-1 text-title-3 font-display tabular-nums text-foreground">{range(pending.min, pending.max)}</p>
            </div>
            <p className="max-w-[45%] text-right text-caption text-secondary">Grows as people join. Lands in Claimable when each room settles.</p>
          </div>
        )}
        <div className="flex items-center justify-between gap-4 px-4 py-4">
          <div>
            <p className="text-caption text-secondary">Claimable</p>
            <p className="mt-1 text-title-1 font-display tabular-nums text-money-ink">{formatMoney(claimable)}</p>
            {inFlight > 0 && <p className="mt-0.5 text-caption text-secondary">{formatMoney(inFlight)} on its way to your wallet</p>}
          </div>
          <div className="flex flex-col items-end gap-1">
            <button
              type="button"
              onClick={onClaim}
              disabled={!canClaim}
              className="h-11 rounded-full px-6 text-body font-semibold text-white transition-transform duration-150 ease-out active:scale-[0.97] disabled:opacity-40"
              style={{ background: "var(--money)" }}
            >
              {claim.state === "claiming" ? "Claiming…" : "Claim"}
            </button>
            {claimable < MIN_CLAIM && claim.state !== "done" && <p className="text-caption text-secondary">$1 minimum</p>}
          </div>
        </div>
        {claim.state === "done" && (
          <p className="border-t border-line px-4 py-3 text-body text-foreground">
            {formatMoney(claim.cents)} sent to your wallet.{" "}
            <a href={explorerTxUrl(claim.signature)} target="_blank" rel="noopener noreferrer" className="text-secondary underline underline-offset-2">
              Verify on Solana ↗
            </a>
          </p>
        )}
        {claim.state === "error" && <p className="border-t border-line px-4 py-3 text-body text-no-ink">{claim.message}</p>}
      </div>

      {(live.length > 0 || earned.length > 0) && (
        <div className="mt-3 flex flex-col divide-y divide-line rounded-control border border-line bg-surface">
          {live.map((r) => (
            <Link key={`live-${r.roomId}`} href={`/rooms/${r.roomId}`} className="flex items-center justify-between gap-3 px-4 py-4">
              <div className="min-w-0">
                <p className="truncate text-body text-foreground">{r.prediction}</p>
                <p className="text-caption text-secondary">Live · depends on who wins</p>
              </div>
              <p className="shrink-0 tabular-nums text-body text-foreground">{range(r.min, r.max)}</p>
            </Link>
          ))}
          {earned.map((r) => (
            <div key={r.roomId} className="flex items-center justify-between gap-3 px-4 py-4">
              <Link href={`/rooms/${r.roomId}`} className="min-w-0">
                <p className="truncate text-body text-foreground">{r.prediction}</p>
                <p className="text-caption text-secondary">{new Date(r.at).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}</p>
              </Link>
              <div className="shrink-0 text-right">
                <p className="tabular-nums text-body font-semibold text-money-ink">+{formatMoney(r.cents)}</p>
                {r.status === "claimed" && r.signature ? (
                  <a href={explorerTxUrl(r.signature)} target="_blank" rel="noopener noreferrer" className="hover-link text-caption text-secondary underline underline-offset-2">
                    Claimed ↗
                  </a>
                ) : (
                  <p className="text-caption text-secondary">{r.status === "claiming" ? "Claiming…" : "Claimable"}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
