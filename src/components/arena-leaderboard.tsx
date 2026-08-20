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

const PODIUM_HEIGHT: Record<1 | 2 | 3, number> = { 1: 92, 2: 68, 3: 52 };
const PODIUM_ORDER: Record<1 | 2 | 3, number> = { 1: 2, 2: 1, 3: 3 }; // visual left-to-right: 2nd, 1st, 3rd

function PodiumSpot({ rank, profile, value }: { rank: 1 | 2 | 3; profile: Profile; value: string }) {
  const isSelf = profile.id === SELF_USER_ID;
  return (
    <Link
      href={`/profile/${profile.username}`}
      className="flex flex-1 flex-col items-center gap-2"
      style={{ order: PODIUM_ORDER[rank] }}
    >
      <div className="relative">
        {rank === 1 && <span className="absolute -top-6 left-1/2 -translate-x-1/2 text-xl">👑</span>}
        <Avatar name={profile.displayName} size={rank === 1 ? 52 : 44} />
      </div>
      <p className="max-w-full truncate text-xs font-medium text-foreground">
        {profile.displayName}
        {isSelf && <span className="text-muted"> (you)</span>}
      </p>
      <p className="font-mono text-[11px] text-muted">{value}</p>
      <div
        className="flex w-full items-start justify-center rounded-t-md pt-1.5"
        style={{
          height: PODIUM_HEIGHT[rank],
          background: rank === 1 ? "var(--rival-blue-dim)" : "var(--surface-elevated)",
          border: "1px solid var(--border)",
          borderBottom: "none",
        }}
      >
        <span
          className="font-mono text-lg font-bold"
          style={{ color: rank === 1 ? "var(--rival-blue)" : "var(--muted)" }}
        >
          {rank}
        </span>
      </div>
    </Link>
  );
}

// Top 3 get the podium moment (per the founder's reference — a real "loud
// where it matters" beat, not decoration: it's the same three ranks every
// filter recomputes for real, per the ethical no-fabricated-numbers rule).
// 4th place and below is a plain ranked list underneath.
export function ArenaLeaderboard() {
  const [filter, setFilter] = useState<Filter>("global");
  const rows = ranked(filter);
  const podium = rows.slice(0, 3);
  const rest = rows.slice(3);

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

      {podium.length === 3 && (
        <div className="mt-8 flex items-end gap-3 px-2">
          <PodiumSpot rank={2} profile={podium[1].profile} value={podium[1].value} />
          <PodiumSpot rank={1} profile={podium[0].profile} value={podium[0].value} />
          <PodiumSpot rank={3} profile={podium[2].profile} value={podium[2].value} />
        </div>
      )}

      <div className="mt-6 flex flex-col divide-y divide-border rounded-lg border border-border bg-surface">
        {rest.map(({ profile, value }, i) => {
          const isSelf = profile.id === SELF_USER_ID;
          return (
            <Link
              key={profile.id}
              href={`/profile/${profile.username}`}
              className="flex items-center gap-3 px-4 py-3 transition-colors duration-150 hover:bg-surface-elevated"
              style={isSelf ? { background: "var(--surface-elevated)" } : undefined}
            >
              <span className="w-5 shrink-0 font-mono text-xs text-muted">{i + 4}</span>
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
