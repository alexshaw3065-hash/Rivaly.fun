"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { openAuthModal } from "@/lib/auth-modal-store";

// Login is Dynamic's own global modal now (see AuthFlowTrigger in
// dynamic-provider.tsx), not a page — but every existing "sign in to
// continue" redirect in the app still does router.push(`/login?next=...`)
// (chat-composer, arena-feed, join-panel, follow-button, rooms/create), and
// /auth/callback/route.ts still does a real server redirect to
// `/login?error=...` on a bad magic link. Rather than touch every one of
// those call sites, this route keeps working exactly as a URL, its only
// job now is: open the modal with whatever next/error it was given, then
// get out of the way by sending the browser on to `next` immediately — the
// modal trigger (mounted at the layout root) reacts across that navigation
// since its state lives outside this page.
export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const next = searchParams.get("next") ?? "/";
    const error = searchParams.get("error");
    openAuthModal({ next, error });
    router.replace(next);
    // Intentionally run once — searchParams/router identity churn on every
    // render and would otherwise re-open the modal mid-flow.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}
