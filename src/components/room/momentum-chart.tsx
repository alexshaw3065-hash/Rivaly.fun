import type { MomentumBar, MomentumMark } from "@/lib/match-stats";
import type { Match } from "@/lib/types";
import { teamFills } from "./room-lineup";

// Who's on top, minute by minute: bars above the line when the home side is
// pressing, below when the away side is — built from TxLINE's attack /
// danger / high-danger possession states, with goals and big chances marked
// where they happened. It's the story of the match at a glance ("they
// battered us for 20 minutes and still lost"), and while the match is live
// the pressure building before a goal is the anticipation beat itself.
// Engagement mechanisms #2 (anticipation) and #9 (a match story to retell).

const W = 360;
const H = 76;
const MID = H / 2;

export function MomentumChart({ match, data }: { match: Match; data: { bars: MomentumBar[]; marks: MomentumMark[]; lastMinute: number } }) {
  const { home, away, codes } = teamFills(match);
  const domain = Math.max(90, data.lastMinute);
  const step = W / domain;
  const peak = Math.max(6, ...data.bars.map((b) => Math.abs(b.value)));
  const scale = (MID - 6) / peak;
  const x = (minute: number) => (minute - 0.5) * step;

  return (
    <section className="rounded-2xl border border-border bg-surface px-4 py-3" aria-label="Momentum">
      <div className="flex items-center justify-between pb-2">
        <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted">Momentum</span>
        <span className="flex items-center gap-3 text-[11px] font-semibold text-foreground">
          <Key colour={home.fill} label={codes.home} />
          <Key colour={away.fill} label={codes.away} />
        </span>
      </div>

      <div className="relative">
        <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="block h-[76px] w-full" aria-hidden>
          {/* Half-time */}
          <line x1={45 * step} x2={45 * step} y1={4} y2={H - 4} stroke="var(--border-strong)" strokeWidth={1} strokeDasharray="2 3" vectorEffect="non-scaling-stroke" />
          {data.bars.map((b) =>
            b.value === 0 ? null : (
              <rect
                key={b.minute}
                x={(b.minute - 1) * step + step * 0.12}
                width={Math.max(0.8, step * 0.76)}
                y={b.value > 0 ? MID - b.value * scale : MID}
                height={Math.abs(b.value) * scale}
                rx={Math.min(1.5, step * 0.3)}
                fill={b.value > 0 ? home.fill : away.fill}
                opacity={0.92}
              />
            ),
          )}
          <line x1={0} x2={W} y1={MID} y2={MID} stroke="var(--border-strong)" strokeWidth={1} vectorEffect="non-scaling-stroke" />
        </svg>

        {/* Goals and big chances, drawn as HTML so they stay round at any width. */}
        {data.marks.map((m, i) => (
          <span
            key={`${m.kind}-${m.minute}-${i}`}
            className="absolute -translate-x-1/2"
            style={{ left: `${(x(m.minute) / W) * 100}%`, ...(m.side === "home" ? { top: -2 } : { bottom: -2 }) }}
            title={`${m.kind === "goal" ? "Goal" : "Big chance"} · ${m.side === "home" ? codes.home : codes.away} ${m.minute}'`}
          >
            {m.kind === "goal" ? (
              <svg width="12" height="12" viewBox="0 0 14 14" className="drop-shadow-[0_1px_1px_rgba(0,0,0,0.5)]">
                <circle cx="7" cy="7" r="6.2" fill="#fff" stroke="#111" strokeWidth="0.8" />
                <path d="M7 4.2 9.6 6.1 8.6 9.1H5.4L4.4 6.1Z" fill="#111" />
              </svg>
            ) : (
              <span className="block h-1.5 w-1.5 rounded-full border border-foreground/60" />
            )}
          </span>
        ))}
      </div>

      <div className="flex justify-between pt-1 font-mono text-[10px] tabular-nums text-muted">
        <span>0&rsquo;</span>
        <span>45&rsquo;</span>
        <span>{domain}&rsquo;</span>
      </div>
    </section>
  );
}

function Key({ colour, label }: { colour: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className="h-2 w-2 rounded-[3px] ring-1 ring-border-strong" style={{ background: colour }} />
      {label}
    </span>
  );
}
