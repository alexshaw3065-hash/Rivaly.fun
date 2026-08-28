import Link from "next/link";
import type { Match, Room } from "@/lib/types";
import { formatMoney, splitPct, estimatedPayoutPerNaira } from "@/lib/mock-data";
import { SplitBar } from "./split-bar";
import { LiveBadge } from "./live-badge";
import { BookmarkButton } from "./bookmark-button";
import { ShareButton } from "./share-button";

// A/B experiment (temporary — see the founder's ask): two visual weights
// for the "if this side wins" payout preview under the bar, so real cards
// side by side settle which reads better rather than guessing. "subtle"
// keeps it a quiet secondary detail; "bold" makes it a real selling
// point, colored to match each side of the bar above it. Once one wins,
// collapse back to a single unconditional style and drop this prop.
export type PayoutVariant = "subtle" | "bold";

export function RoomCard({
  room,
  match,
  payoutVariant = "subtle",
}: {
  room: Room;
  match: Match;
  payoutVariant?: PayoutVariant;
}) {
  const leftPct = splitPct(room);
  const rightPct = 100 - leftPct;
  const yesReturn = estimatedPayoutPerNaira(leftPct);
  const noReturn = estimatedPayoutPerNaira(rightPct);
  const bold = payoutVariant === "bold";

  return (
    <Link
      href={`/rooms/${room.id}`}
      className="group flex flex-col gap-3 rounded-lg border border-border bg-surface p-4 transition-colors duration-150 hover:border-border-strong active:scale-[0.98]"
      style={{ transition: "transform 120ms ease-out, border-color 150ms ease" }}
    >
      <div className="flex items-center justify-between">
        <span className="font-mono text-[11px] uppercase tracking-wider text-muted">
          {match.competition}
        </span>
        {match.status === "live" ? (
          <LiveBadge />
        ) : (
          <span className="font-mono text-[11px] text-muted">
            {match.homeTeam.slice(0, 3).toUpperCase()} v {match.awayTeam.slice(0, 3).toUpperCase()}
          </span>
        )}
      </div>

      <p className="text-lg font-medium leading-snug text-foreground">{room.prediction}</p>

      <SplitBar leftPct={leftPct} leftLabel="Yes" rightLabel="No" />

      {/* "If this side wins" payout preview — real pari-mutuel math off the
          same split shown above, not an odds table: no bare multiplier,
          just what a real ₦1 stake would come back as. See
          estimatedPayoutPerNaira in mock-data.ts. */}
      <div
        className={`flex items-center justify-between font-mono ${bold ? "text-xs font-semibold" : "text-[10px] text-muted"}`}
      >
        <span style={bold ? { color: "var(--rival-blue)" } : undefined}>
          ₦1 → ₦{yesReturn.toFixed(2)} if Yes
        </span>
        <span style={bold ? { color: "var(--danger-red)" } : undefined}>
          ₦1 → ₦{noReturn.toFixed(2)} if No
        </span>
      </div>

      <div className="mt-1 flex items-center justify-between border-t border-border pt-3 font-mono text-xs text-muted">
        <span>{formatMoney(room.poolTotalCents)} pool</span>
        <div className="flex items-center gap-3">
          <span>{room.participantCount} rivals</span>
          <ShareButton path={`/rooms/${room.id}`} label="room" />
          <BookmarkButton id={room.id} label="room" />
        </div>
      </div>
    </Link>
  );
}
