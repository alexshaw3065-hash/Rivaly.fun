"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useCurrentUser } from "./current-user-provider";

// A new account still on its generated name can't wander off the
// claim-your-username page: tapping Home, Rooms or anything else sends it
// straight back until a real name is picked. Sign-in, the legal and help
// pages, and ops stay reachable.
const OPEN_PATHS = ["/auth", "/login", "/signup", "/terms", "/privacy", "/responsible-play", "/support", "/admin"];

// Set the moment the claim saves, so the stale server profile (still
// "placeholder" until the refresh lands) doesn't bounce the person back.
let claimed = false;
export function markUsernameClaimed() {
  claimed = true;
}

export function UsernameGate() {
  const me = useCurrentUser();
  const pathname = usePathname();
  const router = useRouter();
  const mustClaim = me?.usernameIsPlaceholder === true;

  useEffect(() => {
    if (!mustClaim || claimed) return;
    if (OPEN_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`))) return;
    router.replace(`/auth/complete-profile?next=${encodeURIComponent(pathname)}`);
  }, [mustClaim, pathname, router]);

  return null;
}
