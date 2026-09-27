"use client";

import { useEffect, useState } from "react";
import { useSignOut } from "@/lib/use-sign-out";
import { createClient } from "@/lib/supabase/client";
import { useCurrentUser } from "./current-user-provider";
import { setShowHostEarnings } from "@/app/profile/actions";
import { BottomSheet } from "./bottom-sheet";
import { ThemeToggle } from "./theme-toggle";

function formatJoined(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
}

// A real, minimal settings surface. Surfaces the one setting that's
// actually real (theme, already wired up in Nav), a real fact (when this
// account was created), and sign out.
export function ProfileSettingsSheet({
  open,
  onClose,
  createdAt,
}: {
  open: boolean;
  onClose: () => void;
  createdAt: string;
}) {
  const { signOut, signingOut } = useSignOut();
  const me = useCurrentUser();
  // Host earnings on your profile — private by default.
  const [showEarnings, setShowEarnings] = useState<boolean | null>(null);
  useEffect(() => {
    if (!open || !me || showEarnings !== null) return;
    void createClient()
      .from("profiles")
      .select("show_host_earnings")
      .eq("id", me.id)
      .maybeSingle()
      .then(({ data }) => setShowEarnings(Boolean(data?.show_host_earnings)));
  }, [open, me, showEarnings]);

  async function toggleEarnings() {
    const next = !showEarnings;
    setShowEarnings(next);
    const r = await setShowHostEarnings(next);
    if (!r.ok) setShowEarnings(!next);
  }

  async function handleSignOut() {
    await signOut();
    onClose();
  }

  return (
    <BottomSheet open={open} onClose={onClose} title="Settings">
      <div className="flex flex-col gap-5">
        <div className="flex items-center justify-between">
          <p className="text-sm text-foreground">Light mode</p>
          <ThemeToggle />
        </div>
        <div className="flex items-center justify-between gap-4 border-t border-border pt-5">
          <div>
            <p className="text-sm text-foreground">Show host earnings on my profile</p>
            <p className="text-xs text-muted">Off: only you see what hosting rooms has earned you.</p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={Boolean(showEarnings)}
            aria-label="Show host earnings on my profile"
            disabled={showEarnings === null}
            onClick={() => void toggleEarnings()}
            className="relative h-7 w-12 shrink-0 rounded-full transition-colors duration-150 disabled:opacity-40"
            style={{ background: showEarnings ? "var(--rival-green)" : "var(--border-strong)" }}
          >
            <span
              className="absolute top-1 h-5 w-5 rounded-full bg-white transition-[left] duration-150 ease-out"
              style={{ left: showEarnings ? 24 : 4 }}
            />
          </button>
        </div>
        <div className="flex items-center justify-between border-t border-border pt-5">
          <p className="text-sm text-muted">Member since</p>
          <p className="text-sm text-foreground">{formatJoined(createdAt)}</p>
        </div>
        <button
          onClick={handleSignOut}
          disabled={signingOut}
          className="mt-1 w-full rounded-md border border-border py-2.5 text-sm font-medium text-danger-red transition-transform duration-150 ease-out active:scale-[0.97] disabled:opacity-40"
        >
          {signingOut ? "Signing out…" : "Sign out"}
        </button>
      </div>
    </BottomSheet>
  );
}
