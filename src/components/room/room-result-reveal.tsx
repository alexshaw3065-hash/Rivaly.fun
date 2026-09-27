"use client";

import { withRef } from "@/lib/referral";
import Link from "next/link";
import { useEffect, useState, useSyncExternalStore } from "react";
import { formatMoney } from "@/lib/mock-data";
import { explorerTxUrl } from "@/lib/wallet/constants";
import type { MyEntry } from "@/lib/supabase/entries";
import { useCountUp } from "@/components/room-result";
import { pct } from "@/lib/fees";

// The first time you open a room after it's decided, the result comes to
// you instead of waiting below the stadium: what you won, the close call
// you lost, your refund — or, if you sat it out, what the winners made.
// Once per room per device; the inline RoomResult card stays on the page.
//
// Engagement mechanisms (rivaly-engagement-psychology): #3 rare moments —
// a win is the loudest beat in the product, so it gets the one reveal;
// #6 loss aversion framed kindly — a loss shows the real result and a
// rematch, never a taunt; #9 FOMO — the "you missed this" line is a real
// number from this room's pool, never an invented one.

const SIDE_COLOR = { yes: "var(--rival-blue)", no: "var(--rival-red)" } as const;
const EVENT = "rivaly-result-seen";
const key = (roomId: string) => `rivaly-result-seen:${roomId}`;

function subscribe(cb: () => void) {
  window.addEventListener(EVENT, cb);
  return () => window.removeEventListener(EVENT, cb);
}

function useSeen(roomId: string): boolean {
  return useSyncExternalStore(
    subscribe,
    () => {
      try {
        return localStorage.getItem(key(roomId)) === "1";
      } catch {
        return true; // no storage: never nag on every visit
      }
    },
    () => true,
  );
}

function markSeen(roomId: string) {
  try {
    localStorage.setItem(key(roomId), "1");
  } catch {}
  window.dispatchEvent(new Event(EVENT));
}

export function RoomResultReveal({
  roomId,
  outcome,
  settled,
  refunded,
  entry,
  claim,
  score,
  yesCents,
  noCents,
  recent,
  sharePath,
  feeBps = 0,
}: {
  roomId: string;
  outcome: "yes" | "no" | "void";
  settled: boolean;
  refunded: boolean;
  entry: MyEntry | null;
  claim: string;
  /** "Full time · Arsenal 2–1 Spurs", or null before any score. */
  score: string | null;
  yesCents: number;
  noCents: number;
  /** Decided in the last week — old rooms don't pop "you missed this". */
  recent: boolean;
  sharePath: string;
  /** The room's total fee on winnings (Rivaly + host), in basis points. */
  feeBps?: number;
}) {
  const seen = useSeen(roomId);
  const won = entry?.isWinner === true;
  const winningCents = outcome === "yes" ? yesCents : outcome === "no" ? noCents : 0;
  const pool = yesCents + noCents;
  // A spectator only gets a reveal when there's a real story to tell: a
  // decided room, both sides backed, and it happened recently.
  const missed = !entry && !refunded && outcome !== "void" && winningCents > 0 && winningCents < pool && recent;
  const show = !seen && (entry !== null || missed);

  useEffect(() => {
    if (!show) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && markSeen(roomId);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [show, roomId]);

  if (!show) return null;
  const close = () => markSeen(roomId);

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center md:items-center" role="dialog" aria-modal="true" aria-label="Room result">
      <div className="sheet-overlay absolute inset-0 bg-black/60" onClick={close} aria-hidden />
      <div className="sheet-panel relative w-full max-w-md rounded-t-3xl bg-surface p-6 pb-8 ring-1 ring-border md:rounded-3xl md:pb-6">
        <p className="text-[13px] text-muted">{claim}</p>
        {score && <p className="mt-0.5 font-mono text-xs text-muted">{score}</p>}

        {refunded || outcome === "void" ? (
          <Refund entry={entry} settled={settled} oneSided={outcome !== "void"} onClose={close} />
        ) : entry && won ? (
          <Win entry={entry} settled={settled} sharePath={sharePath} feeBps={feeBps} onClose={close} />
        ) : entry ? (
          <Loss entry={entry} outcome={outcome} onClose={close} />
        ) : (
          <Missed outcome={outcome} pool={pool} winningCents={winningCents} onClose={close} />
        )}
      </div>
    </div>
  );
}

function Win({ entry, settled, sharePath, feeBps, onClose }: { entry: MyEntry; settled: boolean; sharePath: string; feeBps: number; onClose: () => void }) {
  const payout = useCountUp(entry.payoutCents ?? 0, 1100);
  const profit = (entry.payoutCents ?? 0) - entry.amountCents;
  const [copied, setCopied] = useState(false);

  async function share() {
    const url = withRef(`${window.location.origin}${sharePath}`);
    try {
      if (navigator.share) await navigator.share({ title: "Called it on Rivaly", url });
      else {
        await navigator.clipboard.writeText(url);
        setCopied(true);
      }
    } catch {}
  }

  return (
    <>
      <p className="mt-5 text-xs font-semibold uppercase tracking-[0.14em] text-rival-green">You called it</p>
      <p className="mt-1 font-display text-6xl font-bold tabular-nums tracking-tight text-foreground">{formatMoney(payout)}</p>
      <p className="mt-2 text-sm text-muted">
        <span className="font-semibold text-rival-green">+{formatMoney(profit)}</span> on your {formatMoney(entry.amountCents)}{" "}
        <span className="font-semibold" style={{ color: SIDE_COLOR[entry.side] }}>
          {entry.side.toUpperCase()}
        </span>
        . {settled ? "It's in your wallet." : "On its way to your wallet."}
        {feeBps > 0 && <> After the {pct(feeBps)} fee on winnings.</>}
      </p>
      {entry.payoutTxSignature && (
        <a href={explorerTxUrl(entry.payoutTxSignature)} target="_blank" rel="noopener noreferrer" className="hover-link mt-1 inline-block text-xs text-muted underline underline-offset-2">
          Verify the payout on Solana ↗
        </a>
      )}
      <div className="mt-6 flex gap-2">
        <button
          type="button"
          onClick={share}
          className="h-11 flex-1 rounded-full text-sm font-semibold text-white transition-transform duration-150 ease-out active:scale-[0.97]"
          style={{ background: "var(--rival-green)" }}
        >
          {copied ? "Link copied" : "Share the win"}
        </button>
        <button type="button" onClick={onClose} className="h-11 rounded-full px-5 text-sm font-semibold text-foreground ring-1 ring-border-strong">
          Done
        </button>
      </div>
    </>
  );
}

function Loss({ entry, outcome, onClose }: { entry: MyEntry; outcome: "yes" | "no"; onClose: () => void }) {
  return (
    <>
      <p className="mt-5 font-display text-3xl font-bold tracking-tight text-foreground">
        <span style={{ color: SIDE_COLOR[outcome] }}>{outcome.toUpperCase()}</span> took this one.
      </p>
      <p className="mt-2 text-sm text-muted">
        You backed {entry.side.toUpperCase()} with {formatMoney(entry.amountCents)}. Next match is yours.
      </p>
      <div className="mt-6 flex gap-2">
        <Link
          href="/rooms/create"
          onClick={onClose}
          className="flex h-11 flex-1 items-center justify-center rounded-full text-sm font-semibold text-white transition-transform duration-150 ease-out active:scale-[0.97]"
          style={{ background: "var(--rival-blue)" }}
        >
          Rematch
        </Link>
        <button type="button" onClick={onClose} className="h-11 rounded-full px-5 text-sm font-semibold text-foreground ring-1 ring-border-strong">
          Close
        </button>
      </div>
    </>
  );
}

function Refund({ entry, settled, oneSided, onClose }: { entry: MyEntry | null; settled: boolean; oneSided: boolean; onClose: () => void }) {
  return (
    <>
      <p className="mt-5 font-display text-3xl font-bold tracking-tight text-foreground">Refunded</p>
      <p className="mt-2 text-sm text-muted">
        {entry ? `Your ${formatMoney(entry.amountCents)} ${settled ? "is back in your wallet" : "is on its way back to your wallet"}.` : "Every stake was returned."} {oneSided ? "Nobody backed the winning side, so every stake went back." : "This room couldn’t be decided, so nobody won or lost."}
      </p>
      {entry?.payoutTxSignature && (
        <a href={explorerTxUrl(entry.payoutTxSignature)} target="_blank" rel="noopener noreferrer" className="hover-link mt-1 inline-block text-xs text-muted underline underline-offset-2">
          Verify the refund on Solana ↗
        </a>
      )}
      <button type="button" onClick={onClose} className="mt-6 h-11 w-full rounded-full text-sm font-semibold text-foreground ring-1 ring-border-strong">
        Got it
      </button>
    </>
  );
}

function Missed({ outcome, pool, winningCents, onClose }: { outcome: "yes" | "no"; pool: number; winningCents: number; onClose: () => void }) {
  // What $10 on the winning side turned into — straight from this pool.
  const tenBecame = Math.floor((1000 * pool) / winningCents);
  return (
    <>
      <p className="mt-5 text-xs font-semibold uppercase tracking-[0.14em] text-muted">You missed this one</p>
      <p className="mt-1 font-display text-3xl font-bold tracking-tight text-foreground">
        <span style={{ color: SIDE_COLOR[outcome] }}>{outcome.toUpperCase()}</span> backers split {formatMoney(pool)}.
      </p>
      <p className="mt-2 text-sm text-muted">
        Every $10 on {outcome.toUpperCase()} came back as <span className="font-semibold text-foreground">{formatMoney(tenBecame)}</span>.
      </p>
      <div className="mt-6 flex gap-2">
        <Link
          href="/"
          onClick={onClose}
          className="flex h-11 flex-1 items-center justify-center rounded-full text-sm font-semibold text-white transition-transform duration-150 ease-out active:scale-[0.97]"
          style={{ background: "var(--rival-blue)" }}
        >
          Find the next room
        </Link>
        <button type="button" onClick={onClose} className="h-11 rounded-full px-5 text-sm font-semibold text-foreground ring-1 ring-border-strong">
          Close
        </button>
      </div>
    </>
  );
}
