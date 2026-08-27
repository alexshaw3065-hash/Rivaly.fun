/**
 * The Rivaly split: a hard diagonal seam between two colors, never a soft
 * blend — represents two opposing predictions clashing, not a gradient.
 * Reused wherever a room shows its YES/NO (or side A/B) distribution.
 *
 * Blue vs red, not blue vs green — green/red reads as "win/lose" or
 * "good/bad" (stock-ticker, traffic-light convention), which would subtly
 * suggest Yes is the "correct" side. Neither side is inherently right;
 * blue vs red is the same instantly-legible high-contrast opposition
 * without implying a winner (classic two-team framing — exactly the
 * rivalry this bar is showing).
 */
export function SplitBar({
  leftPct,
  leftLabel,
  rightLabel,
}: {
  leftPct: number;
  leftLabel: string;
  rightLabel: string;
}) {
  const rightPct = 100 - leftPct;
  return (
    <div>
      <div className="flex items-baseline justify-between font-mono text-[11px] tracking-tight">
        <span className="text-rival-blue">
          {leftLabel} · {leftPct}%
        </span>
        <span className="text-danger-red">
          {rightPct}% · {rightLabel}
        </span>
      </div>
      <div
        className="mt-1.5 h-[6px] w-full rounded-[1px]"
        style={{
          background: `linear-gradient(78deg, var(--rival-blue) 0%, var(--rival-blue) calc(${leftPct}% - 1px), var(--danger-red) calc(${leftPct}% + 1px), var(--danger-red) 100%)`,
        }}
      />
    </div>
  );
}
