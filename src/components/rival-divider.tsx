// Marks where "Top Rivals" (weekly-style P/L) ends and "Goated Rivals"
// (career totalWinnings) starts within one continuous scroll row — see
// src/app/page.tsx. A vertical rule + label, not a second section header,
// since the two groups now share a single row rather than stacking.
export function RivalDivider() {
  return (
    <div className="flex w-16 shrink-0 flex-col items-center justify-center gap-1.5 border-l border-border pl-3 text-center">
      <span className="text-lg leading-none">🏆</span>
      <span className="text-[10px] font-medium uppercase leading-tight tracking-wide text-muted">
        Goated
      </span>
    </div>
  );
}
