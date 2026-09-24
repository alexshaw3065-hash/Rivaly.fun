"use client";

import { useEffect, useMemo, useState } from "react";
import { teamIdentity } from "@/lib/team-identity";

// The room's backdrop: a broadcast view across the ground — the roof and its
// floodlight strip, two tiers of seats packed with fans (home colours, with
// the away end behind the netting on the right), executive boxes between the
// tiers, LED boards on the touchline, and the pitch below.
//
// Energy without noise: fans with arms up and flags in the air, phone
// flashes twinkling across the stands, and a Mexican wave rolling through
// while the match is live. A goal lights up the scoring end and sets the
// flashes off. Everything else stays still.
//
// Day or night follows the app theme through CSS variables (.stadium-art in
// globals.css) — a floodlit night game in dark mode, a sunlit afternoon in
// light — so switching theme never flickers.
//
// Cheap to draw: ~700 fans, but grouped by colour into a couple of dozen SVG
// paths, generated on the device (not shipped in the HTML) from a seed of the
// two teams' names, so a room always shows the same crowd.

const W = 400;
// Tall on purpose: the stands fill the top ~40%, the pitch runs down behind
// the scoreboard and the call. Top-aligned, so the stands are never cropped.
const H = 520;
const AWAY_FROM = 300; // the away end: x ≥ this, behind the segregation netting
const UPPER = { top: 40, rows: 8, rowH: 9.5, head: 2.45, gap: 6.9 };
const LOWER = { top: 132, rows: 5, rowH: 12.5, head: 3.25, gap: 9.1 };
const BOARDS_Y = 196;
const SKIN = ["#f1c7a5", "#dcaa84", "#b8835c", "#8a5a38", "#5e3a22"];

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

interface Crowd {
  /** path data per shirt colour */
  bodies: Map<string, string>;
  /** path data per skin tone */
  heads: Map<string, string>;
  arms: string;
  flags: { x: number; y: number; color: string; stripe: string; delay: number }[];
  flashes: { x: number; y: number; delay: number; dur: number; away: boolean }[];
}

function buildCrowd(homeTeam: string, awayTeam: string): Crowd {
  const rand = seeded(hash(`${homeTeam}|${awayTeam}`));
  const home = teamIdentity(homeTeam);
  const away = teamIdentity(awayTeam);
  const homeShirts = [home.primary, home.primary, home.primary, home.primary, home.secondary, home.secondary, "#f2f2f2", "#1b1b1b"];
  const awayShirts = [away.primary, away.primary, away.primary, away.secondary, "#f2f2f2", "#1b1b1b"];
  const bodies = new Map<string, string>();
  const heads = new Map<string, string>();
  let arms = "";
  const flashes: Crowd["flashes"] = [];
  const add = (m: Map<string, string>, k: string, d: string) => m.set(k, (m.get(k) ?? "") + d);

  for (const tier of [UPPER, LOWER]) {
    for (let row = 0; row < tier.rows; row++) {
      const baseY = tier.top + row * tier.rowH + tier.head + 1.5;
      const offset = row % 2 ? tier.gap / 2 : 0;
      for (let x = 3 + offset; x < W - 2; x += tier.gap) {
        if (Math.abs(x - AWAY_FROM) < tier.gap * 0.8) continue; // the netting gap
        if (rand() < 0.07) continue; // the odd empty seat
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
        add(bodies, shirt, `M${r1(cx - w)} ${r1(bottom)}Q${r1(cx - w)} ${r1(top)} ${r1(cx)} ${r1(top)}Q${r1(cx + w)} ${r1(top)} ${r1(cx + w)} ${r1(bottom)}Z`);
        add(heads, skin, `M${r1(cx - r)} ${r1(cy)}a${r1(r)} ${r1(r)} 0 1 0 ${r1(2 * r)} 0a${r1(r)} ${r1(r)} 0 1 0 ${r1(-2 * r)} 0`);
        // Arms up: more of them nearer the front, where it's loudest.
        if (rand() < (tier === LOWER ? 0.16 : 0.1)) {
          const reach = r * 2.6;
          arms += `M${r1(cx - w * 0.8)} ${r1(top + 1)}l${r1(-r * 0.6)} ${r1(-reach)}M${r1(cx + w * 0.8)} ${r1(top + 1)}l${r1(r * 0.6)} ${r1(-reach)}`;
        }
        if (rand() < 0.035) flashes.push({ x: r1(cx), y: r1(cy - r * 0.2), delay: r1(rand() * 6), dur: r1(3 + rand() * 4), away: awayEnd });
      }
    }
  }

  const flags: Crowd["flags"] = [];
  for (let i = 0; i < 7; i++) {
    const awayFlag = i >= 5;
    const x = awayFlag ? AWAY_FROM + 16 + (i - 5) * 44 : 22 + i * 58 + rand() * 12;
    const tier = rand() < 0.5 ? UPPER : LOWER;
    const y = tier.top + Math.floor(rand() * (tier.rows - 1)) * tier.rowH;
    const kit = awayFlag ? away : home;
    flags.push({ x: r1(x), y: r1(y), color: kit.primary, stripe: kit.secondary, delay: r1(rand() * 1.5) });
  }

  return { bodies, heads, arms, flags, flashes };
}

export function Stadium({
  homeTeam,
  awayTeam,
  sport,
  live = false,
  flare,
  flareKey,
}: {
  homeTeam: string;
  awayTeam: string;
  sport: "soccer" | "nfl";
  live?: boolean;
  flare: "home" | "away" | null;
  flareKey: number;
}) {
  const home = teamIdentity(homeTeam);
  const away = teamIdentity(awayTeam);

  // The crowd is built on the device after first paint — keeps the page's
  // HTML small on slow networks; the stands render empty for a frame.
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
          <stop offset="0.1" stopColor="#000" stopOpacity="0" />
          <stop offset="0.42" stopColor="#000" stopOpacity="0.05" />
          <stop offset="0.75" stopColor="#000" stopOpacity="0.5" />
          <stop offset="1" stopColor="#000" stopOpacity="0.72" />
        </linearGradient>
        <clipPath id="st-stands">
          <rect x="0" y={UPPER.top} width={W} height={BOARDS_Y - UPPER.top} />
        </clipPath>
      </defs>

      {/* Sky */}
      <rect width={W} height={H} fill="url(#st-sky)" />

      {/* Roof canopy with its floodlight strip */}
      <path d={`M0 0H${W}V26L${W - 20} 34H20L0 26Z`} style={{ fill: "var(--st-roof)" }} />
      {Array.from({ length: 16 }, (_, i) => (
        <path key={i} d={`M${12 + i * 25} 4V26`} stroke="#000" strokeOpacity="0.25" strokeWidth="1" />
      ))}
      {Array.from({ length: 22 }, (_, i) => (
        <rect key={i} x={24 + i * 16.4} y="29.5" width="9" height="3" rx="0.8" style={{ fill: "var(--st-light)", opacity: "var(--st-lamp)" }} />
      ))}

      {/* Upper tier: seat rows in the home colour (away end in theirs) */}
      {Array.from({ length: UPPER.rows }, (_, i) => (
        <g key={`u${i}`}>
          <rect x="0" y={UPPER.top + i * UPPER.rowH} width={AWAY_FROM} height={UPPER.rowH} style={{ fill: seat(home.primary), opacity: i % 2 ? 0.9 : 1 }} />
          <rect x={AWAY_FROM} y={UPPER.top + i * UPPER.rowH} width={W - AWAY_FROM} height={UPPER.rowH} style={{ fill: seat(away.primary), opacity: i % 2 ? 0.9 : 1 }} />
        </g>
      ))}
      {/* Roof shadow falling across the top rows (daytime) */}
      <rect x="0" y={UPPER.top} width={W} height={UPPER.rowH * 3.2} fill="#000" style={{ opacity: "var(--st-shadow)" }} />

      {/* Executive boxes between the tiers */}
      <rect x="0" y={upperBottom} width={W} height={LOWER.top - upperBottom} style={{ fill: "var(--st-roof)" }} />
      {Array.from({ length: 20 }, (_, i) => (
        <rect key={i} x={6 + i * 19.6} y={upperBottom + 2} width="15" height={LOWER.top - upperBottom - 4} rx="0.8" style={{ fill: "var(--st-glass)" }} opacity={0.55 + ((i * 37) % 10) / 30} />
      ))}

      {/* Lower tier */}
      {Array.from({ length: LOWER.rows }, (_, i) => (
        <g key={`l${i}`}>
          <rect x="0" y={LOWER.top + i * LOWER.rowH} width={AWAY_FROM} height={LOWER.rowH} style={{ fill: seat(home.primary), opacity: i % 2 ? 0.9 : 1 }} />
          <rect x={AWAY_FROM} y={LOWER.top + i * LOWER.rowH} width={W - AWAY_FROM} height={LOWER.rowH} style={{ fill: seat(away.primary), opacity: i % 2 ? 0.9 : 1 }} />
        </g>
      ))}

      {/* The crowd */}
      {crowd && (
        <g clipPath="url(#st-stands)">
          {[...crowd.bodies].map(([color, d]) => (
            <path key={`b${color}`} d={d} fill={color} />
          ))}
          {[...crowd.heads].map(([color, d]) => (
            <path key={`h${color}`} d={d} fill={color} />
          ))}
          <path d={crowd.arms} stroke="#e8b995" strokeOpacity="0.9" strokeWidth="1.1" strokeLinecap="round" fill="none" />
          {crowd.flags.map((f, i) => (
            <g key={i} transform={`translate(${f.x} ${f.y})`}>
              <path d="M0 0V16" stroke="#d7d7d7" strokeWidth="0.8" />
              <g className="flag-wave" style={{ animationDelay: `${f.delay}s` }}>
                <rect x="0" y="0" width="16" height="10" style={{ fill: f.color }} />
                <rect x="0" y="3.6" width="16" height="2.8" style={{ fill: f.stripe }} />
              </g>
            </g>
          ))}
          {crowd.flashes.map((f, i) => (
            <circle
              key={i}
              cx={f.x}
              cy={f.y}
              r="1.3"
              fill="#fff"
              className={flare && (flare === "away") === f.away ? "cam-flash-burst" : "cam-flash"}
              style={{ animationDelay: `${flare ? (i % 7) * 0.12 : f.delay}s`, animationDuration: flare ? undefined : `${f.dur}s` }}
            />
          ))}
        </g>
      )}

      {/* Segregation netting between the home stands and the away end */}
      <path d={`M${AWAY_FROM} ${UPPER.top}V${lowerBottom}`} stroke="var(--st-roof)" strokeWidth="3" />
      <path d={`M${AWAY_FROM} ${UPPER.top}V${lowerBottom}`} stroke="#fff" strokeOpacity="0.18" strokeWidth="0.6" strokeDasharray="1.5 1.5" />

      {/* Mexican wave while the match is live */}
      {live && <rect className="crowd-wave" x="-80" y={UPPER.top} width="80" height={BOARDS_Y - UPPER.top} fill="url(#st-wave)" />}

      {/* Floodlight haze over the stands (night) */}
      <rect x="0" y="30" width={W} height="120" fill="url(#st-haze)" />

      {/* Goal: the scoring end floods with light, then settles */}
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
      <path d={`M0 ${BOARDS_Y + 11}H${W}V${H}H0Z`} fill="url(#st-pitch)" />
      {Array.from({ length: 9 }, (_, i) => {
        const topX = (W / 9) * i;
        const botX = -120 + ((W + 240) / 9) * i;
        return (
          <path
            key={i}
            d={`M${topX} ${BOARDS_Y + 11}L${topX + W / 9} ${BOARDS_Y + 11}L${botX + (W + 240) / 9} ${H}L${botX} ${H}Z`}
            fill="#fff"
            fillOpacity={i % 2 ? 0.045 : 0}
          />
        );
      })}
      <g fill="none" stroke="#fff" strokeOpacity="0.5" strokeWidth="1.1">
        <path d={`M-10 ${BOARDS_Y + 19}H${W + 10}`} />
        {sport === "soccer" ? (
          <>
            <path d={`M200 ${BOARDS_Y + 19}L200 ${H}`} />
            <ellipse cx="200" cy="300" rx="70" ry="30" />
            <path d={`M-10 ${BOARDS_Y + 46}H40L28 ${H}M${W + 10} ${BOARDS_Y + 46}H360L372 ${H}`} />
          </>
        ) : (
          [0.15, 0.3, 0.45, 0.6, 0.75, 0.9].map((t) => <path key={t} d={`M${W * t} ${BOARDS_Y + 19}L${-120 + (W + 240) * t} ${H}`} />)
        )}
      </g>

      {/* Scrim: dim the very top for the back button, deepen the bottom under the text */}
      <rect width={W} height={H} fill="url(#st-scrim)" />
    </svg>
  );
}
