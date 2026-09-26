import type { Profile } from "./types";

// A real achievements system — every definition is an honest predicate
// over data that already exists (Profile stats, actual Entry records),
// not a placeholder count. `progress` is only defined for the genuinely
// tiered ones (accuracy/rooms/followers/winnings) — it powers a Reddit-
// style "34/50" progress bar on the next milestone; boolean achievements
// (joined, added a bio, first win…) just show locked/unlocked.
export const CATEGORIES = [
  "Getting Started",
  "Prediction Mastery",
  "Room Building",
  "Community",
  "High Roller",
] as const;

export type AchievementCategory = (typeof CATEGORIES)[number];

/** The real record, from settled public rooms (player_card) and rooms entered. */
export interface AchievementStats {
  played: number;
  wins: number;
  /** Net profit in cents. */
  profit: number;
  /** Rooms entered (created or joined). */
  joined: number;
}

export interface Achievement {
  id: string;
  category: AchievementCategory;
  label: string;
  description: string;
  icon: string;
  isUnlocked: (profile: Profile, stats: AchievementStats) => boolean;
  progress?: (profile: Profile, stats: AchievementStats) => { current: number; target: number };
}

// Accuracy only counts from 3 settled rooms — one lucky call isn't 100%.
const ACCURACY_FROM = 3;
const accuracy = (st: AchievementStats) => (st.played >= ACCURACY_FROM ? st.wins / st.played : 0);

export const achievements: Achievement[] = [
  // Getting Started
  {
    id: "joined-rivaly",
    category: "Getting Started",
    label: "Joined Rivaly",
    description: "Created your account.",
    icon: "👋",
    isUnlocked: () => true,
  },
  {
    id: "added-bio",
    category: "Getting Started",
    label: "Tell Your Story",
    description: "Added a bio to your profile.",
    icon: "📝",
    isUnlocked: (p) => p.bio !== null,
  },
  {
    id: "connected-social",
    category: "Getting Started",
    label: "Linked Up",
    description: "Connected a social account.",
    icon: "🔗",
    isUnlocked: (p) => p.socialLinks.length > 0,
  },
  {
    id: "room-starter",
    category: "Getting Started",
    label: "Room Starter",
    description: "Created your first room.",
    icon: "🚪",
    isUnlocked: (p) => p.roomsCreated > 0,
  },
  {
    id: "first-join",
    category: "Getting Started",
    label: "In the Arena",
    description: "Joined your first room.",
    icon: "🎟️",
    isUnlocked: (_p, st) => st.joined > 0,
  },
  {
    id: "five-followed",
    category: "Getting Started",
    label: "Scouting Rivals",
    description: "Followed 5 or more rivals.",
    icon: "🔍",
    isUnlocked: (p) => p.followingCount >= 5,
    progress: (p) => ({ current: Math.min(p.followingCount, 5), target: 5 }),
  },

  // Prediction Mastery
  {
    id: "accuracy-50",
    category: "Prediction Mastery",
    label: "Coin Flip Beater",
    description: "50%+ accuracy over 3+ settled rooms.",
    icon: "🪙",
    isUnlocked: (_p, st) => accuracy(st) >= 0.5,
    progress: (_p, st) => ({ current: Math.round(accuracy(st) * 100), target: 50 }),
  },
  {
    id: "accuracy-60",
    category: "Prediction Mastery",
    label: "Sharp Eye",
    description: "60%+ accuracy over 3+ settled rooms.",
    icon: "👁️",
    isUnlocked: (_p, st) => accuracy(st) >= 0.6,
    progress: (_p, st) => ({ current: Math.round(accuracy(st) * 100), target: 60 }),
  },
  {
    id: "sharp-shooter",
    category: "Prediction Mastery",
    label: "Sharp Shooter",
    description: "70%+ accuracy over 3+ settled rooms.",
    icon: "🎯",
    isUnlocked: (_p, st) => accuracy(st) >= 0.7,
    progress: (_p, st) => ({ current: Math.round(accuracy(st) * 100), target: 70 }),
  },
  {
    id: "accuracy-80",
    category: "Prediction Mastery",
    label: "Oracle",
    description: "80%+ accuracy over 3+ settled rooms.",
    icon: "🔮",
    isUnlocked: (_p, st) => accuracy(st) >= 0.8,
    progress: (_p, st) => ({ current: Math.round(accuracy(st) * 100), target: 80 }),
  },
  {
    id: "first-blood",
    category: "Prediction Mastery",
    label: "First Blood",
    description: "Won your first room.",
    icon: "🩸",
    isUnlocked: (_p, st) => st.wins >= 1,
  },
  {
    id: "ten-wins",
    category: "Prediction Mastery",
    label: "Certified Rival",
    description: "Won 10 or more rooms.",
    icon: "🏅",
    isUnlocked: (_p, st) => st.wins >= 10,
    progress: (_p, st) => ({ current: st.wins, target: 10 }),
  },

  // Room Building
  {
    id: "rooms-5",
    category: "Room Building",
    label: "Getting Started",
    description: "Created 5 or more rooms.",
    icon: "🏠",
    isUnlocked: (p) => p.roomsCreated >= 5,
    progress: (p) => ({ current: p.roomsCreated, target: 5 }),
  },
  {
    id: "prolific-creator",
    category: "Room Building",
    label: "Prolific Creator",
    description: "Created 10 or more rooms.",
    icon: "🏗️",
    isUnlocked: (p) => p.roomsCreated >= 10,
    progress: (p) => ({ current: p.roomsCreated, target: 10 }),
  },
  {
    id: "rooms-25",
    category: "Room Building",
    label: "Room Baron",
    description: "Created 25 or more rooms.",
    icon: "🏰",
    isUnlocked: (p) => p.roomsCreated >= 25,
    progress: (p) => ({ current: p.roomsCreated, target: 25 }),
  },
  {
    id: "rooms-50",
    category: "Room Building",
    label: "Room Mogul",
    description: "Created 50 or more rooms.",
    icon: "🏙️",
    isUnlocked: (p) => p.roomsCreated >= 50,
    progress: (p) => ({ current: p.roomsCreated, target: 50 }),
  },

  // Community
  {
    id: "followers-10",
    category: "Community",
    label: "First Following",
    description: "10 or more rivals following you.",
    icon: "🌱",
    isUnlocked: (p) => p.followerCount >= 10,
    progress: (p) => ({ current: p.followerCount, target: 10 }),
  },
  {
    id: "followers-100",
    category: "Community",
    label: "Rising Rival",
    description: "100 or more rivals following you.",
    icon: "📈",
    isUnlocked: (p) => p.followerCount >= 100,
    progress: (p) => ({ current: p.followerCount, target: 100 }),
  },
  {
    id: "known-name",
    category: "Community",
    label: "Known Name",
    description: "500 or more rivals following you.",
    icon: "⭐",
    isUnlocked: (p) => p.followerCount >= 500,
    progress: (p) => ({ current: p.followerCount, target: 500 }),
  },
  {
    id: "followers-1000",
    category: "Community",
    label: "Household Name",
    description: "1,000 or more rivals following you.",
    icon: "🌟",
    isUnlocked: (p) => p.followerCount >= 1000,
    progress: (p) => ({ current: p.followerCount, target: 1000 }),
  },

  // High Roller
  {
    id: "winnings-10k",
    category: "High Roller",
    label: "First Payout",
    description: "$100+ net winnings.",
    icon: "💵",
    isUnlocked: (_p, st) => st.profit >= 10_000,
    progress: (_p, st) => ({ current: Math.max(0, Math.round(st.profit / 100)), target: 100 }),
  },
  {
    id: "winnings-50k",
    category: "High Roller",
    label: "Stacking Up",
    description: "$500+ net winnings.",
    icon: "💸",
    isUnlocked: (_p, st) => st.profit >= 50_000,
    progress: (_p, st) => ({ current: Math.max(0, Math.round(st.profit / 100)), target: 500 }),
  },
  {
    id: "high-roller",
    category: "High Roller",
    label: "High Roller",
    description: "$1,000+ net winnings.",
    icon: "💰",
    isUnlocked: (_p, st) => st.profit >= 100_000,
    progress: (_p, st) => ({ current: Math.max(0, Math.round(st.profit / 100)), target: 1000 }),
  },
  {
    id: "winnings-500k",
    category: "High Roller",
    label: "Whale",
    description: "$5,000+ net winnings.",
    icon: "🐋",
    isUnlocked: (_p, st) => st.profit >= 500_000,
    progress: (_p, st) => ({ current: Math.max(0, Math.round(st.profit / 100)), target: 5000 }),
  },
];

export function computeAchievements(profile: Profile, stats: AchievementStats): { achievement: Achievement; unlocked: boolean }[] {
  return achievements.map((achievement) => ({ achievement, unlocked: achievement.isUnlocked(profile, stats) }));
}

export function achievementsByCategory(profile: Profile, stats: AchievementStats) {
  return CATEGORIES.map((category) => ({
    category,
    items: achievements
      .filter((a) => a.category === category)
      .map((achievement) => ({ achievement, unlocked: achievement.isUnlocked(profile, stats) })),
  }));
}
