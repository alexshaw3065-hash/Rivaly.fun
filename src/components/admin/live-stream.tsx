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
  neutral: "var(--border-strong)",
  money: "var(--rival-blue)",
  good: "var(--rival-green)",
  warn: "#f5a524",
  bad: "var(--rival-red)",
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
    <div className="rounded-xl bg-surface ring-1 ring-border">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-4 py-2.5">
        <p className="flex items-center gap-2 text-[12px] text-muted">
          <span className="h-1.5 w-1.5 rounded-full" style={{ background: paused ? "var(--border-strong)" : "var(--rival-green)" }} aria-hidden />
          {paused ? "Paused" : "Live"}
        </p>
        <div className="flex flex-wrap items-center gap-1">
          {filterable &&
            [null, ...EVENT_GROUPS.map((g) => g.label)].map((g) => (
              <button
                key={g ?? "all"}
                type="button"
                onClick={() => setGroup(g)}
                className="rounded-md px-2 py-1 text-[12px] transition-colors"
                style={group === g ? { background: "var(--surface-elevated)", color: "var(--foreground)" } : { color: "var(--muted)" }}
              >
                {g ?? "All"}
              </button>
            ))}
          <button type="button" onClick={() => setPaused((p) => !p)} className="ml-1 rounded-md px-2 py-1 text-[12px] text-muted hover:text-foreground">
            {paused ? "Resume" : "Pause"}
          </button>
        </div>
      </div>
      {items.length === 0 ? (
        <p className="px-4 py-10 text-center text-[13px] text-muted">Nothing yet.</p>
      ) : (
        <ol className={compact ? "max-h-[460px] overflow-y-auto" : ""}>
          {items.map((i) => (
            <li
              key={i.id}
              className="flex items-start gap-3 border-b border-border px-4 py-2 text-[13px] last:border-0"
              style={fresh.has(i.id) ? { background: "color-mix(in srgb, var(--rival-blue) 8%, transparent)", transition: "background 1.5s ease" } : { transition: "background 1.5s ease" }}
            >
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: TONE[i.tone] }} aria-hidden />
              <span className="w-[74px] shrink-0 font-mono text-[11px] leading-5 text-muted">{clock(i.at)}</span>
              <span className="min-w-0 flex-1 leading-5 text-foreground">
                {i.href ? (
                  <Link href={i.href} className="hover:underline">
                    {i.text}
                  </Link>
                ) : (
                  i.text
                )}
              </span>
              <span className="hidden shrink-0 font-mono text-[10px] uppercase leading-5 tracking-wide text-muted sm:inline">{i.type}</span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
