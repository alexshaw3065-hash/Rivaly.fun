"use client";

import { useEffect, useState, type ReactNode } from "react";
import { sportOf } from "@/lib/markets";
import { teamIdentity } from "@/lib/team-identity";
import type { Match } from "@/lib/types";
import { LiveBadge } from "../live-badge";
import { TeamCrest } from "../team-crest";
import { GridironIcon, SoccerIcon } from "./market-icons";
import { LeagueMark } from "@/components/league-mark";

export function kickoffLabel(kickoffAt: string, now: number = Date.now()): string {
  const diffMs = +new Date(kickoffAt) - now;
  if (diffMs <= 0) return "Kicking off";
  const totalMinutes = Math.round(diffMs / 60000);
  const days = Math.floor(totalMinutes / 1440);
  const hours = Math.floor((totalMinutes % 1440) / 60);
  const minutes = totalMinutes % 60;
  if (days > 0) return `Kicks off in ${days}d ${hours}h`;
  if (hours > 0) return `Kicks off in ${hours}h ${minutes}m`;
  return `Kicks off in ${minutes}m`;
}

/** A kickoff countdown that actually counts — re-renders every 30s. */
export function Countdown({ kickoffAt }: { kickoffAt: string }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(t);
  }, []);
  return <>{kickoffLabel(kickoffAt, now)}</>;
}

/**
 * The two teams' kit colours as a hard diagonal split — the same angled
 * edge the YES/NO split bar uses — mixed into the surface so it tints the
 * card rather than shouting over it.
 */
export function teamSplit(match: Match, strength = 30): string {
  const home = teamIdentity(match.homeTeam).primary;
  const away = teamIdentity(match.awayTeam).primary;
  return `linear-gradient(102deg, color-mix(in srgb, ${home} ${strength}%, var(--surface)) 0 49.7%, color-mix(in srgb, ${away} ${strength}%, var(--surface)) 50.3% 100%)`;
}

/** Faint pitch or gridiron markings for the background of a match card. */
export function FieldLines({ sport }: { sport: "soccer" | "nfl" }) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 400 160"
      preserveAspectRatio="xMidYMid slice"
      className="pointer-events-none absolute inset-0 h-full w-full text-foreground"
      fill="none"
      stroke="currentColor"
      strokeOpacity="0.1"
      strokeWidth="1.2"
    >
      {sport === "soccer" ? (
        <>
          <rect x="12" y="12" width="376" height="136" rx="2" />
          <path d="M200 12v136" />
          <circle cx="200" cy="80" r="30" />
          <circle cx="200" cy="80" r="2" fill="currentColor" fillOpacity="0.1" />
          <path d="M12 42h52v76H12M388 42h-52v76h52M12 62h18v36H12M388 62h-18v36h18" />
          <path d="M64 62a22 22 0 0 1 0 36M336 62a22 22 0 0 0 0 36" />
        </>
      ) : (
        <>
          <rect x="12" y="12" width="376" height="136" rx="2" />
          <path d="M44 12v136M356 12v136" />
          {Array.from({ length: 9 }, (_, i) => 75 + i * 31.25).map((x) => (
            <path key={x} d={`M${x} 12v136`} strokeOpacity={x === 200 ? 0.16 : 0.1} />
          ))}
          {Array.from({ length: 39 }, (_, i) => 50 + i * 7.9).map((x) => (
            <path key={x} d={`M${x} 58v4M${x} 98v4`} />
          ))}
        </>
      )}
    </svg>
  );
}

/** Competition, kickoff and both crests over the team-colour split. */
export function MatchBanner({ match, size = "lg", children }: { match: Match; size?: "sm" | "lg"; children?: ReactNode }) {
  const sport = sportOf(match);
  const crest = size === "lg" ? 44 : 34;
  return (
    <div className="relative overflow-hidden" style={{ background: teamSplit(match) }}>
      <FieldLines sport={sport} />
      <div className={`relative ${size === "lg" ? "px-4 pb-4 pt-3.5" : "px-4 pb-3.5 pt-3"}`}>
        <div className="flex items-center justify-between gap-3">
          <span className="flex min-w-0 items-center gap-1.5 text-foreground/80">
            <LeagueMark
              name={match.competition}
              size={14}
              fallback={sport === "nfl" ? <GridironIcon className="h-3.5 w-3.5 shrink-0" /> : <SoccerIcon className="h-3.5 w-3.5 shrink-0" />}
            />
            <span className="truncate font-mono text-[10px] uppercase tracking-wider">{match.competition}</span>
          </span>
          {match.status === "live" ? (
            <LiveBadge />
          ) : match.status === "finished" ? (
            <span className="shrink-0 font-mono text-[11px] text-foreground/80">
              FT{match.homeScore != null && match.awayScore != null ? ` · ${match.homeScore}–${match.awayScore}` : ""}
            </span>
          ) : match.status === "postponed" || match.status === "cancelled" ? (
            <span className="shrink-0 font-mono text-[11px] capitalize text-foreground/80">{match.status}</span>
          ) : (
            <span className="shrink-0 font-mono text-[11px] text-foreground/80">
              <Countdown kickoffAt={match.kickoffAt} />
            </span>
          )}
        </div>
        <div className={`grid grid-cols-[1fr_auto_1fr] items-center gap-2 ${size === "lg" ? "mt-3.5" : "mt-2.5"}`}>
          <TeamSide name={match.homeTeam} crest={crest} />
          <span className="font-display text-sm font-bold text-foreground/60">v</span>
          <TeamSide name={match.awayTeam} crest={crest} />
        </div>
        {children}
      </div>
    </div>
  );
}

function TeamSide({ name, crest }: { name: string; crest: number }) {
  return (
    <div className="flex min-w-0 flex-col items-center gap-1.5 text-center">
      <TeamCrest name={name} size={crest} />
      <span className="line-clamp-2 text-sm font-semibold leading-tight text-foreground">{name}</span>
    </div>
  );
}
