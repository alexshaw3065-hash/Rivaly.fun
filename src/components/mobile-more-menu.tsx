"use client";

import Link from "next/link";
import { MoreIcon, SunIcon, MoonIcon, XIcon, TiktokIcon, LinkedInIcon } from "./icons";
import { ThemeToggle, useIsLightTheme } from "./theme-toggle";
import { BottomSheet } from "./bottom-sheet";
import { useMoreMenuOpen, openMoreMenu, closeMoreMenu } from "@/lib/more-menu-store";

const menuLinks = [
  { href: "/docs", label: "Documentation" },
  { href: "/terms", label: "Terms of Use" },
  { href: "/support", label: "Support" },
];

// Not yet linked — Rivaly's real accounts aren't set up yet. Shown dimmed
// and inert (not a <button>/<a> to nowhere) rather than a dead "#" link,
// same "locked, not hidden" convention the achievements badges already
// use for not-yet-true state.
const socialIcons = [
  { label: "X", Icon: XIcon },
  { label: "TikTok", Icon: TiktokIcon },
  { label: "LinkedIn", Icon: LinkedInIcon },
];

// Trigger button only — lives inside the sticky mobile top bar. See
// MobileMoreMenuSheet for why the sheet itself is mounted elsewhere.
export function MobileMoreMenuButton() {
  return (
    <button
      onClick={openMoreMenu}
      aria-label="More options"
      className="flex h-8 w-8 shrink-0 items-center justify-center text-muted transition-colors hover:text-foreground"
    >
      <MoreIcon />
    </button>
  );
}

// Mounted once at the Nav root (alongside MobileSearchOverlay), NOT inside
// the top bar — the top bar's backdrop-blur creates a CSS containing
// block that breaks `position: fixed` for any sheet nested inside it.
// Replaces the old always-visible theme switch + avatar (Profile now
// lives in the bottom tab bar, so the avatar was redundant here).
export function MobileMoreMenuSheet() {
  const open = useMoreMenuOpen();
  const isLight = useIsLightTheme();

  return (
    <BottomSheet open={open} onClose={closeMoreMenu} title="More">
      <div className="flex flex-col gap-5">
        <div className="flex items-center justify-between rounded-lg border border-border bg-surface px-4 py-3.5">
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

        <div className="flex flex-col divide-y divide-border overflow-hidden rounded-lg border border-border bg-surface">
          {menuLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={closeMoreMenu}
              className="flex items-center justify-between px-4 py-3 text-sm text-foreground transition-colors hover:bg-surface-elevated"
            >
              {link.label}
              <span className="text-muted">→</span>
            </Link>
          ))}
        </div>

        <div className="flex items-center justify-center gap-6">
          {socialIcons.map(({ label, Icon }) => (
            <span key={label} title={`${label} — coming soon`} className="text-muted opacity-40">
              <Icon />
            </span>
          ))}
        </div>
      </div>
    </BottomSheet>
  );
}
