"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { teamIdentity } from "@/lib/team-identity";
import { eventFromRow, liveMinute, type TimelineData, type TimelineEvent } from "@/lib/match-timeline";
import type { Match } from "@/lib/types";
import { TeamCrest } from "../team-crest";

// The match on one line, right under the stadium: every goal, card, VAR call
// and whistle on a track from kick-off to full time, home team's moments
// above the line and away team's below, with the room's own pulse — how hard
// the chat went, minute by minute — underneath. Follows the match live;
// press play to replay it (a full match in ~18s), drag to any minute to see
// the score then, tap a moment for what happened and how the room reacted.
//
// Engagement mechanism #9 (a story you can retell — "look how the room went
// off at 67'") and #2 (anticipation: the live playhead creeping toward 90').

const REPLAY_SECONDS = 18;
const TONE = {
  goal: "var(--rival-green)",
  yellow: "#f5c542",
  red: "#ef4444",
  var: "#14b8c4",
} as const;

export function MatchTimeline({ match, initial }: { match: Match; initial: TimelineData }) {
  const [events, setEvents] = useState(initial.events);
  const data = useMemo(() => ({ ...initial, events }), [initial, events]);
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
        const e = eventFromRow({ id: r.id, action: r.action, minute: r.minute, payload: r.payload, occurredAt: r.occurred_at }, initial);
        if (e) setEvents((list) => [...list.filter((x) => x.id !== e.id), e].sort((a, b) => a.minute - b.minute || a.at - b.at));
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

  // Lay out the moments: home above the rail, away below, whistles and
  // unknown-team moments on it — and nudge any that would land on top of
  // each other so every one stays tappable.
  const placed = useMemo(() => {
    const lastX: Record<string, number> = {};
    const flip: Record<string, number> = {};
    return events.map((e) => {
      const lane = e.kind === "kickoff" || e.kind === "halftime" || e.kind === "fulltime" ? "rail" : e.side ?? "rail";
      const x = (e.minute / data.domain) * 100;
      let top = lane === "home" ? 10 : lane === "away" ? 56 : 33;
      const crowded = lastX[lane] !== undefined && x - lastX[lane] < 6;
      if (crowded) {
        flip[lane] = (flip[lane] ?? 0) + 1;
        const n = flip[lane];
        top += lane === "rail" ? (n % 2 ? -21 : 21) : lane === "home" ? -12 * n : 12 * n;
      } else flip[lane] = 0;
      lastX[lane] = x;
      return { e, top };
    });
  }, [events, data.domain]);
  const heatMax = Math.max(1, ...data.heat);

  return (
    <section ref={wrap} className="rounded-2xl border border-border bg-surface px-3 pb-3 pt-3">
      {/* Readout: the minute under the playhead (the score lives in the stadium above) */}
      <div className="flex items-center justify-between gap-2 px-1">
        <p className="font-display text-sm font-bold text-foreground">Match timeline</p>
        {started ? (
          <p className="flex items-center gap-1.5 font-mono text-xs tabular-nums text-muted">
            <span className="font-semibold text-foreground">{Math.floor(head)}&rsquo;</span>
          </p>
        ) : (
          <p className="font-mono text-[11px] text-muted">Fills in from kick-off</p>
        )}
      </div>

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
        className="relative ml-6 mr-2 mt-2 h-[92px] cursor-pointer touch-pan-y select-none outline-none focus-visible:ring-2 focus-visible:ring-rival-blue"
      >
        {/* Team lanes */}
        <span className="absolute -left-5 top-[13px] flex items-center" aria-hidden>
          <TeamCrest name={match.homeTeam} size={12} />
        </span>
        <span className="absolute -left-5 top-[59px] flex items-center" aria-hidden>
          <TeamCrest name={match.awayTeam} size={12} />
        </span>

        {/* The rail: played part lit, the rest waiting */}
        <div className="absolute inset-x-0 top-[42px] h-1.5 overflow-hidden rounded-full bg-background">
          <div className="h-full rounded-full bg-rival-green/80" style={{ width: pct(head) }} />
        </div>
        {data.sport === "soccer" && (
          <div className="absolute top-[36px] h-[18px] w-px bg-border-strong" style={{ left: pct(45) }} aria-hidden>
            <span className="absolute left-1/2 top-[20px] -translate-x-1/2 font-mono text-[9px] text-muted">HT</span>
          </div>
        )}

        {/* The room's pulse */}
        <div className="absolute inset-x-0 bottom-0 flex h-4 items-end gap-px" aria-hidden>
          {data.heat.map((n, i) => {
            const past = ((i + 0.5) / data.heat.length) * data.domain <= head;
            return (
              <span
                key={i}
                className="flex-1 rounded-t-sm transition-colors duration-300"
                style={{
                  height: n ? `${Math.max(18, (n / heatMax) * 100)}%` : "2px",
                  background: n ? (past ? "var(--rival-blue)" : "color-mix(in srgb, var(--rival-blue) 35%, transparent)") : "var(--border)",
                }}
              />
            );
          })}
        </div>

        {/* Moments */}
        {placed.map(({ e, top }) => {
          const reached = e.minute <= head + 0.01;
          return (
            <button
              key={e.id}
              type="button"
              data-moment
              onClick={() => setSelected(selected === e.id ? null : e.id)}
              aria-label={`${e.title}, ${Math.floor(e.minute)} minutes`}
              className="absolute -translate-x-1/2 transition-[opacity,transform] duration-300 ease-out active:scale-90"
              style={{ left: pct(e.minute), top, opacity: reached ? 1 : 0.28, transform: `translateX(-50%) scale(${reached ? 1 : 0.85})` }}
            >
              <MomentMark kind={e.kind} ring={e.side === "home" ? home.primary : e.side === "away" ? away.primary : undefined} />
            </button>
          );
        })}

        {/* Playhead */}
        {started && (
          <div className="pointer-events-none absolute inset-y-0 w-0" style={{ left: pct(head) }} aria-hidden>
            <div className="absolute inset-y-1 -left-px w-0.5 rounded-full bg-foreground/70" />
            <div className="absolute left-1/2 top-[39px] h-3 w-3 -translate-x-1/2 rounded-full border-2 border-background bg-foreground" />
          </div>
        )}

        {/* What happened */}
        {picked && <MomentCard event={picked} left={(picked.minute / data.domain) * 100} home={match.homeTeam} away={match.awayTeam} />}
      </div>

      {/* Controls */}
      <div className="mt-2 flex items-center gap-2 px-1">
        <button
          type="button"
          onClick={togglePlay}
          disabled={!started}
          aria-label={playing ? "Pause replay" : "Replay the match"}
          className="flex h-8 w-8 items-center justify-center rounded-full bg-foreground text-background transition-[transform,opacity] duration-150 active:scale-90 disabled:opacity-30"
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
        <span className="font-mono text-[10px] text-muted">0&rsquo;</span>
        <span className="flex-1" />
        {live && !following && (
          <button
            type="button"
            onClick={() => {
              setPlaying(false);
              setFollowing(true);
            }}
            className="flex h-7 items-center gap-1.5 rounded-full border border-border px-2.5 font-mono text-[10px] font-semibold uppercase tracking-wider text-danger-red transition-transform active:scale-95"
          >
            <span className="h-1.5 w-1.5 rounded-full bg-danger-red" /> Live
          </button>
        )}
        <span className="font-mono text-[10px] text-muted">{Math.round(data.domain)}&rsquo;</span>
      </div>
    </section>
  );
}

function MomentMark({ kind, ring }: { kind: TimelineEvent["kind"]; ring?: string }) {
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
      <span className="flex h-[22px] items-center rounded-md px-1 font-mono text-[8px] font-bold tracking-wide text-white" style={{ background: TONE.var }}>
        VAR
      </span>
    );
  if (kind === "penalty")
    return <span className="flex h-[22px] w-[22px] items-center justify-center rounded-full border border-border-strong bg-background font-mono text-[10px] font-bold text-foreground">P</span>;
  // Whistles: kick-off, half-time, full time — a quiet notch on the rail.
  return (
    <span className="flex h-[22px] w-[14px] items-center justify-center">
      <span className="h-3 w-3 rounded-full border-2 border-muted bg-background" />
    </span>
  );
}

function MomentCard({ event, left, home, away }: { event: TimelineEvent; left: number; home: string; away: string }) {
  const team = event.side === "home" ? home : event.side === "away" ? away : null;
  // Keep the card on screen near the edges.
  const anchor = left < 22 ? "left" : left > 78 ? "right" : "center";
  return (
    <div
      data-moment
      role="dialog"
      aria-label={event.title}
      className="enter-pop absolute top-[calc(100%-18px)] z-20 w-56 rounded-xl border border-border-strong bg-surface-elevated p-3 text-left shadow-xl"
      style={{
        left: `${left}%`,
        transform: anchor === "center" ? "translateX(-50%)" : anchor === "right" ? "translateX(-92%)" : "translateX(-8%)",
      }}
    >
      <div className="flex items-center gap-2">
        <MomentMark kind={event.kind} />
        <p className="min-w-0 flex-1 truncate font-display text-sm font-bold text-foreground">{event.title}</p>
        <span className="font-mono text-xs font-semibold text-muted">{Math.floor(event.minute)}&rsquo;</span>
      </div>
      {event.detail && <p className="mt-1.5 text-xs text-foreground/85">{event.detail}</p>}
      {team && (
        <p className="mt-1.5 flex items-center gap-1.5 text-xs text-muted">
          <TeamCrest name={team} size={14} /> {team}
        </p>
      )}
      <p className="mt-2 border-t border-border pt-2 text-xs text-muted">
        {event.reactions === null
          ? "💬 Just happened — the room's reacting"
          : event.reactions === 0
            ? "💬 The room stayed quiet"
            : `💬 ${event.reactions} ${event.reactions === 1 ? "message" : "messages"} in the room right after`}
      </p>
    </div>
  );
}
