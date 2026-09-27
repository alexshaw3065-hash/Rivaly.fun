import Link from "next/link";
import type { Match } from "@/lib/types";
import { LiveBadge } from "./live-badge";
import { BookmarkButton } from "./bookmark-button";
import { PlusIcon } from "./icons";
import { LeagueMark } from "./league-mark";

function formatKickoff(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
}

export function MatchChip({ match }: { match: Match }) {
  return (
    <div className="relative flex min-w-[220px] shrink-0 flex-col gap-2.5 rounded-lg border border-border bg-surface px-4 py-3.5 transition-colors duration-150 hover:border-border-strong">
      {/* The whole card opens this match's rooms; the bookmark and Challenge sit above the link. */}
      <Link href={`/rooms?match=${match.id}`} aria-label={`Rooms on ${match.homeTeam} v ${match.awayTeam}`} className="absolute inset-0 rounded-lg" />
      <div className="flex items-center justify-between">
        <span className="flex min-w-0 items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider text-muted">
          <LeagueMark name={match.competition} size={12} />
          <span className="truncate">{match.competition}</span>
        </span>
        <div className="flex items-center gap-2.5">
          {match.status === "live" ? (
            <LiveBadge />
          ) : (
            <span className="font-mono text-[10px] text-muted">
              {match.status === "finished" ? "FT" : formatKickoff(match.kickoffAt)}
            </span>
          )}
          <span className="relative z-[1]">
            <BookmarkButton type="match" id={match.id} label="match" />
          </span>
        </div>
      </div>
      <div className="flex items-center justify-between text-sm font-medium text-foreground">
        <span>{match.homeTeam}</span>
        <span className="font-mono text-muted">{match.homeScore ?? "–"}</span>
      </div>
      <div className="flex items-center justify-between text-sm font-medium text-foreground">
        <span>{match.awayTeam}</span>
        <span className="font-mono text-muted">{match.awayScore ?? "–"}</span>
      </div>

      {/* The entry point that makes the fast create-room path possible at
          all: with a match already picked, the sheet skips straight to
          Market → Stake (3 taps total). Hidden once finished — nothing to
          challenge on a match that's already over. */}
      {match.status !== "finished" && (
        <Link
          href={`/rooms/create?matchId=${match.id}`}
          className="relative z-[1] mt-0.5 flex items-center justify-center gap-1.5 rounded-md border border-border-strong py-2 text-xs font-medium text-foreground transition-transform duration-150 ease-out active:scale-[0.97]"
        >
          <span className="[&>svg]:h-3 [&>svg]:w-3">
            <PlusIcon />
          </span>
          Challenge
        </Link>
      )}
    </div>
  );
}
