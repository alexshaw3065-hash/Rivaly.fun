import { teamIdentity } from "@/lib/team-identity";

// The room's backdrop: a stadium at night, drawn — not a photo. Stands in
// each team's kit colour (home on the left, away on the right), a crowd
// texture in the seats, two floodlight masts (the only light source, so the
// light cones are earned, not decorative glow), and the pitch in
// perspective. A few KB of SVG instead of a stadium photo: loads instantly
// on slow 3G and cheap Androids, and needs no image rights.
//
// `flare` lights up one stand for a goal — the loud moment. Everything else
// about the stadium stays still.
export function Stadium({
  homeTeam,
  awayTeam,
  sport,
  flare,
  flareKey,
}: {
  homeTeam: string;
  awayTeam: string;
  sport: "soccer" | "nfl";
  flare: "home" | "away" | null;
  flareKey: number;
}) {
  const home = teamIdentity(homeTeam).primary;
  const away = teamIdentity(awayTeam).primary;

  // Drawn at phone proportions (the room's hero is taller than wide on a
  // phone); on wide screens the slice crops top and bottom, never the stands.
  const HOME_STAND = "M0 50 L64 130 L28 360 L0 360 Z";
  const AWAY_STAND = "M400 50 L336 130 L372 360 L400 360 Z";
  const PITCH = "M64 130 L336 130 L372 360 L28 360 Z";

  return (
    <svg
      aria-hidden
      viewBox="0 0 400 360"
      preserveAspectRatio="xMidYMid slice"
      className="pointer-events-none absolute inset-0 h-full w-full"
    >
      <defs>
        <linearGradient id="st-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#05070b" />
          <stop offset="1" stopColor="#0b0f14" />
        </linearGradient>
        <radialGradient id="st-cone" cx="0.5" cy="0" r="1">
          <stop offset="0" stopColor="#fff8e1" stopOpacity="0.2" />
          <stop offset="0.55" stopColor="#fff8e1" stopOpacity="0.04" />
          <stop offset="1" stopColor="#fff8e1" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="st-pitch" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#0e3620" />
          <stop offset="1" stopColor="#155a31" />
        </linearGradient>
        {/* Seats: a staggered dot grid, three shades, so the stand reads as people. */}
        <pattern id="st-crowd" width="6" height="5" patternUnits="userSpaceOnUse">
          <circle cx="1.5" cy="1.5" r="1.1" fill="#fff" fillOpacity="0.16" />
          <circle cx="4.5" cy="3.8" r="1.1" fill="#fff" fillOpacity="0.09" />
          <circle cx="4.5" cy="1.2" r="0.8" fill="#000" fillOpacity="0.25" />
        </pattern>
        <linearGradient id="st-fade" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#05070b" stopOpacity="0.35" />
          <stop offset="0.3" stopColor="#05070b" stopOpacity="0" />
          <stop offset="0.55" stopColor="#0a0a0a" stopOpacity="0.1" />
          <stop offset="1" stopColor="#0a0a0a" stopOpacity="0.94" />
        </linearGradient>
      </defs>

      <rect width="400" height="360" fill="url(#st-sky)" />

      {/* Back stand, across the top: neutral, far away */}
      <path d="M40 70 L360 70 L336 130 L64 130 Z" fill="#1a1f27" />
      <path d="M40 70 L360 70 L336 130 L64 130 Z" fill="url(#st-crowd)" />
      <path d="M34 66 H366" stroke="#2a313b" strokeWidth="3" />

      {/* Home stand (left) and away stand (right), in kit colours */}
      <path d={HOME_STAND} style={{ fill: `color-mix(in srgb, ${home} 55%, #0b0f14)` }} />
      <path d={HOME_STAND} fill="url(#st-crowd)" />
      <path d={AWAY_STAND} style={{ fill: `color-mix(in srgb, ${away} 55%, #0b0f14)` }} />
      <path d={AWAY_STAND} fill="url(#st-crowd)" />

      {/* Goal flare: the scoring side's stand floods with light, then settles */}
      {flare && (
        <path key={flareKey} className="stand-flare" d={flare === "home" ? HOME_STAND : AWAY_STAND} style={{ fill: flare === "home" ? home : away }} />
      )}

      {/* Pitch in perspective, mown in stripes */}
      <path d={PITCH} fill="url(#st-pitch)" />
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <path
          key={i}
          d={`M${64 + (272 / 6) * i} 130 L${64 + (272 / 6) * (i + 1)} 130 L${28 + (344 / 6) * (i + 1)} 360 L${28 + (344 / 6) * i} 360 Z`}
          fill="#fff"
          fillOpacity={i % 2 ? 0.03 : 0}
        />
      ))}
      <g fill="none" stroke="#fff" strokeOpacity="0.22" strokeWidth="1">
        <path d={PITCH} />
        {sport === "soccer" ? (
          <>
            <path d="M200 130 V360" />
            <ellipse cx="200" cy="245" rx="50" ry="22" />
            <path d="M150 130 L147 152 L253 152 L250 130" />
          </>
        ) : (
          [0.2, 0.35, 0.5, 0.65, 0.8].map((t) => <path key={t} d={`M${64 - 36 * t} ${130 + 230 * t} H${336 + 36 * t}`} />)
        )}
      </g>

      {/* Floodlights: masts at the corners, light falling onto the pitch */}
      <path d="M18 14 L140 360 L-80 360 Z" fill="url(#st-cone)" />
      <path d="M382 14 L480 360 L260 360 Z" fill="url(#st-cone)" />
      {[18, 382].map((x) => (
        <g key={x}>
          <path d={`M${x} 16 V70`} stroke="#2a313b" strokeWidth="2" />
          <rect x={x - 10} y="6" width="20" height="9" rx="1.5" fill="#e9eef5" />
          <rect x={x - 10} y="6" width="20" height="9" rx="1.5" fill="#fff8e1" fillOpacity="0.6" />
        </g>
      ))}

      {/* Dim the top a touch for the back button, and fade the bottom into the page */}
      <rect width="400" height="360" fill="url(#st-fade)" />
    </svg>
  );
}
