"use client";

import { useState } from "react";
import { achievements, achievementsByCategory, type AchievementStats } from "@/lib/achievements";
import { useHasSeenAchievementsIntro, markAchievementsIntroSeen } from "@/lib/use-achievements-intro";
import { useDailyStreak } from "@/lib/use-daily-streak";
import { AchievementsIntroSheet } from "./achievements-intro-sheet";
import { BottomSheet } from "./bottom-sheet";
import type { Profile } from "@/lib/types";

const PREVIEW_COUNT = 6;

function ProgressBar({ current, target }: { current: number; target: number }) {
  const pct = Math.min(100, Math.round((current / target) * 100));
  return (
    <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full" style={{ background: "var(--line)" }}>
      <div
        className="h-full rounded-full"
        style={{ width: `${pct}%`, background: "var(--yes)", transition: "width 200ms ease-out" }}
      />
    </div>
  );
}

// The header trigger stays a small preview row + count — every badge is an
// honest predicate over real Profile/Entry data (src/lib/achievements.ts).
// Tapping it shows the first-time intro once (gated per-viewer, not
// per-profile — it's explaining the concept, not this person's stats),
// then always opens the full categorized sheet with progress bars and,
// self-only, the real daily check-in streak.
export function ProfileAchievements({ profile, isSelf, stats }: { profile: Profile; isSelf: boolean; stats: AchievementStats }) {
  const [fullOpen, setFullOpen] = useState(false);
  const hasSeenIntro = useHasSeenAchievementsIntro();
  const streak = useDailyStreak();

  const preview = achievements.slice(0, PREVIEW_COUNT).map((a) => ({ achievement: a, unlocked: a.isUnlocked(profile, stats) }));
  const unlockedCount = achievements.filter((a) => a.isUnlocked(profile, stats)).length;
  const categories = achievementsByCategory(profile, stats);

  return (
    <>
      <button
        onClick={() => setFullOpen(true)}
        className="hover-link flex items-center gap-2 text-body text-secondary transition-colors"
      >
        <div className="flex -space-x-1.5">
          {preview.map(({ achievement, unlocked }) => (
            <span
              key={achievement.id}
              className="flex h-6 w-6 items-center justify-center rounded-full border text-caption"
              style={{
                borderColor: unlocked ? "var(--yes)" : "var(--line)",
                background: unlocked ? "var(--yes-tint)" : "var(--surface-elevated)",
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

      <AchievementsIntroSheet
        open={!hasSeenIntro && fullOpen}
        onGetStarted={() => markAchievementsIntroSeen()}
      />

      <BottomSheet open={hasSeenIntro && fullOpen} onClose={() => setFullOpen(false)} title="Achievements">
        <div className="flex flex-col gap-6">
          {isSelf && (
            <div className="flex items-center justify-center gap-2 rounded-control border border-line bg-surface py-3">
              <span className="text-lg">🔥</span>
              <span className="text-body font-medium text-foreground">
                {streak} day{streak === 1 ? "" : "s"} streak
              </span>
            </div>
          )}

          {categories.map(({ category, items }) => {
            const categoryUnlocked = items.filter((i) => i.unlocked).length;
            return (
              <div key={category}>
                <div className="flex items-baseline justify-between">
                  <p className="font-display text-body-lg font-semibold text-foreground">{category}</p>
                  <p className="text-caption text-secondary">
                    {categoryUnlocked} of {items.length}
                  </p>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-3">
                  {items.map(({ achievement, unlocked }) => {
                    const prog = !unlocked ? achievement.progress?.(profile, stats) : undefined;
                    return (
                      <div
                        key={achievement.id}
                        className="flex flex-col items-center gap-1.5 rounded-control border p-3 text-center"
                        style={{
                          borderColor: unlocked ? "var(--line-strong)" : "var(--line)",
                          opacity: unlocked ? 1 : 0.5,
                        }}
                      >
                        <span className="text-xl">{achievement.icon}</span>
                        <p className="text-caption font-medium text-foreground">{achievement.label}</p>
                        <p className="text-caption text-secondary">{achievement.description}</p>
                        {prog && (
                          <div className="w-full">
                            <ProgressBar current={prog.current} target={prog.target} />
                            <p className="mt-1 text-micro text-secondary">
                              {prog.current.toLocaleString()}/{prog.target.toLocaleString()}
                            </p>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </BottomSheet>
    </>
  );
}
