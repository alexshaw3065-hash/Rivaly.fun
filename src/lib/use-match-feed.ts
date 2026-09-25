"use client";

import { useEffect, useSyncExternalStore } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import { collapseEvents } from "@/lib/match-feed";
import type { EventRow } from "@/lib/match-timeline";

// A match's events, live: the server's collapsed rows to start, then every
// record the TxLINE stream worker writes, pushed over Supabase Realtime the
// moment it lands — no polling, no page refresh. One shared feed per match:
// the Stats tab, the line-ups and the pressure alerts all read the same rows
// over one subscription. Re-reads of a record the worker already stored
// arrive as UPDATEs and fold in the same way (collapseEvents groups by the
// feed's event id).

type Raw = { id: string; action: string; minute: number | null; payload: Record<string, unknown> | null; occurred_at: string };

interface Feed {
  initial: EventRow[];
  fresh: EventRow[];
  snapshot: EventRow[];
  listeners: Set<() => void>;
  channel: RealtimeChannel | null;
  live: boolean;
}

const feeds = new Map<string, Feed>();
const EMPTY: EventRow[] = [];

function rebuild(f: Feed) {
  if (f.fresh.length === 0) {
    f.snapshot = f.initial;
    return;
  }
  // Anything already folded into the server's rows (same row id) is dropped;
  // the rest joins in time order and collapses with them.
  const known = new Set(f.initial.map((r) => r.id));
  const added = f.fresh.filter((r) => !known.has(r.id)).sort((a, b) => +new Date(a.occurredAt) - +new Date(b.occurredAt));
  f.snapshot = collapseEvents([...f.initial, ...added]);
}

function feedFor(matchId: string, initial: EventRow[] | undefined, live: boolean): Feed {
  let f = feeds.get(matchId);
  if (!f) {
    f = { initial: initial ?? EMPTY, fresh: [], snapshot: initial ?? EMPTY, listeners: new Set(), channel: null, live };
    feeds.set(matchId, f);
  }
  return f;
}

function connect(matchId: string, f: Feed) {
  if (f.channel || !f.live) return;
  const supabase = createClient();
  const take = (r: Raw) => {
    f.fresh = [...f.fresh, { id: r.id, action: r.action, minute: r.minute, payload: r.payload, occurredAt: r.occurred_at }];
    rebuild(f);
    f.listeners.forEach((l) => l());
  };
  f.channel = supabase
    .channel(`match-feed:${matchId}:${Math.random().toString(36).slice(2)}`)
    .on("postgres_changes", { event: "INSERT", schema: "public", table: "match_events", filter: `match_id=eq.${matchId}` }, (p) => take(p.new as Raw))
    .on("postgres_changes", { event: "UPDATE", schema: "public", table: "match_events", filter: `match_id=eq.${matchId}` }, (p) => take(p.new as Raw))
    .subscribe();
}

function adopt(matchId: string, initial: EventRow[]) {
  const f = feeds.get(matchId);
  if (!f || f.initial === initial) return;
  f.initial = initial;
  rebuild(f);
  f.listeners.forEach((l) => l());
}

function subscribe(matchId: string, live: boolean, listener: () => void): () => void {
  const f = feedFor(matchId, undefined, live);
  f.listeners.add(listener);
  f.live = f.live || live;
  connect(matchId, f);
  return () => {
    f.listeners.delete(listener);
    if (f.listeners.size === 0 && f.channel) {
      void createClient().removeChannel(f.channel);
      f.channel = null;
      feeds.delete(matchId);
    }
  };
}

const read = (matchId: string) => feeds.get(matchId)?.snapshot ?? EMPTY;

/**
 * The match's rows, kept live while `live`. Pass `initial` from the server
 * where you have it; a consumer without it (the chat's pressure ticker) reads
 * whatever the page's feed already holds.
 */
export function useMatchFeed(matchId: string, initial?: EventRow[], live = true): EventRow[] {
  // Seed on first sight so the first render already has the server's rows.
  // Never on the server: the map is module state, and it would carry one
  // request's rows into the next.
  if (typeof window !== "undefined") feedFor(matchId, initial, live);

  // A server re-render (RoomLive refresh) brings newer rows — adopt them.
  useEffect(() => {
    if (initial) adopt(matchId, initial);
  }, [matchId, initial]);

  return useSyncExternalStore(
    (listener) => subscribe(matchId, live, listener),
    () => read(matchId),
    () => initial ?? EMPTY,
  );
}
