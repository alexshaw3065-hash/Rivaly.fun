import Link from "next/link";
import type { Match } from "@/lib/types";
import { LiveBadge } from "./live-badge";
import { BookmarkButton } from "./bookmark-button";
import { PlusIcon } from "./icons";
import { LeagueMark } from "./league-mark";
import { buttonClasses } from "./ui/button";

function formatKickoff(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
}

export function MatchChip({ match }: { match: Match }) {
  return (
    <div className="relative flex min-w-[220px] shrink-0 flex-col gap-3 rounded-card bg-surface p-4 edge transition-colors duration-100 hover:bg-surface-elevated">
      {/* The whole card opens this match's rooms; the bookmark and Challenge sit above the link. */}
      <Link href={`/rooms?match=${match.id}`} aria-label={`Rooms on ${match.homeTeam} v ${match.awayTeam}`} className="absolute inset-0 rounded-card" />
      <div className="flex items-center justify-between gap-3">
        <span className="flex min-w-0 items-center gap-1.5 text-caption font-medium text-secondary">
          <LeagueMark name={match.competition} size={12} />
          <span className="truncate">{match.competition}</span>
        </span>
        <div className="flex items-center gap-3">
          {match.status === "live" ? (
            <LiveBadge />
          ) : (
            <span className="text-caption tabular-nums text-secondary">{match.status === "finished" ? "FT" : formatKickoff(match.kickoffAt)}</span>
          )}
          <span className="relative z-[1]">
            <BookmarkButton type="match" id={match.id} label="match" />
          </span>
        </div>
      </div>
      <div className="flex flex-col gap-2">
        {[
          [match.homeTeam, match.homeScore],
          [match.awayTeam, match.awayScore],
        ].map(([team, score]) => (
          <div key={String(team)} className="flex items-center justify-between gap-3 text-body font-semibold text-foreground">
            <span className="truncate">{team}</span>
            <span className="tabular-nums text-secondary">{score ?? "–"}</span>
          </div>
        ))}
      </div>

      {/* The entry point that makes the fast create-room path possible at
          all: with a match already picked, the sheet skips straight to
          Market → Stake (3 taps total). Hidden once finished — nothing to
          challenge on a match that's already over. */}
      {match.status !== "finished" && (
        <Link href={`/rooms/create?matchId=${match.id}`} className={buttonClasses({ variant: "secondary", size: "sm", full: true, className: "z-[1]" })}>
          <span className="[&>svg]:h-3 [&>svg]:w-3">
            <PlusIcon />
          </span>
          Challenge
        </Link>
      )}
    </div>
  );
}
