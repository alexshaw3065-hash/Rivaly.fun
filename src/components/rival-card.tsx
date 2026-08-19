import Link from "next/link";
import type { Profile } from "@/lib/types";
import { rivalPnlCents, formatSignedMoney, formatMoney } from "@/lib/mock-data";
import { Avatar } from "./avatar";

// Weekly-style net P/L — can go negative, which is the point (see
// rivalPnlCents in mock-data.ts). Used by "Top Rivals."
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
        className="font-mono text-sm font-semibold"
        style={{ color: positive ? "var(--rival-green)" : "var(--danger-red)" }}
      >
        {formatSignedMoney(pnl)}
      </p>
    </Link>
  );
}

// Career totalWinnings — always positive, the "hall of fame" stat. Used by
// "Goated Rivals." Kept as a separate component (not a variant prop) since
// the two stats come from genuinely different fields with different signs.
export function GoatedRivalCard({ profile }: { profile: Profile }) {
  return (
    <Link
      href={`/profile/${profile.username}`}
      className="flex w-[128px] shrink-0 flex-col items-center gap-2.5 rounded-lg border border-border-strong bg-surface-elevated px-3 py-4 text-center transition-transform duration-150 ease-out active:scale-[0.97]"
    >
      <Avatar name={profile.displayName} size={40} />
      <p className="w-full truncate text-sm font-medium text-foreground">{profile.displayName}</p>
      <p className="font-mono text-sm font-semibold text-rival-green">
        {formatMoney(profile.totalWinningsCents)}
      </p>
    </Link>
  );
}
