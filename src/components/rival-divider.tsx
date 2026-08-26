// Marks a transition between groups within the single "Top rivals" scroll
// row (Top Rivals -> Goated Rivals -> Hall of Fame) — a vertical rule +
// label rather than a separate section header, since all three groups now
// share one continuous, auto-scrolling row (see src/app/page.tsx).
export function RivalDivider({ emoji, label }: { emoji: string; label: string }) {
  return (
    <div className="flex w-16 shrink-0 flex-col items-center justify-center gap-1.5 border-l border-border pl-3 text-center">
      <span className="text-lg leading-none">{emoji}</span>
      <span className="text-[10px] font-medium uppercase leading-tight tracking-wide text-muted">
        {label}
      </span>
    </div>
  );
}
