"use client";

import { useEffect, useMemo, useState } from "react";
import { teamIdentity } from "@/lib/team-identity";

// The room's backdrop: a broadcast view across the ground — the roof and its
// floodlight strip, two tiers of seats packed with fans (home colours, with
// the away end behind the netting on the right), executive boxes between the
// tiers, LED boards on the touchline, and the pitch below.
//
// Crowd energy lives in the people, not over them (room-energy.ts): the
// room's YES backers are the left end of the ground, NO the right. As an
// end's backers chat and react, its fans come alive — more arms up, more
// phone flashes, shirts catching their side's colour — and a really loud
// end starts bouncing. A quiet end sits still. A goal lights up the scoring
// team's end and sets its flashes off.
//
// Day or night follows the app theme through CSS variables (.stadium-art in
// globals.css) — so switching theme never flickers.
//
// Cheap to draw: ~500 fans grouped by colour into a few dozen SVG paths,
// generated on the device (not shipped in the HTML) from a seed of the two
// teams' names, so a room always shows the same crowd.

type End = "yes" | "no";

const W = 400;
// Tall so the pitch runs down behind the scoreboard and the call; the stands
// are compact (top 39.5% of the width) so the hero stays short on a phone.
const H = 520;
const AWAY_FROM = 300; // the away team's end: x ≥ this, behind the netting
const END_SPLIT = 200; // the room's ends: YES backers left of this, NO right
const ROOF_BOTTOM = 27;
const UPPER = { top: 30, rows: 6, rowH: 9.5, head: 2.45, gap: 6.9 };
const LOWER = { top: 96, rows: 4, rowH: 12.5, head: 3.25, gap: 9.1 };
export const BOARDS_Y = 147;
const PITCH_Y = BOARDS_Y + 11;
const SKIN = ["#f1c7a5", "#dcaa84", "#b8835c", "#8a5a38", "#5e3a22"];
const SIDE_GLOW: Record<End, string> = { yes: "#3d6bff", no: "#ef4444" };

function seeded(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

const r1 = (n: number) => Math.round(n * 10) / 10;

interface Flash {
  x: number;
  y: number;
  delay: number;
  dur: number;
  awayTeam: boolean;
}

interface EndCrowd {
  /** path data per shirt colour */
  bodies: Map<string, string>;
  /** every body in this end, for the side-colour glow layer */
  allBodies: string;
  /** path data per skin tone */
  heads: Map<string, string>;
  /** always up */
  arms: string;
  /** go up as the end gets louder */
  hypeArms: string;
  flashes: Flash[];
  /** extra flashes that only fire when the end is loud */
  hypeFlashes: Flash[];
  flags: { x: number; y: number; color: string; stripe: string; delay: number }[];
}

function emptyEnd(): EndCrowd {
  return { bodies: new Map(), allBodies: "", heads: new Map(), arms: "", hypeArms: "", flashes: [], hypeFlashes: [], flags: [] };
}

function buildCrowd(homeTeam: string, awayTeam: string): Record<End, EndCrowd> {
  const rand = seeded(hash(`${homeTeam}|${awayTeam}`));
  const home = teamIdentity(homeTeam);
  const away = teamIdentity(awayTeam);
  const homeShirts = [home.primary, home.primary, home.primary, home.primary, home.secondary, home.secondary, "#f2f2f2", "#1b1b1b"];
  const awayShirts = [away.primary, away.primary, away.primary, away.secondary, "#f2f2f2", "#1b1b1b"];
  const ends: Record<End, EndCrowd> = { yes: emptyEnd(), no: emptyEnd() };
  const add = (m: Map<string, string>, k: string, d: string) => m.set(k, (m.get(k) ?? "") + d);

  for (const tier of [UPPER, LOWER]) {
    for (let row = 0; row < tier.rows; row++) {
      const baseY = tier.top + row * tier.rowH + tier.head + 1.5;
      const offset = row % 2 ? tier.gap / 2 : 0;
      for (let x = 3 + offset; x < W - 2; x += tier.gap) {
        if (Math.abs(x - AWAY_FROM) < tier.gap * 0.8) continue; // the netting gap
        if (rand() < 0.07) continue; // the odd empty seat
        const end = ends[x < END_SPLIT ? "yes" : "no"];
        const awayEnd = x >= AWAY_FROM;
        const cx = x + (rand() - 0.5) * 1.4;
        const cy = baseY + (rand() - 0.5) * 1.2;
        const r = tier.head * (0.9 + rand() * 0.2);
        const shirts = awayEnd ? awayShirts : homeShirts;
        const shirt = shirts[Math.floor(rand() * shirts.length)];
        const skin = SKIN[Math.floor(rand() * SKIN.length)];
        const w = r * 1.55;
        const top = cy + r * 0.9;
        const bottom = cy + tier.rowH * 0.95;
        const body = `M${r1(cx - w)} ${r1(bottom)}Q${r1(cx - w)} ${r1(top)} ${r1(cx)} ${r1(top)}Q${r1(cx + w)} ${r1(top)} ${r1(cx + w)} ${r1(bottom)}Z`;
        add(end.bodies, shirt, body);
        end.allBodies += body;
        add(end.heads, skin, `M${r1(cx - r)} ${r1(cy)}a${r1(r)} ${r1(r)} 0 1 0 ${r1(2 * r)} 0a${r1(r)} ${r1(r)} 0 1 0 ${r1(-2 * r)} 0`);
        const reach = r * 2.6;
        const armPair = `M${r1(cx - w * 0.8)} ${r1(top + 1)}l${r1(-r * 0.6)} ${r1(-reach)}M${r1(cx + w * 0.8)} ${r1(top + 1)}l${r1(r * 0.6)} ${r1(-reach)}`;
        const roll = rand();
        if (roll < 0.08) end.arms += armPair;
        else if (roll < 0.45) end.hypeArms += armPair;
        const flash = { x: r1(cx), y: r1(cy - r * 0.2), delay: r1(rand() * 6), dur: r1(2.5 + rand() * 4), awayTeam: awayEnd };
        const f = rand();
        if (f < 0.025) end.flashes.push(flash);
        else if (f < 0.08) end.hypeFlashes.push({ ...flash, dur: r1(1.2 + rand() * 1.6) });
      }
    }
  }

  for (let i = 0; i < 7; i++) {
    const awayFlag = i >= 5;
    const x = awayFlag ? AWAY_FROM + 16 + (i - 5) * 44 : 22 + i * 58 + rand() * 12;
    const tier = rand() < 0.5 ? UPPER : LOWER;
    const y = tier.top + Math.floor(rand() * (tier.rows - 1)) * tier.rowH;
    const kit = awayFlag ? away : home;
    ends[x < END_SPLIT ? "yes" : "no"].flags.push({ x: r1(x), y: r1(y), color: kit.primary, stripe: kit.secondary, delay: r1(rand() * 1.5) });
  }

  return ends;
}

export function Stadium({
  homeTeam,
  awayTeam,
  sport,
  live = false,
  energy = { yes: 0, no: 0 },
  flare,
  flareKey,
}: {
  homeTeam: string;
  awayTeam: string;
  sport: "soccer" | "nfl";
  live?: boolean;
  /** How loud each end of the room is, 0–1 (see endLevels in room-energy.ts). */
  energy?: Record<End, number>;
  flare: "home" | "away" | null;
  flareKey: number;
}) {
  const home = teamIdentity(homeTeam);
  const away = teamIdentity(awayTeam);

  // Built on the device after first paint — keeps the page's HTML small on
  // slow networks; the stands render empty for a frame.
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => setReady(true));
    return () => cancelAnimationFrame(id);
  }, []);
  const crowd = useMemo(() => (ready ? buildCrowd(homeTeam, awayTeam) : null), [ready, homeTeam, awayTeam]);

  const seat = (kit: string) => `color-mix(in srgb, ${kit} 38%, var(--st-stand))`;
  const upperBottom = UPPER.top + UPPER.rows * UPPER.rowH;
  const lowerBottom = LOWER.top + LOWER.rows * LOWER.rowH;

  return (
    <svg aria-hidden viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMin slice" className="stadium-art pointer-events-none absolute inset-0 h-full w-full">
      <defs>
        <linearGradient id="st-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" style={{ stopColor: "var(--st-sky-1)" }} />
          <stop offset="1" style={{ stopColor: "var(--st-sky-2)" }} />
        </linearGradient>
        <linearGradient id="st-haze" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" style={{ stopColor: "var(--st-light)", stopOpacity: "var(--st-haze)" }} />
          <stop offset="1" style={{ stopColor: "var(--st-light)", stopOpacity: 0 }} />
        </linearGradient>
        <linearGradient id="st-pitch" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" style={{ stopColor: "var(--st-pitch-1)" }} />
          <stop offset="1" style={{ stopColor: "var(--st-pitch-2)" }} />
        </linearGradient>
        <linearGradient id="st-wave" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#fff" stopOpacity="0" />
          <stop offset="0.5" stopColor="#fff" stopOpacity="0.16" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="st-scrim" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#000" stopOpacity="0.45" />
          <stop offset="0.08" stopColor="#000" stopOpacity="0" />
          <stop offset="0.3" stopColor="#000" stopOpacity="0.05" />
          <stop offset="0.6" stopColor="#000" stopOpacity="0.5" />
          <stop offset="1" stopColor="#000" stopOpacity="0.72" />
        </linearGradient>
        <clipPath id="st-stands">
          <rect x="0" y={UPPER.top} width={W} height={BOARDS_Y - UPPER.top} />
        </clipPath>
      </defs>

      {/* Sky */}
      <rect width={W} height={H} fill="url(#st-sky)" />

      {/* Roof canopy with its floodlight strip */}
      <path d={`M0 0H${W}V20L${W - 20} ${ROOF_BOTTOM}H20L0 20Z`} style={{ fill: "var(--st-roof)" }} />
      {Array.from({ length: 16 }, (_, i) => (
        <path key={i} d={`M${12 + i * 25} 3V20`} stroke="#000" strokeOpacity="0.25" strokeWidth="1" />
      ))}
      {Array.from({ length: 22 }, (_, i) => (
        <rect key={i} x={24 + i * 16.4} y={ROOF_BOTTOM - 4.5} width="9" height="3" rx="0.8" style={{ fill: "var(--st-light)", opacity: "var(--st-lamp)" }} />
      ))}

      {/* Seat rows in the home colour (away end in theirs) */}
      {[UPPER, LOWER].flatMap((tier, t) =>
        Array.from({ length: tier.rows }, (_, i) => (
          <g key={`${t}-${i}`}>
            <rect x="0" y={tier.top + i * tier.rowH} width={AWAY_FROM} height={tier.rowH} style={{ fill: seat(home.primary), opacity: i % 2 ? 0.9 : 1 }} />
            <rect x={AWAY_FROM} y={tier.top + i * tier.rowH} width={W - AWAY_FROM} height={tier.rowH} style={{ fill: seat(away.primary), opacity: i % 2 ? 0.9 : 1 }} />
          </g>
        )),
      )}
      {/* Roof shadow falling across the top rows (daytime) */}
      <rect x="0" y={UPPER.top} width={W} height={UPPER.rowH * 2.4} fill="#000" style={{ opacity: "var(--st-shadow)" }} />

      {/* Executive boxes between the tiers */}
      <rect x="0" y={upperBottom} width={W} height={LOWER.top - upperBottom} style={{ fill: "var(--st-roof)" }} />
      {Array.from({ length: 20 }, (_, i) => (
        <rect key={i} x={6 + i * 19.6} y={upperBottom + 1.5} width="15" height={LOWER.top - upperBottom - 3} rx="0.8" style={{ fill: "var(--st-glass)" }} opacity={0.55 + ((i * 37) % 10) / 30} />
      ))}

      {/* The crowd — each end of the room comes alive with its backers' energy */}
      {crowd && (
        <g clipPath="url(#st-stands)">
          {(["yes", "no"] as const).map((endKey) => {
            const end = crowd[endKey];
            const level = Math.max(0, Math.min(1, energy[endKey]));
            const bouncing = level > 0.45;
            return (
              <g key={endKey} className={bouncing ? "crowd-bounce" : undefined} style={bouncing ? { animationDuration: `${0.75 - level * 0.3}s` } : undefined}>
                {[...end.bodies].map(([color, d]) => (
                  <path key={`b${color}`} d={d} fill={color} />
                ))}
                {/* Shirts catch the side's colour as the end gets louder */}
                <path d={end.allBodies} fill={SIDE_GLOW[endKey]} style={{ opacity: level * 0.5, transition: "opacity 900ms ease" }} />
                {[...end.heads].map(([color, d]) => (
                  <path key={`h${color}`} d={d} fill={color} />
                ))}
                <path d={end.arms} stroke="#e8b995" strokeOpacity="0.9" strokeWidth="1.1" strokeLinecap="round" fill="none" />
                <path
                  d={end.hypeArms}
                  stroke="#e8b995"
                  strokeWidth="1.1"
                  strokeLinecap="round"
                  fill="none"
                  style={{ opacity: level * 0.9, transition: "opacity 700ms ease" }}
                />
                {end.flags.map((f, i) => (
                  <g key={i} transform={`translate(${f.x} ${f.y})`}>
                    <path d="M0 0V16" stroke="#d7d7d7" strokeWidth="0.8" />
                    <g className="flag-wave" style={{ animationDelay: `${f.delay}s`, animationDuration: `${1.4 - level * 0.6}s` }}>
                      <rect x="0" y="0" width="16" height="10" style={{ fill: f.color }} />
                      <rect x="0" y="3.6" width="16" height="2.8" style={{ fill: f.stripe }} />
                    </g>
                  </g>
                ))}
                {end.flashes.map((f, i) => (
                  <circle
                    key={i}
                    cx={f.x}
                    cy={f.y}
                    r="1.3"
                    fill="#fff"
                    className={flare && (flare === "away") === f.awayTeam ? "cam-flash-burst" : "cam-flash"}
                    style={{ animationDelay: `${flare ? (i % 7) * 0.12 : f.delay}s`, animationDuration: flare ? undefined : `${f.dur}s` }}
                  />
                ))}
                {level > 0.15 && (
                  <g style={{ opacity: level }}>
                    {end.hypeFlashes.map((f, i) => (
                      <circle key={i} cx={f.x} cy={f.y} r="1.3" fill="#fff" className="cam-flash" style={{ animationDelay: `${f.delay}s`, animationDuration: `${f.dur}s` }} />
                    ))}
                  </g>
                )}
              </g>
            );
          })}
        </g>
      )}

      {/* Segregation netting between the home stands and the away end */}
      <path d={`M${AWAY_FROM} ${UPPER.top}V${lowerBottom}`} stroke="var(--st-roof)" strokeWidth="3" />
      <path d={`M${AWAY_FROM} ${UPPER.top}V${lowerBottom}`} stroke="#fff" strokeOpacity="0.18" strokeWidth="0.6" strokeDasharray="1.5 1.5" />

      {/* Mexican wave while the match is live */}
      {live && <rect className="crowd-wave" x="-80" y={UPPER.top} width="80" height={BOARDS_Y - UPPER.top} fill="url(#st-wave)" />}

      {/* Floodlight haze over the stands (night) */}
      <rect x="0" y={ROOF_BOTTOM} width={W} height="100" fill="url(#st-haze)" />

      {/* Goal: the scoring team's end floods with light, then settles */}
      {flare && (
        <rect
          key={flareKey}
          className="stand-flare"
          x={flare === "home" ? 0 : AWAY_FROM}
          y={UPPER.top}
          width={flare === "home" ? AWAY_FROM : W - AWAY_FROM}
          height={BOARDS_Y - UPPER.top}
          style={{ fill: flare === "home" ? home.primary : away.primary }}
        />
      )}

      {/* LED advertising boards on the touchline */}
      <rect x="0" y={BOARDS_Y} width={W} height="11" style={{ fill: "var(--st-board)" }} />
      {Array.from({ length: 5 }, (_, i) => (
        <g key={i}>
          <rect x={i * 80 + 2} y={BOARDS_Y + 2} width="30" height="7" rx="1" style={{ fill: i % 2 ? away.primary : home.primary }} />
          <text x={i * 80 + 56} y={BOARDS_Y + 8.4} textAnchor="middle" fontSize="6.4" fontWeight="800" letterSpacing="1.6" fill="#fff" fontFamily="system-ui, sans-serif">
            RIVALY
          </text>
        </g>
      ))}

      {/* The pitch, mown in stripes, running left to right */}
      <path d={`M0 ${PITCH_Y}H${W}V${H}H0Z`} fill="url(#st-pitch)" />
      {Array.from({ length: 9 }, (_, i) => {
        const topX = (W / 9) * i;
        const botX = -120 + ((W + 240) / 9) * i;
        return (
          <path
            key={i}
            d={`M${topX} ${PITCH_Y}L${topX + W / 9} ${PITCH_Y}L${botX + (W + 240) / 9} ${H}L${botX} ${H}Z`}
            fill="#fff"
            fillOpacity={i % 2 ? 0.045 : 0}
          />
        );
      })}
      <g fill="none" stroke="#fff" strokeOpacity="0.5" strokeWidth="1.1">
        <path d={`M-10 ${PITCH_Y + 8}H${W + 10}`} />
        {sport === "soccer" ? (
          <>
            <path d={`M200 ${PITCH_Y + 8}L200 ${H}`} />
            <ellipse cx="200" cy={PITCH_Y + 62} rx="62" ry="26" />
            <path d={`M-10 ${PITCH_Y + 35}H40L28 ${H}M${W + 10} ${PITCH_Y + 35}H360L372 ${H}`} />
          </>
        ) : (
          [0.15, 0.3, 0.45, 0.6, 0.75, 0.9].map((t) => <path key={t} d={`M${W * t} ${PITCH_Y + 8}L${-120 + (W + 240) * t} ${H}`} />)
        )}
      </g>

      {/* Scrim: dim the very top for the back button, deepen the bottom under the text */}
      <rect width={W} height={H} fill="url(#st-scrim)" />
    </svg>
  );
}
