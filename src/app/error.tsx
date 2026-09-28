"use client";

import Link from "next/link";

// Any page that throws lands here instead of a blank white screen. The nav
// stays (this renders inside the root layout), so the way out is obvious.
export default function PageError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center px-4 py-16 text-center">
      <p className="font-display text-2xl font-bold text-foreground">That didn&rsquo;t load</p>
      <p className="mt-2 text-body text-secondary">
        Something went wrong on our side. Your money and rooms are safe — try again in a moment.
      </p>
      <div className="mt-6 flex gap-2">
        <button
          type="button"
          onClick={reset}
          className="inline-flex min-h-11 items-center rounded-control bg-yes px-5 text-body font-semibold text-white transition-transform duration-150 ease-out active:scale-[0.97]"
        >
          Try again
        </button>
        <Link
          href="/"
          className="inline-flex min-h-11 items-center rounded-control border border-line-strong px-5 text-body font-medium text-foreground transition-transform duration-150 ease-out active:scale-[0.97]"
        >
          Home
        </Link>
      </div>
    </main>
  );
}
