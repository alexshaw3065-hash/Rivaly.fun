import Link from "next/link";
import type { Match } from "@/lib/types";
import { formatMoney, formatMoneyCompact } from "@/lib/mock-data";
import { splitPctFromTotals, type RoomWithTotals } from "@/lib/supabase/room-mapper";
import { SplitBar } from "./split-bar";
import { BookmarkButton } from "./bookmark-button";
import { ShareButton } from "./share-button";
import { RivalsInRoom } from "./rivals-in-room";
import { MatchBanner } from "./create-room/match-hero";
import { RoomChatPreview } from "./room-chat-preview";
import { abbreviateClaim } from "@/lib/team-identity";

// The page's one signature artifact (see anti-slop-design-law.md) — not
// just a bigger RoomCard: the same team-colour match banner the create flow
// uses (both crests over their kit colours, pitch or gridiron markings, a
// live countdown), then the claim and the real split. Every number on it is
// a real field on the room — no momentum-per-hour stand-in.
export function ExplodingRoomCard({ room, match }: { room: RoomWithTotals; match: Match }) {
  const leftPct = splitPctFromTotals(room.yesTotalCents ?? 0, room.noTotalCents ?? 0);

  return (
    <Link
      href={`/rooms/${room.id}`}
      className="flex h-full flex-col overflow-hidden rounded-card bg-surface edge transition-transform duration-100 ease-out active:scale-[0.98]"
    >
      <MatchBanner match={match} size="sm" />
      <div className="flex flex-1 flex-col gap-4 p-4">
        <p className="text-title-2 font-display text-foreground" title={room.prediction} aria-label={room.prediction}>
          {abbreviateClaim(room.prediction, match.homeTeam, match.awayTeam)}
        </p>
        <SplitBar leftPct={leftPct} leftLabel="Yes" rightLabel="No" />
        <RoomChatPreview roomId={room.id} />
        <div className="mt-auto flex items-center justify-between gap-3 text-caption text-secondary">
          <span className="shrink-0 tabular-nums" title={formatMoney(room.poolTotalCents)}>
            <span className="text-label font-semibold text-foreground">{formatMoneyCompact(room.poolTotalCents)}</span> pool
          </span>
          <div className="flex min-w-0 items-center gap-4">
            <RivalsInRoom roomId={room.id} participantCount={room.participantCount} />
            <ShareButton path={`/rooms/${room.id}`} label="room" />
            <BookmarkButton id={room.id} label="room" />
          </div>
        </div>
      </div>
    </Link>
  );
}
