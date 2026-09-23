"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { ChevronDownIcon } from "../icons";

// Small, flow-specific building blocks for the create-room picker. Every
// selectable thing shares one visual contract: a flat surface cell that
// fills with rival blue when chosen, presses down slightly on tap, and never
// lifts, glows or bounces — the change of state is the feedback.

export function OptionCell({
  selected,
  onClick,
  children,
  ariaLabel,
  className = "",
}: {
  selected: boolean;
  onClick: () => void;
  children: ReactNode;
  ariaLabel?: string;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      aria-label={ariaLabel}
      className={`hover-border flex min-h-12 items-center justify-center gap-1.5 rounded-md border px-3 text-sm font-medium transition-[transform,background-color,border-color,color] duration-150 ease-out active:scale-[0.97] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rival-blue ${className}`}
      style={{
        borderColor: selected ? "var(--rival-blue)" : "var(--border)",
        background: selected ? "var(--rival-blue-dim)" : "var(--surface)",
        color: selected ? "var(--rival-blue)" : "var(--foreground)",
        boxShadow: selected ? "inset 0 0 0 1px var(--rival-blue)" : "none",
      }}
    >
      {children}
    </button>
  );
}

const canHover = () => window.matchMedia("(hover: hover) and (pointer: fine)").matches;

/**
 * A small (i) that explains a market in one or two plain sentences. Hover
 * opens it on desktop; on touch there's no hover, so a tap toggles it and a
 * tap anywhere else (or Escape) closes it. Sits beside — never inside — the
 * accordion's toggle button, so asking "what's this?" never collapses the
 * section you're asking about.
 */
export function HelpTip({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  const [open, setOpenState] = useState(false);
  const [box, setBox] = useState({ left: 0, width: 256 });
  const ref = useRef<HTMLSpanElement>(null);

  // Positioned from the icon's real spot on screen, clamped to a 16px
  // gutter — icons sit at the right edge of accordion headers and mid-line
  // in body copy, so no single fixed anchor stays on-screen for both.
  const setOpen = (value: boolean) => {
    if (value && ref.current) {
      const r = ref.current.getBoundingClientRect();
      const vw = document.documentElement.clientWidth;
      const width = Math.min(256, vw - 32);
      const left = Math.min(Math.max(r.left + r.width / 2 - width / 2, 16), vw - 16 - width);
      setBox({ left: left - r.left, width });
    }
    setOpenState(value);
  };
  const tipId = useId();

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node))
        setOpenState(false);
    };
    const onKey = (e: KeyboardEvent) =>
      e.key === "Escape" && setOpenState(false);
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <span
      ref={ref}
      className="relative inline-flex"
      // Hover only where hover is real — touch browsers fire a synthetic
      // mouseenter on tap, which would fight the tap-to-toggle.
      onMouseEnter={() => canHover() && setOpen(true)}
      onMouseLeave={() => canHover() && setOpen(false)}
    >
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-label={`What is ${label}?`}
        aria-expanded={open}
        aria-describedby={open ? tipId : undefined}
        className="flex h-7 w-7 items-center justify-center rounded-full transition-colors duration-150"
        style={{ color: open ? "var(--rival-blue)" : "var(--muted)" }}
      >
        <svg viewBox="0 0 20 20" width="15" height="15" fill="none" aria-hidden>
          <circle
            cx="10"
            cy="10"
            r="7"
            stroke="currentColor"
            strokeWidth="1.4"
          />
          <path
            d="M10 9v4.5"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
          />
          <circle cx="10" cy="6.4" r="1" fill="currentColor" />
        </svg>
      </button>
      {open && (
        <span
          id={tipId}
          role="tooltip"
          style={{ left: box.left, width: box.width }}
          className="enter-pop absolute top-full z-20 mt-1.5 rounded-lg border border-border-strong bg-surface-elevated px-3 py-2.5 text-xs font-normal leading-relaxed text-foreground shadow-[0_8px_24px_-12px_rgba(0,0,0,0.6)]"
        >
          {children}
        </span>
      )}
    </span>
  );
}

export function Accordion({
  title,
  icon,
  help,
  summary,
  defaultOpen = true,
  children,
}: {
  title: string;
  icon?: ReactNode;
  /** One or two plain sentences on how this market settles. */
  help?: ReactNode;
  /** Shown beside the title while collapsed — e.g. the current pick in this group. */
  summary?: string | null;
  defaultOpen?: boolean;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const bodyId = useId();
  return (
    <section className="border-b border-border last:border-b-0">
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          aria-controls={bodyId}
          className="flex min-w-0 flex-1 items-center gap-2 py-3.5 text-left"
        >
          <span
            className="text-muted transition-transform duration-200 ease-out [&>svg]:h-4 [&>svg]:w-4"
            style={{ transform: open ? "rotate(0deg)" : "rotate(-90deg)" }}
          >
            <ChevronDownIcon />
          </span>
          {icon && (
            <span
              className="transition-colors duration-150"
              style={{ color: summary ? "var(--rival-blue)" : "var(--muted)" }}
            >
              {icon}
            </span>
          )}
          <span className="flex-1 text-sm font-semibold text-foreground">
            {title}
          </span>
          {!open && summary && (
            <span className="truncate text-xs font-medium text-rival-blue">
              {summary}
            </span>
          )}
        </button>
        {help && <HelpTip label={title}>{help}</HelpTip>}
      </div>
      <div
        id={bodyId}
        className="accordion-body"
        data-open={open}
        inert={!open}
      >
        <div>
          <div className="pb-4">{children}</div>
        </div>
      </div>
    </section>
  );
}

/**
 * Sportsbook-style ladder — Over in one column, Under in the other, one row
 * per line — minus the odds. Each cell names its own claim ("Over 2.5") so it
 * reads correctly on its own, without a header row to decode.
 */
export function OverUnderGrid({
  lines,
  isSelected,
  onPick,
  unit,
}: {
  lines: number[];
  isSelected: (comparison: "over" | "under", line: number) => boolean;
  onPick: (comparison: "over" | "under", line: number) => void;
  unit: string;
}) {
  return (
    <div className="grid grid-cols-2 gap-2">
      {lines.flatMap((line) =>
        (["over", "under"] as const).map((c) => (
          <OptionCell
            key={`${c}-${line}`}
            selected={isSelected(c, line)}
            onClick={() => onPick(c, line)}
            ariaLabel={`${c === "over" ? "Over" : "Under"} ${line} ${unit}`}
          >
            <span className="text-muted">
              {c === "over" ? "Over" : "Under"}
            </span>
            <span className="font-mono tabular-nums">{line}</span>
          </OptionCell>
        )),
      )}
    </div>
  );
}

function StepButton({
  label,
  onClick,
  disabled,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className="flex h-10 w-10 items-center justify-center rounded-full border border-border-strong text-lg text-foreground transition-[transform,opacity] duration-150 ease-out active:scale-90 disabled:opacity-30"
    >
      {children}
    </button>
  );
}

/** Two per-team − n + steppers with a dash between — the exact-score control. */
export function ScoreStepper({
  homeTeam,
  awayTeam,
  home,
  away,
  onChange,
}: {
  homeTeam: string;
  awayTeam: string;
  home: number;
  away: number;
  onChange: (home: number, away: number) => void;
}) {
  const clamp = (n: number) => Math.min(20, Math.max(0, n));
  const side = (team: string, value: number, set: (v: number) => void) => (
    <div className="flex min-w-0 flex-1 flex-col items-center gap-2.5">
      <span className="max-w-full truncate text-sm text-muted">{team}</span>
      <div className="flex items-center gap-1.5 sm:gap-2.5">
        <StepButton
          label={`Fewer ${team} goals`}
          onClick={() => set(clamp(value - 1))}
          disabled={value === 0}
        >
          −
        </StepButton>
        <span
          className="w-7 text-center font-display text-3xl font-bold tabular-nums text-foreground"
          aria-live="polite"
        >
          {value}
        </span>
        <StepButton
          label={`More ${team} goals`}
          onClick={() => set(clamp(value + 1))}
        >
          +
        </StepButton>
      </div>
    </div>
  );
  return (
    <div className="flex items-end gap-1 rounded-lg border border-border bg-surface px-2 py-5 sm:gap-3 sm:px-4">
      {side(homeTeam, home, (v) => onChange(v, away))}
      <span className="pb-3 text-muted" aria-hidden>
        —
      </span>
      {side(awayTeam, away, (v) => onChange(home, v))}
    </div>
  );
}

export function Segmented<T extends string>({
  value,
  options,
  onChange,
  label,
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
  label: string;
}) {
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className="grid grid-flow-col auto-cols-fr gap-1 rounded-lg border border-border bg-surface p-1"
    >
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(o.value)}
            className="min-h-10 rounded-md text-sm font-medium transition-[background-color,color] duration-150 ease-out"
            style={{
              background: active ? "var(--surface-elevated)" : "transparent",
              color: active ? "var(--foreground)" : "var(--muted)",
              boxShadow: active
                ? "inset 0 0 0 1px var(--border-strong)"
                : "none",
            }}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

export function Switch({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className="relative h-7 w-12 shrink-0 rounded-full transition-colors duration-200 ease-out"
      style={{
        background: checked ? "var(--rival-blue)" : "var(--border-strong)",
      }}
    >
      <span
        className="absolute left-0.5 top-0.5 h-6 w-6 rounded-full bg-white transition-transform duration-200 ease-out"
        style={{ transform: checked ? "translateX(20px)" : "translateX(0)" }}
      />
    </button>
  );
}
