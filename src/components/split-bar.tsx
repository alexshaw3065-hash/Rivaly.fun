/**
 * The Rivaly split: a hard diagonal seam between two colors, never a soft
 * blend — represents two opposing predictions clashing, not a gradient.
 * Reused wherever a room shows its YES/NO (or side A/B) distribution.
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
        <span className="text-rival-green">
          {rightPct}% · {rightLabel}
        </span>
      </div>
      <div
        className="mt-1.5 h-[6px] w-full rounded-[1px]"
        style={{
          background: `linear-gradient(78deg, var(--rival-blue) 0%, var(--rival-blue) calc(${leftPct}% - 1px), var(--rival-green) calc(${leftPct}% + 1px), var(--rival-green) 100%)`,
        }}
      />
    </div>
  );
}
