"use client";

import { useLayoutEffect, useRef, useState, type ComponentProps, type ReactNode } from "react";

// Small controls: IconButton, Chip, SidePill, Tabs, Segmented.

/** A round icon button: 36/40 visual, always a 44px hit area. */
export function IconButton({
  label,
  size = 40,
  variant = "ghost",
  className = "",
  children,
  ...rest
}: Omit<ComponentProps<"button">, "aria-label"> & { label: string; size?: 36 | 40; variant?: "ghost" | "surface" }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      {...rest}
      className={`relative inline-flex shrink-0 items-center justify-center rounded-full transition-[transform,background-color,color] duration-100 ease-out before:absolute before:-inset-1 before:content-[''] active:scale-[0.94] disabled:opacity-40 ${
        size === 36 ? "h-9 w-9" : "h-10 w-10"
      } ${variant === "surface" ? "bg-surface-elevated text-foreground edge hover:bg-surface-3" : "text-secondary hover:bg-overlay-1 hover:text-foreground active:bg-overlay-2"} ${className}`}
    >
      {children}
    </button>
  );
}

/**
 * Filter / select chip: 32px, fully rounded; selected = solid foreground.
 * tone="live" keeps a red tint while unselected (the chip with something on
 * right now).
 */
export function Chip({
  selected = false,
  leading,
  tone = "default",
  className = "",
  children,
  ...rest
}: ComponentProps<"button"> & { selected?: boolean; leading?: ReactNode; tone?: "default" | "live" }) {
  const idle = tone === "live" ? "bg-no-tint text-no-ink" : "text-secondary edge-strong hover:bg-overlay-1 hover:text-foreground";
  return (
    <button
      type="button"
      aria-pressed={selected}
      {...rest}
      className={`inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full px-3 text-label transition-[transform,background-color,color] duration-100 ease-out active:scale-[0.97] ${
        selected ? "bg-foreground text-background" : idle
      } ${className}`}
    >
      {leading}
      {children}
    </button>
  );
}

/**
 * The YES / NO choice. Unchosen: a soft tint of the side. Chosen: a stronger
 * tint and a ring in the side's colour. (The committed action — "Throw down
 * $10 on YES" — is a solid Button variant="yes"/"no", not this.)
 */
export function SidePill({
  side,
  selected = false,
  label,
  meta,
  size = "lg",
  className = "",
  ...rest
}: Omit<ComponentProps<"button">, "children"> & { side: "yes" | "no"; selected?: boolean; label?: ReactNode; meta?: ReactNode; size?: "sm" | "md" | "lg" }) {
  const yes = side === "yes";
  const sizing = { sm: "h-8 rounded-tag px-3 text-label", md: "h-10 rounded-tag px-3 text-body", lg: "h-12 rounded-control px-4 text-body-lg" }[size];
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      {...rest}
      className={`inline-flex items-center justify-center gap-2 font-display font-bold transition-[transform,background-color,outline-color] duration-100 ease-out active:scale-[0.97] ${sizing} ${yes ? "text-yes-ink" : "text-no-ink"} ${selected ? (yes ? "bg-yes-tint-strong" : "bg-no-tint-strong") : yes ? "bg-yes-tint" : "bg-no-tint"} outline outline-[1.5px] -outline-offset-[1.5px] ${selected ? (yes ? "outline-yes" : "outline-no") : "outline-transparent"} ${className}`}
    >
      {label ?? (yes ? "YES" : "NO")}
      {meta != null && <span className="font-sans text-label tabular-nums opacity-80">{meta}</span>}
    </button>
  );
}

/** Underline tabs: a 1px track and a 2px indicator that slides to the active tab. */
export function Tabs<T extends string>({
  tabs,
  value,
  onChange,
  track = true,
  className = "",
}: {
  tabs: { id: T; label: ReactNode; count?: number }[];
  value: T;
  onChange: (id: T) => void;
  /** false when the parent draws the 1px track (e.g. an icon sits beside the tabs on the same line). */
  track?: boolean;
  className?: string;
}) {
  const refs = useRef(new Map<T, HTMLButtonElement>());
  const [bar, setBar] = useState<{ x: number; w: number } | null>(null);
  useLayoutEffect(() => {
    const el = refs.current.get(value);
    if (el) setBar({ x: el.offsetLeft, w: el.offsetWidth });
  }, [value, tabs.length]);
  return (
    <div role="tablist" className={`no-scrollbar relative flex gap-6 overflow-x-auto ${track ? "border-b border-line" : ""} ${className}`}>
      {tabs.map((t) => (
        <button
          key={t.id}
          ref={(el) => {
            if (el) refs.current.set(t.id, el);
          }}
          role="tab"
          type="button"
          aria-selected={value === t.id}
          onClick={() => onChange(t.id)}
          className={`relative shrink-0 pb-3 pt-1 text-body transition-colors duration-150 ${value === t.id ? "font-semibold text-foreground" : "text-secondary hover:text-foreground"}`}
        >
          {t.label}
          {t.count != null && <span className="ml-1.5 text-caption tabular-nums text-tertiary">{t.count}</span>}
        </button>
      ))}
      {bar && (
        <span
          aria-hidden
          className="pointer-events-none absolute bottom-0 left-0 h-0.5 w-px origin-left rounded-full bg-foreground transition-transform duration-200 ease-out"
          style={{ transform: `translateX(${bar.x}px) scaleX(${bar.w})` }}
        />
      )}
    </div>
  );
}

/** Segmented control: two to four equal options in one surface. */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
  className = "",
}: {
  options: { id: T; label: ReactNode }[];
  value: T;
  onChange: (id: T) => void;
  className?: string;
}) {
  return (
    <div role="radiogroup" className={`inline-flex rounded-control bg-surface p-1 edge ${className}`}>
      {options.map((o) => (
        <button
          key={o.id}
          type="button"
          role="radio"
          aria-checked={value === o.id}
          onClick={() => onChange(o.id)}
          className={`h-8 flex-1 rounded-tag px-3 text-label transition-[background-color,color] duration-150 ease-out ${value === o.id ? "bg-surface-3 text-foreground" : "text-secondary hover:text-foreground"}`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
