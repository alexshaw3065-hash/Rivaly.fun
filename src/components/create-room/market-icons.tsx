// Line icons for the create-room picker, drawn on the same 20px grid and
// 1.4 stroke as src/components/icons.tsx so they sit in the same family.
// Each one depicts the actual thing being argued about (a corner flag, a
// goalpost, a half-shaded clock) rather than a generic glyph.

type P = { className?: string };
const base = { viewBox: "0 0 20 20", width: 16, height: 16, fill: "none", "aria-hidden": true } as const;

export function SoccerIcon({ className }: P) {
  return (
    <svg {...base} className={className}>
      <circle cx="10" cy="10" r="6.5" stroke="currentColor" strokeWidth="1.4" />
      <path d="m10 6.6 2.4 1.7-.9 2.8h-3l-.9-2.8L10 6.6Z" fill="currentColor" />
      <path d="M10 6.6V3.8m2.4 4.5 2.5-1m-3.4 3.8 1.6 2.3m-4.6-2.3-1.6 2.3m.7-4.8-2.5-1" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" />
    </svg>
  );
}

export function GridironIcon({ className }: P) {
  return (
    <svg {...base} className={className}>
      <path d="M4.2 15.8C2.6 11.7 5 5.9 9.4 4.4c2.2-.7 4.6-.7 6.4-.2.5 1.8.5 4.2-.2 6.4-1.5 4.4-7.3 6.8-11.4 5.2Z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
      <path d="m7.6 12.4 4.8-4.8M9 9.2l1.8 1.8m-.4-3.2 1.8 1.8M7.6 10.6l1.8 1.8" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  );
}

export function TrophyIcon({ className }: P) {
  return (
    <svg {...base} className={className}>
      <path d="M6.5 3.8h7v4a3.5 3.5 0 0 1-7 0v-4Z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
      <path d="M6.5 5.3H4.3c0 2 1 3.2 2.5 3.4m6.7-3.4h2.2c0 2-1 3.2-2.5 3.4M10 11.3v2.9m-2.8 2h5.6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

export function GoalIcon({ className }: P) {
  return (
    <svg {...base} className={className}>
      <path d="M2.8 15.5V5.5h14.4v10" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M5.5 5.5v7.5m3-7.5v7.5m3-7.5v7.5m3-7.5v7.5M2.8 9h14.4m-14.4 3.5h14.4" stroke="currentColor" strokeWidth="0.8" strokeOpacity="0.6" />
    </svg>
  );
}

export function ScoreboardIcon({ className }: P) {
  return (
    <svg {...base} className={className}>
      <rect x="2.8" y="5" width="14.4" height="10" rx="1.8" stroke="currentColor" strokeWidth="1.4" />
      <path d="M6.5 8.3v3.4m7-3.4v3.4M10 8.9v.1m0 2v.1" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

export function HalfClockIcon({ className }: P) {
  return (
    <svg {...base} className={className}>
      <circle cx="10" cy="10" r="6.5" stroke="currentColor" strokeWidth="1.4" />
      <path d="M10 3.5a6.5 6.5 0 0 1 0 13Z" fill="currentColor" fillOpacity="0.35" />
      <path d="M10 3.5v13" stroke="currentColor" strokeWidth="1.2" />
    </svg>
  );
}

export function CornerFlagIcon({ className }: P) {
  return (
    <svg {...base} className={className}>
      <path d="M6 17V3.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      <path d="M6 4h7.5l-2 2.5 2 2.5H6" fill="currentColor" fillOpacity="0.35" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
      <path d="M3 17a3 3 0 0 1 6 0" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  );
}

/** A referee's card — rendered in its real colour, the one place red earns its loudness. */
export function RefCardIcon({ className, color = "var(--no)" }: P & { color?: string }) {
  return (
    <svg {...base} className={className}>
      <rect x="6" y="3" width="8.5" height="12.5" rx="1.2" transform="rotate(10 10 10)" fill={color} />
    </svg>
  );
}

export function BootIcon({ className }: P) {
  return (
    <svg {...base} className={className}>
      <path d="M5 3.8h4.2v5.6l6.2 2.4c1 .4 1.6 1.3 1.6 2.4v.8H3.5V9.2L5 3.8Z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
      <path d="M5.5 15v1.8m3.5-1.8v1.8m3.5-1.8v1.8" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  );
}

export function BothScoreIcon({ className }: P) {
  return (
    <svg {...base} className={className}>
      <circle cx="7" cy="10" r="4" stroke="currentColor" strokeWidth="1.4" />
      <circle cx="13" cy="10" r="4" stroke="currentColor" strokeWidth="1.4" />
    </svg>
  );
}

export function GoalpostIcon({ className }: P) {
  return (
    <svg {...base} className={className}>
      <path d="M5.5 3v7.5h9V3M10 10.5V17" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function OvertimeIcon({ className }: P) {
  return (
    <svg {...base} className={className}>
      <path d="M15.8 12.5A6.5 6.5 0 1 1 13.5 4.6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      <path d="M13 2.8 15.9 4l-1.2 2.9M10 6.7V10l2.2 1.3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function MarginIcon({ className }: P) {
  return (
    <svg {...base} className={className}>
      <path d="M3 13.5h5V9.5H3zM12 13.5h5V5.5h-5z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
      <path d="M8 7h4m-1.5-1.5L12 7l-1.5 1.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function CheckIcon({ className }: P) {
  return (
    <svg {...base} width={14} height={14} className={className}>
      <path d="m5 10.5 3.2 3L15 6.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
