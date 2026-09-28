"use client";

import { useEffect, useState, type ComponentType } from "react";
import { markDynamicFailed, requestDynamic, useDynamicState } from "@/lib/wallet/dynamic-bridge";
import { useAuthModalState } from "@/lib/auth-modal-store";
import { signOutPending } from "@/lib/sign-out-state";

// Sign-in and wallets (Dynamic) without holding up the app. This wrapper
// imports none of Dynamic's SDK: the page renders and works first, then the
// SDK (components/dynamic-runtime.tsx, ~740KB) loads in the background for
// everyone once the page is idle. Reaching for it sooner — opening sign-in,
// staking, withdrawing, signing out — asks for it straight away; until it's
// there, those show "getting ready" and carry on by themselves.
export function DynamicProvider({ children }: { children: React.ReactNode }) {
  const { load } = useDynamicState();
  const { openId } = useAuthModalState();
  const [Runtime, setRuntime] = useState<ComponentType | null>(null);

  // Everyone, in the background, once the page has settled.
  useEffect(() => {
    // A sign-out that didn't finish last time has to complete: load now.
    if (signOutPending()) {
      requestDynamic();
      return;
    }
    const w = window as Window & { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number; cancelIdleCallback?: (id: number) => void };
    if (w.requestIdleCallback) {
      const id = w.requestIdleCallback(() => requestDynamic(), { timeout: 2500 });
      return () => w.cancelIdleCallback?.(id);
    }
    const t = window.setTimeout(() => requestDynamic(), 1200);
    return () => window.clearTimeout(t);
  }, []);

  // Someone tapped Sign in / Sign up before it arrived: load now.
  useEffect(() => {
    if (openId > 0) requestDynamic();
  }, [openId]);

  // Fetch the runtime once it's been asked for; a failure can be retried.
  useEffect(() => {
    if (load !== "loading" || Runtime) return;
    let cancelled = false;
    import("./dynamic-runtime")
      .then((m) => {
        if (!cancelled) setRuntime(() => m.DynamicRuntime);
      })
      .catch(() => {
        if (!cancelled) markDynamicFailed();
      });
    return () => {
      cancelled = true;
    };
  }, [load, Runtime]);

  // Only while the kit itself is still downloading (or failed): once its code
  // is here, Dynamic shows its own sign-in window straight away.
  const opening = openId > 0 && load !== "ready" && (!Runtime || load === "failed");

  return (
    <>
      {children}
      {Runtime && <Runtime />}
      {/* Tapped Sign in before the sign-in kit arrived: say so instead of looking dead. */}
      {opening && (
        <div
          role="status"
          className="fixed inset-x-0 bottom-[calc(5.5rem+env(safe-area-inset-bottom))] z-50 mx-auto flex w-fit items-center gap-2 rounded-full bg-surface-elevated px-4 py-2 text-label text-foreground shadow-pop md:bottom-8"
        >
          {load === "failed" ? (
            <button type="button" onClick={() => requestDynamic()} className="font-semibold">
              Sign-in didn&rsquo;t load — tap to retry
            </button>
          ) : (
            <>
              <span aria-hidden className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
              Opening sign-in…
            </>
          )}
        </div>
      )}
    </>
  );
}
