"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useDynamicContext } from "@dynamic-labs/sdk-react-core";
import { createClient } from "@/lib/supabase/client";
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
  const router = useRouter();
  const { handleLogOut } = useDynamicContext();
  const [signingOut, setSigningOut] = useState(false);

  // Order matters: DynamicAuthWatcher (dynamic-provider.tsx) auto-recovers
  // whenever it sees Dynamic thinks you're logged in but Rivaly has no
  // session — the exact shape a naive sign-out leaves behind for a moment.
  // Signing out of Dynamic first means its isLoggedIn flips to false
  // before currentUser has any chance to go null (that only happens once
  // router.refresh() re-runs the server-side profile fetch), so that
  // watcher's condition is never true during the transition.
  async function handleSignOut() {
    setSigningOut(true);
    await handleLogOut();
    await createClient().auth.signOut();
    onClose();
    router.push("/");
    router.refresh();
  }

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
