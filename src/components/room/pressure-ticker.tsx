"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { feedClock, pressureAlerts, type PressureAlert } from "@/lib/match-pressure";
import { useMatchFeed } from "@/lib/use-match-feed";
import { teamIdentity } from "@/lib/team-identity";
import { TeamCrest } from "../team-crest";
import { ROOM_TAB_EVENT, announceChatActivity } from "./room-tabs-event";

// "MUN are turning the screw — 7 dangerous attacks in 3 min." When one side
// piles on sustained pressure (match-pressure.ts), this drops over the chat
// header in that team's colour for a few seconds, then lifts away. It takes
// the header's place and nothing else — the messages never move or hide.
// Tap it for the momentum chart. Live matches only, one per real spell.
//
// Engagement mechanism #2 (anticipation): the pressure before a goal is the
// tension itself, and it lands while the room's rivals care most.

const SHOW_MS = 7000;
const FRESH_S = 90;
const LINES = ["are turning the screw", "are all over them", "keep coming — wave after wave", "are camped in the box"];

const key = (a: PressureAlert) => `${a.side}:${a.clock}`;

export function PressureTicker({ matchId, homeTeam, awayTeam }: { matchId: string; homeTeam: string; awayTeam: string }) {
  const rows = useMatchFeed(matchId);
  const alerts = useMemo(() => pressureAlerts(rows), [rows]);
  const [shown, setShown] = useState<PressureAlert | null>(null);
  const [leaving, setLeaving] = useState(false);
  const seen = useRef<Set<string> | null>(null);

  useEffect(() => {
    // Hydration hands over an empty feed first; judge "history" only once
    // the real rows are here, or every past spell would look new.
    if (rows.length === 0) return;
    const finished = rows.some((r) => r.action === "game_finalised");
    const head = feedClock(rows);
    // On arrival, everything already past is history (it's in the match
    // story); only a spell still happening gets shown.
    if (seen.current === null) seen.current = new Set(alerts.filter((a) => finished || head - a.clock > FRESH_S).map(key));
    const next = alerts.find((a) => !seen.current!.has(key(a)));
    if (!next) return;
    seen.current.add(key(next));
    const t = teamIdentity(next.side === "home" ? homeTeam : awayTeam);
    announceChatActivity({ kind: "alert", text: `${t.code} ${LINES[Math.floor(next.clock / 7) % LINES.length]}`, colour: t.primary });
    // Deferred a tick (state isn't set during the effect itself); not
    // cancelled if rows change meanwhile — the alert is already claimed.
    window.setTimeout(() => {
      setLeaving(false);
      setShown(next);
    }, 0);
  }, [alerts, rows, homeTeam, awayTeam]);

  // Its own clock, so a stream of new rows can't keep it up forever.
  useEffect(() => {
    if (!shown) return;
    const leave = window.setTimeout(() => setLeaving(true), SHOW_MS);
    const gone = window.setTimeout(() => setShown(null), SHOW_MS + 340);
    return () => {
      window.clearTimeout(leave);
      window.clearTimeout(gone);
    };
  }, [shown]);

  if (!shown) return null;
  const team = shown.side === "home" ? homeTeam : awayTeam;
  const id = teamIdentity(team);
  const line = LINES[Math.floor(shown.clock / 7) % LINES.length];
  const segments = Math.min(5, Math.max(2, Math.round(shown.attacks / 2)));

  const dismiss = () => {
    setLeaving(true);
    window.setTimeout(() => setShown(null), 340);
  };

  return (
    <div
      role="status"
      aria-live="polite"
      className={`absolute inset-0 z-10 flex items-center gap-3 overflow-hidden rounded-t-card pl-4 pr-2 ${leaving ? "ticker-out" : "ticker-in"}`}
      style={{ background: `color-mix(in srgb, ${id.primary} 22%, var(--surface))` }}
    >
      <button
        type="button"
        onClick={() => {
          window.dispatchEvent(new CustomEvent(ROOM_TAB_EVENT, { detail: "stats" }));
          dismiss();
        }}
        className="flex min-w-0 flex-1 items-center gap-3 text-left"
        aria-label={`${team} ${line}. See the momentum.`}
      >
        <TeamCrest name={team} size={24} />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-label font-bold text-foreground">
            {id.code} {line}
          </span>
          <span className="block truncate text-caption tabular-nums text-foreground/70">
            {shown.attacks} dangerous attacks · {shown.minute}&rsquo;
          </span>
        </span>
        {/* Heat: a bar per couple of attacks, rising in turn */}
        <span aria-hidden className="flex h-6 items-end gap-[3px]">
          {Array.from({ length: 5 }, (_, i) => (
            <span
              key={i}
              className="heat-seg w-[5px] rounded-sm ring-1 ring-inset ring-foreground/10"
              style={{
                height: `${40 + i * 15}%`,
                background: i < segments ? id.primary : "color-mix(in srgb, var(--foreground) 14%, transparent)",
                animationDelay: `${120 + i * 70}ms`,
              }}
            />
          ))}
        </span>
      </button>
      <button type="button" onClick={dismiss} aria-label="Dismiss" className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-foreground/60 transition-colors hover:text-foreground">
        <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden>
          <path d="M2.5 2.5l7 7M9.5 2.5l-7 7" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
      </button>
      {/* How long it'll stay */}
      <span aria-hidden className="ticker-drain absolute inset-x-0 bottom-0 h-[2px]" style={{ background: id.primary, animationDuration: `${SHOW_MS}ms` }} />
    </div>
  );
}
