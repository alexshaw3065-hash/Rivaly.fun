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
 *
 * showLabels defaults to true (every existing caller keeps its label row
 * unchanged) — RoomCard is the one caller that opts out with `false`,
 * since its own Yes/No buttons now carry the percentage themselves
 * (e.g. "Yes 73%") and repeating the same number right above them read
 * as a mistake, not emphasis.
 *
 * Brightens on hover (pure CSS, no JS) — a small tactile response so the
 * bar reads as alive rather than a static graphic, applied directly to
 * the bar itself so it works regardless of what markup a given caller
 * wraps it in.
 */
export function SplitBar({
  leftPct,
  leftLabel,
  rightLabel,
  showLabels = true,
}: {
  leftPct: number;
  leftLabel: string;
  rightLabel: string;
  showLabels?: boolean;
}) {
  const rightPct = 100 - leftPct;
  return (
    <div>
      {showLabels && (
        <div className="flex items-baseline justify-between font-mono text-[11px] tracking-tight">
          <span className="text-rival-blue">
            {leftLabel} · {leftPct}%
          </span>
          <span className="text-danger-red">
            {rightPct}% · {rightLabel}
          </span>
        </div>
      )}
      <div
        className={`h-[6px] w-full rounded-[1px] transition-[filter] duration-200 ease-out hover:brightness-125 ${showLabels ? "mt-1.5" : ""}`}
        style={{
          background: `linear-gradient(78deg, var(--rival-blue) 0%, var(--rival-blue) calc(${leftPct}% - 1px), var(--danger-red) calc(${leftPct}% + 1px), var(--danger-red) 100%)`,
        }}
      />
    </div>
  );
}
