// The company pages' icons: one stroke weight, one grid (20px, 1.6 stroke),
// drawn for these pages rather than borrowed, so the help center has its
// own small vocabulary. Colour comes from the parent (currentColor).

type P = { className?: string };
const base = { width: 20, height: 20, viewBox: "0 0 20 20", fill: "none", stroke: "currentColor", strokeWidth: 1.6, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, "aria-hidden": true };

/** How it works: two sides meeting on a seam. */
export function GuideIcon({ className }: P) {
  return (
    <svg {...base} className={className}>
      <rect x="2.5" y="4" width="15" height="12" rx="2.5" />
      <path d="M11.5 4 8.5 16" />
    </svg>
  );
}

/** About: two people, face to face. */
export function PeopleIcon({ className }: P) {
  return (
    <svg {...base} className={className}>
      <circle cx="6.5" cy="7" r="2.5" />
      <circle cx="13.5" cy="7" r="2.5" />
      <path d="M2.5 16c.6-2.5 2.2-3.8 4-3.8s3.4 1.3 4 3.8M9.5 16c.6-2.5 2.2-3.8 4-3.8s3.4 1.3 4 3.8" />
    </svg>
  );
}

/** Support: a speech bubble. */
export function ChatIcon({ className }: P) {
  return (
    <svg {...base} className={className}>
      <path d="M3 5.5A2.5 2.5 0 0 1 5.5 3h9A2.5 2.5 0 0 1 17 5.5v6a2.5 2.5 0 0 1-2.5 2.5H9l-4 3v-3h0A2 2 0 0 1 3 12V5.5Z" />
    </svg>
  );
}

/** Responsible play: a pause. */
export function PauseIcon({ className }: P) {
  return (
    <svg {...base} className={className}>
      <circle cx="10" cy="10" r="7.5" />
      <path d="M8.2 7.2v5.6M11.8 7.2v5.6" />
    </svg>
  );
}

/** Terms: a page with its rules. */
export function DocumentIcon({ className }: P) {
  return (
    <svg {...base} className={className}>
      <path d="M5 2.5h6.5L15 6v11.5H5z" />
      <path d="M11.5 2.5V6H15M7.5 10h5M7.5 13h5" />
    </svg>
  );
}

/** Privacy: a shield. */
export function ShieldIcon({ className }: P) {
  return (
    <svg {...base} className={className}>
      <path d="M10 2.5 16 5v4.6c0 3.6-2.5 6.4-6 7.9-3.5-1.5-6-4.3-6-7.9V5z" />
      <path d="m7.5 10 1.8 1.8 3.2-3.3" />
    </svg>
  );
}

export function MailIcon({ className }: P) {
  return (
    <svg {...base} className={className}>
      <rect x="2.5" y="4.5" width="15" height="11" rx="2" />
      <path d="m3 5.5 7 5.5 7-5.5" />
    </svg>
  );
}

export function InfoCircleIcon({ className }: P) {
  return (
    <svg {...base} className={className}>
      <circle cx="10" cy="10" r="7.5" />
      <path d="M10 9v4.5M10 6.5v.01" />
    </svg>
  );
}

export function CheckCircleIcon({ className }: P) {
  return (
    <svg {...base} className={className}>
      <circle cx="10" cy="10" r="7.5" />
      <path d="m7 10.2 2 2 4-4.2" />
    </svg>
  );
}

export function HeartIcon({ className }: P) {
  return (
    <svg {...base} className={className}>
      <path d="M10 16.5s-6.5-3.8-6.5-8.3A3.6 3.6 0 0 1 10 6.1a3.6 3.6 0 0 1 6.5 2.1c0 4.5-6.5 8.3-6.5 8.3Z" />
    </svg>
  );
}

export function SearchIcon({ className }: P) {
  return (
    <svg {...base} className={className}>
      <circle cx="9" cy="9" r="5.5" />
      <path d="m13 13 4 4" />
    </svg>
  );
}

export function ChevronRightIcon({ className }: P) {
  return (
    <svg width="8" height="14" viewBox="0 0 8 14" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden className={className}>
      <path d="m1.5 1.5 5 5.5-5 5.5" />
    </svg>
  );
}

/** Which icon each company page wears, everywhere it appears. */
export const PAGE_ICONS: Record<string, (p: P) => React.ReactElement> = {
  "/docs": GuideIcon,
  "/about": PeopleIcon,
  "/support": ChatIcon,
  "/responsible-play": PauseIcon,
  "/terms": DocumentIcon,
  "/privacy": ShieldIcon,
};
