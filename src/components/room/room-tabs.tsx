"use client";

import { useEffect, useState, type ReactNode } from "react";
import { formatMoney } from "@/lib/mock-data";
import { teamIdentity } from "@/lib/team-identity";
import { useRoomRace } from "@/lib/room-energy";
import type { StatRow } from "@/lib/match-stats";
import type { Match } from "@/lib/types";
import { TeamCrest } from "../team-crest";
import { RivalCharacter } from "../rival-character";

// Everything under the pool, in tabs: the crowd (chat), the match stats, the
// room's activity and an overview. Chat stays mounted when you switch away,
// so it keeps listening (and keeps feeding the stadium race) in the
// background. All real data: TxLINE's team stats, the room's own entries and
// takeovers — nothing filled in.

type Tab = "chat" | "stats" | "activity" | "overview";
const TABS: { id: Tab; label: string }[] = [
  { id: "chat", label: "Chat" },
  { id: "stats", label: "Stats" },
  { id: "activity", label: "Activity" },
  { id: "overview", label: "Overview" },
];

export interface ActivityItem {
  id: string;
  at: number;
  kind: "created" | "joined" | "locked" | "result";
  name?: string;
  avatarUrl?: string | null;
  side?: "yes" | "no";
  cents?: number;
  outcome?: "yes" | "no" | "void";
}

export interface OverviewFact {
  label: string;
  value: string;
}

export function RoomTabs({
  chat,
  match,
  stats,
  activity,
  overview,
}: {
  chat: ReactNode;
  match: Match;
  stats: StatRow[];
  activity: ActivityItem[];
  overview: OverviewFact[];
}) {
  const [tab, setTab] = useState<Tab>("chat");

  return (
    <section className="flex flex-col">
      <div role="tablist" aria-label="Room" className="no-scrollbar flex gap-1 overflow-x-auto rounded-xl bg-surface p-1">
        {TABS.map((t) => (
          <button
            key={t.id}
            role="tab"
            type="button"
            aria-selected={tab === t.id}
            onClick={() => setTab(t.id)}
            className="h-9 flex-1 shrink-0 rounded-lg px-3 text-sm font-semibold transition-[background-color,color] duration-150"
            style={{
              background: tab === t.id ? "var(--background)" : "transparent",
              color: tab === t.id ? "var(--foreground)" : "var(--muted)",
              boxShadow: tab === t.id ? "0 1px 2px rgba(0,0,0,0.12)" : undefined,
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="mt-3">
        {/* Chat stays mounted so the room keeps listening while you look elsewhere. */}
        <div hidden={tab !== "chat"}>{chat}</div>
        {tab === "stats" && <StatsPanel match={match} rows={stats} />}
        {tab === "activity" && <ActivityPanel items={activity} />}
        {tab === "overview" && <OverviewPanel facts={overview} />}
      </div>
    </section>
  );
}

// Team stats, Google-style: the numbers either side, the leader's pill in
// its team colour, and a split bar under each row.
function StatsPanel({ match, rows }: { match: Match; rows: StatRow[] }) {
  const home = teamIdentity(match.homeTeam);
  const away = teamIdentity(match.awayTeam);
  if (rows.length === 0) return <Empty text="Stats start at kick-off." />;
  return (
    <div className="rounded-2xl border border-border bg-surface px-4 py-3">
      <div className="flex items-center justify-between pb-2">
        <span className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
          <TeamCrest name={match.homeTeam} size={18} /> {home.code}
        </span>
        <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted">Team stats</span>
        <span className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
          {away.code} <TeamCrest name={match.awayTeam} size={18} />
        </span>
      </div>
      <ul className="divide-y divide-border">
        {rows.map((r) => {
          const total = r.home + r.away;
          const homePct = total ? (r.home / total) * 100 : 50;
          return (
            <li key={r.key} className="py-2.5">
              <div className="grid grid-cols-[48px_1fr_48px] items-center">
                <Value value={r.home} lead={r.home > r.away} color={home.primary} ink={home.ink} align="left" />
                <span className="text-center text-sm text-foreground">{r.label}</span>
                <Value value={r.away} lead={r.away > r.home} color={away.primary} ink={away.ink} align="right" />
              </div>
              <div className="mt-1.5 flex h-1 gap-0.5 overflow-hidden rounded-full">
                <span className="h-full rounded-full" style={{ width: `${homePct}%`, background: total ? home.primary : "var(--border)" }} />
                <span className="h-full flex-1 rounded-full" style={{ background: total ? away.primary : "var(--border)" }} />
              </div>
            </li>
          );
        })}
      </ul>
      <p className="pt-2 text-center text-[10px] text-muted">From the official match feed</p>
    </div>
  );
}

function Value({ value, lead, color, ink, align }: { value: number; lead: boolean; color: string; ink: string; align: "left" | "right" }) {
  return (
    <span className={`flex ${align === "left" ? "justify-start" : "justify-end"}`}>
      <span
        className="min-w-7 rounded-full px-2 py-0.5 text-center font-mono text-sm font-bold tabular-nums"
        style={lead ? { background: color, color: ink } : { color: "var(--foreground)" }}
      >
        {value}
      </span>
    </span>
  );
}

// The room's story: who backed what and when, when stakes locked, the result,
// and every takeover of the stadium. Newest first.
function ActivityPanel({ items }: { items: ActivityItem[] }) {
  const { takeovers } = useRoomRace();
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(t);
  }, []);
  const all = [
    ...items,
    ...takeovers.map((t, i) => ({ id: `takeover-${i}`, at: t.at, kind: "takeover" as const, side: t.side })),
  ].sort((a, b) => b.at - a.at);
  if (all.length === 0) return <Empty text="Nothing yet." />;

  return (
    <ul className="rounded-2xl border border-border bg-surface px-4 py-1">
      {all.map((it) => (
        <li key={it.id} className="flex items-center gap-3 border-b border-border py-3 last:border-0">
          <ActivityIcon item={it} />
          <p className="min-w-0 flex-1 text-sm text-foreground">
            <ActivityText item={it} />
          </p>
          <span className="shrink-0 font-mono text-[11px] text-muted">{ago(now, it.at)}</span>
        </li>
      ))}
    </ul>
  );
}

const SIDE_COLOR = { yes: "var(--rival-blue)", no: "var(--rival-red)" } as const;

function ActivityIcon({ item }: { item: ActivityItem | { kind: "takeover"; side: "yes" | "no" } }) {
  if ((item.kind === "joined" || item.kind === "created") && "name" in item && item.name)
    return <RivalCharacter name={item.name} imageUrl={item.avatarUrl ?? null} size={28} />;
  const glyph = item.kind === "takeover" ? "🏟" : item.kind === "locked" ? "🔒" : item.kind === "result" ? "🏁" : "•";
  return <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[10px] bg-background text-sm">{glyph}</span>;
}

function ActivityText({ item }: { item: ActivityItem | { kind: "takeover"; side: "yes" | "no" } }) {
  const side = (s?: "yes" | "no") =>
    s ? (
      <span className="font-bold" style={{ color: SIDE_COLOR[s] }}>
        {s.toUpperCase()}
      </span>
    ) : null;
  switch (item.kind) {
    case "created":
      return (
        <>
          <span className="font-semibold">{item.name}</span> made the call and backed {side(item.side)}
          {item.cents ? <> with {formatMoney(item.cents)}</> : null}
        </>
      );
    case "joined":
      return (
        <>
          <span className="font-semibold">{item.name}</span> backed {side(item.side)}
          {item.cents ? <> with {formatMoney(item.cents)}</> : null}
        </>
      );
    case "locked":
      return <>Kick-off — stakes locked</>;
    case "result":
      return item.outcome === "void" ? <>Match void — everyone refunded</> : <>{side(item.outcome as "yes" | "no")} called it — winners paid</>;
    case "takeover":
      return <>{side(item.side)} end took the stadium</>;
  }
}

function OverviewPanel({ facts }: { facts: OverviewFact[] }) {
  return (
    <dl className="rounded-2xl border border-border bg-surface px-4 py-1">
      {facts.map((f) => (
        <div key={f.label} className="flex items-baseline justify-between gap-4 border-b border-border py-3 last:border-0">
          <dt className="text-sm text-muted">{f.label}</dt>
          <dd className="text-right text-sm font-medium text-foreground">{f.value}</dd>
        </div>
      ))}
    </dl>
  );
}

function Empty({ text }: { text: string }) {
  return <p className="rounded-2xl border border-border bg-surface px-4 py-8 text-center text-sm text-muted">{text}</p>;
}

function ago(now: number, at: number): string {
  const s = Math.max(0, Math.round((now - at) / 1000));
  if (s < 60) return "now";
  const m = Math.round(s / 60);
  if (m < 60) return `${m}m`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.round(h / 24)}d`;
}
