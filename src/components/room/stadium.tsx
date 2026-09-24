"use client";

import { useEffect, useMemo, useState } from "react";
import { teamIdentity } from "@/lib/team-identity";
import { buildCrowd, type CrowdLayer, type End } from "./crowd";

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
// The crowd itself — real-looking people, grouped by colour into a few dozen
// paths and generated on the device from a seed of the two teams' names —
// is built in crowd.ts.

const W = 400;
// Tall so the pitch runs down behind the scoreboard and the call; the stands
// are compact (top 39.5% of the width) so the hero stays short on a phone.
const H = 520;
const AWAY_FROM = 300; // the away team's end: x ≥ this, behind the netting
const END_SPLIT = 200; // the room's ends: YES backers left of this, NO right
const ROOF_BOTTOM = 27;
// Fewer, bigger people: front-row heads ~10px on a phone, back rows ~7px.
const UPPER = { top: 30, rows: 4, rowH: 14, head: 3.7, gap: 10.5 };
const LOWER = { top: 96, rows: 3, rowH: 17, head: 4.9, gap: 13.5 };
export const BOARDS_Y = 147;
const PITCH_Y = BOARDS_Y + 11;
const SIDE_GLOW: Record<End, string> = { yes: "#3d6bff", no: "#ef4444" };
// A few flags in the stands: [x, tier, row]
const FLAGS: [number, "upper" | "lower", number][] = [
  [26, "upper", 1],
  [92, "lower", 0],
  [150, "upper", 2],
  [228, "lower", 1],
  [262, "upper", 0],
  [318, "upper", 1],
  [364, "lower", 0],
];

function CrowdGroup({ layer, end, level, flare }: { layer: CrowdLayer; end: End; level: number; flare: "home" | "away" | null }) {
  const bouncing = level > 0.45;
  const stroke = (m: Map<string, string>) =>
    [...m].map(([key, d]) => {
      const [color, width] = key.split("|");
      return <path key={key} d={d} stroke={color} strokeWidth={width} strokeLinecap="round" fill="none" />;
    });
  const fill = (m: Map<string, string>, prefix: string) => [...m].map(([color, d]) => <path key={`${prefix}${color}`} d={d} fill={color} />);
  return (
    <g className={bouncing ? "crowd-bounce" : undefined} style={bouncing ? { animationDuration: `${0.75 - level * 0.3}s` } : undefined}>
      {fill(layer.bodies, "b")}
      {/* Shirts catch the side's colour as the end gets louder */}
      <path d={layer.allBodies} fill={SIDE_GLOW[end]} style={{ opacity: level * 0.28, transition: "opacity 900ms ease" }} />
      {fill(layer.skin, "s")}
      {fill(layer.hair, "h")}
      {stroke(layer.arms)}
      {fill(layer.hands, "k")}
      <g style={{ opacity: level, transition: "opacity 700ms ease" }}>
        {stroke(layer.hypeArms)}
        {fill(layer.hypeHands, "hk")}
        {fill(layer.scarves, "sc")}
      </g>
      {layer.flashes.map((f, i) => (
        <circle
          key={i}
          cx={f.x}
          cy={f.y}
          r="1.5"
          fill="#fff"
          className={flare && (flare === "away") === f.awayTeam ? "cam-flash-burst" : "cam-flash"}
          style={{ animationDelay: `${flare ? (i % 7) * 0.12 : f.delay}s`, animationDuration: flare ? undefined : `${f.dur}s` }}
        />
      ))}
      {level > 0.15 && (
        <g style={{ opacity: level }}>
          {layer.hypeFlashes.map((f, i) => (
            <circle key={i} cx={f.x} cy={f.y} r="1.5" fill="#fff" className="cam-flash" style={{ animationDelay: `${f.delay}s`, animationDuration: `${f.dur}s` }} />
          ))}
        </g>
      )}
    </g>
  );
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
  const crowd = useMemo(
    () => (ready ? buildCrowd(homeTeam, awayTeam, { width: W, awayFrom: AWAY_FROM, endSplit: END_SPLIT, upper: UPPER, lower: LOWER }) : null),
    [ready, homeTeam, awayTeam],
  );

  const clamp01 = (n: number) => Math.max(0, Math.min(1, n));
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

      {/* The crowd — back tier first, set back in the haze, then the front tier.
          Each end of the room comes alive with its backers' energy. */}
      {crowd && (
        <g clipPath="url(#st-stands)">
          {(["yes", "no"] as const).map((end) => (
            <CrowdGroup key={`u${end}`} layer={crowd.upper[end]} end={end} level={clamp01(energy[end])} flare={flare} />
          ))}
          <rect x="0" y={UPPER.top} width={W} height={UPPER.rows * UPPER.rowH} fill="#000" style={{ opacity: "var(--st-depth)" }} />
          {(["yes", "no"] as const).map((end) => (
            <CrowdGroup key={`l${end}`} layer={crowd.lower[end]} end={end} level={clamp01(energy[end])} flare={flare} />
          ))}
          {FLAGS.map(([x, tierKey, row], i) => {
            const tier = tierKey === "upper" ? UPPER : LOWER;
            const kit = x >= AWAY_FROM ? away : home;
            const level = clamp01(energy[x < END_SPLIT ? "yes" : "no"]);
            return (
              <g key={i} transform={`translate(${x} ${tier.top + row * tier.rowH - 4})`}>
                <path d="M0 0V18" stroke="#d7d7d7" strokeWidth="0.9" />
                <g className="flag-wave" style={{ animationDelay: `${(i % 4) * 0.35}s`, animationDuration: `${1.4 - level * 0.6}s` }}>
                  <rect x="0" y="0" width="18" height="11" style={{ fill: kit.primary }} />
                  <rect x="0" y="4" width="18" height="3" style={{ fill: kit.secondary }} />
                </g>
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
