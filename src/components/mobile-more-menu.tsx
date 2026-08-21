"use client";

import { MoreIcon, SunIcon, MoonIcon } from "./icons";
import { ThemeToggle, useIsLightTheme } from "./theme-toggle";
import { BottomSheet } from "./bottom-sheet";
import { useMoreMenuOpen, openMoreMenu, closeMoreMenu } from "@/lib/more-menu-store";

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
// Docs/Terms/Support and the company's own social links are intentionally
// not in here yet — shipping dead links would be worse than waiting for
// real destinations.
export function MobileMoreMenuSheet() {
  const open = useMoreMenuOpen();
  const isLight = useIsLightTheme();

  return (
    <BottomSheet open={open} onClose={closeMoreMenu} title="More">
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
    </BottomSheet>
  );
}
