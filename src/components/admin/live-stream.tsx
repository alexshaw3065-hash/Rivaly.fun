"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { liveEvents, type LiveItem } from "@/app/admin/actions";
import { EVENT_GROUPS, type EventTone } from "@/lib/admin/events";

// The platform, live: every structured event as a readable line. New rows
// arrive over Realtime (admins can read platform_events) and are described
// on the server, so names come from the same place as everywhere else.
// A slow poll backs Realtime up.

const TONE: Record<EventTone, string> = {
  neutral: "var(--line-strong)",
  money: "var(--yes)",
  good: "var(--money)",
  warn: "#f5a524",
  bad: "var(--no)",
  admin: "#a855f7",
};

function clock(iso: string) {
  const d = new Date(iso);
  const today = new Date().toDateString() === d.toDateString();
  return today ? d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", second: "2-digit" }) : d.toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

export function LiveStream({ initial, limit = 60, filterable = false, compact = false }: { initial: LiveItem[]; limit?: number; filterable?: boolean; compact?: boolean }) {
  const [items, setItems] = useState(initial);
  const [group, setGroup] = useState<string | null>(null);
  const [fresh, setFresh] = useState<Set<string>>(new Set());
  const [paused, setPaused] = useState(false);
  const known = useRef(new Set(initial.map((i) => i.id)));

  const refresh = useCallback(async () => {
    const types = group ? EVENT_GROUPS.find((g) => g.label === group)?.types ?? null : null;
    const next = await liveEvents({ types, limit });
    const newIds = next.filter((i) => !known.current.has(i.id)).map((i) => i.id);
    next.forEach((i) => known.current.add(i.id));
    setItems(next);
    if (newIds.length) {
      setFresh(new Set(newIds));
      window.setTimeout(() => setFresh(new Set()), 2500);
    }
  }, [group, limit]);

  useEffect(() => {
    if (paused) return;
    const supabase = createClient();
    let timer: ReturnType<typeof setTimeout> | null = null;
    const soon = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => void refresh(), 600);
    };
    const channel = supabase
      .channel(`admin-live:${Math.random().toString(36).slice(2)}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "platform_events" }, soon)
      .subscribe();
    const poll = setInterval(() => document.visibilityState === "visible" && void refresh(), 20_000);
    const first = setTimeout(() => void refresh(), 0);
    return () => {
      if (timer) clearTimeout(timer);
      clearTimeout(first);
      clearInterval(poll);
      void supabase.removeChannel(channel);
    };
  }, [refresh, paused]);

  return (
    <div className="rounded-card bg-surface edge">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-4 py-3">
        <p className="flex items-center gap-2 text-caption text-secondary">
          <span className="h-1.5 w-1.5 rounded-full" style={{ background: paused ? "var(--line-strong)" : "var(--money)" }} aria-hidden />
          {paused ? "Paused" : "Live"}
        </p>
        <div className="flex flex-wrap items-center gap-1">
          {filterable &&
            [null, ...EVENT_GROUPS.map((g) => g.label)].map((g) => (
              <button
                key={g ?? "all"}
                type="button"
                onClick={() => setGroup(g)}
                className="rounded-control px-2 py-1 text-caption transition-colors"
                style={group === g ? { background: "var(--surface-elevated)", color: "var(--foreground)" } : { color: "var(--text-secondary)" }}
              >
                {g ?? "All"}
              </button>
            ))}
          <button type="button" onClick={() => setPaused((p) => !p)} className="ml-1 rounded-control px-2 py-1 text-caption text-secondary hover:text-foreground">
            {paused ? "Resume" : "Pause"}
          </button>
        </div>
      </div>
      {items.length === 0 ? (
        <p className="px-4 py-10 text-center text-label text-secondary">Nothing yet.</p>
      ) : (
        <ol className={compact ? "max-h-[460px] overflow-y-auto" : ""}>
          {items.map((i) => (
            <li
              key={i.id}
              className="flex items-start gap-3 border-b border-line px-4 py-2 text-label last:border-0"
              style={fresh.has(i.id) ? { background: "color-mix(in srgb, var(--yes) 8%, transparent)", transition: "background 1.5s ease" } : { transition: "background 1.5s ease" }}
            >
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: TONE[i.tone] }} aria-hidden />
              <span className="w-[74px] shrink-0 font-mono text-caption leading-5 text-secondary">{clock(i.at)}</span>
              <span className="min-w-0 flex-1 leading-5 text-foreground">
                {i.href ? (
                  <Link href={i.href} className="hover:underline">
                    {i.text}
                  </Link>
                ) : (
                  i.text
                )}
              </span>
              <span className="hidden shrink-0 font-mono text-micro uppercase leading-5 text-secondary sm:inline">{i.type}</span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
