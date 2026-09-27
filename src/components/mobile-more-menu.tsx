"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { MoreIcon, SunIcon, MoonIcon, XIcon, TiktokIcon, LinkedInIcon } from "./icons";
import { ThemeToggle, useIsLightTheme } from "./theme-toggle";
import { useCurrentUser } from "./current-user-provider";
import { useSignOut } from "@/lib/use-sign-out";
import { SOCIALS } from "@/lib/socials";

const menuLinks = [
  { href: "/docs", label: "Documentation" },
  { href: "/terms", label: "Terms of Use" },
  { href: "/support", label: "Support" },
];

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
        className="flex shrink-0 items-center text-muted transition-colors hover:text-foreground"
      >
        <MoreIcon />
      </button>

      {open && (
        <div
          className="dropdown-panel absolute right-0 top-full z-30 mt-2 w-64 overflow-hidden rounded-xl border border-border bg-surface shadow-xl"
          style={{ boxShadow: "0 12px 32px -8px rgba(0,0,0,0.45)" }}
        >
          <div className="p-3">
            <div className="flex items-center justify-between rounded-lg border border-border bg-surface-elevated px-3 py-2.5">
              <div className="flex items-center gap-2.5 text-sm text-foreground">
                <span style={{ color: isLight ? "var(--foreground)" : "var(--muted)", transition: "color 150ms ease" }}>
                  <SunIcon />
                </span>
                Theme
                <span style={{ color: isLight ? "var(--muted)" : "var(--foreground)", transition: "color 150ms ease" }}>
                  <MoonIcon />
                </span>
              </div>
              <ThemeToggle />
            </div>
          </div>

          <div className="flex flex-col divide-y divide-border border-t border-border">
            {menuLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                className="flex items-center justify-between px-4 py-3 text-sm text-foreground transition-colors hover:bg-surface-elevated"
              >
                {link.label}
                <span className="text-muted">→</span>
              </Link>
            ))}
          </div>

          {currentUser && (
            <div className="border-t border-border p-3">
              <button
                onClick={() => {
                  setOpen(false);
                  signOut();
                }}
                disabled={signingOut}
                className="w-full rounded-lg px-3 py-2.5 text-left text-sm font-medium text-danger-red transition-colors hover:bg-surface-elevated disabled:opacity-40"
              >
                {signingOut ? "Signing out…" : "Sign out"}
              </button>
            </div>
          )}

          <div className="flex items-center justify-center gap-3 border-t border-border py-2.5">
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
                  className="flex h-11 w-11 items-center justify-center rounded-lg text-muted transition-colors duration-150 hover:bg-surface-elevated hover:text-foreground active:opacity-70 [&>svg]:h-[22px] [&>svg]:w-[22px]"
                >
                  <Icon />
                </a>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
