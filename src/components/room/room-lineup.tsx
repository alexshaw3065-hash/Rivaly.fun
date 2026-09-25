import { teamIdentity } from "@/lib/team-identity";
import type { LineupPlayer, MatchLineups, TeamLineup } from "@/lib/match-lineups";
import type { Match } from "@/lib/types";
import type { EventRow } from "@/lib/match-timeline";
import { TeamCrest } from "../team-crest";

// Both teams on one pitch, the way a matchday graphic shows them: home in the
// top half, away in the bottom, each in its kit colour, with what every
// player did marked on them — goals, cards, the minute they went off — and
// the bench underneath with who came on when. All from TxLINE's line-ups and
// event stream (match-lineups.ts); nothing here is filled in.

type Kit = { fill: string; ink: string };

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

/**
 * Each side's colour for charts and the pitch: the kits worn on the day when
 * the feed says, otherwise club colours — with the away side in its second
 * colour if the two would blur together (red v red).
 */
export function teamFills(match: Match, kits: { home?: string; away?: string } = {}): { home: Kit; away: Kit; codes: { home: string; away: string } } {
  const home = teamIdentity(match.homeTeam);
  const away = teamIdentity(match.awayTeam);
  const homeFill = kits.home ?? home.primary;
  const awayFill = kits.away ?? (clash(homeFill, away.primary) ? away.secondary : away.primary);
  return { home: { fill: homeFill, ink: inkOn(homeFill) }, away: { fill: awayFill, ink: inkOn(awayFill) }, codes: { home: home.code, away: away.code } };
}

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
  if (!lineups)
    return <p className="rounded-2xl border border-border bg-surface px-4 py-8 text-center text-sm text-muted">Line-ups land shortly before kick-off.</p>;

  const home = teamIdentity(match.homeTeam);
  const away = teamIdentity(match.awayTeam);
  const { home: homeKit, away: awayKit } = teamFills(match, kits);

  return (
    <div className="flex flex-col gap-3">
      <div className="stadium-art overflow-hidden rounded-2xl border border-border">
        <TeamBar name={match.homeTeam} code={home.code} formation={lineups.home.formation} />
        <div style={{ background: STRIPES }}>
          <div className="relative mx-auto aspect-[2/3] w-full max-w-[440px]">
            <PitchLines />
            <Half team={lineups.home} kit={homeKit} end="top" />
            <Half team={lineups.away} kit={awayKit} end="bottom" />
          </div>
        </div>
        <TeamBar name={match.awayTeam} code={away.code} formation={lineups.away.formation} />
      </div>

      <div className="grid grid-cols-2 gap-x-4 rounded-2xl border border-border bg-surface px-4 py-3">
        <p className="col-span-2 pb-1 font-mono text-[10px] uppercase tracking-[0.14em] text-muted">Substitutes</p>
        <Bench team={lineups.home} code={home.code} name={match.homeTeam} />
        <Bench team={lineups.away} code={away.code} name={match.awayTeam} />
      </div>
      <p className="text-center text-[10px] text-muted">Official line-ups from the match feed</p>
    </div>
  );
}

// Mown stripes across the pitch, from the stadium's own grass colours (they
// follow light/dark with the stadium — see .stadium-art in globals.css).
const STRIPES =
  "repeating-linear-gradient(180deg, var(--st-pitch-2) 0 8.333%, color-mix(in srgb, var(--st-pitch-2) 86%, #000) 8.333% 16.666%)";

function TeamBar({ name, code, formation }: { name: string; code: string; formation: string }) {
  return (
    <div className="flex items-center gap-2 bg-surface px-4 py-2.5">
      <TeamCrest name={name} size={20} />
      <span className="min-w-0 flex-1 truncate text-sm font-semibold text-foreground" title={name}>
        <span className="md:hidden">{code}</span>
        <span className="hidden md:inline">{name}</span>
      </span>
      {formation && <span className="font-mono text-xs font-bold tabular-nums text-muted">{formation}</span>}
    </div>
  );
}

function PitchLines() {
  return (
    <svg viewBox="0 0 100 150" className="absolute inset-0 h-full w-full" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="0.5" aria-hidden>
      <rect x="3" y="3" width="94" height="144" />
      <line x1="3" y1="75" x2="97" y2="75" />
      <circle cx="50" cy="75" r="10" />
      <circle cx="50" cy="75" r="0.8" fill="rgba(255,255,255,0.4)" stroke="none" />
      <rect x="21" y="3" width="58" height="19" />
      <rect x="36" y="3" width="28" height="7" />
      <path d="M40 22a10 10 0 0 0 20 0" />
      <rect x="21" y="128" width="58" height="19" />
      <rect x="36" y="140" width="28" height="7" />
      <path d="M40 128a10 10 0 0 1 20 0" />
    </svg>
  );
}

/** One team's shape in its half: keeper on the goal line, forwards near halfway. */
function Half({ team, kit, end }: { team: TeamLineup; kit: Kit; end: "top" | "bottom" }) {
  const n = team.lines.length;
  return (
    <>
      {team.lines.map((line, i) => {
        const depth = n > 1 ? 6.5 + (i * 36) / (n - 1) : 6.5;
        const top = end === "top" ? depth : 100 - depth;
        return line.map((p, j) => (
          <PlayerToken key={p.id} player={p} kit={kit} left={8 + ((j + 0.5) / line.length) * 84} top={top} />
        ));
      })}
    </>
  );
}

function PlayerToken({ player: p, kit, left, top }: { player: LineupPlayer; kit: Kit; left: number; top: number }) {
  return (
    <div className="absolute flex w-[21%] -translate-x-1/2 -translate-y-[18px] flex-col items-center" style={{ left: `${left}%`, top: `${top}%` }} title={p.name}>
      <span className="relative">
        <span
          className="flex h-8 w-8 items-center justify-center rounded-full font-mono text-xs font-bold tabular-nums shadow-[0_1px_3px_rgba(0,0,0,0.45)] ring-[1.5px] ring-white/85"
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
      <span className="mt-1 line-clamp-2 max-w-full text-center text-[10.5px] font-semibold leading-[1.15] text-white [overflow-wrap:anywhere] [text-shadow:0_1px_2px_rgba(0,0,0,0.85)]">
        {p.surname}
      </span>
      {p.off !== null && (
        <span className="mt-px flex items-center gap-0.5 font-mono text-[9.5px] font-semibold text-white/80 [text-shadow:0_1px_2px_rgba(0,0,0,0.85)]">
          <Arrow dir="off" /> {p.off}&rsquo;
        </span>
      )}
    </div>
  );
}

function Bench({ team, code, name }: { team: TeamLineup; code: string; name: string }) {
  return (
    <div className="min-w-0">
      <p className="flex items-center gap-1.5 pb-1.5 text-xs font-semibold text-foreground">
        <TeamCrest name={name} size={14} /> {code}
      </p>
      <ul className="flex flex-col">
        {team.bench.map((p) => (
          <li key={p.id} className={`flex items-center gap-2 py-1 text-[13px] ${p.on === null ? "text-muted" : "text-foreground"}`}>
            <span className="w-5 shrink-0 text-right font-mono text-[11px] tabular-nums text-muted">{p.number}</span>
            <span className="min-w-0 flex-1 truncate" title={p.name}>
              {p.surname}
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
    </div>
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

// Two teams in near-identical kits (red v red) would blur together on one
// pitch; the away side switches to its second colour, as it would on the day.
function clash(a: string, b: string): boolean {
  const [r1, g1, b1] = rgb(a);
  const [r2, g2, b2] = rgb(b);
  return Math.hypot(r1 - r2, g1 - g2, b1 - b2) < 90;
}

function inkOn(hex: string): string {
  const [r, g, b] = rgb(hex);
  return 0.299 * r + 0.587 * g + 0.114 * b > 150 ? "#0b0d10" : "#ffffff";
}

function rgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  const full = h.length === 3 ? h.replace(/./g, (c) => c + c) : h.padEnd(6, "0");
  const v = Number.parseInt(full.slice(0, 6), 16) || 0;
  return [(v >> 16) & 255, (v >> 8) & 255, v & 255];
}
