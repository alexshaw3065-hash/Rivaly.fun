"use client";

import { useEffect, useRef, useState, type MouseEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { sportOf } from "@/lib/markets";
import { competitionShort, teamIdentity } from "@/lib/team-identity";
import type { Match } from "@/lib/types";
import { kickoffLabel } from "../create-room/match-hero";
import { BookmarkButton } from "../bookmark-button";
import { LiveBadge } from "../live-badge";
import { TeamCrest } from "../team-crest";
import { RivalCharacter } from "../rival-character";
import { Stadium } from "./stadium";
import { useRoomRace } from "@/lib/room-energy";
import { RoomShareButton } from "./room-share-button";
import { hasInAppHistory } from "../app-preloader";

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
//
// The stadium race (room-race.ts): each end of the room climbs as its
// backers chat; the first to break through takes the stadium — its fans hold
// up a card mosaic and a banner sweeps the room — and holds it until the
// other side fights back. After the result, the winning call's end celebrates.
export function RoomStage({
  roomId,
  match,
  claim,
  creator,
  sharePath,
  outcome = null,
  children,
}: {
  roomId: string;
  match: Match;
  claim: string;
  creator: { displayName: string; username: string; avatarUrl: string | null } | null;
  sharePath: string;
  outcome?: "yes" | "no" | "void" | null;
  children?: React.ReactNode;
}) {
  const router = useRouter();
  // Back goes where you came from inside Rivaly; straight into a room from a
  // shared link, it goes home. A real link to "/" underneath, so a tap before
  // the page has finished loading still works; home is prefetched so it's
  // instant either way.
  useEffect(() => {
    router.prefetch("/");
  }, [router]);
  function goBack(e: MouseEvent<HTMLAnchorElement>) {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
    e.preventDefault();
    if (hasInAppHistory() && window.history.length > 1) router.back();
    else router.push("/");
  }
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

  // The race. Once the call is settled the result outranks the noise: the
  // winning end celebrates and holds the stadium, the other end goes quiet.
  const race = useRoomRace();
  const decided = outcome === "yes" || outcome === "no" ? outcome : null;
  const levels = decided ? { yes: decided === "yes" ? 1 : 0, no: decided === "no" ? 1 : 0 } : race.levels;
  const holder = decided ?? race.holder;

  // Banner when an end takes the stadium while you're watching (not on load).
  const seen = useRef(-1);
  const [takeover, setTakeover] = useState<{ side: "yes" | "no"; key: number } | null>(null);
  useEffect(() => {
    const count = race.takeovers.length;
    if (seen.current === -1 || count <= seen.current) {
      seen.current = Math.max(seen.current, count);
      return;
    }
    seen.current = count;
    const latest = race.takeovers[count - 1];
    const show = window.setTimeout(() => setTakeover({ side: latest.side, key: latest.at }), 0);
    navigator.vibrate?.([30, 50, 30, 50, 60]);
    const hide = window.setTimeout(() => setTakeover(null), 2800);
    return () => {
      window.clearTimeout(show);
      window.clearTimeout(hide);
    };
  }, [race.takeovers]);

  return (
    <section className="stadium-art relative -mx-4 overflow-hidden bg-[var(--st-pitch-2)] md:mx-0 md:rounded-t-2xl">
      <Stadium
        homeTeam={match.homeTeam}
        awayTeam={match.awayTeam}
        sport={sportOf(match)}
        live={live}
        energy={levels}
        holder={holder}
        flare={goal?.side ?? null}
        flareKey={goal?.key ?? 0}
      />

      {floats.map((f) => (
        <span key={f.id} aria-hidden className="reaction-float pointer-events-none absolute bottom-24 z-10 text-2xl" style={{ left: `${f.x}%` }}>
          {f.emoji}
        </span>
      ))}

      {/* A dark wash under the scoreboard and the call, so the text reads on any pitch. */}
      <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-[58%] bg-gradient-to-t from-black/85 via-black/45 to-transparent" />

      <div className="relative z-[1] flex flex-col px-4 pb-4 pt-3 [text-shadow:0_1px_3px_rgba(0,0,0,0.65)] md:px-6">
        {/* Top bar, over the roof: back + league, then kick-off status, watchlist, share */}
        <div className="flex items-center gap-2">
          <Link
            href="/"
            onClick={goBack}
            aria-label="Back"
            className="flex h-9 shrink-0 items-center gap-1 rounded-full bg-black/70 ring-1 ring-white/20 backdrop-blur-sm pl-2 pr-3 text-white transition-transform duration-100 active:scale-90"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden>
              <path d="M10 3 5 8l5 5" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span className="font-mono text-xs font-bold uppercase tracking-[0.1em]" title={match.competition}>
              {competitionShort(match.competition)}
            </span>
          </Link>
          <span className="ml-auto min-w-0 truncate rounded-full bg-black/70 ring-1 ring-white/20 backdrop-blur-sm px-3 py-2 font-mono text-[10px] font-bold uppercase tracking-[0.1em]">
            {live ? (
              <LiveBadge />
            ) : finished ? (
              <span className="text-white">Full time</span>
            ) : (
              <StartsIn kickoffAt={match.kickoffAt} />
            )}
          </span>
          <BookmarkButton id={roomId} type="room" label="room" variant="stage" />
          <RoomShareButton path={sharePath} claim={claim} />
        </div>

        {/* Scoreboard — pushed down onto the pitch, so the stands above stay
            clear: the padding is a % of width, matching the stadium's scale
            (its boards end at 158/400 of the width). */}
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 pt-[calc(39.5%-44px)]">
          <Team name={match.homeTeam} code={home.code} />
          <div className="flex flex-col items-center">
            <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-black/55 px-3 py-0.5 font-display text-2xl font-bold tabular-nums text-white md:text-3xl">
              <span key={`h${match.homeScore ?? "x"}`} className={goal?.side === "home" ? "score-bump" : undefined}>
                {started ? (match.homeScore ?? 0) : "–"}
              </span>
              <span className="text-white/30">:</span>
              <span key={`a${match.awayScore ?? "x"}`} className={goal?.side === "away" ? "score-bump" : undefined}>
                {started ? (match.awayScore ?? 0) : "–"}
              </span>
            </div>
          </div>
          <Team name={match.awayTeam} code={away.code} />
        </div>

        {/* The call */}
        <div className="mt-2.5">
          <h1 className="font-display text-[21px] font-extrabold leading-[1.15] text-white [text-shadow:0_2px_8px_rgba(0,0,0,0.9)] md:text-3xl">&ldquo;{claim}&rdquo;</h1>
          {creator && (
            <Link href={`/profile/${creator.username}`} className="mt-1.5 inline-flex items-center gap-2 text-sm text-white/85 transition-colors hover:text-white">
              <RivalCharacter name={creator.username} imageUrl={creator.avatarUrl} size={22} />
              Called by <span className="font-semibold text-white">{creator.displayName}</span>
            </Link>
          )}
        </div>

        {children}
      </div>

      {/* An end takes the stadium — sweeps across in the side's colour */}
      {takeover && !goal && (
        <div key={takeover.key} role="status" className="goal-sweep pointer-events-none absolute inset-x-0 top-[18%] z-20 flex justify-center px-4">
          <span
            className="rounded-lg px-4 py-2 text-center font-display text-xl font-extrabold tracking-wide text-white shadow-lg"
            style={{ background: takeover.side === "yes" ? "#3d6bff" : "#ef4444" }}
          >
            {takeover.side.toUpperCase()} END TAKES THE STADIUM
          </span>
        </div>
      )}

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

/** "Starts in 2h 53m" — counts down, re-rendering every 30s. */
// Before kick-off, the countdown (gold: the anticipation). Past kick-off with
// no live feed yet, say so honestly rather than "Starting now" forever: a
// few minutes' grace, then "Awaiting feed", then — hours on — "Result
// pending" (some fixtures TxLINE lists never get live coverage).
const GRACE_MIN = 20;
const PENDING_MIN = 150;

function StartsIn({ kickoffAt }: { kickoffAt: string }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(t);
  }, []);
  const since = (now - +new Date(kickoffAt)) / 60_000;
  if (since > PENDING_MIN) return <span className="text-white/75">Result pending</span>;
  if (since > GRACE_MIN) return <span className="text-white/75">Awaiting feed</span>;
  return <span className="text-[#f5c542]">{kickoffLabel(kickoffAt, now).replace("Kicks off in", "Starts in").replace("Kicking off", "Starting now")}</span>;
}

function Team({ name, code }: { name: string; code: string }) {
  return (
    <div className="flex min-w-0 flex-col items-center gap-1 text-center">
      <TeamCrest name={name} size={34} />
      <span className="max-w-full truncate text-sm font-semibold text-white">
        <span className="md:hidden">{code}</span>
        <span className="hidden md:inline">{name}</span>
      </span>
    </div>
  );
}
