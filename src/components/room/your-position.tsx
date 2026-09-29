"use client";

import { useEffect, useState } from "react";
import type { EntrySide } from "@/lib/types";
import { planSettlement } from "@/lib/settlement/payouts";
import { formatMoney } from "@/lib/mock-data";

// Your stake in a room and what it would pay, live: as people join either
// side the room re-renders (room-live.tsx) and these numbers move with it.
// The maths is the settlement's own (planSettlement) at the room's frozen fee
// rates, so "to win" is what would actually be paid if the room settled now —
// an estimate only because more people can still join.
//
// Two layouts to compare (founder, 2026-09-29): PositionBar docked above the
// chat input, PositionCard beneath the chat. Keep the one that wins.
//
// Engagement mechanisms (rivaly-engagement-psychology): #2 anticipation —
// your potential win moving as the pot fills; #6 "money at play".

export interface PositionProps {
  side: EntrySide;
  stakeCents: number;
  yesCents: number;
  noCents: number;
  rivalyBps: number;
  hostBps: number;
  /** Kicked off (or stakes otherwise closed): the numbers are final unless the result voids it. */
  locked: boolean;
}

interface Numbers {
  payout: number;
  profit: number;
  pot: number;
  sharePct: number;
  oneSided: boolean;
  feePct: number;
}

function positionNumbers({ side, stakeCents, yesCents, noCents, rivalyBps, hostBps }: PositionProps): Numbers {
  const mine = Math.max(side === "yes" ? yesCents : noCents, stakeCents);
  const theirs = side === "yes" ? noCents : yesCents;
  const other: EntrySide = side === "yes" ? "no" : "yes";
  const entries = [
    { id: "me", side, amountCents: stakeCents },
    ...(mine > stakeCents ? [{ id: "rest", side, amountCents: mine - stakeCents }] : []),
    ...(theirs > 0 ? [{ id: "them", side: other, amountCents: theirs }] : []),
  ];
  const plan = planSettlement(entries, side, { rivalyBps, hostBps });
  const payout = plan.payouts.find((p) => p.entryId === "me")?.cents ?? stakeCents;
  return {
    payout,
    profit: payout - stakeCents,
    pot: mine + theirs,
    sharePct: Math.round((stakeCents / mine) * 100),
    oneSided: theirs === 0,
    feePct: (rivalyBps + hostBps) / 100,
  };
}

const SIDE_INK: Record<EntrySide, string> = { yes: "text-yes-ink", no: "text-no-ink" };

// A change in what you'd win, shown for a few seconds next to the number.
function useChange(payout: number): number | null {
  const [seen, setSeen] = useState<{ payout: number; delta: number | null }>({ payout, delta: null });
  if (payout !== seen.payout) setSeen({ payout, delta: payout - seen.payout });
  useEffect(() => {
    if (seen.delta === null) return;
    const t = window.setTimeout(() => setSeen((s) => ({ ...s, delta: null })), 4000);
    return () => window.clearTimeout(t);
  }, [seen]);
  return seen.delta;
}

function Change({ delta }: { delta: number | null }) {
  if (!delta) return null;
  return (
    <span className={`text-caption font-semibold tabular-nums [animation:fade-in-up_200ms_ease-out_both] ${delta > 0 ? "text-money-ink" : "text-secondary"}`}>
      {delta > 0 ? "+" : "−"}
      {formatMoney(Math.abs(delta))}
    </span>
  );
}

function Details({ p, n }: { p: PositionProps; n: Numbers }) {
  const cells = [
    { label: "Your stake", value: formatMoney(p.stakeCents) },
    { label: `Your share of ${p.side.toUpperCase()}`, value: `${n.sharePct}%` },
    { label: "Whole pot", value: formatMoney(n.pot) },
    { label: "Profit if you win", value: n.oneSided ? "—" : `+${formatMoney(n.profit)}` },
  ];
  return (
    <>
      <dl className="grid grid-cols-2 gap-2">
        {cells.map((c) => (
          <div key={c.label} className="rounded-control bg-background px-3 py-2">
            <dt className="text-caption text-secondary">{c.label}</dt>
            <dd className="mt-0.5 text-label font-semibold tabular-nums text-foreground">{c.value}</dd>
          </div>
        ))}
      </dl>
      <p className="mt-2 text-caption text-secondary">
        {n.oneSided
          ? `Nobody's on ${p.side === "yes" ? "NO" : "YES"} yet — if nobody joins, you get your ${formatMoney(p.stakeCents)} back.`
          : p.locked
            ? "Locked at kickoff. Paid automatically when the result is in."
            : "Moves as people join — more on the other side means more for you."}
        {n.feePct > 0 && !n.oneSided && ` Includes the ${n.feePct}% fee on winnings.`}
      </p>
    </>
  );
}

function headline(p: PositionProps, n: Numbers) {
  return n.oneSided ? (
    <span className="text-secondary">waiting for a rival</span>
  ) : (
    <>
      <span className="text-secondary">{p.locked ? "if it lands" : "to win"}</span>{" "}
      <span className="font-semibold tabular-nums text-money-ink">{formatMoney(n.payout)}</span>
    </>
  );
}

/** Docked above the chat input: one line, tap for the details. */
export function PositionBar(p: PositionProps) {
  const n = positionNumbers(p);
  const delta = useChange(n.payout);
  const [open, setOpen] = useState(false);
  return (
    <div className="mb-2 rounded-control bg-background px-3 py-2 edge">
      <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} className="flex w-full min-w-0 items-center gap-2 text-left text-label">
        <span className={`font-bold ${SIDE_INK[p.side]}`}>{p.side.toUpperCase()}</span>
        <span className="tabular-nums text-foreground">{formatMoney(p.stakeCents)}</span>
        <span aria-hidden className="text-tertiary">→</span>
        <span className="min-w-0 truncate">{headline(p, n)}</span>
        <Change delta={delta} />
        <svg aria-hidden width="12" height="12" viewBox="0 0 12 12" className={`ml-auto shrink-0 text-secondary transition-transform duration-200 ${open ? "rotate-180" : ""}`}>
          <path d="M3 4.5 6 7.5l3-3" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      {open && (
        <div className="mt-2 [animation:fade-in-up_180ms_ease-out_both]">
          <Details p={p} n={n} />
        </div>
      )}
    </div>
  );
}

/** Beneath the chat: the same numbers, always open. */
export function PositionCard(p: PositionProps) {
  const n = positionNumbers(p);
  const delta = useChange(n.payout);
  return (
    <section className="rounded-card bg-surface p-4 edge" aria-label="Your position">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-body-lg font-display font-bold text-foreground">Your position</h2>
        <span className={`text-label font-bold ${SIDE_INK[p.side]}`}>{p.side.toUpperCase()}</span>
      </div>
      <p className="mt-2 flex flex-wrap items-baseline gap-x-2 text-body">
        {headline(p, n)}
        <Change delta={delta} />
      </p>
      <div className="mt-3">
        <Details p={p} n={n} />
      </div>
    </section>
  );
}
