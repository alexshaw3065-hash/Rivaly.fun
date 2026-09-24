"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { sportOf } from "@/lib/markets";
import { teamIdentity } from "@/lib/team-identity";
import type { Match } from "@/lib/types";
import { Countdown } from "../create-room/match-hero";
import { LiveBadge } from "../live-badge";
import { TeamCrest } from "../team-crest";
import { RivalCharacter } from "../rival-character";
import { Stadium } from "./stadium";
import { readEnergy, useRoomEnergy } from "@/lib/room-energy";
import { RoomShareButton } from "./room-share-button";

export const REACTION_EVENT = "rivaly:reaction";

const MAX_FLOATS = 14;

// The top of the room: the stadium, the scoreboard, the call, and who made
// it. The stadium is the atmosphere; this is the structure over it.
//
// A goal is the one loud moment (engagement mechanism #3, goal euphoria —
// .claude/skills/rivaly-engagement-psychology): when the score goes up, the
// scoring side's stand floods with light, a GOAL banner sweeps across and
// the phone buzzes. Reactions sent in chat float up over the stadium
// (mechanism #4, collective effervescence) — only ever real ones.
export function RoomStage({
  match,
  claim,
  creator,
  sharePath,
  children,
}: {
  match: Match;
  claim: string;
  creator: { displayName: string; username: string; avatarUrl: string | null } | null;
  sharePath: string;
  children?: React.ReactNode;
}) {
  const home = teamIdentity(match.homeTeam);
  const away = teamIdentity(match.awayTeam);
  const live = match.status === "live";
  const finished = match.status === "finished";
  const started = live || finished;

  // Goal detection: the page re-renders with a new score over realtime.
  const prev = useRef({ home: match.homeScore ?? 0, away: match.awayScore ?? 0 });
  const [goal, setGoal] = useState<{ side: "home" | "away"; key: number } | null>(null);
  useEffect(() => {
    const h = match.homeScore ?? 0;
    const a = match.awayScore ?? 0;
    const side = h > prev.current.home ? "home" : a > prev.current.away ? "away" : null;
    prev.current = { home: h, away: a };
    if (!side) return;
    // Deferred a tick: never set state synchronously inside the effect body.
    const start = window.setTimeout(() => setGoal({ side, key: Date.now() }), 0);
    navigator.vibrate?.([40, 60, 40]);
    const end = window.setTimeout(() => setGoal(null), 2600);
    return () => {
      window.clearTimeout(start);
      window.clearTimeout(end);
    };
  }, [match.homeScore, match.awayScore]);

  // Floating reactions from the crowd.
  const [floats, setFloats] = useState<{ id: number; emoji: string; x: number }[]>([]);
  useEffect(() => {
    const onReaction = (e: Event) => {
      const emoji = (e as CustomEvent<string>).detail;
      const id = Date.now() + Math.random();
      setFloats((f) => [...f.slice(-(MAX_FLOATS - 1)), { id, emoji, x: 12 + Math.random() * 76 }]);
      window.setTimeout(() => setFloats((f) => f.filter((x) => x.id !== id)), 2200);
    };
    window.addEventListener(REACTION_EVENT, onReaction);
    return () => window.removeEventListener(REACTION_EVENT, onReaction);
  }, []);

  const scorer = goal ? (goal.side === "home" ? home : away) : null;
  const energy = readEnergy(useRoomEnergy());

  return (
    <section className="stadium-art relative -mx-4 overflow-hidden rounded-b-3xl bg-[var(--st-pitch-2)] md:mx-0 md:rounded-2xl">
      <Stadium
        homeTeam={match.homeTeam}
        awayTeam={match.awayTeam}
        sport={sportOf(match)}
        live={live}
        energy={energy}
        flare={goal?.side ?? null}
        flareKey={goal?.key ?? 0}
      />

      {floats.map((f) => (
        <span key={f.id} aria-hidden className="reaction-float pointer-events-none absolute bottom-24 z-10 text-2xl" style={{ left: `${f.x}%` }}>
          {f.emoji}
        </span>
      ))}

      <div className="relative z-[1] flex flex-col px-4 pb-6 pt-4 [text-shadow:0_1px_3px_rgba(0,0,0,0.65)] md:px-6">
        {/* Top bar, over the roof */}
        <div className="flex items-center justify-between gap-3">
          <Link href="/" aria-label="Back home" className="flex h-9 w-9 items-center justify-center rounded-full bg-black/40 text-white/80 transition-colors hover:text-white">
            <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden>
              <path d="M10 3 5 8l5 5" stroke="currentColor" strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </Link>
          <span className="min-w-0 truncate font-mono text-[11px] uppercase tracking-[0.12em] text-white/70">{match.competition}</span>
          <RoomShareButton path={sharePath} claim={claim} />
        </div>

        {/* Scoreboard — pushed down onto the pitch, so the stands above stay
            clear: the padding is a % of width, matching the stadium's scale
            (its boards end at 207/400 of the width). */}
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 pt-[calc(51.75%-36px)]">
          <Team name={match.homeTeam} code={home.code} />
          <div className="flex flex-col items-center">
            <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-black/55 px-4 py-2 font-display text-4xl font-bold tabular-nums text-white">
              <span key={`h${match.homeScore ?? "x"}`} className={goal?.side === "home" ? "score-bump" : undefined}>
                {started ? (match.homeScore ?? 0) : "–"}
              </span>
              <span className="text-white/30">:</span>
              <span key={`a${match.awayScore ?? "x"}`} className={goal?.side === "away" ? "score-bump" : undefined}>
                {started ? (match.awayScore ?? 0) : "–"}
              </span>
            </div>
            <div className="mt-2 h-4">
              {live ? (
                <LiveBadge />
              ) : finished ? (
                <span className="font-mono text-[11px] uppercase tracking-wider text-white/70">Full time</span>
              ) : (
                <span className="font-mono text-[11px] uppercase tracking-wider text-[#f5c542]">
                  <Countdown kickoffAt={match.kickoffAt} />
                </span>
              )}
            </div>
          </div>
          <Team name={match.awayTeam} code={away.code} />
        </div>

        {/* The call */}
        <div className="mt-7">
          <h1 className="font-display text-[28px] font-bold leading-[1.1] text-white md:text-4xl">&ldquo;{claim}&rdquo;</h1>
          {creator && (
            <Link href={`/profile/${creator.username}`} className="mt-3 inline-flex items-center gap-2 text-sm text-white/70 transition-colors hover:text-white">
              <RivalCharacter name={creator.username} imageUrl={creator.avatarUrl} size={22} />
              Called by <span className="font-semibold text-white">{creator.displayName}</span>
            </Link>
          )}
        </div>

        <CrowdNoise intensity={energy.intensity} yesShare={energy.yesShare} />

        {children}
      </div>

      {/* GOAL — sweeps across in the scorer's colours, then clears */}
      {goal && scorer && (
        <div key={goal.key} role="status" className="goal-sweep pointer-events-none absolute inset-x-0 top-1/3 z-20 flex justify-center">
          <span className="rounded-lg px-5 py-2 font-display text-3xl font-extrabold tracking-wide shadow-lg" style={{ background: scorer.primary, color: scorer.ink }}>
            GOAL · {scorer.code}
          </span>
        </div>
      )}
    </section>
  );
}

// Which end is louder right now — the meter under the call. Reads the same
// energy the stadium glows with, so the words and the light always agree.
function CrowdNoise({ intensity, yesShare }: { intensity: number; yesShare: number }) {
  const pct = Math.round(yesShare * 100);
  const verdict =
    intensity < 0.05
      ? "Crowd's quiet — chat to make your end louder"
      : yesShare >= 0.6
        ? "YES end is louder"
        : yesShare <= 0.4
          ? "NO end is louder"
          : "Neck and neck";
  return (
    <div className="mt-5">
      <div className="flex items-center gap-2 font-mono text-[10px] font-semibold uppercase tracking-[0.12em]">
        <span className="text-[#7c9bff]">YES end</span>
        <div className="flex h-1.5 flex-1 overflow-hidden rounded-full bg-white/15" style={{ opacity: 0.45 + intensity * 0.55 }}>
          <span className="h-full transition-[width] duration-1000 ease-out" style={{ width: `${pct}%`, background: "#3d6bff" }} />
          <span className="h-full flex-1" style={{ background: "#ef4444" }} />
        </div>
        <span className="text-[#ff8a8a]">NO end</span>
      </div>
      <p className="mt-1.5 text-xs font-semibold text-white/80">{verdict}</p>
    </div>
  );
}

function Team({ name, code }: { name: string; code: string }) {
  return (
    <div className="flex min-w-0 flex-col items-center gap-2 text-center">
      <TeamCrest name={name} size={52} />
      <span className="max-w-full truncate text-sm font-semibold text-white">
        <span className="md:hidden">{code}</span>
        <span className="hidden md:inline">{name}</span>
      </span>
    </div>
  );
}
