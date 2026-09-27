"use client";

import { useSyncExternalStore } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";

// Who's in the app right now: one private realtime channel ("online") that
// every signed-in visitor joins with their public basics, read by anyone.
// Joined once from the root (OnlinePresence in nav.tsx) and shared through a
// tiny store, so every surface reads the same list without its own socket.

export interface OnlineRival {
  id: string;
  username: string;
  name: string;
  avatar: string | null;
}

let channel: RealtimeChannel | null = null;
let trackedAs: string | null = null;
let online: OnlineRival[] = [];
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

/** Join (or re-join as a different account). `me` null = watch only. */
export function joinOnline(me: OnlineRival | null) {
  const key = me?.id ?? null;
  if (channel && trackedAs === key) return;
  leaveOnline();
  trackedAs = key;
  const supabase = createClient();
  const ch = supabase.channel("online", { config: { private: true, presence: { key: key ?? `guest-${Math.random().toString(36).slice(2)}` } } });
  ch.on("presence", { event: "sync" }, () => {
    const state = ch.presenceState<OnlineRival>();
    const seen = new Map<string, OnlineRival>();
    for (const metas of Object.values(state)) {
      const m = metas[0];
      if (m?.id && m.username) seen.set(m.id, { id: m.id, username: m.username, name: m.name, avatar: m.avatar ?? null });
    }
    online = [...seen.values()];
    emit();
  });
  ch.subscribe((status) => {
    if (status === "SUBSCRIBED" && me) void ch.track(me);
  });
  channel = ch;
}

export function leaveOnline() {
  if (!channel) return;
  void createClient().removeChannel(channel);
  channel = null;
  online = [];
  emit();
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}
const getOnline = () => online;
const EMPTY: OnlineRival[] = [];

export function useOnlineRivals(): OnlineRival[] {
  return useSyncExternalStore(subscribe, getOnline, () => EMPTY);
}
