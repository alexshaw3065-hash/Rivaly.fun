"use client";

import { useMemo, useRef, useState, type PointerEvent } from "react";
import type { MomentumBar, MomentumMark } from "@/lib/match-stats";
import type { MatchStory, StoryBeat } from "@/lib/match-pressure";
import type { Match } from "@/lib/types";
import { inkOn, teamFills } from "@/lib/team-fills";
import { ShareStoryButton } from "./share-story-button";

// The match, read: a one-line story of who was on top (and whether the
// scoreline agrees), the share of the pressure across the match or either
// half, the beats that made it — spells of control, swings, goals against
// the run of play — and the momentum chart they come from. Tap a beat to
// light up that stretch of the chart; drag across the chart to read any
// minute. After the whistle, the story can go out as a card.
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
  const [focus, setFocus] = useState<StoryBeat | null>(null);
  const finished = match.status === "finished";

  return (
    <section className="overflow-hidden rounded-2xl border border-border bg-surface" aria-label="Match story">
      {story && <Story story={story} codes={codes} fill={fill} focus={focus} onFocus={setFocus} />}
      <Chart data={data} fill={fill} codes={codes} focus={focus} />
      {story && finished && roomId && (
        <div className="border-t border-border px-4 py-3">
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
  focus,
  onFocus,
}: {
  story: MatchStory;
  codes: Record<Side, string>;
  fill: Record<Side, string>;
  focus: StoryBeat | null;
  onFocus: (b: StoryBeat | null) => void;
}) {
  const [period, setPeriod] = useState<0 | 1 | 2>(0);
  const share = period === 0 ? story.share : story.halves[period - 1];
  const lead: Side = story.share.home >= story.share.away ? "home" : "away";
  const empty = share.home + share.away === 0;

  return (
    <div className="px-4 pb-1 pt-4">
      <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted">Match story</p>
      <p
        key={story.headline}
        className="mt-1.5 border-l-[3px] pl-3 font-display text-[17px] font-bold leading-snug text-foreground [animation:fade-in-up_480ms_cubic-bezier(0.23,1,0.32,1)_both]"
        style={{ borderColor: fill[lead] }}
      >
        {story.headline}
      </p>

      {/* Share of the pressure */}
      <div className="mt-4 flex items-center justify-between">
        <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted">Pressure</span>
        <div role="tablist" aria-label="Period" className="flex gap-0.5 rounded-lg bg-background p-0.5">
          {(["Match", "1st", "2nd"] as const).map((label, i) => (
            <button
              key={label}
              role="tab"
              type="button"
              aria-selected={period === i}
              onClick={() => setPeriod(i as 0 | 1 | 2)}
              className="h-6 rounded-md px-2 font-mono text-[10px] font-semibold uppercase tracking-wide transition-colors duration-150"
              style={{ background: period === i ? "var(--surface-elevated, var(--surface))" : "transparent", color: period === i ? "var(--foreground)" : "var(--muted)" }}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
      <div className="mt-2 flex items-center gap-2.5">
        <span className="w-12 font-display text-lg font-extrabold tabular-nums" style={{ color: empty ? "var(--muted)" : undefined }}>
          {share.home}%
        </span>
        <div className="flex h-2.5 flex-1 gap-[3px] overflow-hidden rounded-full">
          <span className="h-full rounded-full transition-[width] duration-500 ease-out" style={{ width: empty ? "50%" : `${share.home}%`, background: empty ? "var(--border)" : fill.home, boxShadow: EDGE }} />
          <span className="h-full flex-1 rounded-full" style={{ background: empty ? "var(--border)" : fill.away, boxShadow: EDGE }} />
        </div>
        <span className="w-12 text-right font-display text-lg font-extrabold tabular-nums">{share.away}%</span>
      </div>
      <div className="mt-0.5 flex justify-between font-mono text-[10px] font-semibold text-muted">
        <span>{codes.home}</span>
        <span>{codes.away}</span>
      </div>

      {/* The beats */}
      {story.beats.length > 0 && (
        <div className="no-scrollbar -mx-4 mt-3 flex gap-1.5 overflow-x-auto px-4 pb-1">
          {story.beats.map((b, i) => {
            const on = focus === b;
            return (
              <button
                key={i}
                type="button"
                aria-pressed={on}
                onClick={() => onFocus(on ? null : b)}
                className="enter-pop flex shrink-0 items-center gap-1.5 rounded-full py-1.5 pl-2 pr-3 text-xs font-semibold transition-[background-color,color,transform] duration-150 active:scale-95"
                style={{
                  background: on ? fill[b.side] : `color-mix(in srgb, ${fill[b.side]} 13%, transparent)`,
                  color: on ? inkOn(fill[b.side]) : "var(--foreground)",
                  boxShadow: `inset 0 0 0 1px color-mix(in srgb, ${fill[b.side]} ${on ? 100 : 38}%, transparent)`,
                  transitionDelay: `${i * 40}ms`,
                }}
              >
                <BeatIcon kind={b.kind} colour={on ? inkOn(fill[b.side]) : fill[b.side]} />
                {beatLabel(b, codes)}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function beatLabel(b: StoryBeat, codes: Record<Side, string>): string {
  const c = codes[b.side];
  switch (b.kind) {
    case "spell":
      return `${c} on top · ${b.from}'–${b.to}'`;
    case "swing":
      return `Swing to ${c} · ${b.minute}'`;
    case "late":
      return `Late goal · ${c} ${b.minute}'`;
    case "against-run":
      return `Against the run · ${c} ${b.minute}'`;
  }
}

function BeatIcon({ kind, colour }: { kind: StoryBeat["kind"]; colour: string }) {
  if (kind === "spell")
    return (
      <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden>
        <path d="M1 9h2V6H1zM5 9h2V3H5zM9 9h2V1H9z" fill={colour} />
      </svg>
    );
  if (kind === "swing")
    return (
      <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden>
        <path d="M2 4h7l-2-2M10 8H3l2 2" stroke={colour} strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  return (
    <svg width="12" height="12" viewBox="0 0 14 14" aria-hidden>
      <circle cx="7" cy="7" r="6" fill="none" stroke={colour} strokeWidth="1.4" />
      <path d="M7 4.4 9.4 6.2 8.5 9H5.5L4.6 6.2Z" fill={colour} />
    </svg>
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
        <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted">Momentum</span>
        <span className="flex items-center gap-3 text-[11px] font-semibold text-foreground">
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
          <line x1={45 * step} x2={45 * step} y1={4} y2={H - 4} stroke="var(--border-strong)" strokeWidth={1} strokeDasharray="2 3" vectorEffect="non-scaling-stroke" />
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
          <line x1={0} x2={W} y1={MID} y2={MID} stroke="var(--border-strong)" strokeWidth={1} vectorEffect="non-scaling-stroke" />
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
              <span className="block h-1.5 w-1.5 rounded-full" style={{ boxShadow: `inset 0 0 0 1.5px ${fill[m.side]}` }} />
            )}
          </span>
        ))}

        {/* Reading a minute */}
        {hover !== null && (
          <>
            <span className="pointer-events-none absolute inset-y-0 w-px bg-foreground/50" style={{ left: `${((hover - 0.5) / domain) * 100}%` }} />
            <span
              className="pointer-events-none absolute -top-7 whitespace-nowrap rounded-md bg-foreground px-1.5 py-0.5 font-mono text-[10px] font-semibold text-background"
              style={{ left: `${((hover - 0.5) / domain) * 100}%`, transform: `translateX(${hover < domain * 0.15 ? "0" : hover > domain * 0.85 ? "-100%" : "-50%"})` }}
            >
              {hover}&rsquo; · {hoverText}
            </span>
          </>
        )}
      </div>

      <div className="flex justify-between pt-1 font-mono text-[10px] tabular-nums text-muted">
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
      <span className="h-2 w-2 rounded-[3px]" style={{ background: colour, boxShadow: EDGE }} />
      {label}
    </span>
  );
}

const EDGE = "inset 0 0 0 1px color-mix(in srgb, var(--foreground) 14%, transparent)";
