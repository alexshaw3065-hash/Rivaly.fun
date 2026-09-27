"use client";

import { createContext, useContext, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { setReferrer } from "@/lib/referral";
import type { Profile } from "@/lib/types";

// Populated once, server-side, in src/app/layout.tsx (getCurrentProfile())
// and handed down here so client components never each do their own
// fetch/round-trip just to know who's signed in. null means signed out —
// every consumer must handle that, not assume a user exists.
const CurrentUserContext = createContext<Profile | null>(null);

export function CurrentUserProvider({
  profile,
  children,
}: {
  profile: Profile | null;
  children: React.ReactNode;
}) {
  // Counts today as an active day for this person, once a day (DAU/WAU/MAU
  // and retention in /admin → Analytics). Best-effort; storage may be off.
  const userId = profile?.id ?? null;
  const username = profile?.username ?? null;
  useEffect(() => setReferrer(username), [username]);
  useEffect(() => {
    if (!userId) return;
    const today = new Date().toISOString().slice(0, 10);
    const key = `rivaly-active:${userId}`;
    try {
      if (localStorage.getItem(key) === today) return;
      localStorage.setItem(key, today);
    } catch {}
    void createClient().rpc("touch_active").then(() => undefined, () => undefined);
  }, [userId]);

  return <CurrentUserContext.Provider value={profile}>{children}</CurrentUserContext.Provider>;
}

export function useCurrentUser(): Profile | null {
  return useContext(CurrentUserContext);
}
