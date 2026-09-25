// Reading the momentum: who's turning the screw right now (live pressure
// alerts), and afterwards the story of who was on top — spells of control,
// goals against the run of play, the biggest swing, and a one-line headline.
// All from TxLINE's danger / high-danger possession states and goals (see
// match-stats.ts momentum()). Pure — tested in match-pressure.test.ts.
//
// Engagement mechanisms #2 (anticipation — the pressure before a goal is the
// tension itself) and #9 (a match story to retell, and to argue about).

import { momentum, type MomentumBar } from "./match-stats.ts";
import type { EventRow } from "./match-timeline";

type Side = "home" | "away";
const num = (v: unknown): number | null => (typeof v === "number" ? v : null);
const sideOf = (v: unknown): Side | null => (v === "home" || v === "away" ? v : null);

// ── Live pressure ────────────────────────────────────────────────────────

/** A spell of sustained pressure worth telling the room about. */
export interface PressureAlert {
  side: Side;
  /** Match clock (seconds) when it tipped over. */
  clock: number;
  minute: number;
  /** Dangerous attacks in the window. */
  attacks: number;
  /** Window length in minutes, for the copy ("in 3 minutes"). */
  windowMinutes: number;
  /** 0–1: how far past the bar it went. */
  heat: number;
}

const WINDOW_S = 180;
const DANGER = { danger_possession: 1, high_danger_possession: 2 } as Record<string, number>;
// Calibrated on real Premier League logs: a handful per match, only for the
// spells a fan would call "they're all over them".
const THRESHOLD = 10;
const COOLDOWN_S = 540;

export function pressureAlerts(rows: EventRow[]): PressureAlert[] {
  const marks = rows
    .map((r) => ({ w: DANGER[r.action] ?? 0, side: sideOf(r.payload?._side), clock: num(r.payload?._clock) }))
    .filter((m): m is { w: number; side: Side; clock: number } => m.w > 0 && m.side !== null && m.clock !== null)
    .sort((a, b) => a.clock - b.clock);

  const out: PressureAlert[] = [];
  const last: Record<Side, number> = { home: -Infinity, away: -Infinity };
  for (let i = 0; i < marks.length; i++) {
    const m = marks[i];
    let score = 0;
    let attacks = 0;
    for (let j = i; j >= 0 && marks[j].clock >= m.clock - WINDOW_S; j--) {
      if (marks[j].side !== m.side) continue;
      score += marks[j].w;
      attacks++;
    }
    if (score >= THRESHOLD && m.clock - last[m.side] >= COOLDOWN_S) {
      last[m.side] = m.clock;
      out.push({ side: m.side, clock: m.clock, minute: Math.floor(m.clock / 60) + 1, attacks, windowMinutes: WINDOW_S / 60, heat: Math.min(1, (score - THRESHOLD) / THRESHOLD + 0.4) });
    }
  }
  return out;
}

/** The match clock the feed has reached (latest in-play record). */
export function feedClock(rows: EventRow[]): number {
  let c = 0;
  for (const r of rows) {
    const v = num(r.payload?._clock);
    if (v !== null && v > c) c = v;
  }
  return c;
}

// ── The story ────────────────────────────────────────────────────────────

export type StoryBeat =
  | { kind: "spell"; side: Side; from: number; to: number }
  | { kind: "against-run"; side: Side; minute: number }
  | { kind: "late"; side: Side; minute: number }
  | { kind: "swing"; side: Side; minute: number };

export interface MatchStory {
  headline: string;
  beats: StoryBeat[];
  /** Share of all attacking pressure, whole percentages. */
  share: { home: number; away: number };
  /** The same, per half. */
  halves: { home: number; away: number }[];
}

const SMOOTH = 5;
const MIN_SPELL = 8;

function rolling(bars: MomentumBar[], width: number): number[] {
  return bars.map((_, i) => {
    let s = 0;
    for (let j = Math.max(0, i - width + 1); j <= i; j++) s += bars[j].value;
    return s;
  });
}

function shareOf(bars: MomentumBar[]): { home: number; away: number } {
  let h = 0;
  let a = 0;
  for (const b of bars) {
    if (b.value > 0) h += b.value;
    else a -= b.value;
  }
  if (h + a === 0) return { home: 0, away: 0 };
  const home = Math.round((h / (h + a)) * 100);
  return { home, away: 100 - home };
}

export function matchStory(
  rows: EventRow[],
  ctx: { home: string; away: string; homeScore: number | null; awayScore: number | null; finished: boolean },
): MatchStory | null {
  const { bars, marks } = momentum(rows);
  if (bars.length < 10) return null;
  const name = (s: Side) => (s === "home" ? ctx.home : ctx.away);

  const share = shareOf(bars);
  const halves = [shareOf(bars.filter((b) => b.minute <= 45)), shareOf(bars.filter((b) => b.minute > 45))];

  // Spells of control: stretches where the rolling pressure leans one way,
  // clearly, for a good while.
  const smooth = rolling(bars, SMOOTH);
  const peak = Math.max(1, ...smooth.map(Math.abs));
  const spells: (StoryBeat & { kind: "spell"; weight: number })[] = [];
  let start = -1;
  let side: Side | null = null;
  const close = (end: number) => {
    if (side && start >= 0 && end - start + 1 >= MIN_SPELL) {
      let weight = 0;
      for (let k = start; k <= end; k++) weight += Math.abs(smooth[k]);
      spells.push({ kind: "spell", side, from: bars[start].minute, to: bars[end].minute, weight });
    }
  };
  for (let i = 0; i < smooth.length; i++) {
    const s: Side | null = smooth[i] > peak * 0.18 ? "home" : smooth[i] < -peak * 0.18 ? "away" : null;
    if (s !== side) {
      close(i - 1);
      side = s;
      start = s ? i : -1;
    }
  }
  close(smooth.length - 1);
  const topSpells = spells.sort((a, b) => b.weight - a.weight).slice(0, 2);

  // Goals: against the run of play (the other side had the ten minutes
  // before), and late ones.
  const beats: StoryBeat[] = topSpells.map(({ kind, side: s, from, to }) => ({ kind, side: s, from, to }));
  const goals = marks.filter((m) => m.kind === "goal");
  for (const g of goals) {
    let before = 0;
    for (const b of bars) if (b.minute >= g.minute - 10 && b.minute < g.minute) before += b.value;
    const against = g.side === "home" ? before < -peak * 0.6 : before > peak * 0.6;
    if (against) beats.push({ kind: "against-run", side: g.side, minute: g.minute });
    else if (g.minute >= 85) beats.push({ kind: "late", side: g.side, minute: g.minute });
  }

  // The biggest swing: where ten minutes of one side gave way to ten of the other.
  let swing: { side: Side; minute: number; size: number } | null = null;
  for (let i = 10; i + 10 <= bars.length; i++) {
    let a = 0;
    let b = 0;
    for (let k = i - 10; k < i; k++) a += bars[k].value;
    for (let k = i; k < i + 10; k++) b += bars[k].value;
    if (Math.sign(a) !== Math.sign(b) && a !== 0 && b !== 0) {
      const size = Math.abs(b - a);
      if (!swing || size > swing.size) swing = { side: b > 0 ? "home" : "away", minute: bars[i].minute, size };
    }
  }
  if (swing && swing.size > peak * 1.2) beats.push({ kind: "swing", side: swing.side, minute: swing.minute });
  beats.sort((x, y) => ("from" in x ? x.from : x.minute) - ("from" in y ? y.from : y.minute));

  return { headline: headline(), beats, share, halves };

  function headline(): string {
    const dom: Side | null = share.home >= 58 ? "home" : share.away >= 58 ? "away" : null;
    const hs = ctx.homeScore ?? 0;
    const as = ctx.awayScore ?? 0;
    const winner: Side | null = hs > as ? "home" : as > hs ? "away" : null;
    const late = beats.find((b) => b.kind === "late") as { side: Side; minute: number } | undefined;
    const run = beats.find((b) => b.kind === "against-run") as { side: Side; minute: number } | undefined;

    if (ctx.finished && dom && winner && winner !== dom)
      return `${name(dom)} had ${share[dom]}% of the pressure — and still lost.`;
    if (ctx.finished && dom && !winner) return `${name(dom)} had ${share[dom]}% of the pressure but couldn't find a winner.`;
    if (late) return `${name(late.side)} struck at ${late.minute}' — the late one that told the story.`;
    if (run) return `${name(run.side)} scored against the run of play at ${run.minute}'.`;
    const second = halves[1];
    const flip: Side | null = second.home >= 62 ? "home" : second.away >= 62 ? "away" : null;
    if (flip && halves[0][flip] < 50) return `${name(flip)} took over after the break — ${second[flip]}% of the pressure.`;
    if (dom) return `${name(dom)} ran the game — ${share[dom]}% of the pressure.`;
    return `Nothing between them — ${share.home}–${share.away} on pressure.`;
  }
}
