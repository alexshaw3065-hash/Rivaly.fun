import Link from "next/link";

// What every room surface shows when there are no real rooms to show —
// never filler. A room without opponents isn't a room, so the empty state's
// only job is to make starting one the obvious next move.
export function EmptyRooms({ title = "No rooms yet", body = "Be the first — put your call up against someone else's in seconds." }: { title?: string; body?: string }) {
  return (
    <div className="rounded-xl border border-dashed border-border-strong bg-surface p-8 text-center">
      <p className="font-display text-lg font-semibold text-foreground">{title}</p>
      <p className="mx-auto mt-1.5 max-w-sm text-sm text-muted">{body}</p>
      <Link
        href="/rooms/create"
        className="mt-5 inline-flex min-h-11 items-center rounded-md bg-rival-blue px-5 text-sm font-semibold text-white transition-transform duration-150 ease-out active:scale-[0.97]"
      >
        Create a room
      </Link>
    </div>
  );
}
