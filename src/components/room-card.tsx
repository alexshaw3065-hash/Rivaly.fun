import Link from "next/link";
import type { Match, Room } from "@/lib/types";
import { formatMoney, splitPct, estimatedPayoutPerNaira } from "@/lib/mock-data";
import { SplitBar } from "./split-bar";
import { LiveBadge } from "./live-badge";
import { BookmarkButton } from "./bookmark-button";
import { ShareButton } from "./share-button";

// "If this side wins" payout preview, boxed per side (per founder
// reference) — real pari-mutuel math off the same split shown on the bar
// above (see estimatedPayoutPerNaira in mock-data.ts), not an invented
// number or an odds table. The target amount is green on BOTH sides
// deliberately: green here means "this is what you'd win," the same
// meaning regardless of which side it's on, not "this side is the good
// one" — keeping the bar's own blue-vs-red framing (opposing sides, no
// implied winner) intact. Each box's border still echoes its side's bar
// color so the two rows visually line up.
function PayoutPreviewBox({ borderColor, target }: { borderColor: string; target: number }) {
  return (
    <div
      className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border py-2"
      style={{ borderColor, background: `color-mix(in srgb, ${borderColor} 10%, transparent)` }}
    >
      <span className="font-mono text-xs text-muted">₦1</span>
      <span className="text-muted">→</span>
      <span className="font-mono text-base font-bold text-rival-green">₦{target.toFixed(2)}</span>
    </div>
  );
}

export function RoomCard({ room, match }: { room: Room; match: Match }) {
  const leftPct = splitPct(room);
  const rightPct = 100 - leftPct;
  const yesReturn = estimatedPayoutPerNaira(leftPct);
  const noReturn = estimatedPayoutPerNaira(rightPct);

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

      <div className="flex items-center gap-2">
        <PayoutPreviewBox borderColor="var(--rival-blue)" target={yesReturn} />
        <PayoutPreviewBox borderColor="var(--danger-red)" target={noReturn} />
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
