import Link from "next/link";
import type { Profile } from "@/lib/types";
import { rivalPnlCents, formatSignedMoney } from "@/lib/mock-data";
import { Avatar } from "./avatar";

export function RivalCard({ profile }: { profile: Profile }) {
  const pnl = rivalPnlCents(profile);
  const positive = pnl >= 0;

  return (
    <Link
      href={`/profile/${profile.username}`}
      className="flex w-[128px] shrink-0 flex-col items-center gap-2.5 rounded-lg border border-border bg-surface px-3 py-4 text-center transition-transform duration-150 ease-out active:scale-[0.97]"
    >
      <Avatar name={profile.displayName} size={40} />
      <p className="w-full truncate text-sm font-medium text-foreground">{profile.displayName}</p>
      <p
        className="font-mono text-xs"
        style={{ color: positive ? "var(--rival-green)" : "var(--danger-red)" }}
      >
        {formatSignedMoney(pnl)}
      </p>
    </Link>
  );
}
