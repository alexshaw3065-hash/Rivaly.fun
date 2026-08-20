"use client";

import { useState } from "react";
import { computeAchievements } from "@/lib/achievements";
import { BottomSheet } from "./bottom-sheet";
import type { Profile } from "@/lib/types";

// A small real achievements row — every badge is an honest predicate over
// this profile's actual stats/entries (see src/lib/achievements.ts), not a
// placeholder count. Locked badges are dimmed, not hidden — same
// "trust must be visible" instinct as the rest of the app.
export function ProfileAchievements({ profile }: { profile: Profile }) {
  const [open, setOpen] = useState(false);
  const computed = computeAchievements(profile);
  const unlockedCount = computed.filter((c) => c.unlocked).length;

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="hover-link flex items-center gap-2 text-sm text-muted transition-colors"
      >
        <div className="flex -space-x-1.5">
          {computed.map(({ achievement, unlocked }) => (
            <span
              key={achievement.id}
              className="flex h-6 w-6 items-center justify-center rounded-full border text-xs"
              style={{
                borderColor: unlocked ? "var(--rival-blue)" : "var(--border)",
                background: unlocked ? "var(--rival-blue-dim)" : "var(--surface-elevated)",
                opacity: unlocked ? 1 : 0.4,
              }}
            >
              {achievement.icon}
            </span>
          ))}
        </div>
        <span>
          {unlockedCount} achievement{unlockedCount === 1 ? "" : "s"}
        </span>
      </button>

      <BottomSheet open={open} onClose={() => setOpen(false)} title="Achievements">
        <div className="grid grid-cols-2 gap-3">
          {computed.map(({ achievement, unlocked }) => (
            <div
              key={achievement.id}
              className="flex flex-col items-center gap-2 rounded-lg border p-4 text-center"
              style={{
                borderColor: unlocked ? "var(--border-strong)" : "var(--border)",
                opacity: unlocked ? 1 : 0.4,
              }}
            >
              <span className="text-2xl">{achievement.icon}</span>
              <p className="text-sm font-medium text-foreground">{achievement.label}</p>
              <p className="text-xs text-muted">{achievement.description}</p>
            </div>
          ))}
        </div>
      </BottomSheet>
    </>
  );
}
