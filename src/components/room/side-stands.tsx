"use client";

import { useState } from "react";
import { formatMoney, formatMoneyCompact } from "@/lib/mock-data";
import type { RoomRival } from "@/lib/supabase/entries";
import type { EntrySide } from "@/lib/types";
import { openStakeSheet } from "@/lib/stake-sheet-store";
import { AnimatedMoney } from "../animated-money";
import { RivalCharacter } from "../rival-character";
import { RoomShareButton } from "./room-share-button";
import { RoomPeopleSheet } from "./room-people-sheet";

const SIDES = {
  yes: { label: "YES", color: "var(--rival-blue)", dim: "var(--rival-blue-dim)" },
  no: { label: "NO", color: "var(--rival-red)", dim: "var(--rival-red-dim)" },
} as const;

const FACES = 3;

// The pool: a ring split between the two sides with the pot in the middle,
// each side's money, share and backers either side of it, the faces behind
// the biggest stakes (tap for everyone in the room), and — on a phone, while stakes are open — the way in.
// Named people and their money, not a percentage table (engagement mechanism
// #5, social identity/rivalry). After the result, the winning side lights up.
export function SideStands({
  yesCents,
  noCents,
  poolCents,
  rivals,
  mySide,
  myStakeCents,
  outcome,
  open,
  sharePath,
  claim,
}: {
  yesCents: number;
  noCents: number;
  poolCents: number;
  rivals: RoomRival[];
  mySide: EntrySide | null;
  myStakeCents: number | null;
  outcome: "yes" | "no" | "void" | null;
  open: boolean;
  sharePath: string;
  claim: string;
}) {
  const total = yesCents + noCents;
  const yesShare = total > 0 ? yesCents / total : 0.5;
  const pct = { yes: Math.round(yesShare * 100), no: 100 - Math.round(yesShare * 100) };
  const cents = { yes: yesCents, no: noCents };
  const bySide = {
    yes: rivals.filter((r) => r.side === "yes").sort((a, b) => b.amountCents - a.amountCents),
    no: rivals.filter((r) => r.side === "no").sort((a, b) => b.amountCents - a.amountCents),
  };
  const decided = outcome === "yes" || outcome === "no" ? outcome : null;
  const [sheetSide, setSheetSide] = useState<EntrySide | null>(null);

  return (
    <section className="rounded-2xl border border-border bg-surface p-4">
      {/* Side · ring · side */}
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
        {(["yes", "no"] as const).map((side, i) => {
          const s = SIDES[side];
          const lost = decided !== null && decided !== side;
          const stats = (
            <div key={side} className={`min-w-0 transition-opacity duration-300 ${i === 1 ? "order-3 text-right" : ""}`} style={{ opacity: lost ? 0.45 : 1 }}>
              <p className="font-display text-base font-extrabold tracking-wide" style={{ color: s.color }}>
                {s.label}
                {decided === side && <span className="ml-1 text-xs">✓</span>}
              </p>
              <p className="mt-0.5 truncate font-display text-lg font-bold tabular-nums text-foreground" title={formatMoney(cents[side])}>
                {formatMoneyCompact(cents[side])}
              </p>
              <p className="font-mono text-[11px] text-muted">
                {pct[side]}% · {bySide[side].length} in
              </p>
            </div>
          );
          return stats;
        })}
        <PoolRing yesShare={total > 0 ? yesShare : null} poolCents={poolCents} decided={decided} />
      </div>

      {/* The faces behind the money — tap for everyone in the room */}
      <div className="mt-4 grid grid-cols-2 gap-2">
        {(["yes", "no"] as const).map((side) => {
          const s = SIDES[side];
          const people = bySide[side];
          const frame = {
            background: `color-mix(in srgb, ${s.color} 7%, transparent)`,
            boxShadow: `inset 0 0 0 ${decided === side ? 1.5 : 1}px color-mix(in srgb, ${s.color} ${decided === side ? 100 : 24}%, transparent)`,
          };
          if (people.length === 0)
            return (
              <div key={side} className="flex min-h-[72px] items-center justify-center rounded-xl px-2.5 py-2" style={frame}>
                {open ? <RoomShareButton path={sharePath} claim={claim} tone={side} /> : <span className="text-xs text-muted">Nobody</span>}
              </div>
            );
          return (
            <button
              key={side}
              type="button"
              onClick={() => setSheetSide(side)}
              aria-label={`Everyone on ${s.label} — ${people.length} ${people.length === 1 ? "rival" : "rivals"}`}
              className="flex min-h-[72px] items-center gap-1.5 rounded-xl px-2.5 py-2.5 text-left transition-transform duration-150 ease-out active:scale-[0.98]"
              style={frame}
            >
              {people.slice(0, FACES).map((p) => (
                <span key={p.userId} className="enter-pop flex w-[34px] shrink-0 flex-col items-center gap-1" title={`${p.displayName} · ${formatMoney(p.amountCents)}`}>
                  <RivalCharacter name={p.displayName} imageUrl={p.avatarUrl} size={32} />
                  <span className="max-w-full truncate text-[11px] font-semibold tabular-nums text-foreground/80">{formatMoneyCompact(p.amountCents)}</span>
                </span>
              ))}
              {people.length > FACES && (
                <span className="flex w-[34px] shrink-0 flex-col items-center gap-1">
                  <span
                    className="flex h-8 w-8 items-center justify-center rounded-full text-[11px] font-bold tabular-nums"
                    style={{ color: s.color, boxShadow: `inset 0 0 0 1.5px color-mix(in srgb, ${s.color} 55%, transparent)` }}
                  >
                    +{people.length - FACES}
                  </span>
                  <span className="text-[11px] text-transparent" aria-hidden>
                    ·
                  </span>
                </span>
              )}
            </button>
          );
        })}
      </div>
      <RoomPeopleSheet open={sheetSide !== null} side={sheetSide ?? "yes"} rivals={rivals} onOpenChange={(o) => !o && setSheetSide(null)} />

      {/* The way in (phones; desktop has the side panel) */}
      {open && !mySide && (
        <div className="mt-3 grid grid-cols-2 gap-2 md:hidden">
          {(["yes", "no"] as const).map((side) => (
            <button
              key={side}
              type="button"
              onClick={() => openStakeSheet(side)}
              className="flex h-11 items-center justify-center gap-1.5 rounded-xl font-display text-sm font-extrabold tracking-wide text-white transition-transform duration-150 ease-out active:scale-[0.96]"
              style={{ background: SIDES[side].color }}
            >
              <svg width="13" height="13" viewBox="0 0 14 14" aria-hidden>
                <path d="M7 2.5v9M2.5 7h9" stroke="currentColor" strokeWidth="2" strokeLinecap="butt" />
              </svg>
              Back {SIDES[side].label}
            </button>
          ))}
        </div>
      )}
      {mySide && (
        <p className="mt-3 text-center text-xs text-muted">
          You&rsquo;re on{" "}
          <span className="font-bold" style={{ color: SIDES[mySide].color }}>
            {SIDES[mySide].label}
          </span>
          {myStakeCents !== null && <> · {formatMoney(myStakeCents)}</>}
        </p>
      )}
    </section>
  );
}

// The pot in the middle of a ring split between the sides.
function PoolRing({ yesShare, poolCents, decided }: { yesShare: number | null; poolCents: number; decided: "yes" | "no" | null }) {
  const size = 128;
  const stroke = 14;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const gap = 0; // the sides meet on a straight cut
  const yesLen = yesShare === null ? 0 : Math.max(0, yesShare * c - gap);
  const noLen = yesShare === null ? 0 : Math.max(0, (1 - yesShare) * c - gap);
  return (
    <div className="order-2 relative flex items-center justify-center" style={{ width: size, height: size }}>
      {/* Starts at 12 o'clock and runs counter-clockwise, so YES fills the left half beside its numbers. */}
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ transform: "scaleX(-1) rotate(-90deg)" }} aria-hidden>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--border)" strokeWidth={stroke} />
        {yesShare !== null && (
          <>
            <circle
              cx={size / 2}
              cy={size / 2}
              r={r}
              fill="none"
              stroke="var(--rival-blue)"
              strokeWidth={stroke}
              strokeLinecap="butt"
              strokeDasharray={`${yesLen} ${c}`}
              strokeDashoffset={-gap / 2}
              style={{ opacity: decided === "no" ? 0.35 : 1, transition: "stroke-dasharray 900ms cubic-bezier(0.23,1,0.32,1), opacity 300ms" }}
            />
            <circle
              cx={size / 2}
              cy={size / 2}
              r={r}
              fill="none"
              stroke="var(--rival-red)"
              strokeWidth={stroke}
              strokeLinecap="butt"
              strokeDasharray={`${noLen} ${c}`}
              strokeDashoffset={-(yesShare * c + gap / 2)}
              style={{ opacity: decided === "yes" ? 0.35 : 1, transition: "stroke-dasharray 900ms cubic-bezier(0.23,1,0.32,1), stroke-dashoffset 900ms cubic-bezier(0.23,1,0.32,1), opacity 300ms" }}
            />
          </>
        )}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted">Pool</span>
        <span className="font-display text-2xl font-bold tabular-nums text-foreground">
          <AnimatedMoney cents={poolCents} />
        </span>
      </div>
    </div>
  );
}
