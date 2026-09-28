import Link from "next/link";

// A dead link (an old room, a mistyped profile) gets a page that points
// somewhere useful instead of the framework's bare 404.
export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center px-4 py-16 text-center">
      <p className="font-display text-2xl font-bold text-foreground">Nothing here</p>
      <p className="mt-2 text-body text-secondary">This page doesn&rsquo;t exist, or the room was removed.</p>
      <div className="mt-6 flex gap-2">
        <Link
          href="/"
          className="inline-flex min-h-11 items-center rounded-control bg-yes px-5 text-body font-semibold text-white transition-transform duration-150 ease-out active:scale-[0.97]"
        >
          Back to matches
        </Link>
        <Link
          href="/rooms/create"
          className="inline-flex min-h-11 items-center rounded-control border border-line-strong px-5 text-body font-medium text-foreground transition-transform duration-150 ease-out active:scale-[0.97]"
        >
          Create a room
        </Link>
      </div>
    </main>
  );
}
