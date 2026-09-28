"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { teamIdentity } from "@/lib/team-identity";
import { eventFromRow, liveMinute, minuteLabel, scoreAtMinute, type TimelineData, type TimelineEvent } from "@/lib/match-timeline";
import { setReplay } from "@/lib/replay-store";
import type { Match } from "@/lib/types";
import { TeamCrest } from "../team-crest";
import { Badge } from "../ui/surfaces";

// The match on one slim strip attached to the bottom of the stadium: every
// goal, card, VAR call and whistle on a rail from kick-off to full time, with
// the room's own pulse — how hard the chat went, minute by minute — faint
// behind it. Follows the match live; play replays it (a full match in ~18s),
// drag to any minute, tap a moment for what happened and how the room reacted.
//
// Engagement mechanism #9 (a story you can retell — "look how the room went
// off at 67'") and #2 (anticipation: the live playhead creeping toward 90').

const REPLAY_SECONDS = 18;
// Which marker sits on top when moments fan out: goals first.
const IMPORTANCE: Partial<Record<TimelineEvent["kind"], number>> = { goal: 6, red: 5, penalty: 4, var: 3, "var-end": 3, yellow: 2 };

const TONE = {
  goal: "var(--rival-green)",
  yellow: "#f5c542",
  red: "#ef4444",
  var: "#14b8c4",
} as const;

export function MatchTimeline({ match, initial }: { match: Match; initial: TimelineData }) {
  const [events, setEvents] = useState(initial.events);
  // NFL: the quarter count carries on from the server's build as live events arrive.
  const nflRef = useRef(initial.nfl ? { ...initial.nfl } : undefined);
  const [nfl, setNfl] = useState(initial.nfl);
  const data = useMemo(() => ({ ...initial, events, nfl }), [initial, events, nfl]);
  const live = match.status === "live";
  const finished = match.status === "finished";
  const started = live || finished || events.length > 0;
  const home = teamIdentity(match.homeTeam);
  const away = teamIdentity(match.awayTeam);

  // Live moments arrive as they happen.
  useEffect(() => {
    if (!live) return;
    const supabase = createClient();
    const channel = supabase
      .channel(`timeline:${match.id}:${Math.random().toString(36).slice(2)}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "match_events", filter: `match_id=eq.${match.id}` }, (payload) => {
        const r = payload.new as { id: string; action: string; minute: number | null; payload: Record<string, unknown> | null; occurred_at: string };
        const e = eventFromRow({ id: r.id, action: r.action, minute: r.minute, payload: r.payload, occurredAt: r.occurred_at }, { ...initial, nfl: nflRef.current });
        if (e)
          setEvents((list) =>
            // One halftime marker, however the feed reports it.
            e.kind === "halftime" && list.some((x) => x.kind === "halftime" && x.id !== e.id)
              ? list
              : [...list.filter((x) => x.id !== e.id), e].sort((a, b) => a.minute - b.minute || a.at - b.at),
          );
        if (nflRef.current) setNfl({ ...nflRef.current });
      })
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [live, match.id, initial]);

  // Playhead: follows the match live (or sits at full time) until you take over.
  const lastMinute = events.reduce((m, e) => Math.max(m, e.minute), 0);
  const [following, setFollowing] = useState(true);
  const [manual, setManualState] = useState(0);
  const manualRef = useRef(0);
  const setManual = useCallback((m: number) => {
    manualRef.current = m;
    setManualState(m);
  }, []);
  const [playing, setPlaying] = useState(false);
  const [clock, setClock] = useState(0);
  useEffect(() => {
    if (!live) return;
    const tick = () => setClock(Date.now());
    const first = window.setTimeout(tick, 0);
    const t = window.setInterval(tick, 15_000);
    return () => {
      window.clearTimeout(first);
      window.clearInterval(t);
    };
  }, [live]);
  const liveAt = live ? (clock ? liveMinute(data, clock) : lastMinute) : finished ? data.domain : 0;
  const head = following ? liveAt : manual;

  // Replay: move the playhead from where it is to "now" (or full time).
  useEffect(() => {
    if (!playing) return;
    let frame = 0;
    let last = performance.now();
    const stopAt = live ? liveAt : data.domain;
    const step = (t: number) => {
      const dt = (t - last) / 1000;
      last = t;
      const next = Math.min(stopAt, manualRef.current + (data.domain / REPLAY_SECONDS) * dt);
      setManual(next);
      if (next >= stopAt) {
        setPlaying(false);
        if (live) setFollowing(true);
        return;
      }
      frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [playing, live, liveAt, data.domain, setManual]);

  function togglePlay() {
    if (playing) {
      setPlaying(false);
      return;
    }
    const stopAt = live ? liveAt : data.domain;
    setManual(following || head >= stopAt - 0.5 ? 0 : head);
    setFollowing(false);
    setPlaying(true);
  }

  // Scrubbing
  const track = useRef<HTMLDivElement>(null);
  const minuteAtX = useCallback(
    (clientX: number) => {
      const el = track.current;
      if (!el) return 0;
      const r = el.getBoundingClientRect();
      const cap = live ? liveAt : finished ? data.domain : 0;
      return Math.max(0, Math.min(cap, ((clientX - r.left) / r.width) * data.domain));
    },
    [live, liveAt, finished, data.domain],
  );
  const dragging = useRef(false);
  function onPointerDown(e: React.PointerEvent) {
    if (!started || (e.target as HTMLElement).closest("button")) return;
    dragging.current = true;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    setPlaying(false);
    setFollowing(false);
    setManual(minuteAtX(e.clientX));
    setSelected(null);
  }
  function onPointerMove(e: React.PointerEvent) {
    if (dragging.current) setManual(minuteAtX(e.clientX));
  }
  function onKey(e: React.KeyboardEvent) {
    const cap = live ? liveAt : data.domain;
    const d = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
    if (d) {
      e.preventDefault();
      setFollowing(false);
      setPlaying(false);
      setManual(Math.max(0, Math.min(cap, head + d)));
    }
  }

  // Tapped moment
  const [selected, setSelected] = useState<string | null>(null);
  const picked = events.find((e) => e.id === selected) ?? null;
  const wrap = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!selected) return;
    const close = (e: PointerEvent) => {
      if (!(e.target as HTMLElement).closest("[data-moment]")) setSelected(null);
    };
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setSelected(null);
    document.addEventListener("pointerdown", close);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("pointerdown", close);
      document.removeEventListener("keydown", esc);
    };
  }, [selected]);

  const pct = (m: number) => `${(m / data.domain) * 100}%`;

  // Lay out the moments on the one rail. Moments that land within a few
  // minutes of each other form a little fan — each nudged sideways, up or
  // down, and tilted slightly — so every one stays visible and tappable, with
  // the one that matters most (a goal) drawn on top.
  const placed = useMemo(() => {
    const out: { e: TimelineEvent; dx: number; dy: number; rot: number; z: number }[] = [];
    const clusters: TimelineEvent[][] = [];
    for (const e of events) {
      const x = (e.minute / data.domain) * 100;
      const cur = clusters[clusters.length - 1];
      // Chained: a moment joins the fan if it's close to the previous one, so a run of them fans as one.
      if (cur && x - (cur[cur.length - 1].minute / data.domain) * 100 < 5) cur.push(e);
      else clusters.push([e]);
    }
    for (const group of clusters) {
      const mid = (group.length - 1) / 2;
      group.forEach((e, i) => {
        const k = i - mid;
        const fanned = group.length > 1;
        out.push({
          e,
          dx: fanned ? k * 12 : 0,
          dy: fanned ? (i % 2 ? -12 : 12) : 0,
          rot: fanned ? Math.max(-18, Math.min(18, k * 9)) : 0,
          z: IMPORTANCE[e.kind] ?? 1,
        });
      });
    }
    return out;
  }, [events, data.domain]);
  const heatMax = Math.max(1, ...data.heat);
  const showMinute = started && (!following || playing);

  // While you drag back or replay, the stadium's scoreboard shows the score
  // and minute at the playhead (replay-store.ts); following live, it's live.
  useEffect(() => {
    setReplay(match.id, showMinute ? { score: scoreAtMinute(data, head), label: minuteLabel(data.sport, head) } : null);
  }, [match.id, showMinute, data, head]);
  useEffect(() => () => setReplay(match.id, null), [match.id]);

  return (
    <section
      ref={wrap}
      className="-mx-4 rounded-b-sheet px-4 pb-3 pt-3 md:mx-0"
      style={{ background: "color-mix(in srgb, var(--st-pitch-2) 22%, #050806)" }}
      aria-label="Match timeline"
    >
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={togglePlay}
          disabled={!started}
          aria-label={playing ? "Pause replay" : "Replay the match"}
          className="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white text-black transition-[transform,opacity] duration-100 before:absolute before:-inset-1.5 active:scale-90 disabled:opacity-25"
        >
          {playing ? (
            <svg width="11" height="11" viewBox="0 0 12 12" aria-hidden>
              <rect x="2" y="1.5" width="2.6" height="9" rx="0.8" fill="currentColor" />
              <rect x="7.4" y="1.5" width="2.6" height="9" rx="0.8" fill="currentColor" />
            </svg>
          ) : (
            <svg width="11" height="11" viewBox="0 0 12 12" aria-hidden>
              <path d="M3 1.8v8.4a.6.6 0 0 0 .9.5l6.7-4.2a.6.6 0 0 0 0-1L3.9 1.3a.6.6 0 0 0-.9.5Z" fill="currentColor" />
            </svg>
          )}
        </button>
        <span className="text-caption tabular-nums text-white/55">{data.sport === "nfl" ? "Q1" : "0’"}</span>

        {/* The track */}
        <div
          ref={track}
          role="slider"
          tabIndex={started ? 0 : -1}
          aria-label="Match timeline"
          aria-valuemin={0}
          aria-valuemax={Math.round(data.domain)}
          aria-valuenow={Math.round(head)}
          aria-valuetext={`${Math.floor(head)} minutes`}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={() => (dragging.current = false)}
          onPointerCancel={() => (dragging.current = false)}
          onKeyDown={onKey}
          className="relative h-10 min-w-0 flex-1 cursor-pointer touch-pan-y select-none rounded-tag outline-none focus-visible:ring-2 focus-visible:ring-yes"
        >
          {/* The room's pulse, faint behind the rail */}
          <div className="absolute inset-x-0 bottom-0.5 flex h-3 items-end gap-px" aria-hidden>
            {data.heat.map((n, i) => {
              const past = ((i + 0.5) / data.heat.length) * data.domain <= head;
              return (
                <span
                  key={i}
                  className="flex-1 rounded-t-[1px] transition-colors duration-300"
                  style={{
                    height: n ? `${Math.max(25, (n / heatMax) * 100)}%` : "1px",
                    background: n ? (past ? "rgba(124,155,255,0.9)" : "rgba(124,155,255,0.35)") : "rgba(255,255,255,0.12)",
                  }}
                />
              );
            })}
          </div>

          {/* The rail: played part lit */}
          <div className="absolute inset-x-0 top-1/2 h-1 -translate-y-1/2 overflow-hidden rounded-full bg-white/15">
            <div className="h-full rounded-full bg-rival-green" style={{ width: pct(head) }} />
          </div>
          {data.sport === "soccer" && <div className="absolute top-1/2 h-3 w-px -translate-y-1/2 bg-white/30" style={{ left: pct(45) }} aria-hidden />}
          {/* NFL: a notch at each quarter break. */}
          {data.sport === "nfl" &&
            [15, 30, 45, 60].filter((m) => m < data.domain).map((m) => <div key={m} className="absolute top-1/2 h-3 w-px -translate-y-1/2 bg-white/30" style={{ left: pct(m) }} aria-hidden />)}

          {/* Moments */}
          {placed.map(({ e, dx, dy, rot, z }) => {
            const reached = e.minute <= head + 0.01;
            return (
              <button
                key={e.id}
                type="button"
                data-moment
                onClick={() => setSelected(selected === e.id ? null : e.id)}
                aria-label={`${e.title}, ${e.clock ?? `${Math.floor(e.minute)} minutes`}`}
                className="absolute top-1/2 transition-[opacity,transform] duration-300 ease-out"
                style={{
                  left: pct(e.minute),
                  opacity: reached ? 1 : 0.3,
                  transform: `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px)) rotate(${rot}deg) scale(${reached ? 0.8 : 0.68})`,
                  zIndex: z,
                }}
              >
                <MomentMark sport={data.sport} kind={e.kind} ring={e.side === "home" ? home.primary : e.side === "away" ? away.primary : undefined} />
              </button>
            );
          })}

          {/* Playhead, with the minute while you drag or replay */}
          {started && (
            <div className="pointer-events-none absolute inset-y-0 w-0" style={{ left: pct(head) }} aria-hidden>
              <div className="absolute left-1/2 top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-[#050806] bg-white" />
              {showMinute && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-tag bg-white px-1 text-micro font-bold tabular-nums text-black">
                  {minuteLabel(data.sport, head)}
                </span>
              )}
            </div>
          )}

          {picked && <MomentCard event={picked} left={(picked.minute / data.domain) * 100} home={match.homeTeam} away={match.awayTeam} sport={data.sport} />}
        </div>

        <span className="text-caption tabular-nums text-white/55">{data.sport === "nfl" ? (data.domain > 60 ? "OT" : "Q4") : `${Math.round(data.domain)}’`}</span>
        {live && !following && (
          <button
            type="button"
            onClick={() => {
              setPlaying(false);
              setFollowing(true);
            }}
            aria-label="Back to live"
            className="flex h-6 shrink-0 items-center rounded-full bg-white/10 px-2 transition-transform active:scale-95"
          >
            <Badge tone="live">Live</Badge>
          </button>
        )}
      </div>
    </section>
  );
}

function MomentMark({ kind, ring, sport = "soccer" }: { kind: TimelineEvent["kind"]; ring?: string; sport?: "soccer" | "nfl" }) {
  if (kind === "goal" && sport === "nfl")
    return (
      <span className="flex h-[22px] w-[22px] items-center justify-center rounded-full bg-white shadow-sm" style={{ boxShadow: ring ? `0 0 0 2px ${ring}` : undefined }}>
        <svg width="14" height="14" viewBox="0 0 16 16" aria-hidden>
          <ellipse cx="8" cy="8" rx="6.6" ry="4.2" transform="rotate(-35 8 8)" fill="#7a3e1d" />
          <path d="M5.8 10.2 10.2 5.8" stroke="#fff" strokeWidth="0.9" strokeLinecap="round" />
          <path d="M6.9 8.2l.9.9M7.9 7.2l.9.9M8.9 6.2l.9.9" stroke="#fff" strokeWidth="0.8" strokeLinecap="round" />
        </svg>
      </span>
    );
  if (kind === "goal")
    return (
      <span className="flex h-[22px] w-[22px] items-center justify-center rounded-full bg-white shadow-sm" style={{ boxShadow: ring ? `0 0 0 2px ${ring}` : undefined }}>
        <svg width="14" height="14" viewBox="0 0 16 16" aria-hidden>
          <circle cx="8" cy="8" r="7" fill="#fff" stroke="#111" strokeWidth="1.2" />
          <path d="M8 4.6 10.7 6.6 9.7 9.8H6.3L5.3 6.6Z" fill="#111" />
          <path d="M8 4.6V1.4M10.7 6.6l3-1M9.7 9.8l1.9 2.6M6.3 9.8l-1.9 2.6M5.3 6.6l-3-1" stroke="#111" strokeWidth="1" />
        </svg>
      </span>
    );
  if (kind === "yellow" || kind === "red")
    return (
      <span className="flex h-[22px] w-[22px] items-center justify-center" aria-hidden>
        <span className="h-[15px] w-[11px] rotate-[8deg] rounded-[2px] shadow-sm" style={{ background: TONE[kind], boxShadow: ring ? `0 0 0 1.5px ${ring}` : undefined }} />
      </span>
    );
  if (kind === "var" || kind === "var-end")
    return (
      <span className="flex h-[22px] items-center rounded-tag px-1 text-micro font-bold text-white" style={{ background: TONE.var }}>
        VAR
      </span>
    );
  if (kind === "penalty")
    return <span className="flex h-[22px] w-[22px] items-center justify-center rounded-full border border-line-strong bg-background text-micro font-bold text-foreground">P</span>;
  // Whistles: kick-off, half-time, full time — a quiet notch on the rail.
  return (
    <span className="flex h-[22px] w-[14px] items-center justify-center">
      <span className="h-3 w-3 rounded-full border-2 border-secondary bg-background" />
    </span>
  );
}

function MomentCard({ event, left, home, away, sport }: { event: TimelineEvent; left: number; home: string; away: string; sport: "soccer" | "nfl" }) {
  const team = event.side === "home" ? home : event.side === "away" ? away : null;
  // Keep the card on screen near the edges.
  const anchor = left < 22 ? "left" : left > 78 ? "right" : "center";
  return (
    <div
      data-moment
      role="dialog"
      aria-label={event.title}
      className="enter-pop absolute top-[calc(100%+6px)] z-30 w-56 rounded-card bg-surface-elevated p-3 text-left shadow-pop"
      style={{
        left: `${left}%`,
        transform: anchor === "center" ? "translateX(-50%)" : anchor === "right" ? "translateX(-92%)" : "translateX(-8%)",
      }}
    >
      <div className="flex items-center gap-2">
        <MomentMark kind={event.kind} sport={sport} />
        <p className="min-w-0 flex-1 truncate text-label font-display font-bold text-foreground">
          {event.title}
          {event.player && <span className="font-semibold text-foreground/80"> · {event.player}</span>}
        </p>
        <span className="text-caption font-semibold tabular-nums text-secondary">{event.clock ?? `${Math.floor(event.minute)}’`}</span>
      </div>
      {event.detail && <p className="mt-2 text-caption text-foreground/85">{event.detail}</p>}
      {team && (
        <p className="mt-2 flex items-center gap-1.5 text-caption text-secondary">
          <TeamCrest name={team} size={14} /> {team}
        </p>
      )}
      <p className="mt-2 border-t border-line pt-2 text-caption text-secondary">
        {event.reactions === null
          ? "💬 Just happened — the room's reacting"
          : event.reactions === 0
            ? "💬 The room stayed quiet"
            : `💬 ${event.reactions} ${event.reactions === 1 ? "message" : "messages"} in the room right after`}
      </p>
    </div>
  );
}
