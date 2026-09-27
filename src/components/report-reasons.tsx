"use client";

import { REPORT_REASONS, type ReportReason } from "@/lib/report";

// The one list of reasons, shared by the chat message sheet and the Arena
// post menu. Picking one sends the report — no second confirm step.
export function ReportReasons({ onPick }: { onPick: (reason: ReportReason) => void }) {
  return (
    <div>
      <div className="flex flex-col overflow-hidden rounded-xl bg-surface ring-1 ring-border">
        {REPORT_REASONS.map((r) => (
          <button
            key={r.id}
            type="button"
            onClick={() => onPick(r.id)}
            className="flex h-12 items-center border-b border-border px-4 text-left text-[15px] font-semibold text-foreground last:border-0 active:bg-foreground/5"
          >
            {r.label}
          </button>
        ))}
      </div>
      <p className="mt-3 px-1 text-[13px] text-muted">It disappears for you straight away, and the Rivaly team reviews it.</p>
    </div>
  );
}
