import Link from "next/link";
import type { Profile } from "@/lib/types";
import { Avatar } from "./avatar";

export function PersonRow({ profile }: { profile: Profile }) {
  return (
    <Link
      href={`/profile/${profile.username}`}
      className="flex min-h-14 items-center gap-3 rounded-card bg-surface px-4 py-3 edge transition-colors duration-100 hover:bg-surface-elevated"
    >
      <Avatar name={profile.displayName} size={40} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-body font-semibold text-foreground">{profile.displayName}</p>
        <p className="truncate text-caption text-secondary">@{profile.username}</p>
      </div>
      <p className="shrink-0 text-caption tabular-nums text-secondary">
        {Math.round(profile.predictionAccuracy * 100)}% acc.
      </p>
    </Link>
  );
}
