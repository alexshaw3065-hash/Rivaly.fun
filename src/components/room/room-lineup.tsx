"use client";

import { useState } from "react";
import { teamFills } from "@/lib/team-fills";
import type { LineupPlayer, MatchLineups, TeamLineup } from "@/lib/match-lineups";
import type { Match } from "@/lib/types";
import type { EventRow } from "@/lib/match-timeline";
import { TeamCrest } from "../team-crest";

// The line-ups the way match apps show them: a switch between the two teams,
// both formations up top, and the chosen team laid out across a pitch —
// keeper on the left, attack on the right — in the kit it's wearing, with
// what every player did marked on them (goals, cards, the minute they went
// off) and the bench underneath with who came on when. All from TxLINE's
// line-ups and event stream (match-lineups.ts); nothing filled in. Until the
// line-ups land (~25 minutes before kick-off) the same frame waits for them.

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
  const [side, setSide] = useState<Side>("home");
  const fills = teamFills(match, kits);
  const teams = { home: match.homeTeam, away: match.awayTeam };
  const team = lineups?.[side] ?? null;

  return (
    <div className="flex flex-col gap-3">
      <div className="stadium-art overflow-hidden rounded-2xl border border-border">
        {/* Team switch */}
        <div role="tablist" aria-label="Team" className="grid grid-cols-2 bg-surface">
          {(["home", "away"] as const).map((s) => (
            <button
              key={s}
              role="tab"
              type="button"
              aria-selected={side === s}
              onClick={() => setSide(s)}
              className={`relative flex h-12 min-w-0 items-center gap-2 px-4 text-sm font-semibold transition-colors duration-150 ${s === "away" ? "flex-row-reverse text-right" : ""}`}
              style={{ color: side === s ? "var(--foreground)" : "var(--muted)" }}
            >
              <TeamCrest name={teams[s]} size={20} />
              <span className="min-w-0 truncate">{teams[s]}</span>
              <span
                aria-hidden
                className="absolute bottom-0 h-[2px] rounded-full transition-[opacity,transform] duration-200"
                style={{
                  background: "var(--foreground)",
                  opacity: side === s ? 1 : 0,
                  transform: side === s ? "scaleX(1)" : "scaleX(0.4)",
                  [s === "home" ? "left" : "right"]: 16,
                  width: "calc(100% - 32px)",
                }}
              />
            </button>
          ))}
        </div>

        {/* Both formations */}
        <div className="flex items-end justify-between border-t border-border bg-surface px-4 py-2">
          {(["home", "away"] as const).map((s) => (
            <div key={s} className={s === "away" ? "text-right" : ""}>
              <p className="font-mono text-sm font-bold tabular-nums text-foreground">{lineups?.[s].formation || "–"}</p>
              <p className="font-mono text-[9px] uppercase tracking-[0.14em] text-muted">Formation</p>
            </div>
          ))}
        </div>

        {/* The pitch, sideways: keeper left, attack right */}
        <div style={{ background: STRIPES }}>
          <div className="relative mx-auto aspect-[4/3] w-full max-w-[560px]">
            <PitchLines />
            {team ? (
              <Shape key={side} team={team} kit={fills[side]} />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center p-6">
                <p className="max-w-[16rem] rounded-xl bg-black/55 px-4 py-3 text-center text-[13px] font-medium leading-snug text-white backdrop-blur-sm">
                  Line-ups drop about 30 minutes before kick-off.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {team && team.bench.length > 0 && (
        <div className="rounded-2xl border border-border bg-surface px-4 py-3">
          <p className="pb-1.5 font-mono text-[10px] uppercase tracking-[0.14em] text-muted">Substitutes</p>
          <Bench team={team} />
        </div>
      )}
      {team && <p className="text-center text-[10px] text-muted">Official line-ups from the match feed</p>}
    </div>
  );
}

// Mown stripes across the pitch, from the stadium's own grass colours (they
// follow light/dark with the stadium — see .stadium-art in globals.css).
const STRIPES =
  "repeating-linear-gradient(90deg, var(--st-pitch-2) 0 10%, color-mix(in srgb, var(--st-pitch-2) 86%, #000) 10% 20%)";

function PitchLines() {
  return (
    <svg viewBox="0 0 120 90" className="absolute inset-0 h-full w-full" fill="none" stroke="rgba(255,255,255,0.38)" strokeWidth="0.45" aria-hidden>
      <rect x="2.5" y="2.5" width="115" height="85" />
      <line x1="60" y1="2.5" x2="60" y2="87.5" />
      <circle cx="60" cy="45" r="9" />
      <circle cx="60" cy="45" r="0.7" fill="rgba(255,255,255,0.38)" stroke="none" />
      <rect x="2.5" y="24" width="16" height="42" />
      <rect x="2.5" y="35" width="6" height="20" />
      <path d="M18.5 38a8 8 0 0 1 0 14" />
      <rect x="101.5" y="24" width="16" height="42" />
      <rect x="111.5" y="35" width="6" height="20" />
      <path d="M101.5 38a8 8 0 0 0 0 14" />
    </svg>
  );
}

/** One team across the pitch: each line a column, keeper nearest the left goal. */
function Shape({ team, kit }: { team: TeamLineup; kit: Kit }) {
  const n = team.lines.length;
  return (
    <>
      {team.lines.map((line, i) => {
        const left = n > 1 ? 8 + (i * 80) / (n - 1) : 8;
        return line.map((p, j) => <PlayerToken key={p.id} player={p} kit={kit} left={left} top={9 + ((j + 0.5) / line.length) * 82} />);
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

function Bench({ team }: { team: TeamLineup }) {
  return (
    <ul className="grid grid-cols-1 gap-x-4 min-[420px]:grid-cols-2">
      {team.bench.map((p) => (
        <li key={p.id} className={`flex items-center gap-2 py-1 text-[13px] ${p.on === null ? "text-muted" : "text-foreground"}`}>
          <span className="w-5 shrink-0 text-right font-mono text-[11px] tabular-nums text-muted">{p.number}</span>
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
