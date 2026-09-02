"use client";

import { createContext, useContext } from "react";
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
  return <CurrentUserContext.Provider value={profile}>{children}</CurrentUserContext.Provider>;
}

export function useCurrentUser(): Profile | null {
  return useContext(CurrentUserContext);
}
