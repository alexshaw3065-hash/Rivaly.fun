import { formatMoney, formatMoneyCompact } from "@/lib/mock-data";
import type { RoomRival } from "@/lib/supabase/entries";
import type { EntrySide } from "@/lib/types";
import { AnimatedMoney } from "../animated-money";
import { RivalCharacter } from "../rival-character";
import { RoomShareButton } from "./room-share-button";

const SIDES = {
  yes: { label: "YES", color: "var(--rival-blue)", dim: "var(--rival-blue-dim)" },
  no: { label: "NO", color: "var(--rival-red)", dim: "var(--rival-red-dim)" },
} as const;

// The two ends of the ground: everyone backing YES on one side, NO on the
// other — their faces, how many, and their share of the pool. Named people,
// not a percentage (engagement mechanism #5, social identity/rivalry). When
// one end is empty, the call to action is to fill it: send the room to
// someone who disagrees. After the result, the winning end lights up.
export function SideStands({
  yesCents,
  noCents,
  poolCents,
  rivals,
  mySide,
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
  outcome: "yes" | "no" | "void" | null;
  open: boolean;
  sharePath: string;
  claim: string;
}) {
  const total = yesCents + noCents;
  const yesPct = total > 0 ? Math.round((yesCents / total) * 100) : 50;
  const bySide = { yes: rivals.filter((r) => r.side === "yes"), no: rivals.filter((r) => r.side === "no") };
  const emptySide: EntrySide | null = open ? (bySide.yes.length === 0 ? "yes" : bySide.no.length === 0 ? "no" : null) : null;

  return (
    <section className="rounded-2xl border border-border bg-surface p-4">
      <div className="flex items-baseline justify-between">
        <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted">The pool</p>
        <p className="font-display text-2xl font-bold tabular-nums text-foreground">
          <AnimatedMoney cents={poolCents} />
        </p>
      </div>

      {/* Tug of war: the split, with the two sides meeting on an angle */}
      <div className="relative mt-3 flex h-3 overflow-hidden rounded-full bg-background">
        <span className="h-full transition-[width] duration-700 ease-out" style={{ width: `${yesPct}%`, background: SIDES.yes.color }} />
        <span className="h-full flex-1" style={{ background: SIDES.no.color }} />
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3">
        {(["yes", "no"] as const).map((side) => {
          const s = SIDES[side];
          const people = bySide[side];
          const cents = side === "yes" ? yesCents : noCents;
          const pct = side === "yes" ? yesPct : 100 - yesPct;
          const won = outcome === side;
          const lost = outcome !== null && outcome !== "void" && outcome !== side;
          return (
            <div
              key={side}
              className="rounded-xl border p-3 transition-opacity duration-300"
              style={{
                borderColor: won ? s.color : "var(--border)",
                background: won ? s.dim : "var(--background)",
                opacity: lost ? 0.55 : 1,
              }}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-display text-lg font-extrabold tracking-wide" style={{ color: s.color }}>
                  {s.label}
                </span>
                <span className="font-mono text-xs text-muted">{pct}%</span>
              </div>
              <p className="mt-0.5 font-mono text-xs text-muted" title={formatMoney(cents)}>
                {formatMoneyCompact(cents)} · {people.length} {people.length === 1 ? "backer" : "backers"}
              </p>
              <div className="mt-2.5 flex h-7 items-center">
                {people.length > 0 ? (
                  <div className="flex -space-x-1.5">
                    {people.slice(0, 5).map((p) => (
                      <span key={p.userId} className="enter-pop rounded-[10px]" style={{ boxShadow: `0 0 0 2px var(--background)` }} title={p.displayName}>
                        <RivalCharacter name={p.displayName} imageUrl={p.avatarUrl} size={26} />
                      </span>
                    ))}
                    {people.length > 5 && (
                      <span className="flex h-[26px] items-center pl-3 font-mono text-[11px] text-muted">+{people.length - 5}</span>
                    )}
                  </div>
                ) : (
                  <span className="text-xs text-muted">{open ? "Empty — waiting for a rival" : "Nobody took this side"}</span>
                )}
              </div>
              {won && <p className="mt-2 text-xs font-semibold" style={{ color: s.color }}>Called it ✓</p>}
              {mySide === side && !won && <p className="mt-2 text-xs font-semibold" style={{ color: s.color }}>You&rsquo;re here</p>}
              {mySide === side && won && <p className="text-xs text-muted">Including you</p>}
            </div>
          );
        })}
      </div>

      {emptySide && (
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-dashed border-border-strong p-3">
          <p className="text-sm text-foreground">
            Nobody&rsquo;s on <span className="font-bold" style={{ color: SIDES[emptySide].color }}>{SIDES[emptySide].label}</span> yet. Send it to someone who
            disagrees.
          </p>
          <RoomShareButton path={sharePath} claim={claim} label="Challenge a rival" />
        </div>
      )}
    </section>
  );
}
