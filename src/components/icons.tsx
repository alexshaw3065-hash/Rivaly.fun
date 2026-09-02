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

// A trending-up arrow — same bare hand-drawn stroke convention as the
// rest of this file. Sits next to each term in the search dropdown's
// Trending list.
export function TrendingIcon() {
  return (
    <svg viewBox="0 0 20 20" width="14" height="14" fill="none" aria-hidden>
      <path
        d="M3.5 13.5 8 9l3 3 5.5-5.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M12.5 6.5h4v4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// Sidebar nav marks — same bare-mark, hand-drawn convention as the icons
// above, sized for the collapsible desktop sidebar (nav.tsx).
export function HomeIcon() {
  return (
    <svg viewBox="0 0 20 20" width="19" height="19" fill="none" aria-hidden>
      <path d="M3.5 9.6 10 4l6.5 5.6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M5.5 8.3V16h9V8.3" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M8 16v-4.2h4V16" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  );
}

export function WalletIcon() {
  return (
    <svg viewBox="0 0 20 20" width="19" height="19" fill="none" aria-hidden>
      <path d="M3 6.5a1.5 1.5 0 0 1 1.5-1.5h9A1.5 1.5 0 0 1 15 6.5V7H4.5A1.5 1.5 0 0 1 3 5.5" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M3 6.5v8A1.5 1.5 0 0 0 4.5 16H16a1 1 0 0 0 1-1v-7a1 1 0 0 0-1-1H4.5A1.5 1.5 0 0 1 3 5.5Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      <circle cx="13.6" cy="11" r="1" fill="currentColor" />
    </svg>
  );
}

// Points left at rest; nav.tsx rotates it 180° when the sidebar is
// collapsed so it always points the direction the toggle will expand to.
export function ChevronIcon() {
  return (
    <svg viewBox="0 0 20 20" width="16" height="16" fill="none" aria-hidden>
      <path d="M12 5 7.5 10l4.5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function PlusIcon() {
  return (
    <svg viewBox="0 0 20 20" width="19" height="19" fill="none" aria-hidden>
      <path d="M10 4v12M4 10h12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

// A stack of two prediction cards — the "bets to place" metaphor for the
// Rooms nav tab, distinct from a generic grid/list glyph. The back card's
// fill punches through the front card's stroke where they overlap, same
// trick SlidersIcon uses for its track dots — matches whatever surface the
// icon sits on (nav bars, all on --background).
export function RoomsIcon() {
  return (
    <svg viewBox="0 0 20 20" width="19" height="19" fill="none" aria-hidden>
      <rect x="6.2" y="2.6" width="10" height="7.2" rx="1.3" stroke="currentColor" strokeWidth="1.5" />
      <rect x="3.2" y="7.3" width="11" height="9.6" rx="1.6" fill="var(--background)" stroke="currentColor" strokeWidth="1.5" />
      <path d="M6 11.3h4.2M6 13.9h6.2" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  );
}

// Bow + shaft + teeth — for the "Join private room" invite-code affordance.
export function KeyIcon() {
  return (
    <svg viewBox="0 0 20 20" width="18" height="18" fill="none" aria-hidden>
      <circle cx="6.8" cy="7" r="3.1" stroke="currentColor" strokeWidth="1.5" />
      <path
        d="M9.1 9.3 16 16.2M12.8 12.5l1.9 1.9M15.1 10.2l1.9 1.9"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// Plain circle-i — explains what a tab/section means, on hover (desktop,
// via the native title attribute wherever it's used) or tap (everywhere).
export function InfoIcon() {
  return (
    <svg viewBox="0 0 20 20" width="16" height="16" fill="none" aria-hidden>
      <circle cx="10" cy="10" r="7" stroke="currentColor" strokeWidth="1.5" />
      <path d="M10 9v4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="10" cy="6.6" r="0.9" fill="currentColor" />
    </svg>
  );
}

// Small chevron-down for the Discover filter's "More" dropdown trigger.
export function ChevronDownIcon() {
  return (
    <svg viewBox="0 0 20 20" width="14" height="14" fill="none" aria-hidden>
      <path d="M5 8l5 5 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// Three nodes off a shared spine — the standard "share" construction, kept
// to the same bare hand-drawn stroke weight as the rest of this file.
export function ShareIcon() {
  return (
    <svg viewBox="0 0 20 20" width="17" height="17" fill="none" aria-hidden>
      <circle cx="15" cy="5" r="2.2" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="5" cy="10" r="2.2" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="15" cy="15" r="2.2" stroke="currentColor" strokeWidth="1.5" />
      <path d="M7 8.8 13 6M7 11.2l6 2.8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

// Two interlocking loops — a generic "connected account" mark, not tied to
// any one platform's brand, since Profile's social field can hold any
// handle a user adds.
export function LinkIcon() {
  return (
    <svg viewBox="0 0 20 20" width="15" height="15" fill="none" aria-hidden>
      <path
        d="M8.3 11.7 11.7 8.3M8.9 6.3l1-1a2.6 2.6 0 0 1 3.7 3.7l-1 1M11.1 13.7l-1 1a2.6 2.6 0 0 1-3.7-3.7l1-1"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// A tilted pencil — replaces the old plain "Edit" text link next to your
// own name so the affordance reads as an icon action, matching the share/
// settings/gift icons it now sits alongside on the banner.
export function PencilIcon() {
  return (
    <svg viewBox="0 0 20 20" width="15" height="15" fill="none" aria-hidden>
      <path
        d="M12.9 3.6 16.4 7.1 6.9 16.6 3 17.4l.8-3.9 9.1-9.9Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path d="M11.3 5.2 14.8 8.7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

// A simple gear — account settings, reached from your own profile banner.
export function SettingsIcon() {
  return (
    <svg viewBox="0 0 20 20" width="17" height="17" fill="none" aria-hidden>
      <circle cx="10" cy="10" r="2.6" stroke="currentColor" strokeWidth="1.5" />
      <path
        d="M10 3.2v1.9M10 14.9v1.9M16.8 10h-1.9M5.1 10H3.2M14.9 5.1l-1.3 1.3M6.4 13.6l-1.3 1.3M14.9 14.9l-1.3-1.3M6.4 6.4 5.1 5.1"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

// Connect-socials set — same bare hand-drawn convention as the rest of this
// file: simplified, recognizable silhouettes, not traced brand logos.

export function XIcon() {
  return (
    <svg viewBox="0 0 20 20" width="15" height="15" fill="none" aria-hidden>
      <path d="M4.5 4.5 15.5 15.5M15.5 4.5 4.5 15.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

export function DiscordIcon() {
  return (
    <svg viewBox="0 0 20 20" width="16" height="16" fill="none" aria-hidden>
      <path
        d="M5.5 6.2C7 5.3 8.5 5 10 5s3 .3 4.5 1.2c1 2 1.4 4.3 1.2 7-1.3.9-2.5 1.4-3.7 1.7l-.6-1.1"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M5.5 6.2c-1 2-1.4 4.3-1.2 7 1.3.9 2.5 1.4 3.7 1.7l.6-1.1" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="7.6" cy="10.8" r="1.1" fill="currentColor" />
      <circle cx="12.4" cy="10.8" r="1.1" fill="currentColor" />
    </svg>
  );
}

export function TelegramIcon() {
  return (
    <svg viewBox="0 0 20 20" width="16" height="16" fill="none" aria-hidden>
      <path
        d="M3.5 10.4 16 4.8l-2.3 11.4-4-3-2 1.9-.3-3.4-6-2.4Z"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
      <path d="M7.4 11.7 15.6 5.3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  );
}

export function InstagramIcon() {
  return (
    <svg viewBox="0 0 20 20" width="16" height="16" fill="none" aria-hidden>
      <rect x="3.5" y="3.5" width="13" height="13" rx="4" stroke="currentColor" strokeWidth="1.4" />
      <circle cx="10" cy="10" r="3.2" stroke="currentColor" strokeWidth="1.4" />
      <circle cx="14" cy="6" r="0.9" fill="currentColor" />
    </svg>
  );
}

export function TiktokIcon() {
  return (
    <svg viewBox="0 0 20 20" width="15" height="15" fill="none" aria-hidden>
      <path
        d="M11 3.5v9.3a2.6 2.6 0 1 1-2.2-2.6"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M11 3.5c.3 1.9 1.6 3.3 3.5 3.6"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function YoutubeIcon() {
  return (
    <svg viewBox="0 0 20 20" width="17" height="17" fill="none" aria-hidden>
      <rect x="2.5" y="5" width="15" height="10" rx="3" stroke="currentColor" strokeWidth="1.4" />
      <path d="M8.5 7.8v4.4l4-2.2Z" fill="currentColor" />
    </svg>
  );
}

// Vertical ellipsis — "more options" trigger for the mobile top bar's menu.
export function MoreIcon() {
  return (
    <svg viewBox="0 0 20 20" width="18" height="18" fill="currentColor" aria-hidden>
      <circle cx="10" cy="4.5" r="1.4" />
      <circle cx="10" cy="10" r="1.4" />
      <circle cx="10" cy="15.5" r="1.4" />
    </svg>
  );
}

export function SunIcon() {
  return (
    <svg viewBox="0 0 20 20" width="16" height="16" fill="none" aria-hidden>
      <circle cx="10" cy="10" r="3.4" stroke="currentColor" strokeWidth="1.5" />
      <path
        d="M10 2.8v2M10 15.2v2M17.2 10h-2M4.8 10h-2M15.1 4.9l-1.4 1.4M6.3 13.7l-1.4 1.4M15.1 15.1l-1.4-1.4M6.3 6.3 4.9 4.9"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function MoonIcon() {
  return (
    <svg viewBox="0 0 20 20" width="16" height="16" fill="none" aria-hidden>
      <path
        d="M15.8 12.3A6.2 6.2 0 0 1 7.7 4.2a6.2 6.2 0 1 0 8.1 8.1Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function LinkedInIcon() {
  return (
    <svg viewBox="0 0 20 20" width="16" height="16" fill="none" aria-hidden>
      <rect x="3" y="3" width="14" height="14" rx="2.5" stroke="currentColor" strokeWidth="1.4" />
      <circle cx="6.8" cy="7" r="1" fill="currentColor" />
      <path d="M6.8 9.3v4.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      <path
        d="M9.6 13.8V9.3m0 0c0-1 .7-1.7 1.7-1.7s1.7.7 1.7 1.7v4.5"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
    </svg>
  );
}

// A stadium bowl seen from the side — two opposing stands (the arcs) around
// the pitch (the center dot) — for the Arena nav tab. Deliberately not a
// trophy (that reads as "you already won something"; Arena is the crowd,
// not the prize).
export function ArenaIcon() {
  return (
    <svg viewBox="0 0 20 20" width="19" height="19" fill="none" aria-hidden>
      <path d="M3 7c0-2.2 3.1-4 7-4s7 1.8 7 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M3 13c0 2.2 3.1 4 7 4s7-1.8 7-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M3 7v6M17 7v6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="10" cy="10" r="1.4" fill="currentColor" />
    </svg>
  );
}

// Small glyphs for Search's Browse chips and Discussions topics (per
// founder direction — icons on our own existing tabs, not a copy of any
// other product's category list). Same bare hand-drawn stroke convention
// as every icon above.

// A four-point glint, not a filled star — "new" without reaching for a
// generic notification-badge asterisk.
export function NewIcon() {
  return (
    <svg viewBox="0 0 20 20" width="15" height="15" fill="none" aria-hidden>
      <path
        d="M10 3.2c.4 2.7 1.5 3.8 4.2 4.2-2.7.4-3.8 1.5-4.2 4.2-.4-2.7-1.5-3.8-4.2-4.2 2.7-.4 3.8-1.5 4.2-4.2Z"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinejoin="round"
      />
      <path
        d="M15.5 12.5c.15.9.5 1.25 1.4 1.4-.9.15-1.25.5-1.4 1.4-.15-.9-.5-1.25-1.4-1.4.9-.15 1.25-.5 1.4-1.4Z"
        stroke="currentColor"
        strokeWidth="1"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// Broadcast pulse — a signal going out, not the LiveBadge's pulsing dot
// (that's an animated state marker; this is a static glyph next to a
// filter label).
export function LiveIcon() {
  return (
    <svg viewBox="0 0 20 20" width="15" height="15" fill="none" aria-hidden>
      <circle cx="10" cy="10" r="1.8" fill="currentColor" />
      <path d="M6.8 6.8a4.5 4.5 0 0 0 0 6.4M13.2 6.8a4.5 4.5 0 0 1 0 6.4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  );
}

export function ClockIcon() {
  return (
    <svg viewBox="0 0 20 20" width="15" height="15" fill="none" aria-hidden>
      <circle cx="10" cy="10" r="6.3" stroke="currentColor" strokeWidth="1.4" />
      <path d="M10 6.7V10l2.4 1.4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// A coin stack for "Big pools" — three tiers, not a single coin, so it
// reads as accumulation rather than one flat currency mark.
export function PoolIcon() {
  return (
    <svg viewBox="0 0 20 20" width="15" height="15" fill="none" aria-hidden>
      <ellipse cx="10" cy="5.8" rx="4.6" ry="1.8" stroke="currentColor" strokeWidth="1.3" />
      <path d="M5.4 5.8v3.7c0 1 2 1.8 4.6 1.8s4.6-.8 4.6-1.8V5.8" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
      <path d="M5.4 9.5v3.7c0 1 2 1.8 4.6 1.8s4.6-.8 4.6-1.8V9.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  );
}

// A level balance scale — both pans even, for "Too close to call."
export function ScalesIcon() {
  return (
    <svg viewBox="0 0 20 20" width="15" height="15" fill="none" aria-hidden>
      <path d="M10 3.3v13.4M6.2 5.3h7.6" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
      <path d="M3.6 5.3h2.9L5.1 9a1.2 1.2 0 0 1-2.2 0L3.6 5.3Z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
      <path d="M13.5 5.3h2.9L15 9a1.2 1.2 0 0 1-2.2 0l.7-3.7Z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
      <path d="M7 16.5h6" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  );
}

export function ForYouIcon() {
  return (
    <svg viewBox="0 0 20 20" width="15" height="15" fill="none" aria-hidden>
      <circle cx="10" cy="6.6" r="2.4" stroke="currentColor" strokeWidth="1.4" />
      <path d="M4.8 16c.7-2.9 2.9-4.4 5.2-4.4s4.5 1.5 5.2 4.4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

// A ball, not a trophy — see ArenaIcon above on why: a trophy reads as
// "you already won," which is wrong for browsing what's on/coming up.
// Rivaly is football-first, so the league/moment topics (UCL night, EPL
// weekend, etc.) get the ball, not a generic tag or calendar mark.
export function BallIcon() {
  return (
    <svg viewBox="0 0 20 20" width="15" height="15" fill="none" aria-hidden>
      <circle cx="10" cy="10" r="6.3" stroke="currentColor" strokeWidth="1.4" />
      <path d="M10 6.4 12.5 8.2l-1 2.9H8.5l-1-2.9L10 6.4Z" stroke="currentColor" strokeWidth="1.1" strokeLinejoin="round" />
      <path
        d="M10 6.4V4M12.5 8.2l2.2-1.3M11.5 11.1l1.6 2M8.5 11.1l-1.6 2M7.5 8.2 5.3 6.9"
        stroke="currentColor"
        strokeWidth="1.1"
        strokeLinecap="round"
      />
    </svg>
  );
}
