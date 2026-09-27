"use client";

import { useId } from "react";
import { teamIdentity } from "@/lib/team-identity";
import { CrestImage, useCrestUrl } from "./crest-provider";

// A generated crest: shield silhouette in the team's primary kit colour,
// one diagonal band of its secondary, and its short code. The same object
// shows up on the match list, the picker and the room card, so a team is
// recognisable by colour before its name is read. A hairline in the ink
// colour keeps very dark kits (Raiders, Bears) from dissolving into the
// dark theme's background.
//
// With a real badge (src/lib/crests/), the badge shows in the same box and
// this monogram becomes its instant placeholder and fallback — so the
// layout never shifts and a slow or missing image never leaves a gap.
export function TeamCrest({ name, size = 32, className = "" }: { name: string; size?: number; className?: string }) {
  const src = useCrestUrl("team", name);
  const height = (size * 36) / 32;
  if (!src) return <Monogram name={name} size={size} className={className} />;
  return (
    <CrestImage src={src} alt={`${name} crest`} width={size} height={height} className={className}>
      <Monogram name={name} size={size} />
    </CrestImage>
  );
}

function Monogram({ name, size, className = "" }: { name: string; size: number; className?: string }) {
  const id = useId();
  const t = teamIdentity(name);
  const long = t.code.length > 3;
  return (
    <svg
      viewBox="0 0 32 36"
      width={size}
      height={(size * 36) / 32}
      className={`shrink-0 ${className}`}
      role="img"
      aria-label={`${name} crest`}
    >
      <defs>
        <clipPath id={`${id}-shield`}>
          <path d="M16 1.5 29.5 5.5V17c0 8.6-6 14.6-13.5 17.5C8.5 31.6 2.5 25.6 2.5 17V5.5Z" />
        </clipPath>
      </defs>
      <g clipPath={`url(#${id}-shield)`}>
        <rect width="32" height="36" fill={t.primary} />
        <path d="M-2 30 34 21v4.5L-2 34.5Z" fill={t.secondary} />
      </g>
      <path
        d="M16 1.5 29.5 5.5V17c0 8.6-6 14.6-13.5 17.5C8.5 31.6 2.5 25.6 2.5 17V5.5Z"
        fill="none"
        stroke={t.ink}
        strokeOpacity="0.18"
      />
      <text
        x="16"
        y={long ? 14.5 : 15}
        textAnchor="middle"
        dominantBaseline="middle"
        fill={t.ink}
        fontSize={long ? 7 : 9}
        fontWeight="800"
        letterSpacing="0.3"
        style={{ fontFamily: "var(--font-display)" }}
      >
        {t.code}
      </text>
    </svg>
  );
}
