"use client";

import { BottomSheet } from "./bottom-sheet";

// First-time-only explainer, gated by use-achievements-intro.ts. The perk
// claim here is deliberately narrow and true — badges are genuinely
// visible on your profile (already shipped), so this promises exactly
// what the product does, nothing an unbuilt algorithm would have to back.
export function AchievementsIntroSheet({
  open,
  onGetStarted,
}: {
  open: boolean;
  onGetStarted: () => void;
}) {
  return (
    <BottomSheet open={open} onClose={onGetStarted} title="Introducing achievements!">
      <div className="flex flex-col items-center gap-5 text-center">
        <div className="flex gap-2 text-3xl">
          <span>🚪</span>
          <span>🎯</span>
          <span>🏅</span>
          <span>💰</span>
          <span>⭐</span>
        </div>
        <p className="text-sm text-muted">
          Unlock real badges for real activity — creating rooms, sharp predictions, growing your
          following, career winnings, and more.
        </p>
        <div className="w-full rounded-lg border border-border bg-surface p-4 text-left">
          <p className="text-sm font-medium text-foreground">A real, visible track record</p>
          <p className="mt-1 text-sm text-muted">
            Achievements show up right on your profile — other rivals see them before they accept
            your challenge.
          </p>
        </div>
        <button
          onClick={onGetStarted}
          className="w-full rounded-md bg-foreground px-4 py-3 text-sm font-medium text-background active:scale-[0.97]"
          style={{ transition: "transform 150ms ease-out" }}
        >
          Get Started
        </button>
      </div>
    </BottomSheet>
  );
}
