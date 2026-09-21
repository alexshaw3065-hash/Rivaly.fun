import Link from "next/link";
import { notifications, profileById } from "@/lib/mock-data";
import { Avatar } from "@/components/avatar";

function relativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.round(diffMs / 60_000);
  if (mins < 60) return `${Math.max(mins, 1)}m`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h`;
  return `${Math.round(hours / 24)}d`;
}

function targetHref(n: (typeof notifications)[number]): string {
  if (n.roomId) return `/rooms/${n.roomId}`;
  if (n.actorId) {
    const profile = profileById(n.actorId);
    if (profile) return `/profile/${profile.username}`;
  }
  return "/";
}

// Every type per docs/masterplan/07-product-blueprint.md#410-notifications.
// No "mark read" affordance yet — nothing to persist it to without a
// backend, and it's not in the V1 field list, just the type catalog.
export default function NotificationsPage() {
  return (
    <main className="mx-auto max-w-2xl px-4 py-12 md:px-6">
      <h1 className="font-display text-2xl font-bold text-foreground md:text-3xl">
        Notifications
      </h1>

      <div className="mt-7 flex flex-col divide-y divide-border rounded-lg border border-border bg-surface">
        {notifications.map((n) => {
          const actor = n.actorId ? profileById(n.actorId) : undefined;
          return (
            <Link
              key={n.id}
              href={targetHref(n)}
              className="flex items-start gap-3 px-4 py-4 transition-colors duration-150 hover:bg-surface-elevated"
            >
              {actor ? (
                <Avatar name={actor.displayName} size={34} />
              ) : (
                <div className="flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-full border border-border-strong">
                  <span
                    className="h-1.5 w-1.5 rounded-full"
                    style={{ background: "var(--rival-blue)" }}
                  />
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className={n.read ? "text-sm text-muted" : "text-sm text-foreground"}>
                  {n.body}
                </p>
                <p className="mt-0.5 font-mono text-xs text-muted">{relativeTime(n.createdAt)} ago</p>
              </div>
              {!n.read && (
                <span
                  className="mt-1.5 h-2 w-2 shrink-0 rounded-full"
                  style={{ background: "var(--rival-blue)" }}
                />
              )}
            </Link>
          );
        })}
      </div>
    </main>
  );
}
