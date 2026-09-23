"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useCurrentUser } from "@/components/current-user-provider";
import { useWallet } from "./wallet-context";
import { openStakesCents } from "./stakeable";

/**
 * The client's view of what the signed-in user can stake: their embedded
 * wallet's devnet USDC (the same live read the top-bar chip uses) minus
 * stakes already open in unfinished rooms. The server re-checks this
 * authoritatively before writing any entry — this only lets the UI say
 * "not enough" before anyone taps.
 */
export function useStakeable(): { availableCents: number | null; hasLoaded: boolean; refresh: () => void } {
  const user = useCurrentUser();
  const wallet = useWallet();
  const [open, setOpen] = useState<{ userId: string; cents: number } | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    openStakesCents(createClient(), user.id).then((cents) => {
      if (!cancelled) setOpen({ userId: user.id, cents });
    });
    return () => {
      cancelled = true;
    };
  }, [user, tick]);

  const { refresh: refreshWallet } = wallet;
  const refresh = useCallback(() => {
    refreshWallet();
    setTick((t) => t + 1);
  }, [refreshWallet]);

  const openCents = user && open?.userId === user.id ? open.cents : null;
  const hasLoaded = Boolean(user && wallet.isReal && wallet.hasLoaded && openCents !== null);
  const availableCents = hasLoaded ? Math.max(0, Math.floor(wallet.usdcBalance * 100 + 1e-6) - (openCents ?? 0)) : null;
  return { availableCents, hasLoaded, refresh };
}
