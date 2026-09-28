"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { dynamic, requestDynamic } from "@/lib/wallet/dynamic-bridge";
import { createClient } from "@/lib/supabase/client";
import { useCurrentUser } from "@/components/current-user-provider";
import { beginSignOut, finishDynamicLogout } from "@/lib/sign-out-state";

// Instant sign-out: nothing the user waits on touches the network.
//
//   1. Flag the sign-out (sign-out-state.ts) BEFORE anything else, so
//      DynamicAuthWatcher (dynamic-provider.tsx) — which re-bridges whenever
//      Dynamic says logged-in but Rivaly has no user — finishes the logout
//      instead of signing the person straight back in.
//   2. Drop the Supabase session locally: deletes the auth cookies on this
//      device, no server round-trip. The server never sees a session again.
//   3. Show signed-out and go home — one navigation plus a refresh so the
//      server-rendered layout catches up.
//   4. In the background: revoke the session server-side (with the token
//      read in step 2), and log out of Dynamic. If either fails, this device
//      is still signed out; an unfinished Dynamic logout is retried on the
//      next page load because the flag stays set.
export function useSignOut() {
  const router = useRouter();
  const currentUser = useCurrentUser();
  const [signingOut, setSigningOut] = useState(false);

  async function signOut() {
    if (signingOut) return;
    setSigningOut(true);
    beginSignOut(currentUser?.id ?? null);
    // The wallet logout below needs the sign-in kit; start it now if it hasn't arrived.
    requestDynamic();

    const supabase = createClient();
    const { data } = await supabase.auth.getSession(); // local read
    const accessToken = data.session?.access_token ?? null;
    await supabase.auth.signOut({ scope: "local" });

    router.replace("/");
    router.refresh();
    setSigningOut(false);

    if (accessToken) revokeThisSession(accessToken);
    // Waits for the kit if it's still loading; the flag keeps the sign-out
    // safe (and retried on the next load) until the wallet logout confirms.
    void finishDynamicLogout(dynamic.logOut);
  }

  return { signOut, signingOut };
}

/** Server-side revoke of this device's session (other devices stay signed in) — fire-and-forget. */
function revokeThisSession(accessToken: string) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return;
  void fetch(`${url}/auth/v1/logout?scope=local`, {
    method: "POST",
    headers: { apikey: key, Authorization: `Bearer ${accessToken}` },
    keepalive: true,
  }).catch(() => undefined);
}
