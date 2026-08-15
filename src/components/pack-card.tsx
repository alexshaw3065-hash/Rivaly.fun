import Link from "next/link";
import type { Pack } from "@/lib/types";
import { formatMoney, matchById } from "@/lib/mock-data";

// A pack is a bundled conviction ticket (2-4 legs), not a bet-slip table —
// per masterplan 07-product-blueprint.md §5.8. Each leg reads as a plain
// prediction sentence with its matchup for context; the only number that
// stands out is the combined payout multiplier, framed like a headline
// stat rather than odds.
export function PackCard({ pack }: { pack: Pack }) {
  return (
    <Link
      href={`/packs/${pack.id}`}
      className="flex flex-col gap-3.5 rounded-lg border border-border bg-surface p-4 transition-colors duration-150 hover:border-border-strong active:scale-[0.98]"
      style={{ transition: "transform 120ms ease-out, border-color 150ms ease" }}
    >
      <div className="flex items-center justify-between">
        <span className="font-mono text-[11px] uppercase tracking-wider text-muted">
          {pack.legs.length}-leg pack
        </span>
        <span className="font-mono text-sm font-semibold text-rival-blue">
          {pack.payoutMultiplier.toFixed(1)}×
        </span>
      </div>

      <ul className="flex flex-col gap-2">
        {pack.legs.map((leg, i) => {
          const match = matchById(leg.matchId);
          return (
            <li key={i} className="flex flex-col gap-0.5">
              <p className="text-sm font-medium leading-snug text-foreground">{leg.prediction}</p>
              {match && (
                <p className="text-xs text-muted">
                  {match.homeTeam} v {match.awayTeam}
                </p>
              )}
            </li>
          );
        })}
      </ul>

      <div className="mt-1 flex items-center justify-between border-t border-border pt-3 font-mono text-xs text-muted">
        <span>
          {formatMoney(pack.entryAmountCents)} entry · {formatMoney(pack.poolTotalCents)} pool
        </span>
        <span>{pack.participantCount} rivals</span>
      </div>
    </Link>
  );
}
