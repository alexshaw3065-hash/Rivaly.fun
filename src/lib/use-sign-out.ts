"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useDynamicContext } from "@dynamic-labs/sdk-react-core";
import { createClient } from "@/lib/supabase/client";

// Order matters: DynamicAuthWatcher (dynamic-provider.tsx) auto-recovers
// whenever it sees Dynamic thinks you're logged in but Rivaly has no
// session — the exact shape a naive sign-out leaves behind for a moment.
// Signing out of Dynamic first means its isLoggedIn flips to false before
// currentUser has any chance to go null (that only happens once
// router.refresh() re-runs the server-side profile fetch), so that
// watcher's condition is never true during the transition. Shared here
// rather than duplicated per call site — this sequencing is easy to get
// subtly wrong a second time.
export function useSignOut() {
  const router = useRouter();
  const { handleLogOut } = useDynamicContext();
  const [signingOut, setSigningOut] = useState(false);

  async function signOut() {
    setSigningOut(true);
    await handleLogOut();
    await createClient().auth.signOut();
    router.push("/");
    router.refresh();
  }

  return { signOut, signingOut };
}
