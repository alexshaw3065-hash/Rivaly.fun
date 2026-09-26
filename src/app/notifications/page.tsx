import Link from "next/link";

// Real notifications (a big stake in your room, someone fading your call,
// replies, receipts) aren't built yet — so this says so plainly rather than
// showing sample alerts about people and rooms that don't exist.
export default function NotificationsPage() {
  return (
    <main className="mx-auto max-w-2xl px-4 py-12 md:px-6">
      <h1 className="font-display text-2xl font-bold text-foreground md:text-3xl">Notifications</h1>

      <div className="mt-7 rounded-2xl bg-surface px-6 py-14 text-center ring-1 ring-border">
        <p className="font-display text-lg font-bold text-foreground">Nothing yet</p>
        <p className="mx-auto mt-1 max-w-sm text-sm text-muted">
          When someone joins your room, fades your call or replies to you, it lands here.
        </p>
        <Link
          href="/rooms/create"
          className="mt-5 inline-flex h-10 items-center rounded-full px-5 text-sm font-semibold text-white transition-transform duration-150 ease-out active:scale-[0.97]"
          style={{ background: "var(--rival-blue)" }}
        >
          Start a room
        </Link>
      </div>
    </main>
  );
}
