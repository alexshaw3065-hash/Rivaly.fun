// Hand-drawn, not pulled from an icon pack — see anti-slop-design-law.md on
// generic outline icons. Bare marks, no filled tile behind them. Shared
// across top-bar-icons.tsx, search-bar-row.tsx, and bookmark-button.tsx so
// the same glyph doesn't get redrawn slightly differently in each place.

export function BellIcon() {
  return (
    <svg viewBox="0 0 20 20" width="19" height="19" fill="none" aria-hidden>
      <path d="M10 5.2V4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path
        d="M6 8.5a4 4 0 0 1 8 0v2.8l1.3 2.2H4.7L6 11.3V8.5Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path d="M8.5 15.5a1.5 1.5 0 0 0 3 0" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

export function GiftIcon() {
  return (
    <svg viewBox="0 0 20 20" width="19" height="19" fill="none" aria-hidden>
      <rect x="4" y="9" width="12" height="7" rx="1" stroke="currentColor" strokeWidth="1.5" />
      <rect x="3" y="6.5" width="14" height="3" rx="1" stroke="currentColor" strokeWidth="1.5" />
      <path d="M10 6.5V16" stroke="currentColor" strokeWidth="1.5" />
      <path
        d="M10 6.5c-1.2 0-2.4-.6-2.4-1.8S8.6 3 9.6 3c1 0 1.4 1 .4 2.2M10 6.5c1.2 0 2.4-.6 2.4-1.8S11.4 3 10.4 3c-1 0-1.4 1-.4 2.2"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function BookmarkIcon({ filled = false }: { filled?: boolean }) {
  return (
    <svg viewBox="0 0 20 20" width="18" height="18" fill={filled ? "currentColor" : "none"} aria-hidden>
      <path
        d="M5.5 3.5h9a1 1 0 0 1 1 1V17l-5.5-3.4L4 17V4.5a1 1 0 0 1 1-1Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function TagIcon() {
  return (
    <svg viewBox="0 0 20 20" width="18" height="18" fill="none" aria-hidden>
      <path
        d="M10.6 3.5H16a.5.5 0 0 1 .5.5v5.4a1 1 0 0 1-.3.7l-6.7 6.7a1 1 0 0 1-1.4 0l-4.4-4.4a1 1 0 0 1 0-1.4l6.7-6.7a1 1 0 0 1 .2-.2Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <circle cx="13.2" cy="6.8" r="1" fill="currentColor" />
    </svg>
  );
}

// The classic funnel — wide intake narrowing to a single output — reads as
// "filter" more universally than the tag mark did for the league picker.
export function FilterIcon() {
  return (
    <svg viewBox="0 0 20 20" width="18" height="18" fill="none" aria-hidden>
      <path
        d="M3 4.5h14L11.5 11v5.3l-3 1.5V11L3 4.5Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function SlidersIcon() {
  return (
    <svg viewBox="0 0 20 20" width="18" height="18" fill="none" aria-hidden>
      <path d="M3 6h8M14 6h3M3 14h3M8 14h9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="11" cy="6" r="1.6" fill="var(--surface)" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="6" cy="14" r="1.6" fill="var(--surface)" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

export function SearchIcon() {
  return (
    <svg viewBox="0 0 20 20" width="16" height="16" fill="none" aria-hidden>
      <circle cx="8.7" cy="8.7" r="5.2" stroke="currentColor" strokeWidth="1.5" />
      <path d="M16.5 16.5 13 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}
