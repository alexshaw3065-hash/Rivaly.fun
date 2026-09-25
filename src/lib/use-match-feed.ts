"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { collapseEvents } from "@/lib/match-feed";
import type { EventRow } from "@/lib/match-timeline";

// A match's events, live: the server's collapsed rows to start, then every
// record the TxLINE stream worker writes, pushed over Supabase Realtime the
// moment it lands — no polling, no page refresh. Stats, possession, momentum
// and the line-ups are all derived from this on the client, so they move with
// the match. Re-reads of a record the worker already stored arrive as UPDATEs
// and fold in the same way (collapseEvents groups by the feed's event id).

type Raw = { id: string; action: string; minute: number | null; payload: Record<string, unknown> | null; occurred_at: string };

export function useMatchFeed(matchId: string, initial: EventRow[], live: boolean): EventRow[] {
  const [fresh, setFresh] = useState<EventRow[]>([]);

  useEffect(() => {
    if (!live) return;
    const supabase = createClient();
    const take = (r: Raw) =>
      setFresh((list) => [...list, { id: r.id, action: r.action, minute: r.minute, payload: r.payload, occurredAt: r.occurred_at }]);
    const channel = supabase
      .channel(`match-feed:${matchId}:${Math.random().toString(36).slice(2)}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "match_events", filter: `match_id=eq.${matchId}` }, (p) => take(p.new as Raw))
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "match_events", filter: `match_id=eq.${matchId}` }, (p) => take(p.new as Raw))
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [matchId, live]);

  return useMemo(() => {
    if (fresh.length === 0) return initial;
    // Anything already folded into the server's rows (same row id) is dropped;
    // the rest joins in time order and collapses with them.
    const known = new Set(initial.map((r) => r.id));
    const added = fresh.filter((r) => !known.has(r.id)).sort((a, b) => +new Date(a.occurredAt) - +new Date(b.occurredAt));
    return collapseEvents([...initial, ...added]);
  }, [initial, fresh]);
}
