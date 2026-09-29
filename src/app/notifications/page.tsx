"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useCurrentUser } from "@/components/current-user-provider";
import { openAuthModal } from "@/lib/auth-modal-store";
import { fetchNotifications, markAllRead, subscribeToNotifications } from "@/lib/notifications";
import { describe, groupByDay, type AppNotification } from "@/lib/notifications-model";
import { NotificationRow } from "@/components/notification-row";

// Everything that happened to you: stakes in your rooms, calls against you,
// kickoffs, results, replies, mentions, follows. Opening the page marks it
// all read; what was unread when you arrived keeps its marker until you leave.

const PAGE = 30;

export default function NotificationsPage() {
  const me = useCurrentUser();
  const [items, setItems] = useState<AppNotification[] | null>(null);
  const [done, setDone] = useState(false);
  const [error, setError] = useState(false);

  const load = useCallback(async () => {
    try {
      const page = await fetchNotifications(undefined, PAGE);
      setItems(page);
      setDone(page.length < PAGE);
      setError(false);
      if (page.some((n) => !n.read)) void markAllRead();
    } catch {
      setError(true);
    }
  }, []);

  useEffect(() => {
    if (!me) return;
    const t = window.setTimeout(() => void load(), 0);
    // New ones while you're here slide in on top (and count as seen).
    const unsubscribe = subscribeToNotifications(me.id, () => {
      void fetchNotifications(undefined, 5).then((fresh) => {
        setItems((cur) => {
          const have = new Set((cur ?? []).map((n) => n.id));
          return [...fresh.filter((n) => !have.has(n.id)), ...(cur ?? [])];
        });
        void markAllRead();
      });
    });
    return () => {
      window.clearTimeout(t);
      unsubscribe();
    };
  }, [me, load]);

  async function more() {
    const last = items?.[items.length - 1];
    if (!last) return;
    const page = await fetchNotifications(last.createdAt, PAGE);
    setItems((cur) => [...(cur ?? []), ...page]);
    if (page.length < PAGE) setDone(true);
  }

  return (
    <main className="mx-auto max-w-2xl px-4 py-8 md:px-6 md:py-12 lg:max-w-[648px]">
      <h1 className="text-title-1 font-display text-foreground">Notifications</h1>

      {!me ? (
        <Empty title="Sign in to see yours" body="Stakes in your rooms, calls against you, kickoffs and results land here.">
          <button
            type="button"
            onClick={() => openAuthModal({ next: "/notifications" })}
            className="mt-5 inline-flex h-10 items-center rounded-full px-5 text-body font-semibold text-white"
            style={{ background: "var(--yes)" }}
          >
            Sign in
          </button>
        </Empty>
      ) : error ? (
        <Empty title="Couldn't load them" body="Check your connection and try again.">
          <button type="button" onClick={() => void load()} className="mt-5 h-10 rounded-full px-5 text-body font-semibold text-foreground edge-strong">
            Try again
          </button>
        </Empty>
      ) : items === null ? (
        <div className="mt-7 overflow-hidden rounded-card bg-surface edge">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="flex gap-3 border-b border-line px-4 py-4 last:border-0">
              <span className="h-10 w-10 shrink-0 skeleton rounded-full bg-foreground/5" />
              <span className="mt-1 h-3 w-2/3 skeleton rounded bg-foreground/5" />
            </div>
          ))}
        </div>
      ) : items.length === 0 ? (
        <Empty title="Nothing yet" body="When someone joins your room, fades your call or replies to you, it lands here.">
          <Link
            href="/rooms/create"
            className="mt-5 inline-flex h-10 items-center rounded-full px-5 text-body font-semibold text-white transition-transform duration-150 ease-out active:scale-[0.97]"
            style={{ background: "var(--yes)" }}
          >
            Start a room
          </Link>
        </Empty>
      ) : (
        <>
          {groupByDay(items).map((g) => (
            <section key={g.label} className="mt-7">
              <p className="px-1 text-label font-semibold text-secondary">{g.label}</p>
              <div className="mt-2 overflow-hidden rounded-card bg-surface edge">
                {g.items.map((n) => (
                  <NotificationRow key={n.id} n={n} view={describe(n)} />
                ))}
              </div>
            </section>
          ))}
          {!done && (
            <div className="flex justify-center py-6">
              <button type="button" onClick={() => void more()} className="h-10 rounded-full px-5 text-body text-foreground edge-strong">
                Older
              </button>
            </div>
          )}
        </>
      )}
    </main>
  );
}

function Empty({ title, body, children }: { title: string; body: string; children?: React.ReactNode }) {
  return (
    <div className="mt-7 rounded-card bg-surface px-6 py-14 text-center edge">
      <p className="text-title-3 font-display text-foreground">{title}</p>
      <p className="mx-auto mt-1 max-w-sm text-body text-secondary">{body}</p>
      {children}
    </div>
  );
}
