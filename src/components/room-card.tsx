"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { EntrySide, Match } from "@/lib/types";
import { formatMoney, formatMoneyCompact, kickoffCountdownCompact } from "@/lib/mock-data";
import { splitPctFromTotals, type RoomWithTotals } from "@/lib/supabase/room-mapper";
import { SplitBar } from "./split-bar";
import { LiveBadge } from "./live-badge";
import { BookmarkButton } from "./bookmark-button";
import { ShareButton } from "./share-button";
import { ArenaQuoteButton } from "./arena/arena-room-buttons";
import { RivalsInRoom } from "./rivals-in-room";
import { TeamCrest } from "./team-crest";
import { abbreviateClaim, teamIdentity } from "@/lib/team-identity";
import { LeagueMark } from "./league-mark";
import { SidePill } from "./ui/controls";

// One-tap into a side, right from the feed — the Fast design principle's
// "one-tap challenges." Now that entries move real balance, the pill can't
// just flip local state to "You're in": it opens the room with that side
// already picked, so the only thing left is the stake. Pill-shaped and always visible,
// not hidden behind a reveal step. No percentage baked in — the split
// bar's own labels above already show Yes/No's percentage, so the pill
// only ever needs to carry the pick itself. A light tint of the side's
// own color sits behind each pill (not fully transparent, not a full
// solid fill either) so the pick reads as a real surface, not just an
// outline.
function PredictPills({ onPick }: { onPick: (side: EntrySide) => void }) {
  const pick = (side: EntrySide) => (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onPick(side);
  };
  return (
    <div className="grid grid-cols-2 gap-2">
      <SidePill side="yes" size="md" role="button" aria-checked={undefined} label="Yes" onClick={pick("yes")} />
      <SidePill side="no" size="md" role="button" aria-checked={undefined} label="No" onClick={pick("no")} />
    </div>
  );
}

export function RoomCard({ room, match }: { room: RoomWithTotals; match: Match }) {
  const router = useRouter();
  const leftPct = splitPctFromTotals(room.yesTotalCents ?? 0, room.noTotalCents ?? 0);
  const countdown = kickoffCountdownCompact(match);

  return (
    <Link
      href={`/rooms/${room.id}`}
      className="group flex flex-col gap-3 rounded-card bg-surface p-4 edge transition-[transform,background-color] duration-100 ease-out hover:bg-surface-elevated active:scale-[0.98]"
    >
      <div className="flex items-center justify-between">
        <span className="flex min-w-0 items-center gap-2">
          <LeagueMark name={match.competition} size={14} />
          <span className="truncate text-caption font-medium text-secondary">{match.competition}</span>
        </span>
        {match.status === "live" ? <LiveBadge /> : countdown && <span className="shrink-0 text-caption tabular-nums text-yes-ink">{countdown}</span>}
      </div>

      {/* Each club's badge beside its own name: MUN v TOT. */}
      <div className="flex items-center gap-2 text-label font-semibold text-foreground">
        <TeamCrest name={match.homeTeam} size={20} />
        <span>{teamIdentity(match.homeTeam).code}</span>
        <span className="font-normal text-tertiary">v</span>
        <span>{teamIdentity(match.awayTeam).code}</span>
        <TeamCrest name={match.awayTeam} size={20} />
      </div>

      <p className="text-title-3 font-display text-foreground" title={room.prediction} aria-label={room.prediction}>
        {abbreviateClaim(room.prediction, match.homeTeam, match.awayTeam)}
      </p>

      <SplitBar leftPct={leftPct} leftLabel="Yes" rightLabel="No" />

      {/* Only while it's still taking stakes — a live or settled room can't be joined. */}
      {room.status === "open" && <PredictPills onPick={(side: EntrySide) => router.push(`/rooms/${room.id}?side=${side}`)} />}

      <div className="mt-1 flex items-center justify-between text-caption text-secondary">
        <span className="tabular-nums" title={formatMoney(room.poolTotalCents)}>
          <span className="text-label font-semibold text-foreground">{formatMoneyCompact(room.poolTotalCents)}</span> pool
        </span>
        <div className="flex items-center gap-4">
          <RivalsInRoom roomId={room.id} participantCount={room.participantCount} />
          {room.visibility === "public" && room.status === "open" && (
            <ArenaQuoteButton room={{ id: room.id, prediction: room.prediction, matchId: room.matchId }} />
          )}
          <ShareButton path={`/rooms/${room.id}`} label="room" />
          <BookmarkButton id={room.id} label="room" />
        </div>
      </div>
    </Link>
  );
}
