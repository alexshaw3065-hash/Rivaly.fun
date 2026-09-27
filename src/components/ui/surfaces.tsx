import Link from "next/link";
import type { ComponentProps, CSSProperties, ReactNode } from "react";

// Surfaces and content blocks: Card, SectionHeader, ListGroup/ListRow,
// Badge/LiveBadge, Skeleton, EmptyState. One quiet edge per card, no card
// shadows, rows highlight on press (they never scale).

/** A card: surface fill, 14px radius, one 1px inner edge. */
export function Card({
  padded = true,
  className = "",
  children,
  ...rest
}: ComponentProps<"div"> & { padded?: boolean }) {
  return (
    <div {...rest} className={`rounded-card bg-surface edge ${padded ? "p-4" : ""} ${className}`}>
      {children}
    </div>
  );
}

/** A section title with an optional action on the right ("See all"). */
export function SectionHeader({ title, action, className = "" }: { title: ReactNode; action?: ReactNode; className?: string }) {
  return (
    <div className={`mb-3 flex items-baseline justify-between gap-4 ${className}`}>
      <h2 className="text-title-3 font-display text-foreground">{title}</h2>
      {action && <div className="shrink-0 text-label text-secondary">{action}</div>}
    </div>
  );
}

/** A grouped list surface; rows inside get inset dividers. */
export function ListGroup({ className = "", children }: { className?: string; children: ReactNode }) {
  return <div className={`overflow-hidden rounded-card bg-surface edge ${className}`}>{children}</div>;
}

/**
 * One row: leading (avatar/icon), title + subtitle, trailing. The divider
 * above it starts after the leading item (iOS-style) — pass `inset` in px
 * (default 16; 68 for a 40px avatar row) — and never shows on the first row.
 */
export function ListRow({
  leading,
  title,
  subtitle,
  trailing,
  href,
  onClick,
  inset = 16,
  className = "",
}: {
  leading?: ReactNode;
  title: ReactNode;
  subtitle?: ReactNode;
  trailing?: ReactNode;
  href?: string;
  onClick?: () => void;
  inset?: number;
  className?: string;
}) {
  const cls = `relative flex min-h-14 w-full items-center gap-3 px-4 py-3 text-left before:absolute before:right-0 before:top-0 before:h-px before:bg-line before:content-[''] first:before:hidden ${
    href || onClick ? "press-row" : ""
  } ${className}`;
  const style = { "--row-inset": `${inset}px` } as CSSProperties;
  const body = (
    <>
      {leading && <span className="shrink-0">{leading}</span>}
      <span className="min-w-0 flex-1">
        <span className="block truncate text-body text-foreground">{title}</span>
        {subtitle && <span className="mt-0.5 block truncate text-caption text-secondary">{subtitle}</span>}
      </span>
      {trailing && <span className="shrink-0 text-label text-secondary">{trailing}</span>}
    </>
  );
  const withInset = `${cls} before:left-[var(--row-inset)]`;
  if (href)
    return (
      <Link href={href} className={withInset} style={style}>
        {body}
      </Link>
    );
  if (onClick)
    return (
      <button type="button" onClick={onClick} className={withInset} style={style}>
        {body}
      </button>
    );
  return (
    <div className={withInset} style={style}>
      {body}
    </div>
  );
}

/**
 * Tiny status badge — the only place UPPERCASE is used. The live dot is
 * steady (a state, not an animation): anti-slop law, "the pulsing live dot".
 */
export function Badge({ tone = "neutral", children, className = "" }: { tone?: "neutral" | "live" | "yes" | "no" | "money"; children: ReactNode; className?: string }) {
  const color = { neutral: "text-secondary", live: "text-live", yes: "text-yes-ink", no: "text-no-ink", money: "text-money-ink" }[tone];
  return (
    <span className={`inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap text-micro uppercase ${color} ${className}`}>
      {tone === "live" && <span aria-hidden className="live-dot" />}
      {children}
    </span>
  );
}

export function LiveBadge({ detail }: { detail?: ReactNode }) {
  return (
    <Badge tone="live">
      Live{detail ? <span className="normal-case tabular-nums"> · {detail}</span> : null}
    </Badge>
  );
}

/** A placeholder block shaped like the content it stands in for. */
export function Skeleton({ className = "", style }: { className?: string; style?: CSSProperties }) {
  return <span aria-hidden className={`skeleton block rounded-control bg-overlay-2 ${className}`} style={style} />;
}

/** Nothing here yet — said once, with the one thing to do about it. */
export function EmptyState({ title, body, action, className = "" }: { title: ReactNode; body?: ReactNode; action?: ReactNode; className?: string }) {
  return (
    <div className={`flex flex-col items-center gap-2 px-6 py-12 text-center ${className}`}>
      <p className="text-title-3 font-display text-foreground">{title}</p>
      {body && <p className="max-w-xs text-body text-secondary">{body}</p>}
      {action && <div className="mt-3">{action}</div>}
    </div>
  );
}
