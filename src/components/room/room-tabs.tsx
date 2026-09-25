"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { formatMoney } from "@/lib/mock-data";
import { teamIdentity } from "@/lib/team-identity";
import { useRoomRace } from "@/lib/room-energy";
import { matchStats, momentum, type StatRow } from "@/lib/match-stats";
import { buildLineups } from "@/lib/match-lineups";
import { useMatchFeed } from "@/lib/use-match-feed";
import type { EventRow } from "@/lib/match-timeline";
import type { Match } from "@/lib/types";
import { TeamCrest } from "../team-crest";
import { RivalCharacter } from "../rival-character";
import { LineupPanel, kitsFrom } from "./room-lineup";
import { teamFills } from "@/lib/team-fills";
import { feedClock, matchStory } from "@/lib/match-pressure";
import { LiveBadge } from "../live-badge";
import { MatchAnalysis } from "./match-analysis";
import { CHAT_ACTIVITY_EVENT, ROOM_TAB_EVENT, type ChatActivity } from "./room-tabs-event";

// Everything under the pool, in tabs: the line-ups, the crowd (chat), the
// match stats, the room's activity and an overview. Chat stays mounted when you switch away,
// so it keeps listening (and keeps feeding the stadium race) in the
// background. All real data: TxLINE's line-ups and team stats, the room's own
// entries and takeovers — nothing filled in. Chat is where the room opens:
// the crowd is the point (engagement mechanism #4).

type Tab = "lineup" | "chat" | "stats" | "activity" | "overview";
// Chat in the middle — the crowd is the heart of the room — with the match on
// its left and the room's own record on its right.
const TABS: { id: Tab; label: string }[] = [
  { id: "lineup", label: "Lineup" },
  { id: "stats", label: "Stats" },
  { id: "chat", label: "Chat" },
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
  sport,
  events,
  activity,
  overview,
  roomId,
}: {
  chat: ReactNode;
  match: Match;
  /** For the match-story share card. */
  roomId?: string;
  sport: "soccer" | "nfl";
  /** The match's events so far (collapsed); the tab keeps them live from here. */
  events: EventRow[];
  activity: ActivityItem[];
  overview: OverviewFact[];
}) {
  const [tab, setTab] = useState<Tab>("chat");
  // Live while the match can still change; a finished match is what it is.
  const rows = useMatchFeed(match.id, events, match.status !== "finished");
  const stats = useMemo(() => matchStats(match, rows, sport), [match, rows, sport]);
  const flow = useMemo(() => (sport === "soccer" ? momentum(rows) : null), [rows, sport]);
  // Football only: NFL sends "lineups" too, but a pitch of 53-man rosters isn't one.
  const lineups = useMemo(() => (sport === "soccer" ? buildLineups(rows, match.homeTeam, match.awayTeam) : undefined), [rows, sport, match.homeTeam, match.awayTeam]);
  const kits = useMemo(() => kitsFrom(rows), [rows]);
  const story = useMemo(
    () =>
      sport === "soccer"
        ? matchStory(rows, { home: match.homeTeam, away: match.awayTeam, homeScore: match.homeScore ?? null, awayScore: match.awayScore ?? null, finished: match.status === "finished" })
        : null,
    [rows, sport, match.homeTeam, match.awayTeam, match.homeScore, match.awayScore, match.status],
  );

  // Where it's happening: the chat. Whenever it's out of sight (another tab,
  // or scrolled up to the stadium) new messages, match moments and pressure
  // alerts count up on the Chat tab and in a pill above the nav that takes
  // you straight there. Engagement mechanisms #4 (collective effervescence:
  // the room going off is the pull) and #9 (FOMO, from real activity only).
  const chatRef = useRef<HTMLDivElement>(null);
  const [chatInView, setChatInView] = useState(false);
  const [chatBelow, setChatBelow] = useState(true);
  const [unread, setUnread] = useState(0);
  const [alert, setAlert] = useState<{ text: string; colour?: string } | null>(null);
  const seeing = useRef(false);
  useEffect(() => {
    seeing.current = tab === "chat" && chatInView;
  }, [tab, chatInView]);

  const clearUnread = useCallback(() => {
    setUnread(0);
    setAlert(null);
  }, []);

  useEffect(() => {
    const el = chatRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        setChatInView(entry.isIntersecting);
        setChatBelow(entry.boundingClientRect.top > 0);
        if (entry.isIntersecting && !el.hidden) clearUnread();
      },
      // Seen means it has come up into the screen, not a sliver peeking
      // over the nav at the very bottom.
      { threshold: 0, rootMargin: "0px 0px -40% 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [clearUnread]);

  useEffect(() => {
    const on = (e: Event) => {
      if (seeing.current) return;
      const a = (e as CustomEvent<ChatActivity>).detail;
      setUnread((n) => n + 1);
      if (a.kind === "alert" && a.text) setAlert({ text: a.text, colour: a.colour });
    };
    window.addEventListener(CHAT_ACTIVITY_EVENT, on);
    return () => window.removeEventListener(CHAT_ACTIVITY_EVENT, on);
  }, []);

  const choose = useCallback(
    (t: Tab) => {
      setTab(t);
      if (t === "chat") clearUnread();
    },
    [clearUnread],
  );
  const jumpToChat = () => {
    choose("chat");
    // After the tab switch renders (the chat panel is hidden until then).
    window.setTimeout(() => chatRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 30);
  };

  // The floating bar: once the tabs reach the top of the screen they stick
  // there as a capsule, with a mini scoreboard above them, so switching tabs
  // and knowing the score never takes a scroll. "Stuck" is read from where
  // the bar sits against its own sticky offset.
  const barRef = useRef<HTMLDivElement>(null);
  const [stuck, setStuck] = useState(false);
  useEffect(() => {
    // One rect read per scroll event; React skips the re-render when the
    // value hasn't changed.
    const check = () => {
      const el = barRef.current;
      if (!el) return;
      const top = parseFloat(getComputedStyle(el).top) || 0;
      // A little early, so the app bar is already sliding away as the tabs arrive.
      setStuck(el.getBoundingClientRect().top <= top + 16 && window.scrollY > 0);
    };
    check();
    window.addEventListener("scroll", check, { passive: true });
    window.addEventListener("resize", check);
    return () => {
      window.removeEventListener("scroll", check);
      window.removeEventListener("resize", check);
    };
  }, []);
  // While the bar is stuck, the app's own top bar slides away (globals.css)
  // so the room gets the whole screen — like opening a chat in a messaging app.
  useEffect(() => {
    document.documentElement.toggleAttribute("data-room-stuck", stuck);
    return () => document.documentElement.removeAttribute("data-room-stuck");
  }, [stuck]);
  const minute = useMemo(() => {
    const c = feedClock(rows);
    return c > 0 ? Math.floor(c / 60) + 1 : null;
  }, [rows]);

  // The pressure ticker (inside the chat) can ask for the momentum chart.
  useEffect(() => {
    const go = (e: Event) => {
      const t = (e as CustomEvent<Tab>).detail;
      if (TABS.some((x) => x.id === t)) choose(t);
    };
    window.addEventListener(ROOM_TAB_EVENT, go);
    return () => window.removeEventListener(ROOM_TAB_EVENT, go);
  }, [choose]);

  return (
    <section className="flex flex-col">
      {/* Sticks 44px down; once stuck, the mini scoreboard fills that strip
          above it. The bar's own height never changes, so nothing jumps
          as you scroll past. */}
      <div ref={barRef} className="sticky top-[44px] z-30 pb-2 pt-2 md:top-[calc(var(--header-height)+44px)]">
        {stuck && (
          <div className="absolute inset-x-0 bottom-full flex h-11 items-end justify-center pb-0.5">
            <MiniScoreboard match={match} minute={minute} />
          </div>
        )}
      <div
        role="tablist"
        aria-label="Room"
        className="no-scrollbar flex gap-1 overflow-x-auto rounded-full p-1 ring-1 ring-border transition-[box-shadow,background-color] duration-200"
        style={stuck ? FLOAT : { background: "var(--surface)" }}
      >
        {TABS.filter((t) => t.id !== "lineup" || lineups !== undefined).map((t) =>
          t.id === "chat" ? (
            // The room's heart gets the contrast: always bold with a live
            // dot, inverted when open, and a count of what you're missing.
            <button
              key={t.id}
              role="tab"
              type="button"
              aria-selected={tab === "chat"}
              onClick={() => choose("chat")}
              className="relative flex h-9 flex-1 shrink-0 items-center justify-center gap-1.5 rounded-full px-3 text-[13px] font-bold transition-[background-color,color,transform] duration-150 active:scale-[0.97] md:text-sm"
              style={{
                background: tab === "chat" ? "var(--foreground)" : "color-mix(in srgb, var(--rival-green) 12%, transparent)",
                color: tab === "chat" ? "var(--background)" : "var(--foreground)",
                boxShadow: tab === "chat" ? "0 1px 3px rgba(0,0,0,0.25)" : "inset 0 0 0 1px color-mix(in srgb, var(--rival-green) 35%, transparent)",
              }}
            >
              <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-rival-green" />
              Chat
              {unread > 0 && tab !== "chat" && (
                <span key={unread} className="enter-pop flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-rival-green px-1 font-mono text-[10px] font-bold tabular-nums text-black">
                  {unread > 99 ? "99+" : unread}
                </span>
              )}
            </button>
          ) : (
            <button
              key={t.id}
              role="tab"
              type="button"
              aria-selected={tab === t.id}
              onClick={() => choose(t.id)}
              className="h-9 flex-1 shrink-0 rounded-full px-2.5 text-[13px] font-semibold transition-[background-color,color] duration-150 md:px-3 md:text-sm"
              style={{
                background: tab === t.id ? "var(--background)" : "transparent",
                color: tab === t.id ? "var(--foreground)" : "var(--muted)",
                boxShadow: tab === t.id ? "0 1px 2px rgba(0,0,0,0.12)" : undefined,
              }}
            >
              {t.label}
            </button>
          ),
        )}
      </div>
      </div>

      <div className="mt-1">
        {/* Chat stays mounted so the room keeps listening while you look
            elsewhere. It fills the screen under the floating bar (and above
            the phone's tab bar), like a messaging app: the thread scrolls
            inside it, the message box stays put. */}
        <div
          ref={chatRef}
          hidden={tab !== "chat"}
          className="h-[calc(100dvh-156px-env(safe-area-inset-bottom))] min-h-[420px] scroll-mt-[108px] md:h-[calc(100dvh-var(--header-height)-132px)] md:scroll-mt-[calc(var(--header-height)+108px)]"
        >
          {chat}
        </div>
        {tab === "lineup" && lineups !== undefined && <LineupPanel match={match} lineups={lineups} kits={kits} />}
        {tab === "stats" && (
          <div className="flex flex-col gap-3">
            {flow && <MatchAnalysis match={match} data={flow} story={story} roomId={roomId} />}
            <StatsPanel match={match} rows={stats} />
          </div>
        )}
        {tab === "activity" && <ActivityPanel items={activity} />}
        {tab === "overview" && <OverviewPanel facts={overview} />}
      </div>

      {unread > 0 && !(tab === "chat" && chatInView) && <JumpPill count={unread} alert={alert} up={tab === "chat" && !chatBelow} onJump={jumpToChat} />}
    </section>
  );
}

// A floating capsule: frosted surface, a tight shadow, the page visible
// around it.
const FLOAT = {
  background: "color-mix(in srgb, var(--surface) 86%, transparent)",
  backdropFilter: "blur(14px) saturate(1.2)",
  WebkitBackdropFilter: "blur(14px) saturate(1.2)",
  boxShadow: "0 8px 24px -10px rgba(0,0,0,0.55), 0 1px 2px rgba(0,0,0,0.2)",
} as const;

// The score while you're down in the tabs: both sides, the score (or the
// kick-off time), and the live minute. Tap it to go back up to the stadium.
function MiniScoreboard({ match, minute }: { match: Match; minute: number | null }) {
  const home = teamIdentity(match.homeTeam);
  const away = teamIdentity(match.awayTeam);
  const live = match.status === "live";
  const finished = match.status === "finished";
  const started = live || finished;
  return (
    <button
      type="button"
      onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
      aria-label="Back to the stadium"
      className="flex h-9 w-fit max-w-full items-center gap-2 rounded-full pl-3 pr-3.5 ring-1 ring-border transition-transform duration-150 [animation:fade-in-up_260ms_cubic-bezier(0.23,1,0.32,1)_both] active:scale-[0.97]"
      style={FLOAT}
    >
      <span className="flex items-center gap-1.5">
        <TeamCrest name={match.homeTeam} size={20} />
        <span className="text-[13px] font-bold text-foreground">{home.code}</span>
      </span>
      <span className="shrink-0 px-0.5 font-display text-base font-extrabold tabular-nums text-foreground">
        {started ? `${match.homeScore ?? 0} – ${match.awayScore ?? 0}` : "vs"}
      </span>
      <span className="flex items-center gap-1.5">
        <span className="text-[13px] font-bold text-foreground">{away.code}</span>
        <TeamCrest name={match.awayTeam} size={20} />
      </span>
      <span className="h-4 w-px bg-border" aria-hidden />
      <span className="flex items-center">
        <span className="shrink-0 font-mono text-[11px] font-semibold text-muted">
          {live ? (
            <span className="flex items-center gap-1.5">
              <LiveBadge />
              {minute !== null && <span className="text-foreground">{minute}&rsquo;</span>}
            </span>
          ) : finished ? (
            "FT"
          ) : (
            new Date(match.kickoffAt).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })
          )}
        </span>
      </span>
    </button>
  );
}

// Floats above the nav while the chat is out of sight and something new has
// dropped in it: the live alert when there is one, else the count.
function JumpPill({ count, alert, up, onJump }: { count: number; alert: { text: string; colour?: string } | null; up: boolean; onJump: () => void }) {
  return (
    <button
      type="button"
      onClick={onJump}
      className="fixed inset-x-0 bottom-[calc(84px+env(safe-area-inset-bottom))] z-20 mx-auto flex h-10 w-fit max-w-[min(92vw,360px)] items-center gap-2 rounded-full bg-foreground pl-3 pr-2 text-[13px] font-semibold text-background shadow-[0_4px_14px_rgba(0,0,0,0.3)] transition-transform duration-150 [animation:fade-in-up_360ms_cubic-bezier(0.23,1,0.32,1)_both] active:scale-95 md:bottom-6"
      aria-label={`${count} new in the chat, jump to it`}
    >
      <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden className={up ? "rotate-180" : ""}>
        <path d="M7 2.5v9M3.5 8 7 11.5 10.5 8" stroke="currentColor" strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      {alert ? (
        <>
          <span aria-hidden className="h-2.5 w-2.5 shrink-0 rounded-full ring-1 ring-background/40" style={{ background: alert.colour ?? "var(--rival-green)" }} />
          <span className="min-w-0 truncate">{alert.text}</span>
        </>
      ) : (
        <span>New in the chat</span>
      )}
      <span key={count} className="enter-pop flex h-6 min-w-6 items-center justify-center rounded-full bg-rival-green px-1.5 font-mono text-[11px] font-bold tabular-nums text-black">
        {count > 99 ? "99+" : count}
      </span>
    </button>
  );
}

// Team stats, Google-style: the numbers either side, the leader's pill in
// its team colour, and a split bar under each row.
function StatsPanel({ match, rows }: { match: Match; rows: StatRow[] }) {
  const home = teamIdentity(match.homeTeam);
  const away = teamIdentity(match.awayTeam);
  const fills = teamFills(match);
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
                <Value value={r.home} pct={r.pct} lead={r.home > r.away} color={fills.home.fill} ink={fills.home.ink} align="left" />
                <span className="text-center text-sm text-foreground">{r.label}</span>
                <Value value={r.away} pct={r.pct} lead={r.away > r.home} color={fills.away.fill} ink={fills.away.ink} align="right" />
              </div>
              <div className="mt-1.5 flex h-1 gap-0.5 overflow-hidden rounded-full">
                <span className="h-full rounded-full" style={{ width: `${homePct}%`, background: total ? fills.home.fill : "var(--border)", boxShadow: EDGE }} />
                <span className="h-full flex-1 rounded-full" style={{ background: total ? fills.away.fill : "var(--border)", boxShadow: EDGE }} />
              </div>
            </li>
          );
        })}
      </ul>
      <p className="pt-2 text-center text-[10px] text-muted">From the official match feed</p>
    </div>
  );
}

// A hairline so a white kit still reads on a light surface.
const EDGE = "inset 0 0 0 1px color-mix(in srgb, var(--foreground) 14%, transparent)";

function Value({ value, pct, lead, color, ink, align }: { value: number; pct?: boolean; lead: boolean; color: string; ink: string; align: "left" | "right" }) {
  return (
    <span className={`flex ${align === "left" ? "justify-start" : "justify-end"}`}>
      <span
        className="min-w-7 rounded-full px-2 py-0.5 text-center font-mono text-sm font-bold tabular-nums"
        style={lead ? { background: color, color: ink, boxShadow: EDGE } : { color: "var(--foreground)" }}
      >
        {value}
        {pct && "%"}
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
