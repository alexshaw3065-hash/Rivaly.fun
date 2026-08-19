import Link from "next/link";
import type { Match, Room } from "@/lib/types";
import { formatMoney, splitPct, momentumCount } from "@/lib/mock-data";
import { SplitBar } from "./split-bar";
import { LiveBadge } from "./live-badge";
import { BookmarkButton } from "./bookmark-button";

// The page's one signature artifact (see anti-slop-design-law.md) — not
// just a bigger RoomCard. The self-colored top rule + momentum stat are
// what's actually new here: this is what makes a room worth showing on
// "Exploding Now" rather than just "Trending."
export function ExplodingRoomCard({ room, match }: { room: Room; match: Match }) {
  const leftPct = splitPct(room);
  const momentum = momentumCount(room);

  return (
    <Link
      href={`/rooms/${room.id}`}
      className="flex h-full flex-col gap-4 rounded-xl border border-border-strong bg-surface-elevated p-5 transition-transform duration-150 ease-out active:scale-[0.98]"
    >
      <span className="block h-[3px] w-9 rounded-full" style={{ background: "var(--rival-blue)" }} />

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

      <p className="font-display text-xl font-semibold leading-snug text-foreground">
        {room.prediction}
      </p>

      <SplitBar leftPct={leftPct} leftLabel="Yes" rightLabel="No" />

      <div className="flex items-center justify-between border-t border-border pt-3.5 font-mono text-xs text-muted">
        <span>{formatMoney(room.poolTotalCents)} pool</span>
        <div className="flex items-center gap-3">
          <span className="text-rival-green">+{momentum} this hour</span>
          <BookmarkButton id={room.id} label="room" />
        </div>
      </div>
    </Link>
  );
}
