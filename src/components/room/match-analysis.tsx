"use client";

import { useMemo, useRef, useState, type PointerEvent } from "react";
import type { MomentumBar, MomentumMark } from "@/lib/match-stats";
import type { MatchStory, StoryBeat } from "@/lib/match-pressure";
import type { Match } from "@/lib/types";
import { teamFills } from "@/lib/team-fills";
import { ShareStoryButton } from "./share-story-button";

// The match, read: a one-line story of who was on top (and whether the
// scoreline agrees), the share of the pressure across the match or either
// half, and the momentum chart it comes from; drag across the chart to read
// any minute. After the whistle, the story can go out as a card.
//
// Engagement mechanisms #9 (a match story to retell — "they battered us and
// still lost") and #2 (live, the pressure building is the tension itself).

type Side = "home" | "away";
type Momentum = { bars: MomentumBar[]; marks: MomentumMark[]; lastMinute: number };

const W = 360;
const H = 88;
const MID = H / 2;

export function MatchAnalysis({ match, data, story, roomId }: { match: Match; data: Momentum; story: MatchStory | null; roomId?: string }) {
  const { home, away, codes } = teamFills(match);
  const fill = { home: home.fill, away: away.fill };
  const finished = match.status === "finished";

  return (
    <section className="overflow-hidden rounded-card bg-surface edge" aria-label="Match story">
      {story && <Story story={story} codes={codes} fill={fill} />}
      <Chart data={data} fill={fill} codes={codes} focus={null} />
      {story && finished && roomId && (
        <div className="border-t border-line px-4 py-3">
          <ShareStoryButton roomId={roomId} />
        </div>
      )}
    </section>
  );
}

// ── The story ────────────────────────────────────────────────────────────

function Story({
  story,
  codes,
  fill,
}: {
  story: MatchStory;
  codes: Record<Side, string>;
  fill: Record<Side, string>;
}) {
  const [period, setPeriod] = useState<0 | 1 | 2>(0);
  const share = period === 0 ? story.share : story.halves[period - 1];
  const lead: Side = story.share.home >= story.share.away ? "home" : "away";
  const empty = share.home + share.away === 0;

  return (
    <div className="px-4 pb-1 pt-4">
      <p className="flex items-center gap-2 text-caption text-secondary">
        <span aria-hidden className="h-2 w-2 rounded-full" style={{ background: fill[lead] }} />
        Match story
      </p>
      <p
        key={story.headline}
        className="mt-2 text-title-3 font-display text-foreground [animation:fade-in-up_480ms_cubic-bezier(0.23,1,0.32,1)_both]"
      >
        {story.headline}
      </p>

      {/* Share of the pressure */}
      <div className="mt-4 flex items-center justify-between">
        <span className="text-caption text-secondary">Pressure</span>
        <div role="tablist" aria-label="Period" className="flex gap-0.5 rounded-control bg-background p-0.5">
          {(["Match", "1st", "2nd"] as const).map((label, i) => (
            <button
              key={label}
              role="tab"
              type="button"
              aria-selected={period === i}
              onClick={() => setPeriod(i as 0 | 1 | 2)}
              className={`h-6 rounded-tag px-2 text-caption font-semibold transition-colors duration-100 ${period === i ? "bg-surface-elevated text-foreground" : "text-secondary"}`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
      <div className="mt-2 flex items-center gap-3">
        <span className={`w-12 text-title-3 font-display font-extrabold tabular-nums ${empty ? "text-secondary" : ""}`}>
          {share.home}%
        </span>
        <div className="flex h-2.5 flex-1 gap-[3px] overflow-hidden rounded-full">
          <span className={`h-full rounded-full transition-[width] duration-500 ease-out ${EDGE}`} style={{ width: empty ? "50%" : `${share.home}%`, background: empty ? "var(--line-strong)" : fill.home }} />
          <span className={`h-full flex-1 rounded-full ${EDGE}`} style={{ background: empty ? "var(--line-strong)" : fill.away }} />
        </div>
        <span className="w-12 text-right text-title-3 font-display font-extrabold tabular-nums">{share.away}%</span>
      </div>
      <div className="mt-1 flex justify-between text-caption font-semibold text-secondary">
        <span>{codes.home}</span>
        <span>{codes.away}</span>
      </div>

    </div>
  );
}

// ── The chart ────────────────────────────────────────────────────────────

function Chart({ data, fill, codes, focus }: { data: Momentum; fill: Record<Side, string>; codes: Record<Side, string>; focus: StoryBeat | null }) {
  const domain = Math.max(90, data.lastMinute);
  const step = W / domain;
  const peak = Math.max(6, ...data.bars.map((b) => Math.abs(b.value)));
  const scale = (MID - 8) / peak;
  const byMinute = useMemo(() => new Map(data.bars.map((b) => [b.minute, b.value])), [data.bars]);
  const box = useRef<HTMLDivElement>(null);
  const [hover, setHover] = useState<number | null>(null);

  const inFocus = (m: number) => {
    if (!focus) return true;
    if (focus.kind === "spell") return m >= focus.from && m <= focus.to;
    return m >= focus.minute - 10 && m <= focus.minute;
  };
  const read = (e: PointerEvent<HTMLDivElement>) => {
    const r = box.current?.getBoundingClientRect();
    if (!r) return;
    setHover(Math.min(domain, Math.max(1, Math.ceil(((e.clientX - r.left) / r.width) * domain))));
  };
  const hv = hover !== null ? (byMinute.get(hover) ?? 0) : 0;
  const hoverText = hover === null ? null : Math.abs(hv) < peak * 0.12 ? "Even" : `${codes[hv > 0 ? "home" : "away"]} ${Math.abs(hv) > peak * 0.6 ? "pressing hard" : "pressing"}`;

  return (
    <div className="px-4 pb-3 pt-3">
      <div className="flex items-center justify-between pb-2">
        <span className="text-caption text-secondary">Momentum</span>
        <span className="flex items-center gap-3 text-caption font-semibold text-foreground">
          <Key colour={fill.home} label={codes.home} />
          <Key colour={fill.away} label={codes.away} />
        </span>
      </div>

      <div
        ref={box}
        className="relative touch-pan-y select-none"
        onPointerMove={read}
        onPointerDown={read}
        onPointerLeave={() => setHover(null)}
        onPointerUp={(e) => e.pointerType !== "mouse" && setHover(null)}
      >
        <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="block h-[88px] w-full" aria-hidden>
          {focus && (
            <rect
              x={((focus.kind === "spell" ? focus.from : focus.minute - 10) - 1) * step}
              width={((focus.kind === "spell" ? focus.to - focus.from : 10) + 1) * step}
              y={0}
              height={H}
              fill={fill[focus.side]}
              opacity={0.1}
              rx={2}
            />
          )}
          <line x1={45 * step} x2={45 * step} y1={4} y2={H - 4} stroke="var(--line-strong)" strokeWidth={1} strokeDasharray="2 3" vectorEffect="non-scaling-stroke" />
          {data.bars.map((b) =>
            b.value === 0 ? null : (
              <rect
                key={b.minute}
                className="momentum-bar"
                data-side={b.value > 0 ? "home" : "away"}
                x={(b.minute - 1) * step + step * 0.12}
                width={Math.max(0.8, step * 0.76)}
                y={b.value > 0 ? MID - b.value * scale : MID}
                height={Math.abs(b.value) * scale}
                rx={Math.min(1.5, step * 0.3)}
                fill={b.value > 0 ? fill.home : fill.away}
                style={{ opacity: inFocus(b.minute) ? (hover === null || hover === b.minute ? 0.95 : 0.6) : 0.2, transitionDelay: `${Math.min(b.minute * 5, 450)}ms` }}
              />
            ),
          )}
          <line x1={0} x2={W} y1={MID} y2={MID} stroke="var(--line-strong)" strokeWidth={1} vectorEffect="non-scaling-stroke" />
        </svg>

        {data.marks.map((m, i) => (
          <span
            key={`${m.kind}-${m.minute}-${i}`}
            className="pointer-events-none absolute -translate-x-1/2"
            style={{ left: `${((m.minute - 0.5) / domain) * 100}%`, ...(m.side === "home" ? { top: -3 } : { bottom: -3 }) }}
          >
            {m.kind === "goal" ? (
              <svg width="13" height="13" viewBox="0 0 14 14" className="drop-shadow-[0_1px_1px_rgba(0,0,0,0.5)]">
                <circle cx="7" cy="7" r="6.2" fill="#fff" stroke="#111" strokeWidth="0.8" />
                <path d="M7 4.2 9.6 6.1 8.6 9.1H5.4L4.4 6.1Z" fill="#111" />
              </svg>
            ) : (
              <span className="block h-1.5 w-1.5 rounded-full border-[1.5px]" style={{ borderColor: fill[m.side] }} />
            )}
          </span>
        ))}

        {/* Reading a minute */}
        {hover !== null && (
          <>
            <span className="pointer-events-none absolute inset-y-0 w-px bg-foreground/50" style={{ left: `${((hover - 0.5) / domain) * 100}%` }} />
            <span
              className="pointer-events-none absolute -top-7 whitespace-nowrap rounded-tag bg-foreground px-1.5 py-0.5 text-caption font-semibold tabular-nums text-background"
              style={{ left: `${((hover - 0.5) / domain) * 100}%`, transform: `translateX(${hover < domain * 0.15 ? "0" : hover > domain * 0.85 ? "-100%" : "-50%"})` }}
            >
              {hover}&rsquo; · {hoverText}
            </span>
          </>
        )}
      </div>

      <div className="flex justify-between pt-1 text-caption tabular-nums text-tertiary">
        <span>0&rsquo;</span>
        <span>45&rsquo;</span>
        <span>{domain}&rsquo;</span>
      </div>
    </div>
  );
}

function Key({ colour, label }: { colour: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className={`h-2 w-2 rounded-sm ${EDGE}`} style={{ background: colour }} />
      {label}
    </span>
  );
}

const EDGE = "ring-1 ring-inset ring-foreground/15";
