import Link from "next/link";
import type { Profile } from "@/lib/types";
import { entriesByUser, currentStreak, formatMoney } from "@/lib/mock-data";
import { Avatar } from "./avatar";

// Career winnings + room-entry count for a rival you follow. Replaces the
// old dual "Top Rivals" (weekly P/L) / "Goated Rivals" (career total) split
// — per founder direction, one row now, scoped to people you actually
// follow rather than an anonymous global ranking. That's engagement-
// psychology mechanism #5 (social identity/rivalry — see
// .claude/skills/rivaly-engagement-psychology): in-group favoritism is a
// stronger, more consistent pull than "here are the best 5 strangers."
export function RivalCard({ profile }: { profile: Profile }) {
  const entryCount = entriesByUser(profile.id).length;

  return (
    <Link
      href={`/profile/${profile.username}`}
      className="flex w-[136px] shrink-0 flex-col items-center gap-1.5 rounded-lg border border-border bg-surface px-3 py-4 text-center transition-transform duration-150 ease-out active:scale-[0.97]"
    >
      <Avatar name={profile.displayName} size={40} />
      <p className="mt-1 w-full truncate text-sm font-medium text-foreground">{profile.displayName}</p>
      <p className="font-mono text-sm font-semibold text-rival-green">
        {formatMoney(profile.totalWinningsCents)}
      </p>
      <p className="text-[11px] text-muted">
        {entryCount} {entryCount === 1 ? "room" : "rooms"} entered
      </p>
    </Link>
  );
}

// Real consecutive-win streak for a rival you follow — engagement-
// psychology mechanism #6 (loss aversion & streaks — see
// .claude/skills/rivaly-engagement-psychology): a visible hot streak is
// what makes someone worth watching or challenging right now. Only ever
// rendered for profiles that actually clear the streak threshold — see
// followedGoatedRivals in mock-data.ts.
export function GoatedRivalCard({ profile }: { profile: Profile }) {
  const streak = currentStreak(profile.id);

  return (
    <Link
      href={`/profile/${profile.username}`}
      className="flex w-[136px] shrink-0 flex-col items-center gap-1.5 rounded-lg border border-border-strong bg-surface-elevated px-3 py-4 text-center transition-transform duration-150 ease-out active:scale-[0.97]"
    >
      <Avatar name={profile.displayName} size={40} />
      <p className="mt-1 w-full truncate text-sm font-medium text-foreground">{profile.displayName}</p>
      <p className="font-mono text-sm font-semibold text-rival-green">
        🔥 {streak} in a row
      </p>
    </Link>
  );
}
