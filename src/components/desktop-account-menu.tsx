"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Avatar } from "./avatar";
import { useSignOut } from "@/lib/use-sign-out";

// Desktop had no account menu at all before this — signed-in, the avatar
// was a bare Link straight to the profile page, with no way to reach sign
// out short of finding the small settings gear on your own profile
// banner. Same anchored-dropdown pattern as mobile-more-menu.tsx.
export function DesktopAccountMenu({
  username,
  name,
  avatarUrl,
}: {
  username: string;
  name: string;
  avatarUrl?: string | null;
}) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
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
    <div ref={containerRef} className="relative shrink-0">
      <button onClick={() => setOpen((v) => !v)} aria-label="Account menu" aria-expanded={open}>
        <Avatar name={name} size={32} imageUrl={avatarUrl} />
      </button>

      {open && (
        <div
          className="dropdown-panel absolute right-0 top-full z-30 mt-2 w-52 overflow-hidden rounded-card bg-surface shadow-pop"
        >
          <Link
            href={`/profile/${username}`}
            onClick={() => setOpen(false)}
            className="block px-4 py-3 text-sm text-foreground transition-colors hover:bg-overlay-1"
          >
            Profile
          </Link>
          <button
            onClick={() => {
              setOpen(false);
              signOut();
            }}
            disabled={signingOut}
            className="w-full border-t border-line px-4 py-3 text-left text-sm font-medium text-no-ink transition-colors hover:bg-overlay-1 disabled:opacity-40"
          >
            {signingOut ? "Signing out…" : "Sign out"}
          </button>
        </div>
      )}
    </div>
  );
}
