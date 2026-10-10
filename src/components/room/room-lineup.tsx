"use client";

import { useState } from "react";
import { teamFills } from "@/lib/team-fills";
import type { LineupPlayer, MatchLineups, TeamLineup } from "@/lib/match-lineups";
import type { Match } from "@/lib/types";
import type { EventRow } from "@/lib/match-timeline";
import { TeamCrest } from "../team-crest";

// The line-ups the way match apps show them: one full pitch with both teams
// on it, each in its own half facing the other — the away side attacking
// down from the top, the home side up from the bottom — in the kits they're
// wearing, with what every player did marked on them (goals, cards, the
// minute they went off), each team's name and formation at its own end, and
// the substitutes underneath. All from TxLINE's line-ups and event stream
// (match-lineups.ts); nothing filled in. Until the line-ups land (~25 minutes
// before kick-off) the same pitch waits for them.

type Kit = { fill: string; ink: string };
type Side = "home" | "away";

// TxLINE's "jersey" action names the colour each side actually wears that
// day ("white", "blue") — an away kit included. Named colours only; anything
// unrecognised falls back to the club's own colours.
const KIT_COLOURS: Record<string, string> = {
  white: "#F5F5F5",
  black: "#141414",
  red: "#D7262E",
  blue: "#1F4FB8",
  "light blue": "#7CB8E6",
  "sky blue": "#7CB8E6",
  navy: "#14213D",
  "dark blue": "#14213D",
  yellow: "#F5D130",
  orange: "#F07F1E",
  green: "#1E8F4E",
  "dark green": "#10502C",
  purple: "#5B2A86",
  claret: "#7A1F3D",
  maroon: "#7A1F3D",
  pink: "#EE8FB8",
  grey: "#8A8F98",
  gray: "#8A8F98",
  gold: "#C9A13B",
};

/** The kits worn this match, from the feed's jersey records. */
export function kitsFrom(rows: EventRow[]): { home?: string; away?: string } {
  const out: { home?: string; away?: string } = {};
  for (const r of rows) {
    if (r.action !== "jersey") continue;
    const colour = typeof r.payload?.Color === "string" ? KIT_COLOURS[r.payload.Color.trim().toLowerCase()] : undefined;
    if (colour && (r.payload?._side === "home" || r.payload?._side === "away")) out[r.payload._side] = colour;
  }
  return out;
}

export function LineupPanel({ match, lineups, kits = {} }: { match: Match; lineups: MatchLineups | null; kits?: { home?: string; away?: string } }) {
  // Whose substitutes are listed under the pitch.
  const [side, setSide] = useState<Side>("home");
  const fills = teamFills(match, kits);
  const teams = { home: match.homeTeam, away: match.awayTeam };
  const bench = lineups?.[side].bench ?? [];

  return (
    <div className="flex flex-col gap-3">
      <div className="stadium-art overflow-hidden rounded-card edge">
        <TeamBar name={teams.away} formation={lineups?.away.formation} kit={fills.away} />
        {/* The full pitch: away team in the top half, home team in the bottom half */}
        <div style={{ background: STRIPES }}>
          <div className="relative mx-auto aspect-[68/105] w-full max-w-[420px]">
            <PitchLines />
            {lineups ? (
              <>
                <Half team={lineups.away} kit={fills.away} end="top" />
                <Half team={lineups.home} kit={fills.home} end="bottom" />
              </>
            ) : (
              <div className="absolute inset-0 flex items-center justify-center p-6">
                <p className="max-w-[16rem] rounded-xl bg-black/55 px-4 py-3 text-center text-[13px] font-medium leading-snug text-white backdrop-blur-sm">
                  Line-ups drop about 30 minutes before kick-off.
                </p>
              </div>
            )}
          </div>
        </div>
        <TeamBar name={teams.home} formation={lineups?.home.formation} kit={fills.home} />
      </div>

      {lineups && (lineups.home.bench.length > 0 || lineups.away.bench.length > 0) && (
        <div className="rounded-card bg-surface px-4 py-3 edge">
          <div className="flex items-center justify-between pb-2">
            <p className="text-label font-semibold text-secondary">Substitutes</p>
            <div role="tablist" aria-label="Team" className="flex gap-0.5 rounded-control bg-background p-0.5">
              {(["home", "away"] as const).map((s) => (
                <button
                  key={s}
                  role="tab"
                  type="button"
                  aria-selected={side === s}
                  onClick={() => setSide(s)}
                  className={`flex h-7 max-w-[9rem] items-center gap-1.5 rounded-tag px-2 text-caption font-semibold transition-colors duration-100 ${side === s ? "bg-surface-elevated text-foreground" : "text-secondary"}`}
                >
                  <TeamCrest name={teams[s]} size={14} />
                  <span className="truncate">{teams[s]}</span>
                </button>
              ))}
            </div>
          </div>
          <Bench bench={bench} />
        </div>
      )}
      {lineups && <p className="text-center text-caption text-tertiary">Official line-ups from the match feed</p>}
    </div>
  );
}

/** A team's name, kit and formation, at its own end of the pitch. */
function TeamBar({ name, formation, kit }: { name: string; formation?: string; kit: Kit }) {
  return (
    <div className="flex h-12 items-center gap-2 bg-surface px-4">
      <TeamCrest name={name} size={20} />
      <span className="min-w-0 flex-1 truncate text-sm font-semibold text-foreground">{name}</span>
      <span aria-hidden className="h-2.5 w-2.5 shrink-0 rounded-full ring-1 ring-white/40" style={{ background: kit.fill }} />
      <span className="text-label font-bold tabular-nums text-foreground">{formation || "–"}</span>
    </div>
  );
}

// Mown stripes across the pitch, from the stadium's own grass colours (they
// follow light/dark with the stadium — see .stadium-art in globals.css).
const STRIPES =
  "repeating-linear-gradient(180deg, var(--st-pitch-2) 0 6.25%, color-mix(in srgb, var(--st-pitch-2) 86%, #000) 6.25% 12.5%)";

/** A full pitch, end to end (68 x 105, the real proportions). */
function PitchLines() {
  return (
    <svg viewBox="0 0 68 105" className="absolute inset-0 h-full w-full" fill="none" stroke="rgba(255,255,255,0.38)" strokeWidth="0.4" aria-hidden>
      <rect x="2" y="2" width="64" height="101" />
      <line x1="2" y1="52.5" x2="66" y2="52.5" />
      <circle cx="34" cy="52.5" r="9.15" />
      <circle cx="34" cy="52.5" r="0.6" fill="rgba(255,255,255,0.38)" stroke="none" />
      {/* top end */}
      <rect x="13.85" y="2" width="40.3" height="16.5" />
      <rect x="24.85" y="2" width="18.3" height="5.5" />
      <circle cx="34" cy="13" r="0.5" fill="rgba(255,255,255,0.38)" stroke="none" />
      <path d="M26.69 18.5A9.15 9.15 0 0 0 41.31 18.5" />
      {/* bottom end */}
      <rect x="13.85" y="86.5" width="40.3" height="16.5" />
      <rect x="24.85" y="97.5" width="18.3" height="5.5" />
      <circle cx="34" cy="92" r="0.5" fill="rgba(255,255,255,0.38)" stroke="none" />
      <path d="M26.69 86.5A9.15 9.15 0 0 1 41.31 86.5" />
    </svg>
  );
}

/** One team in its own half: keeper by its goal, each line further up towards halfway. */
function Half({ team, kit, end }: { team: TeamLineup; kit: Kit; end: "top" | "bottom" }) {
  const n = team.lines.length;
  return (
    <>
      {team.lines.map((line, i) => {
        // Keeper at 7% from its own goal line, the most advanced line at 43%.
        const fromGoal = n > 1 ? 7 + (i * 36) / (n - 1) : 7;
        const top = end === "top" ? fromGoal : 100 - fromGoal;
        return line.map((p, j) => <PlayerToken key={p.id} player={p} kit={kit} left={8 + ((j + 0.5) / line.length) * 84} top={top} />);
      })}
    </>
  );
}

function PlayerToken({ player: p, kit, left, top }: { player: LineupPlayer; kit: Kit; left: number; top: number }) {
  return (
    <div className="enter-pop absolute flex w-[17%] -translate-x-1/2 -translate-y-[15px] flex-col items-center" style={{ left: `${left}%`, top: `${top}%` }} title={p.name}>
      <span className="relative">
        <span
          className="flex h-[30px] w-[30px] items-center justify-center rounded-full font-mono text-xs font-bold tabular-nums shadow-[0_1px_3px_rgba(0,0,0,0.45)] ring-[1.5px] ring-white/85"
          style={{ background: kit.fill, color: kit.ink }}
        >
          {p.number}
        </span>
        {(p.yellow > 0 || p.red) && <Card red={p.red || p.yellow > 1} className="absolute -left-1.5 -top-1" />}
        {p.goals + p.ownGoals > 0 && (
          <span className="absolute -right-2 -top-1.5 flex items-center">
            <Ball own={p.ownGoals > 0 && p.goals === 0} />
            {p.goals > 1 && <span className="ml-px font-mono text-[9px] font-bold text-white [text-shadow:0_1px_2px_rgba(0,0,0,0.9)]">{p.goals}</span>}
          </span>
        )}
      </span>
      <span className="mt-0.5 max-w-full truncate text-center text-[10px] font-semibold leading-tight text-white [text-shadow:0_1px_2px_rgba(0,0,0,0.85)]">
        {p.surname}
      </span>
      {p.off !== null && (
        <span className="flex items-center gap-0.5 font-mono text-[9px] font-semibold leading-none text-white/80 [text-shadow:0_1px_2px_rgba(0,0,0,0.85)]">
          <Arrow dir="off" /> {p.off}&rsquo;
        </span>
      )}
    </div>
  );
}

function Bench({ bench }: { bench: LineupPlayer[] }) {
  return (
    <ul className="grid grid-cols-1 gap-x-4 min-[420px]:grid-cols-2">
      {bench.map((p) => (
        <li key={p.id} className={`flex items-center gap-2 py-1 text-label ${p.on === null ? "text-secondary" : "text-foreground"}`}>
          <span className="w-5 shrink-0 text-right text-caption tabular-nums text-tertiary">{p.number}</span>
          <span className="min-w-0 flex-1 truncate" title={p.name}>
            {p.name}
          </span>
          {(p.yellow > 0 || p.red) && <Card red={p.red || p.yellow > 1} />}
          {p.goals + p.ownGoals > 0 && <Ball own={p.ownGoals > 0 && p.goals === 0} />}
          {p.on !== null && (
            <span className="flex shrink-0 items-center gap-0.5 font-mono text-[11px] font-semibold text-rival-green">
              <Arrow dir="on" />
              {p.on}&rsquo;
            </span>
          )}
        </li>
      ))}
    </ul>
  );
}

function Card({ red, className = "" }: { red: boolean; className?: string }) {
  return (
    <span
      aria-label={red ? "Red card" : "Yellow card"}
      className={`inline-block h-3 w-[9px] shrink-0 rotate-[8deg] rounded-[2px] shadow-[0_1px_2px_rgba(0,0,0,0.5)] ${className}`}
      style={{ background: red ? "#ef4444" : "#f5c542" }}
    />
  );
}

function Ball({ own }: { own: boolean }) {
  return (
    <svg width="13" height="13" viewBox="0 0 14 14" aria-label={own ? "Own goal" : "Goal"} className="shrink-0 drop-shadow-[0_1px_1px_rgba(0,0,0,0.6)]">
      <circle cx="7" cy="7" r="6.2" fill="#fff" stroke={own ? "#ef4444" : "#111"} strokeWidth={own ? 1.4 : 0.8} />
      <path d="M7 4.2 9.6 6.1 8.6 9.1H5.4L4.4 6.1Z" fill="#111" />
    </svg>
  );
}

function Arrow({ dir }: { dir: "on" | "off" }) {
  return (
    <svg width="9" height="9" viewBox="0 0 10 10" aria-label={dir === "on" ? "Came on" : "Went off"} className="shrink-0">
      <path
        d={dir === "on" ? "M5 8.5V1.8M2 4.6 5 1.5l3 3.1" : "M5 1.5v6.7M2 5.4 5 8.5l3-3.1"}
        stroke={dir === "on" ? "var(--rival-green)" : "#f87171"}
        strokeWidth="1.8"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
