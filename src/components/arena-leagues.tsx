"use client";

import { predictionLeagues, leagueStandings, SELF_USER_ID } from "@/lib/mock-data";
import { useJoinedLeagueIds, leaveLeague } from "@/lib/use-joined-leagues";
import { Avatar } from "./avatar";
import { JoinLeagueButton } from "./join-league-button";
import type { PredictionLeague } from "@/lib/types";

const GLOBAL_LEAGUE_ID = "l1";

function LeagueStandingsTable({ league, locallyJoined }: { league: PredictionLeague; locallyJoined: boolean }) {
  // Joining via code (use-joined-leagues.ts) is localStorage-only — it
  // never mutates the static memberIds in mock-data.ts, so the standings
  // table needs its own effective member list, or you'd show up in "Your
  // leagues" without ever appearing in the table itself.
  const effectiveLeague =
    locallyJoined && !league.memberIds.includes(SELF_USER_ID)
      ? { ...league, memberIds: [...league.memberIds, SELF_USER_ID] }
      : league;
  const standings = leagueStandings(effectiveLeague);
  const canLeave = league.id !== GLOBAL_LEAGUE_ID;

  return (
    <section>
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-foreground">{league.name}</p>
        {canLeave && (
          <button
            onClick={() => leaveLeague(league.id)}
            className="hover-link-danger text-xs text-muted transition-colors"
          >
            Leave
          </button>
        )}
      </div>
      <div className="mt-3 flex flex-col divide-y divide-border rounded-lg border border-border bg-surface">
        {standings.map((s, i) => {
          const isSelf = s.profile.id === SELF_USER_ID;
          return (
            <div
              key={s.profile.id}
              className="flex items-center gap-3 px-4 py-3"
              style={isSelf ? { background: "var(--surface-elevated)" } : undefined}
            >
              <span className="w-5 shrink-0 font-mono text-xs text-muted">{i + 1}</span>
              <Avatar name={s.profile.displayName} size={28} />
              <p className="min-w-0 flex-1 truncate text-sm text-foreground">
                {s.profile.displayName}
                {isSelf && <span className="text-muted"> (you)</span>}
              </p>
              <div className="shrink-0 text-right">
                <p className="font-mono text-sm font-medium text-foreground">{s.seasonPoints} pts</p>
                {s.gameweekPoints > 0 && (
                  <p className="font-mono text-[11px] text-rival-green">+{s.gameweekPoints} this GW</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

// Points-only, FPL-style — standings, streaks, bragging rights, no money.
// The Global League is automatic (everyone's in it); the rest are joined
// by code, same private-room-style precedent already established, and
// kept genuinely private rather than half-shown in a browsable "discover"
// list — a code you don't have shouldn't leak the league's existence.
export function ArenaLeagues() {
  const joinedIds = useJoinedLeagueIds();
  const myLeagues = predictionLeagues.filter(
    (l) => l.memberIds.includes(SELF_USER_ID) || joinedIds.includes(l.id),
  );

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium uppercase tracking-wide text-muted">Your leagues</p>
        <JoinLeagueButton />
      </div>
      <div className="flex flex-col gap-8">
        {myLeagues.map((league) => (
          <LeagueStandingsTable key={league.id} league={league} locallyJoined={joinedIds.includes(league.id)} />
        ))}
      </div>
    </div>
  );
}
