"use client";

import { openStakeSheet } from "@/lib/stake-sheet-store";
import { SidePill } from "../ui/controls";

// Placeholder rows only: the database never sends this viewer the real
// messages, so there's nothing to leak through the blur.
const ROWS = [
  { name: 28, line: 62 },
  { name: 22, line: 40 },
  { name: 34, line: 74 },
  { name: 24, line: 52 },
  { name: 30, line: 34 },
  { name: 20, line: 66 },
];

// A room that doesn't allow spectators: the chat is there, but blurred shut
// until you take a side.
export function LockedChat({ joinable }: { joinable: boolean }) {
  return (
    <section className="relative flex h-full min-h-0 flex-col overflow-hidden rounded-card bg-surface edge">
      <div className="flex shrink-0 items-center border-b border-line px-4 py-3">
        <p className="text-body-lg font-display font-bold text-foreground">The crowd</p>
      </div>

      <div aria-hidden className="flex min-h-0 flex-1 select-none flex-col gap-5 overflow-hidden px-4 pt-5 blur-[6px]">
        {ROWS.map((r, i) => (
          <div key={i} className="flex items-start gap-3">
            <span className={`h-9 w-9 shrink-0 rounded-full ${i % 2 ? "bg-no-tint-strong" : "bg-yes-tint-strong"}`} />
            <div className="flex min-w-0 flex-1 flex-col gap-2 pt-1">
              <span className={`h-2.5 rounded-full ${i % 2 ? "bg-no-tint-strong" : "bg-yes-tint-strong"}`} style={{ width: `${r.name}%` }} />
              <span className="h-3 rounded-full bg-overlay-3" style={{ width: `${r.line}%` }} />
            </div>
          </div>
        ))}
      </div>

      <div className="absolute inset-x-0 bottom-0 top-12 flex items-center justify-center bg-gradient-to-b from-transparent via-surface/60 to-surface px-6">
        <div className="flex max-w-xs flex-col items-center text-center">
          <span aria-hidden className="flex h-11 w-11 items-center justify-center rounded-full bg-overlay-2 text-foreground">
            <svg viewBox="0 0 20 20" width="20" height="20" fill="none">
              <rect x="4.5" y="8.5" width="11" height="8" rx="1.8" stroke="currentColor" strokeWidth="1.5" />
              <path d="M7 8.5V6.3a3 3 0 0 1 6 0v2.2" stroke="currentColor" strokeWidth="1.5" />
            </svg>
          </span>
          <p className="mt-3 text-title-3 font-display text-foreground">Stake to chat</p>
          <p className="mt-1 text-body text-secondary">
            {joinable ? "This room's chat is only for rivals. Take a side to see what they're saying." : "This room's chat is only for rivals."}
          </p>
          {/* Phones open the stake sheet; on desktop the stake panel is beside the chat. */}
          {joinable && (
            <div className="mt-4 grid w-full grid-cols-2 gap-2 md:hidden">
              <SidePill side="yes" size="md" role="button" aria-checked={undefined} onClick={() => openStakeSheet("yes")} />
              <SidePill side="no" size="md" role="button" aria-checked={undefined} onClick={() => openStakeSheet("no")} />
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
