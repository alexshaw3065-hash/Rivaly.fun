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
  return (
    <div className="grid grid-cols-2 gap-2">
      <button
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onPick("yes");
        }}
        className="rounded-full border py-2 text-sm font-semibold active:scale-[0.96]"
        style={{
          borderColor: "var(--rival-blue)",
          color: "var(--rival-blue)",
          background: "color-mix(in srgb, var(--rival-blue) 14%, transparent)",
        }}
      >
        Yes
      </button>
      <button
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onPick("no");
        }}
        className="rounded-full border py-2 text-sm font-semibold active:scale-[0.96]"
        style={{
          borderColor: "var(--rival-red)",
          color: "var(--rival-red)",
          background: "color-mix(in srgb, var(--rival-red) 14%, transparent)",
        }}
      >
        No
      </button>
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
      className="group flex flex-col gap-3 rounded-lg border border-border bg-surface p-4 transition-colors duration-150 hover:border-border-strong active:scale-[0.98]"
      style={{ transition: "transform 120ms ease-out, border-color 150ms ease" }}
    >
      <div className="flex items-center justify-between">
        <span className="flex min-w-0 items-center gap-2">
          <span className="flex shrink-0 -space-x-1">
            <TeamCrest name={match.homeTeam} size={18} />
            <TeamCrest name={match.awayTeam} size={18} />
          </span>
          <span className="truncate font-mono text-[11px] uppercase tracking-wider text-muted">{match.competition}</span>
        </span>
        {match.status === "live" ? (
          <LiveBadge />
        ) : (
          <span className="font-mono text-[11px] text-muted">
            {countdown && <span className="text-rival-blue">{countdown} · </span>}
            {teamIdentity(match.homeTeam).code} v {teamIdentity(match.awayTeam).code}
          </span>
        )}
      </div>

      <p className="text-lg font-medium leading-snug text-foreground" title={room.prediction} aria-label={room.prediction}>
        {abbreviateClaim(room.prediction, match.homeTeam, match.awayTeam)}
      </p>

      <SplitBar leftPct={leftPct} leftLabel="Yes" rightLabel="No" />

      {/* Only while it's still taking stakes — a live or settled room can't be joined. */}
      {room.status === "open" && <PredictPills onPick={(side: EntrySide) => router.push(`/rooms/${room.id}?side=${side}`)} />}

      <div className="mt-1 flex items-center justify-between border-t border-border pt-3 font-mono text-xs text-muted">
        <span title={formatMoney(room.poolTotalCents)}>{formatMoneyCompact(room.poolTotalCents)} pool</span>
        <div className="flex items-center gap-3">
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
