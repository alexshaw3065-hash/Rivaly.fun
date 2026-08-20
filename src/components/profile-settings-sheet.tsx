"use client";

import { BottomSheet } from "./bottom-sheet";
import { ThemeToggle } from "./theme-toggle";

function formatJoined(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
}

// A real, minimal settings surface — no auth exists yet so there's no
// account/sign-out section to build honestly. Surfaces the one setting
// that's actually real (theme, already wired up in Nav) plus a real fact
// (when this account was created) rather than filler menu rows.
export function ProfileSettingsSheet({
  open,
  onClose,
  createdAt,
}: {
  open: boolean;
  onClose: () => void;
  createdAt: string;
}) {
  return (
    <BottomSheet open={open} onClose={onClose} title="Settings">
      <div className="flex flex-col gap-5">
        <div className="flex items-center justify-between">
          <p className="text-sm text-foreground">Light mode</p>
          <ThemeToggle />
        </div>
        <div className="flex items-center justify-between border-t border-border pt-5">
          <p className="text-sm text-muted">Member since</p>
          <p className="text-sm text-foreground">{formatJoined(createdAt)}</p>
        </div>
      </div>
    </BottomSheet>
  );
}
