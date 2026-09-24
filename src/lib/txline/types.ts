// Wire shapes from TxLINE's OpenAPI spec, narrowed to the fields Rivaly uses.
// Field names are PascalCase because that's what the API returns.

/**
 * From /api/fixtures/snapshot. Carries the human-readable names, which the
 * scores feed does not — scores are keyed by numeric ids only, so fixtures
 * is the only place team and competition names come from.
 */
export interface TxLineFixture {
  FixtureId: number;
  CompetitionId: number;
  Competition: string;
  /** Epoch milliseconds (verified against real data, not seconds). */
  StartTime: number;
  Ts: number;
  FixtureGroupId: number;
  Participant1Id: number;
  Participant1: string;
  Participant2Id: number;
  Participant2: string;
  Participant1IsHome: boolean;
}

/** Per-participant totals, broken down by period. */
export interface TxLinePeriodScore {
  Goals?: number;
  YellowCards?: number;
  RedCards?: number;
  Corners?: number;
}

export interface TxLineParticipantScore {
  H1?: TxLinePeriodScore;
  HT?: TxLinePeriodScore;
  H2?: TxLinePeriodScore;
  Total?: TxLinePeriodScore;
}

/**
 * From /api/scores/snapshot/{fixtureId} and the SSE stream. One record per
 * update, each carrying an Action naming what happened.
 */
export interface TxLineScores {
  FixtureId: number;
  SportId: number;
  /** Unreliable for status — it reads "scheduled" for finished matches. Use StatusId. */
  GameState: string;
  StatusId?: number;
  StartTime: number;
  /** Per-fixture sequence number. Must be passed verbatim to stat-validation. */
  Seq: number;
  Ts: number;
  Action: string;
  Participant1Id: number;
  Participant2Id: number;
  Participant1IsHome: boolean;
  CompetitionId: number;
  Score?: {
    Participant1?: TxLineParticipantScore;
    Participant2?: TxLineParticipantScore;
  };
  /** Stat map keyed by period_prefix + base_key, e.g. 3001 = team 1 H2 goals. */
  Stats?: Record<string, number>;
  /** The provider's id for the event. Its first report, confirmation and later detail share it. */
  Id?: number;
  /** False on a first, unconfirmed report; the confirmed record follows with the same Id. */
  Confirmed?: boolean;
  /** The team, on shots, goals and cards (substitutions carry it in Data instead). */
  Participant?: number;
  /** The match clock, in seconds since kick-off, counting on through both halves. */
  Clock?: { Running?: boolean; Seconds?: number };
  /** Only on the pregame "lineups" action: each team's squad for the match. */
  Lineups?: TxLineTeamLineup[] | null;
  /** Event detail: Goal, GoalType, Penalty, RedCard, YellowCard, VAR, PlayerId, Minutes… */
  Data?: {
    Goal?: boolean;
    GoalType?: unknown;
    Penalty?: boolean;
    Corner?: boolean;
    RedCard?: boolean;
    YellowCard?: boolean;
    VAR?: boolean;
    Minutes?: number;
    Participant?: number;
    PlayerId?: number;
    PlayerInId?: number;
    PlayerOutId?: number;
    Type?: string;
    Outcome?: string;
    Action?: string;
    /** On action_amend: the corrected fields, and the clock of the event being corrected. */
    New?: { Clock?: { Seconds?: number }; PlayerId?: number; PlayerInId?: number; PlayerOutId?: number };
    Previous?: { Clock?: { Seconds?: number } };
  };
}

/**
 * One team's squad from the "lineups" action, sent shortly before kick-off
 * (about 25 minutes, in real data). Events name players by
 * player.normativeId — not fixturePlayerId, whatever the feed PDF says;
 * verified against a finished match, where every scorer, card and
 * substitution id matched a normativeId.
 */
export interface TxLineTeamLineup {
  id: string;
  preferredName: string;
  lineups: {
    fixturePlayerId: number;
    /** 34 goalkeeper, 35 defender, 36 midfielder, 37 forward. */
    positionId: number;
    rosterNumber: string;
    starter: boolean;
    /** 0 in the matchday squad; 1 left out. */
    statusId: number;
    player: { normativeId: number; preferredName: string };
  }[];
}

/**
 * TxLINE's SoccerFixtureStatus. Values confirmed against live data where
 * possible; anything unmapped falls back to a kickoff-time heuristic rather
 * than guessing, so an unknown code can't silently mark a match finished.
 */
export const SPORT_SOCCER = 1;
export const SPORT_US_FOOTBALL = 6;
