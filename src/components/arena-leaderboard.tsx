"use client";

import { useState } from "react";
import Link from "next/link";
import {
  profiles,
  topRivals,
  goatedRivals,
  gameweekPointsForProfile,
  formatMoney,
  rivalPnlCents,
  formatSignedMoney,
  SELF_USER_ID,
} from "@/lib/mock-data";
import { Avatar } from "./avatar";
import type { Profile } from "@/lib/types";

type Filter = "global" | "weekly" | "accurate" | "earnings";

const filters: { id: Filter; label: string }[] = [
  { id: "global", label: "Global" },
  { id: "weekly", label: "This Gameweek" },
  { id: "accurate", label: "Most Accurate" },
  { id: "earnings", label: "Highest Earnings" },
];

// Per masterplan §4.12 — trimmed from the full Global/Weekly/Monthly/Most
// Accurate/Highest Earnings/Biggest Upsets list to just the filters with a
// genuinely distinct real signal behind them. A "Monthly" window would
// need mock data actually spread across months (the current dataset
// clusters in ~2 real days); rather than fake a different-looking number
// for it, it's left out until there's real data to back it.
function ranked(filter: Filter): { profile: Profile; value: string }[] {
  switch (filter) {
    case "global":
      // Same rivalPnlCents ranking Home's "Top rivals" teases the top 5 of
      // — this is the full board.
      return topRivals(profiles.length).map((p) => ({ profile: p, value: formatSignedMoney(rivalPnlCents(p)) }));
    case "weekly":
      return [...profiles]
        .sort((a, b) => gameweekPointsForProfile(b) - gameweekPointsForProfile(a))
        .map((p) => ({ profile: p, value: `${gameweekPointsForProfile(p)} pts` }));
    case "accurate":
      return [...profiles]
        .sort((a, b) => b.predictionAccuracy - a.predictionAccuracy)
        .map((p) => ({ profile: p, value: `${Math.round(p.predictionAccuracy * 100)}%` }));
    case "earnings":
      return goatedRivals(profiles.length).map((p) => ({ profile: p, value: formatMoney(p.totalWinningsCents) }));
  }
}

export function ArenaLeaderboard() {
  const [filter, setFilter] = useState<Filter>("global");
  const rows = ranked(filter);

  return (
    <div>
      <div className="no-scrollbar flex gap-2 overflow-x-auto pb-1">
        {filters.map((f) => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            className="shrink-0 rounded-full border px-3.5 py-1.5 text-sm active:scale-[0.97]"
            style={{
              borderColor: filter === f.id ? "var(--foreground)" : "var(--border)",
              color: filter === f.id ? "var(--foreground)" : "var(--muted)",
              background: filter === f.id ? "var(--surface-elevated)" : "transparent",
              transition:
                "transform 150ms ease-out, border-color 150ms ease, color 150ms ease, background-color 150ms ease",
            }}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="mt-5 flex flex-col divide-y divide-border rounded-lg border border-border bg-surface">
        {rows.map(({ profile, value }, i) => {
          const isSelf = profile.id === SELF_USER_ID;
          return (
            <Link
              key={profile.id}
              href={`/profile/${profile.username}`}
              className="flex items-center gap-3 px-4 py-3 transition-colors duration-150 hover:bg-surface-elevated"
              style={isSelf ? { background: "var(--surface-elevated)" } : undefined}
            >
              <span className="w-5 shrink-0 font-mono text-xs text-muted">{i + 1}</span>
              <Avatar name={profile.displayName} size={28} />
              <p className="min-w-0 flex-1 truncate text-sm text-foreground">
                {profile.displayName}
                {isSelf && <span className="text-muted"> (you)</span>}
              </p>
              <span className="shrink-0 font-mono text-sm font-medium text-foreground">{value}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
