"use client";

import { useEffect } from "react";
import Link from "next/link";
import { track } from "@/lib/analytics/track";

// A page that fails to load its own code after a new version went live (the
// app was open during a deploy, so it asks for files that no longer exist).
const STALE_BUILD = /ChunkLoadError|Loading (CSS )?chunk|Failed to load chunk|dynamically imported module|Importing a module script failed|error loading dynamically/i;
const RELOADED_AT = "rvl-stale-reload";

// Any page that throws lands here instead of a blank white screen. The nav
// stays (this renders inside the root layout), so the way out is obvious.
export default function PageError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const stale = STALE_BUILD.test(`${error.name} ${error.message}`);

  useEffect(() => {
    // What broke, for Admin → Analytics (no personal data: the error's type and the page).
    track("page_error", { kind: stale ? "stale_build" : error.name || "Error", digest: error.digest ?? "" });
    if (!stale) return;
    // Old version in the tab: load the new one once. The timestamp stops a
    // loop if the reload somehow lands on the same failure.
    try {
      const last = Number(sessionStorage.getItem(RELOADED_AT) ?? 0);
      if (Date.now() - last < 60_000) return;
      sessionStorage.setItem(RELOADED_AT, String(Date.now()));
    } catch {
      return;
    }
    window.location.reload();
  }, [error, stale]);

  return (
    <main className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center px-4 py-16 text-center">
      <p className="text-title-2 font-display text-foreground">{stale ? "Rivaly just updated" : "That didn’t load"}</p>
      <p className="mt-2 text-body text-secondary">
        {stale ? "Loading the new version…" : "Something went wrong on our side. Your money and rooms are safe — try again in a moment."}
      </p>
      <div className="mt-6 flex gap-2">
        <button
          type="button"
          onClick={() => (stale ? window.location.reload() : reset())}
          className="inline-flex h-11 items-center rounded-control bg-yes px-5 text-body font-semibold text-white transition-transform duration-100 ease-out active:scale-[0.97]"
        >
          Try again
        </button>
        <Link
          href="/"
          className="inline-flex h-11 items-center rounded-control px-5 text-body font-medium text-foreground edge-strong transition-transform duration-100 ease-out active:scale-[0.97]"
        >
          Home
        </Link>
      </div>
    </main>
  );
}
