import type { Match } from "@/lib/types";
import { LiveBadge } from "./live-badge";

function formatKickoff(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
}

export function MatchChip({ match }: { match: Match }) {
  return (
    <div className="flex min-w-[220px] shrink-0 flex-col gap-2.5 rounded-lg border border-border bg-surface px-4 py-3.5">
      <div className="flex items-center justify-between">
        <span className="font-mono text-[10px] uppercase tracking-wider text-muted">
          {match.competition}
        </span>
        {match.status === "live" ? (
          <LiveBadge />
        ) : (
          <span className="font-mono text-[10px] text-muted">
            {match.status === "finished" ? "FT" : formatKickoff(match.kickoffAt)}
          </span>
        )}
      </div>
      <div className="flex items-center justify-between text-sm font-medium text-foreground">
        <span>{match.homeTeam}</span>
        <span className="font-mono text-muted">{match.homeScore ?? "–"}</span>
      </div>
      <div className="flex items-center justify-between text-sm font-medium text-foreground">
        <span>{match.awayTeam}</span>
        <span className="font-mono text-muted">{match.awayScore ?? "–"}</span>
      </div>
    </div>
  );
}
