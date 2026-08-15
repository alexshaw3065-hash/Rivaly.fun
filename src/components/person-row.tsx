import Link from "next/link";
import type { Profile } from "@/lib/types";
import { Avatar } from "./avatar";

export function PersonRow({ profile }: { profile: Profile }) {
  return (
    <Link
      href={`/profile/${profile.username}`}
      className="flex items-center gap-3 rounded-lg border border-border bg-surface px-4 py-3 transition-colors duration-150 hover:border-border-strong"
    >
      <Avatar name={profile.displayName} size={36} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-foreground">{profile.displayName}</p>
        <p className="truncate font-mono text-xs text-muted">@{profile.username}</p>
      </div>
      <p className="shrink-0 font-mono text-xs text-muted">
        {Math.round(profile.predictionAccuracy * 100)}% acc.
      </p>
    </Link>
  );
}
