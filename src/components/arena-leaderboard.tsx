"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { formatSignedMoney } from "@/lib/mock-data";
import { fetchLeaderboard, type LeaderMetric, type LeaderPeriod, type LeaderRow } from "@/lib/arena/data";
import { useCurrentUser } from "./current-user-provider";
import { RivalCharacter } from "./rival-character";

const METRICS: { id: LeaderMetric; label: string }[] = [
  { id: "profit", label: "Winnings" },
  { id: "points", label: "Points" },
  { id: "accuracy", label: "Accuracy" },
  { id: "streak", label: "Streaks" },
];

const PERIODS: { id: LeaderPeriod; label: string }[] = [
  { id: "today", label: "Today" },
  { id: "week", label: "This week" },
  { id: "month", label: "This month" },
  { id: "all", label: "All time" },
];

function show(metric: LeaderMetric, v: number): string {
  switch (metric) {
    case "profit":
      return formatSignedMoney(v);
    case "points":
      return `${v} pts`;
    case "accuracy":
      return `${v}%`;
    case "streak":
      return `${v} in a row`;
  }
}

// One row of what's ranked, and a small period picker beside it. Every
// number comes from settled public rooms (arena_leaderboard() in the
// database). People you follow are marked in the list rather than filtered
// into a second view, and your own rank is pinned at the bottom — wherever
// you are on the board.
export function ArenaLeaderboard({ load = fetchLeaderboard }: { /** Swappable for tests. */ load?: typeof fetchLeaderboard } = {}) {
  const me = useCurrentUser();
  const [metric, setMetric] = useState<LeaderMetric>("profit");
  const [period, setPeriod] = useState<LeaderPeriod>("all");
  const [rows, setRows] = useState<LeaderRow[] | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let live = true;
    void load(metric, period)
      .then((r) => {
        if (!live) return;
        setRows(r);
        setFailed(false);
      })
      .catch(() => live && setFailed(true));
    return () => {
      live = false;
    };
  }, [metric, period, me?.id, load]);

  const board = rows?.filter((r) => r.rank <= 50) ?? [];
  const podium = board.slice(0, 3);
  const rest = board.slice(3);
  const mine = rows?.find((r) => r.isMe) ?? null;
  const periodLabel = PERIODS.find((p) => p.id === period)!.label;

  return (
    <div className="pb-20">
      <div className="flex items-center gap-2">
        <div className="no-scrollbar flex min-w-0 flex-1 gap-2 overflow-x-auto pr-6 [mask-image:linear-gradient(to_right,black_calc(100%-28px),transparent)]">
          {METRICS.map((m) => (
            <button
              key={m.id}
              onClick={() => setMetric(m.id)}
              className="h-9 shrink-0 rounded-full px-4 text-sm transition-colors duration-150"
              style={{
                background: metric === m.id ? "var(--foreground)" : "transparent",
                color: metric === m.id ? "var(--background)" : "var(--muted)",
                boxShadow: metric === m.id ? "none" : "inset 0 0 0 1px var(--border)",
              }}
            >
              {m.label}
            </button>
          ))}
        </div>
        {metric !== "streak" && <PeriodPicker value={period} onChange={setPeriod} />}
      </div>

      {failed && <p className="py-14 text-center text-sm text-muted">Couldn&apos;t load the leaderboard — try again in a moment.</p>}
      {!failed && rows === null && <div className="mt-8 h-48 animate-pulse rounded-2xl bg-foreground/5" />}
      {!failed && rows !== null && board.length === 0 && (
        <div className="mt-6 rounded-2xl px-6 py-12 text-center ring-1 ring-border">
          <p className="font-display text-lg font-bold text-foreground">
            {metric === "streak" ? "No streaks yet" : period === "all" ? "The board is empty — for now" : `Nothing settled ${periodLabel.toLowerCase()} yet`}
          </p>
          <p className="mx-auto mt-1 max-w-sm text-sm text-muted">
            {metric === "accuracy"
              ? "Accuracy shows once someone has 3 settled rooms."
              : metric === "streak"
                ? "Streaks show from 2 wins in a row."
                : "It fills in as rooms settle. Every number here is a real result."}
          </p>
          <Link href="/rooms" className="mt-4 inline-block rounded-full px-4 py-2 text-sm font-bold text-white" style={{ background: "var(--rival-blue)" }}>
            Find a room
          </Link>
        </div>
      )}

      {podium.length > 0 && (
        <div className="mt-8 flex items-end gap-3 px-2">
          {[1, 0, 2].map((i) => podium[i] && <PodiumSpot key={podium[i].userId} rank={(i + 1) as 1 | 2 | 3} row={podium[i]} value={show(metric, podium[i].value)} />)}
        </div>
      )}

      {rest.length > 0 && (
        <div className="mt-6 flex flex-col divide-y divide-border rounded-2xl bg-surface ring-1 ring-border">
          {rest.map((r) => (
            <BoardRow key={r.userId} row={r} value={show(metric, r.value)} />
          ))}
        </div>
      )}

      {/* Your place, always in view — even from outside the top 50. */}
      {me && rows !== null && (
        <div className="fixed inset-x-0 bottom-[calc(64px+env(safe-area-inset-bottom))] z-10 px-4 md:bottom-6 md:left-[var(--sidebar-width)]">
          <div className="mx-auto flex max-w-5xl items-center gap-3 rounded-2xl bg-surface-elevated px-4 py-3 shadow-[0_12px_30px_-12px_rgba(0,0,0,0.7)] ring-1 ring-border-strong">
            {mine ? (
              <>
                <span className="w-9 shrink-0 font-mono text-sm font-bold text-foreground">#{mine.rank}</span>
                <RivalCharacter name={me.displayName} imageUrl={me.avatarUrl} size={28} />
                <p className="min-w-0 flex-1 truncate text-sm font-semibold text-foreground">You</p>
                <span className="shrink-0 font-mono text-sm font-bold text-foreground">{show(metric, mine.value)}</span>
              </>
            ) : (
              <>
                <RivalCharacter name={me.displayName} imageUrl={me.avatarUrl} size={28} />
                <p className="min-w-0 flex-1 text-sm text-muted">
                  {metric === "accuracy" ? "You're on the board after 3 settled rooms." : metric === "streak" ? "Win 2 in a row to get a streak." : "You're not on the board yet — settle a room to get ranked."}
                </p>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function PeriodPicker({ value, onChange }: { value: LeaderPeriod; onChange: (p: LeaderPeriod) => void }) {
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => !box.current?.contains(e.target as Node) && setOpen(false);
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);
  return (
    <div ref={box} className="relative shrink-0">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="flex h-9 items-center gap-1.5 rounded-full px-4 text-sm text-muted ring-1 ring-border transition-colors hover:text-foreground"
      >
        {PERIODS.find((p) => p.id === value)!.label}
        <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden className="transition-transform duration-150" style={{ transform: open ? "rotate(180deg)" : undefined }}>
          <path d="m3 4.5 3 3 3-3" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      {open && (
        <ul role="listbox" className="absolute right-0 top-11 z-20 min-w-40 overflow-hidden rounded-2xl bg-surface-elevated py-1 shadow-[0_12px_30px_-12px_rgba(0,0,0,0.7)] ring-1 ring-border [animation:fade-in-up_140ms_ease-out_both]">
          {PERIODS.map((p) => (
            <li key={p.id}>
              <button
                type="button"
                role="option"
                aria-selected={p.id === value}
                onClick={() => {
                  onChange(p.id);
                  setOpen(false);
                }}
                className="flex w-full items-center justify-between px-4 py-2.5 text-left text-sm transition-colors hover:bg-foreground/5"
                style={{ color: p.id === value ? "var(--foreground)" : "var(--muted)" }}
              >
                {p.label}
                {p.id === value && (
                  <svg width="14" height="14" viewBox="0 0 16 16" aria-hidden>
                    <path d="m3.5 8.5 3 3 6-7" stroke="currentColor" strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function BoardRow({ row, value }: { row: LeaderRow; value: string }) {
  return (
    <Link
      href={row.username ? `/profile/${row.username}` : "#"}
      className="flex items-center gap-3 px-4 py-3 transition-colors duration-150 hover:bg-surface-elevated"
      style={row.isMe ? { background: "var(--surface-elevated)" } : undefined}
    >
      <span className="w-6 shrink-0 font-mono text-xs text-muted">{row.rank}</span>
      <RivalCharacter name={row.name} imageUrl={row.avatar} size={28} />
      <p className="flex min-w-0 flex-1 items-center gap-2 text-sm text-foreground">
        <span className="truncate">{row.isMe ? "You" : row.name}</span>
        {row.following && <span className="shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-rival-blue ring-1 ring-rival-blue/40">Following</span>}
      </p>
      <span className="shrink-0 font-mono text-sm font-medium text-foreground">{value}</span>
    </Link>
  );
}

const PODIUM_HEIGHT: Record<1 | 2 | 3, number> = { 1: 92, 2: 68, 3: 52 };

function PodiumSpot({ rank, row, value }: { rank: 1 | 2 | 3; row: LeaderRow; value: string }) {
  return (
    <Link href={row.username ? `/profile/${row.username}` : "#"} className="flex flex-1 flex-col items-center gap-2">
      <div className="relative">
        {rank === 1 && <span className="absolute -top-6 left-1/2 -translate-x-1/2 text-xl">👑</span>}
        <RivalCharacter name={row.name} imageUrl={row.avatar} size={rank === 1 ? 52 : 44} />
      </div>
      <p className="flex max-w-full items-center gap-1 truncate text-xs font-medium text-foreground">
        <span className="truncate">{row.isMe ? "You" : row.name}</span>
      </p>
      {row.following && <span className="-mt-1 text-[9px] font-semibold uppercase tracking-wide text-rival-blue">Following</span>}
      <p className="font-mono text-[11px] text-muted">{value}</p>
      <div
        className="flex w-full items-start justify-center rounded-t-md pt-1.5"
        style={{ height: PODIUM_HEIGHT[rank], background: rank === 1 ? "var(--rival-blue-dim)" : "var(--surface-elevated)", border: "1px solid var(--border)", borderBottom: "none" }}
      >
        <span className="font-mono text-lg font-bold" style={{ color: rank === 1 ? "var(--rival-blue)" : "var(--muted)" }}>
          {rank}
        </span>
      </div>
    </Link>
  );
}
