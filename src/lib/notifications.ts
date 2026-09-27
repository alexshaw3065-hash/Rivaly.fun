"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { AppNotification, NotificationKind } from "./notifications-model";

// Reading your notifications and the unread dot on the bell. Rows only ever
// come from database triggers; RLS lets you read your own and nothing else.

const SELECT = "id, kind, room_id, post_id, data, created_at, read_at, actor:profiles!notifications_actor_id_fkey(username, display_name, avatar_url)";
const READ_EVENT = "rivaly-notifications-read";

interface Row {
  id: string;
  kind: NotificationKind;
  room_id: string | null;
  post_id: string | null;
  data: AppNotification["data"] | null;
  created_at: string;
  read_at: string | null;
  actor: { username: string | null; display_name: string; avatar_url: string | null } | null;
}

function toNotification(r: Row): AppNotification {
  return {
    id: r.id,
    kind: r.kind,
    actor: r.actor ? { username: r.actor.username, name: r.actor.display_name, avatar: r.actor.avatar_url } : null,
    roomId: r.room_id,
    postId: r.post_id,
    data: r.data ?? {},
    createdAt: r.created_at,
    read: r.read_at !== null,
  };
}

export async function fetchNotifications(before?: string, limit = 30): Promise<AppNotification[]> {
  let q = createClient().from("notifications").select(SELECT).order("created_at", { ascending: false }).limit(limit);
  if (before) q = q.lt("created_at", before);
  const { data, error } = await q;
  if (error) throw new Error(error.message);
  return ((data ?? []) as unknown as Row[]).map(toNotification);
}

/** Everything's been seen: clears the bell's dot everywhere at once. */
export async function markAllRead(): Promise<void> {
  await createClient().rpc("mark_notifications_read");
  window.dispatchEvent(new Event(READ_EVENT));
}

/** Live: calls back with each new notification as it's written. */
export function subscribeToNotifications(userId: string, onNew: () => void): () => void {
  const supabase = createClient();
  const channel = supabase
    .channel(`notifications:${userId}:${Math.random().toString(36).slice(2)}`)
    .on("postgres_changes", { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${userId}` }, onNew)
    .subscribe();
  return () => {
    void supabase.removeChannel(channel);
  };
}

/** How many unread — live, for the bell. */
export function useUnreadCount(userId: string | null): number {
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    const load = () =>
      void createClient()
        .from("notifications")
        .select("id", { count: "exact", head: true })
        .is("read_at", null)
        .then(({ count: c }) => !cancelled && setCount(c ?? 0));
    load();
    const unsubscribe = subscribeToNotifications(userId, () => setCount((c) => c + 1));
    const cleared = () => setCount(0);
    window.addEventListener(READ_EVENT, cleared);
    return () => {
      cancelled = true;
      unsubscribe();
      window.removeEventListener(READ_EVENT, cleared);
    };
  }, [userId]);
  return userId ? count : 0;
}
