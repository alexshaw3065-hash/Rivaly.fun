"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { formatSignedMoney } from "@/lib/mock-data";
import { fetchLeaderboard, type FeedScope, type LeaderMetric, type LeaderRow } from "@/lib/arena/data";
import { openAuthModal } from "@/lib/auth-modal-store";
import { useCurrentUser } from "./current-user-provider";
import { RivalCharacter } from "./rival-character";

const METRICS: { id: LeaderMetric; label: string }[] = [
  { id: "profit", label: "Winnings" },
  { id: "gameweek", label: "This gameweek" },
  { id: "accuracy", label: "Most accurate" },
  { id: "streak", label: "Streaks" },
];

function show(metric: LeaderMetric, v: number): string {
  switch (metric) {
    case "profit":
      return formatSignedMoney(v);
    case "gameweek":
      return `${v} pts`;
    case "accuracy":
      return `${v}%`;
    case "streak":
      return `${v} in a row`;
  }
}

// Every number here comes from settled public rooms (arena_leaderboard() in
// the database) — nothing seeded. Until rooms settle it says so plainly.
// Global or just the people you follow: the named rival is the stronger pull.
export function ArenaLeaderboard() {
  const me = useCurrentUser();
  const [metric, setMetric] = useState<LeaderMetric>("profit");
  const [scope, setScope] = useState<FeedScope>("global");
  const [rows, setRows] = useState<LeaderRow[] | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let live = true;
    void fetchLeaderboard(metric, scope)
      .then((r) => {
        if (!live) return;
        setRows(r);
        setFailed(false);
      })
      .catch(() => live && setFailed(true));
    return () => {
      live = false;
    };
  }, [metric, scope, me?.id]);

  const podium = rows?.slice(0, 3) ?? [];
  const rest = rows?.slice(3) ?? [];

  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <div className="no-scrollbar flex gap-2 overflow-x-auto pb-1">
          {METRICS.map((m) => (
            <button
              key={m.id}
              onClick={() => setMetric(m.id)}
              className="h-8 shrink-0 rounded-full px-3.5 text-sm transition-colors duration-150"
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
      </div>
      <div className="mt-3 inline-flex rounded-full p-0.5 ring-1 ring-border">
        {(["global", "following"] as const).map((s) => (
          <button
            key={s}
            onClick={() => (s === "following" && !me ? openAuthModal({ next: "/arena" }) : setScope(s))}
            className="h-7 rounded-full px-3 text-[13px] font-medium transition-colors"
            style={{ background: scope === s ? "var(--surface-elevated)" : "transparent", color: scope === s ? "var(--foreground)" : "var(--muted)" }}
          >
            {s === "global" ? "Everyone" : "People you follow"}
          </button>
        ))}
      </div>

      {failed && <p className="py-14 text-center text-sm text-muted">Couldn&apos;t load the leaderboard — try again in a moment.</p>}
      {!failed && rows === null && <div className="mt-8 h-48 animate-pulse rounded-2xl bg-foreground/5" />}
      {!failed && rows?.length === 0 && (
        <div className="mt-6 rounded-2xl px-6 py-12 text-center ring-1 ring-border">
          <p className="font-display text-lg font-bold text-foreground">
            {scope === "following" ? "No results in your circle yet" : metric === "gameweek" ? "No points this gameweek yet" : "The board is empty — for now"}
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
          {[1, 0, 2].map((i) => podium[i] && <PodiumSpot key={podium[i].userId} rank={(i + 1) as 1 | 2 | 3} row={podium[i]} value={show(metric, podium[i].value)} self={podium[i].userId === me?.id} />)}
        </div>
      )}

      {rest.length > 0 && (
        <div className="mt-6 flex flex-col divide-y divide-border rounded-2xl bg-surface ring-1 ring-border">
          {rest.map((r, i) => (
            <Link
              key={r.userId}
              href={r.username ? `/profile/${r.username}` : "#"}
              className="flex items-center gap-3 px-4 py-3 transition-colors duration-150 hover:bg-surface-elevated"
              style={r.userId === me?.id ? { background: "var(--surface-elevated)" } : undefined}
            >
              <span className="w-5 shrink-0 font-mono text-xs text-muted">{i + 4}</span>
              <RivalCharacter name={r.name} imageUrl={r.avatar} size={28} />
              <p className="min-w-0 flex-1 truncate text-sm text-foreground">
                {r.name}
                {r.userId === me?.id && <span className="text-muted"> (you)</span>}
              </p>
              <span className="shrink-0 font-mono text-sm font-medium text-foreground">{show(metric, r.value)}</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

const PODIUM_HEIGHT: Record<1 | 2 | 3, number> = { 1: 92, 2: 68, 3: 52 };

function PodiumSpot({ rank, row, value, self }: { rank: 1 | 2 | 3; row: LeaderRow; value: string; self: boolean }) {
  return (
    <Link href={row.username ? `/profile/${row.username}` : "#"} className="flex flex-1 flex-col items-center gap-2">
      <div className="relative">
        {rank === 1 && <span className="absolute -top-6 left-1/2 -translate-x-1/2 text-xl">👑</span>}
        <RivalCharacter name={row.name} imageUrl={row.avatar} size={rank === 1 ? 52 : 44} />
      </div>
      <p className="max-w-full truncate text-xs font-medium text-foreground">
        {row.name}
        {self && <span className="text-muted"> (you)</span>}
      </p>
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
