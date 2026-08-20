import type { Profile } from "./types";
import { entriesByUser } from "./mock-data";

// A real, minimal achievements system — every definition is an honest
// predicate over data that already exists (Profile stats, actual Entry
// records), not a placeholder count. Per the founder's direction: build a
// small real version rather than a fabricated badge number.
export interface Achievement {
  id: string;
  label: string;
  description: string;
  icon: string;
  isUnlocked: (profile: Profile) => boolean;
}

export const achievements: Achievement[] = [
  {
    id: "room-starter",
    label: "Room Starter",
    description: "Created your first room.",
    icon: "🚪",
    isUnlocked: (p) => p.roomsCreated > 0,
  },
  {
    id: "prolific-creator",
    label: "Prolific Creator",
    description: "Created 10 or more rooms.",
    icon: "🏗️",
    isUnlocked: (p) => p.roomsCreated >= 10,
  },
  {
    id: "sharp-shooter",
    label: "Sharp Shooter",
    description: "70%+ prediction accuracy.",
    icon: "🎯",
    isUnlocked: (p) => p.predictionAccuracy >= 0.7,
  },
  {
    id: "first-blood",
    label: "First Blood",
    description: "Won your first room.",
    icon: "🩸",
    isUnlocked: (p) => entriesByUser(p.id).some((e) => e.isWinner === true),
  },
  {
    id: "high-roller",
    label: "High Roller",
    description: "₦100,000+ in career winnings.",
    icon: "💰",
    isUnlocked: (p) => p.totalWinningsCents >= 100_000_00,
  },
  {
    id: "known-name",
    label: "Known Name",
    description: "500+ rivals following you.",
    icon: "⭐",
    isUnlocked: (p) => p.followerCount >= 500,
  },
];

export function computeAchievements(profile: Profile): { achievement: Achievement; unlocked: boolean }[] {
  return achievements.map((achievement) => ({ achievement, unlocked: achievement.isUnlocked(profile) }));
}
