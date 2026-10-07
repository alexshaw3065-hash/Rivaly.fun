"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { MoreIcon, SunIcon, MoonIcon, XIcon, TiktokIcon, LinkedInIcon } from "./icons";
import { ThemeToggle, useIsLightTheme } from "./theme-toggle";
import { useCurrentUser } from "./current-user-provider";
import { useSignOut } from "@/lib/use-sign-out";
import { SOCIALS } from "@/lib/socials";
import { openHowItWorks } from "@/lib/how-it-works-store";
import { COMPANY_GROUPS } from "@/lib/company";

// Learn and Help as rows; the legal pages as quiet links in the footer, the
// way most apps file them — one tap away, never in the way.
const ROW_GROUPS = COMPANY_GROUPS.filter((g) => g.title !== "Legal");
const LEGAL = COMPANY_GROUPS.find((g) => g.title === "Legal")?.links ?? [];

function Chevron() {
  return (
    <svg width="7" height="12" viewBox="0 0 7 12" aria-hidden className="shrink-0 text-tertiary">
      <path d="M1 1l5 5-5 5" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

const ROW = "flex min-h-11 w-full items-center justify-between px-4 py-2 text-left text-body text-foreground transition-colors duration-100 hover:bg-overlay-1 active:bg-overlay-2";

// Rivaly's official accounts (src/lib/socials.ts).
const SOCIAL_ICONS = { x: XIcon, tiktok: TiktokIcon, linkedin: LinkedInIcon } as const;

// A real anchored dropdown — positioned off its trigger corner, not a
// full-width bottom sheet. `absolute` (not `fixed`) inside a `relative`
// wrapper stays correctly positioned even though the top bar it lives in
// has backdrop-blur (which would break `position: fixed` — see the sheet-
// based version this replaced).
export function MobileMoreMenu() {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const isLight = useIsLightTheme();
  const currentUser = useCurrentUser();
  const { signOut, signingOut } = useSignOut();

  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: PointerEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={containerRef} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label="More options"
        aria-expanded={open}
        className="flex shrink-0 items-center text-secondary transition-colors hover:text-foreground"
      >
        <MoreIcon />
      </button>

      {open && (
        <div
          className="dropdown-panel absolute right-0 top-full z-30 mt-2 max-h-[calc(100dvh-88px)] w-64 overflow-y-auto overscroll-contain rounded-card bg-surface shadow-pop"
        >
          <div className="p-3">
            <div className="flex items-center justify-between rounded-control border border-line bg-surface-elevated px-3 py-3">
              <div className="flex items-center gap-2 text-body text-foreground">
                <span style={{ color: isLight ? "var(--foreground)" : "var(--text-secondary)", transition: "color 150ms ease" }}>
                  <SunIcon />
                </span>
                Theme
                <span style={{ color: isLight ? "var(--text-secondary)" : "var(--foreground)", transition: "color 150ms ease" }}>
                  <MoonIcon />
                </span>
              </div>
              <ThemeToggle />
            </div>
          </div>

          {ROW_GROUPS.map((group, gi) => (
            <nav key={group.title} aria-label={group.title} className="border-t border-line pb-1.5 pt-3">
              <p className="px-4 pb-1 text-caption font-medium text-tertiary">{group.title}</p>
              {gi === 0 && (
                <button
                  type="button"
                  onClick={() => {
                    setOpen(false);
                    openHowItWorks("menu");
                  }}
                  className={ROW}
                >
                  Rivaly in 30 seconds
                  <Chevron />
                </button>
              )}
              {group.links.map((link) => (
                <Link key={link.href} href={link.href} onClick={() => setOpen(false)} className={ROW}>
                  {link.label}
                  <Chevron />
                </Link>
              ))}
            </nav>
          ))}

          {currentUser && (
            <div className="border-t border-line p-3">
              <button
                onClick={() => {
                  setOpen(false);
                  signOut();
                }}
                disabled={signingOut}
                className="w-full rounded-control px-3 py-3 text-left text-body font-medium text-no-ink transition-colors hover:bg-overlay-1 disabled:opacity-40"
              >
                {signingOut ? "Signing out…" : "Sign out"}
              </button>
            </div>
          )}

          <div className="flex items-center justify-center gap-3 border-t border-line pt-2">
            {SOCIALS.map(({ key, label, href }) => {
              const Icon = SOCIAL_ICONS[key];
              return (
                <a
                  key={key}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`Rivaly on ${label}`}
                  onClick={() => setOpen(false)}
                  className="flex h-11 w-11 items-center justify-center rounded-control text-secondary transition-colors duration-150 hover:bg-overlay-1 hover:text-foreground active:opacity-70 [&>svg]:h-[22px] [&>svg]:w-[22px]"
                >
                  <Icon />
                </a>
              );
            })}
          </div>
          <p className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 px-4 pb-3 pt-1 text-caption text-tertiary">
            {LEGAL.map((l) => (
              <Link key={l.href} href={l.href} onClick={() => setOpen(false)} className="transition-colors duration-100 hover:text-secondary">
                {l.label}
              </Link>
            ))}
            <span>© {new Date().getFullYear()} Rivaly</span>
          </p>
        </div>
      )}
    </div>
  );
}
