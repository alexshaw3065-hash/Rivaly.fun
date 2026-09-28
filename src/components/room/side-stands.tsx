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
import { Button } from "../ui/button";

const SIDES = {
  yes: { label: "YES", ink: "text-yes-ink", box: "bg-yes/8", edge: "outline-yes/25", won: "outline-yes" },
  no: { label: "NO", ink: "text-no-ink", box: "bg-no/8", edge: "outline-no/25", won: "outline-no" },
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
    <section className="rounded-card bg-surface p-4 edge">
      {/* Side · ring · side */}
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
        {(["yes", "no"] as const).map((side, i) => {
          const s = SIDES[side];
          const lost = decided !== null && decided !== side;
          const stats = (
            <div key={side} className={`min-w-0 transition-opacity duration-300 ${i === 1 ? "order-3 text-right" : ""}`} style={{ opacity: lost ? 0.45 : 1 }}>
              <p className={`text-body-lg font-display font-extrabold tracking-wide ${s.ink}`}>
                {s.label}
                {decided === side && <span className="ml-1 text-caption">✓</span>}
              </p>
              <p className="mt-1 truncate text-title-3 font-display tabular-nums text-foreground" title={formatMoney(cents[side])}>
                {formatMoneyCompact(cents[side])}
              </p>
              <p className="text-caption tabular-nums text-secondary">
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
          const frame = `rounded-control outline -outline-offset-1 ${s.box} ${decided === side ? `outline-[1.5px] ${s.won}` : `outline-1 ${s.edge}`}`;
          if (people.length === 0)
            return (
              <div key={side} className={`flex min-h-[72px] items-center justify-center px-3 py-2 ${frame}`}>
                {open ? <RoomShareButton path={sharePath} claim={claim} tone={side} /> : <span className="text-caption text-secondary">Nobody</span>}
              </div>
            );
          return (
            <button
              key={side}
              type="button"
              onClick={() => setSheetSide(side)}
              aria-label={`Everyone on ${s.label} — ${people.length} ${people.length === 1 ? "rival" : "rivals"}`}
              className={`flex min-h-[72px] items-center gap-1.5 px-3 py-3 text-left transition-transform duration-100 ease-out active:scale-[0.98] ${frame}`}
            >
              {people.slice(0, FACES).map((p) => (
                <span key={p.userId} className="enter-pop flex w-[34px] shrink-0 flex-col items-center gap-1" title={`${p.displayName} · ${formatMoney(p.amountCents)}`}>
                  <RivalCharacter name={p.displayName} imageUrl={p.avatarUrl} size={32} />
                  <span className="max-w-full truncate text-micro font-semibold tabular-nums text-foreground/80">{formatMoneyCompact(p.amountCents)}</span>
                </span>
              ))}
              {people.length > FACES && (
                <span className="flex w-[34px] shrink-0 flex-col items-center gap-1">
                  <span className={`flex h-8 w-8 items-center justify-center rounded-full text-micro font-bold tabular-nums outline outline-[1.5px] -outline-offset-[1.5px] ${s.ink} ${s.edge}`}>
                    +{people.length - FACES}
                  </span>
                  <span className="text-micro text-transparent" aria-hidden>
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
            <Button
              key={side}
              variant={side}
              size="lg"
              className="font-display font-extrabold tracking-wide"
              onClick={() => openStakeSheet(side)}
              leading={
                <svg width="13" height="13" viewBox="0 0 14 14" aria-hidden>
                  <path d="M7 2.5v9M2.5 7h9" stroke="currentColor" strokeWidth="2" strokeLinecap="butt" />
                </svg>
              }
            >
              Back {SIDES[side].label}
            </Button>
          ))}
        </div>
      )}
      {mySide && (
        <p className="mt-3 text-center text-caption text-secondary">
          You&rsquo;re on{" "}
          <span className={`font-bold ${SIDES[mySide].ink}`}>
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
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--line-strong)" strokeWidth={stroke} />
        {yesShare !== null && (
          <>
            <circle
              cx={size / 2}
              cy={size / 2}
              r={r}
              fill="none"
              stroke="var(--yes)"
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
              stroke="var(--no)"
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
        <span className="text-caption text-secondary">Pool</span>
        <span className="text-title-1 font-display tabular-nums text-foreground">
          <AnimatedMoney cents={poolCents} />
        </span>
      </div>
    </div>
  );
}
