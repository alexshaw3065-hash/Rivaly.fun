"use client";

import { useId, useMemo, useRef, useState, type PointerEvent } from "react";

// Your profit/loss over time: one step per room that settled (you only make
// or lose money when a room settles, so the line steps rather than drifts).
// The figure is what you made in the chosen period; drag along the line to
// read any point. Engagement mechanism #7 (investment): a record that grows
// with every room you play is a reason to come back — and a loss reads as one
// step on a longer line, never as a verdict.

export interface PnlPoint {
  at: number;
  cents: number;
}

type Period = "24h" | "7d" | "30d" | "all";
const PERIODS: Period[] = ["24h", "7d", "30d", "all"];
const SPAN: Record<Period, number> = { "24h": 86_400_000, "7d": 7 * 86_400_000, "30d": 30 * 86_400_000, all: Infinity };
const LABEL: Record<Period, string> = { "24h": "Past day", "7d": "Past week", "30d": "Past month", all: "All time" };

const W = 320;
const H = 140;
const PAD = 10;

// The empty state's wave: decoration for "nothing yet", never data.
const EMPTY_WAVE = "M24,70 C 44,25 74,25 94,70 C 114,115 144,115 164,70 C 184,25 214,25 234,70 C 254,115 284,115 296,80";

function split(cents: number) {
  const abs = Math.abs(cents) / 100;
  const [whole, frac] = abs.toFixed(2).split(".");
  return { sign: cents > 0 ? "+" : cents < 0 ? "−" : "", whole: `$${Number(whole).toLocaleString("en-US")}`, frac: `.${frac}` };
}

function when(t: number, period: Period): string {
  const d = new Date(t);
  return period === "24h"
    ? d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })
    : d.toLocaleDateString("en-GB", { day: "numeric", month: "short", ...(period === "all" ? { year: "numeric" } : {}) });
}

export function PnlChart({ points, now }: { points: PnlPoint[] | null; now: number }) {
  const [period, setPeriod] = useState<Period>("all");
  const [scrub, setScrub] = useState<number | null>(null);
  const box = useRef<HTMLDivElement>(null);
  // Each chart's own gradient id — a shared one would paint every chart on the page in the first chart's colour.
  const fillId = `pnl-fill-${useId().replace(/:/g, "")}`;

  const data = useMemo(() => {
    if (!points || points.length === 0) return null;
    const first = points[0].at;
    const start = period === "all" ? first - Math.max(3_600_000, (now - first) * 0.03) : now - SPAN[period];
    const inside = points.filter((p) => p.at >= start && p.at <= now);
    let cum = 0;
    const series = [{ t: start, v: 0 }];
    for (const p of inside) {
      cum += p.cents;
      series.push({ t: p.at, v: cum });
    }
    series.push({ t: now, v: cum });
    const vs = series.map((s) => s.v);
    let lo = Math.min(0, ...vs);
    let hi = Math.max(0, ...vs);
    if (lo === hi) {
      lo -= 100;
      hi += 100;
    }
    const x = (t: number) => ((t - start) / Math.max(1, now - start)) * W;
    const y = (v: number) => PAD + ((hi - v) / (hi - lo)) * (H - 2 * PAD);
    let line = `M${x(series[0].t)},${y(series[0].v)}`;
    for (let i = 1; i < series.length; i++) line += ` H${x(series[i].t)} V${y(series[i].v)}`;
    const area = `${line} V${H} H${x(series[0].t)} Z`;
    return { series, inside, total: cum, x, y, line, area, zero: y(0) };
  }, [points, period, now]);

  const shown = data ? (scrub !== null ? data.series[scrub] : { t: now, v: data.total }) : null;
  const value = split(shown?.v ?? 0);
  const up = (data?.total ?? 0) >= 0;
  const tone = up ? "var(--money)" : "var(--no)";

  function read(e: PointerEvent<HTMLDivElement>) {
    if (!data || !box.current) return;
    const r = box.current.getBoundingClientRect();
    const t = ((e.clientX - r.left) / r.width) * W;
    let best = 0;
    let bestD = Infinity;
    data.series.forEach((s, i) => {
      const d = Math.abs(data.x(s.t) - t);
      if (d < bestD) {
        bestD = d;
        best = i;
      }
    });
    setScrub(best);
  }

  const sub =
    points === null
      ? "…"
      : !data
        ? "--"
        : scrub !== null && shown
          ? when(shown.t, period)
          : data.inside.length === 0
            ? `${LABEL[period]} · nothing settled`
            : `${LABEL[period]} · ${data.inside.length} ${data.inside.length === 1 ? "room" : "rooms"}`;

  return (
    <div>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-display font-display tabular-nums text-foreground" aria-live="polite">
            {value.sign && <span className={shown && shown.v < 0 ? "text-no-ink" : "text-money-ink"}>{value.sign}</span>}
            {value.whole}
            <span className="text-tertiary">{value.frac}</span>
          </p>
          <p className="mt-1 text-label text-secondary">{sub}</p>
        </div>
        <div role="radiogroup" aria-label="Period" className="flex shrink-0 gap-1">
          {PERIODS.map((p) => (
            <button
              key={p}
              type="button"
              role="radio"
              aria-checked={period === p}
              onClick={() => setPeriod(p)}
              className={`h-8 rounded-control px-2 text-label font-semibold transition-colors duration-100 ${period === p ? "bg-surface-3 text-foreground" : "text-tertiary hover:text-secondary"}`}
            >
              {p === "all" ? "All" : p}
            </button>
          ))}
        </div>
      </div>

      <div
        ref={box}
        className="relative mt-4 h-36 touch-pan-y select-none"
        style={{ backgroundImage: "radial-gradient(var(--line-strong) 1px, transparent 1px)", backgroundSize: "12px 12px" }}
        onPointerDown={read}
        onPointerMove={(e) => (e.pointerType === "mouse" || e.buttons ? read(e) : undefined)}
        onPointerLeave={() => setScrub(null)}
        onPointerUp={(e) => e.pointerType !== "mouse" && setScrub(null)}
      >
        <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="absolute inset-0 h-full w-full" aria-hidden>
          {data ? (
            <>
              <defs>
                <linearGradient id={fillId} x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" stopColor={tone} stopOpacity="0.18" />
                  <stop offset="100%" stopColor={tone} stopOpacity="0" />
                </linearGradient>
              </defs>
              <line x1={0} x2={W} y1={data.zero} y2={data.zero} stroke="var(--line-strong)" strokeDasharray="3 4" vectorEffect="non-scaling-stroke" />
              <path d={data.area} fill={`url(#${fillId})`} />
              <path d={data.line} fill="none" stroke={tone} strokeWidth={2} strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
              {scrub !== null && (
                <line
                  x1={data.x(data.series[scrub].t)}
                  x2={data.x(data.series[scrub].t)}
                  y1={0}
                  y2={H}
                  stroke="var(--text-secondary)"
                  strokeWidth={1}
                  vectorEffect="non-scaling-stroke"
                />
              )}
            </>
          ) : (
            <path d={EMPTY_WAVE} fill="none" stroke="var(--line-strong)" strokeWidth={2.5} strokeLinecap="round" vectorEffect="non-scaling-stroke" />
          )}
        </svg>
        {!data && points !== null && <p className="absolute inset-x-0 bottom-2 text-center text-body text-tertiary">No positions yet</p>}
      </div>
    </div>
  );
}
