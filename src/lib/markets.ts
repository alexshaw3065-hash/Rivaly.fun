import type { MarketSideDefinition, MarketType, SettlementMode } from "@/lib/types";

// Shared by the createRoom server action and the create-room UI. Pure — no
// server or browser imports — so the live preview the creator sees before
// committing is composed by the exact same function that writes the room's
// `prediction`, rather than a client copy that could quietly drift from it.

// Discriminated by market type so the caller can't send a total_goals room
// with no line, or a custom room with no prediction text — the shape itself
// rules those out, no separate validation needed for "did they send the
// right fields."
export type CreateRoomMarket =
  | { type: "winner"; outcome: "home" | "draw" | "away" }
  | { type: "total_goals"; comparison: "over" | "under"; line: number }
  | { type: "both_score" }
  | { type: "correct_score"; homeGoals: number; awayGoals: number }
  // Favorite-only framing (the picked team wins by more than `line`), not a
  // full two-sided spread — a deliberate scope call, not a missing feature:
  // it's a real, correctly-settleable handicap market without doubling the
  // number of taps to also pick favorite-vs-underdog framing.
  | { type: "handicap"; team: "home" | "away"; line: number }
  // HT/Total period-stat markets read the columns on `matches` the same way
  // total_goals reads home_score/away_score; penalty/red_card/var are
  // event-existence checks against `match_events` at settlement time.
  | { type: "halftime_result"; outcome: "home" | "draw" | "away" }
  | { type: "halftime_total_goals"; comparison: "over" | "under"; line: number }
  | { type: "halftime_correct_score"; homeGoals: number; awayGoals: number }
  | { type: "second_half_total_goals"; comparison: "over" | "under"; line: number }
  | { type: "corners"; comparison: "over" | "under"; line: number }
  | { type: "cards"; comparison: "over" | "under"; line: number }
  | { type: "penalty" }
  | { type: "red_card" }
  | { type: "var" }
  | { type: "anytime_scorer"; player: string; team: "home" | "away" }
  // NFL — every one of these reads a stat TxLINE's NFL feed actually
  // carries (Score/Touchdown/FieldGoal per HT and Total, plus an OT period).
  | { type: "total_points"; comparison: "over" | "under"; line: number }
  | { type: "team_points"; team: "home" | "away"; comparison: "over" | "under"; line: number }
  | { type: "first_half_points"; comparison: "over" | "under"; line: number }
  | { type: "total_touchdowns"; comparison: "over" | "under"; line: number }
  | { type: "total_field_goals"; comparison: "over" | "under"; line: number }
  | { type: "overtime" }
  | { type: "custom"; prediction: string };

export type Sport = "soccer" | "nfl";

// TxLINE sport ids — 6 is US football. Anything else (including the mock
// roster, which carries no sport id) is soccer.
export function sportOf(match: { sportId?: number }): Sport {
  return match.sportId === 6 ? "nfl" : "soccer";
}

const SPORT_MARKETS: Record<Sport, ReadonlySet<CreateRoomMarket["type"]>> = {
  soccer: new Set([
    "winner", "total_goals", "both_score", "correct_score", "handicap", "halftime_result",
    "halftime_total_goals", "halftime_correct_score", "second_half_total_goals", "corners",
    "cards", "penalty", "red_card", "var", "anytime_scorer", "custom",
  ]),
  nfl: new Set([
    "winner", "handicap", "halftime_result", "total_points", "team_points", "first_half_points",
    "total_touchdowns", "total_field_goals", "overtime", "custom",
  ]),
};

/** Whether this market means anything for this match's sport (no corners in the NFL). */
export function marketFitsSport(market: CreateRoomMarket, sport: Sport): boolean {
  if (sport === "nfl" && market.type === "winner" && market.outcome === "draw") return false;
  return SPORT_MARKETS[sport].has(market.type);
}

export interface ComposedMarket {
  prediction: string;
  marketType: MarketType;
  marketLine: number | null;
  marketSideDefinition: MarketSideDefinition | null;
  settlementMode: SettlementMode;
}

// "No limit" means no limit: the only floor is one cent, the smallest amount
// a USDC balance in this app can hold — not a product minimum.
export const MIN_STAKE_FLOOR_CENTS = 1;

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

// `prediction` is the one string every existing surface (room cards, chat,
// search) already renders, so composing it here means nothing downstream
// needs to change to understand the structured markets.
export function composeMarket(market: CreateRoomMarket, match: { homeTeam: string; awayTeam: string }): ComposedMarket {
  const auto = (
    marketType: Exclude<MarketType, "custom">,
    prediction: string,
    def: Omit<MarketSideDefinition, "stat"> = {},
    marketLine: number | null = null,
  ): ComposedMarket => ({
    prediction,
    marketType,
    marketLine,
    marketSideDefinition: { stat: marketType, ...def },
    settlementMode: "auto",
  });
  const teamName = (t: "home" | "away") => (t === "home" ? match.homeTeam : match.awayTeam);

  switch (market.type) {
    case "winner":
      return auto(
        "winner",
        market.outcome === "draw" ? `${match.homeTeam} v ${match.awayTeam} ends in a draw` : `${teamName(market.outcome)} wins`,
        { outcome: market.outcome },
      );
    case "total_goals":
      return auto(
        "total_goals",
        `${cap(market.comparison)} ${market.line} goals`,
        { comparison: market.comparison, threshold: market.line },
        market.line,
      );
    case "both_score":
      return auto("both_score", "Both teams score");
    case "correct_score":
      return auto("correct_score", `${match.homeTeam} ${market.homeGoals}-${market.awayGoals} ${match.awayTeam}`, {
        homeGoals: market.homeGoals,
        awayGoals: market.awayGoals,
      });
    case "handicap":
      return auto(
        "handicap",
        `${teamName(market.team)} wins by ${Math.ceil(market.line)}+`,
        { team: market.team, threshold: market.line },
        market.line,
      );
    case "halftime_result":
      return auto(
        "halftime_result",
        market.outcome === "draw"
          ? `${match.homeTeam} v ${match.awayTeam} level at halftime`
          : `${teamName(market.outcome)} lead at halftime`,
        { outcome: market.outcome },
      );
    case "halftime_total_goals":
      return auto(
        "halftime_total_goals",
        `${cap(market.comparison)} ${market.line} first-half goals`,
        { comparison: market.comparison, threshold: market.line },
        market.line,
      );
    case "halftime_correct_score":
      return auto(
        "halftime_correct_score",
        `${match.homeTeam} ${market.homeGoals}-${market.awayGoals} ${match.awayTeam} at halftime`,
        { homeGoals: market.homeGoals, awayGoals: market.awayGoals },
      );
    case "second_half_total_goals":
      return auto(
        "second_half_total_goals",
        `${cap(market.comparison)} ${market.line} second-half goals`,
        { comparison: market.comparison, threshold: market.line },
        market.line,
      );
    case "corners":
      return auto(
        "corners",
        `${cap(market.comparison)} ${market.line} corners`,
        { comparison: market.comparison, threshold: market.line },
        market.line,
      );
    case "cards":
      return auto(
        "cards",
        `${cap(market.comparison)} ${market.line} cards`,
        { comparison: market.comparison, threshold: market.line },
        market.line,
      );
    case "penalty":
      return auto("penalty", "A penalty is awarded");
    case "red_card":
      return auto("red_card", "A red card is shown");
    case "var":
      return auto("var", "A VAR review happens");
    case "anytime_scorer":
      // Can't auto-settle yet: the scores feed names scorers by numeric
      // PlayerId only, so there's nothing to match a picked name against.
      return {
        prediction: `${market.player.trim()} scores`,
        marketType: "anytime_scorer",
        marketLine: null,
        marketSideDefinition: { stat: "anytime_scorer", player: market.player.trim(), team: market.team },
        settlementMode: "creator_confirms",
      };
    case "total_points":
      return auto(
        "total_points",
        `${cap(market.comparison)} ${market.line} points`,
        { comparison: market.comparison, threshold: market.line },
        market.line,
      );
    case "team_points":
      return auto(
        "team_points",
        `${teamName(market.team)} ${market.comparison} ${market.line} points`,
        { team: market.team, comparison: market.comparison, threshold: market.line },
        market.line,
      );
    case "first_half_points":
      return auto(
        "first_half_points",
        `${cap(market.comparison)} ${market.line} first-half points`,
        { comparison: market.comparison, threshold: market.line },
        market.line,
      );
    case "total_touchdowns":
      return auto(
        "total_touchdowns",
        `${cap(market.comparison)} ${market.line} touchdowns`,
        { comparison: market.comparison, threshold: market.line },
        market.line,
      );
    case "total_field_goals":
      return auto(
        "total_field_goals",
        `${cap(market.comparison)} ${market.line} field goals`,
        { comparison: market.comparison, threshold: market.line },
        market.line,
      );
    case "overtime":
      return auto("overtime", "The game goes to overtime");
    case "custom":
      return {
        prediction: market.prediction.trim(),
        marketType: "custom",
        marketLine: null,
        marketSideDefinition: null,
        settlementMode: "creator_confirms",
      };
  }
}

/** Null when the market is well-formed, otherwise a user-facing reason. */
export function invalidMarketReason(market: CreateRoomMarket): string | null {
  switch (market.type) {
    case "custom":
      return market.prediction.trim() ? null : "Say what you think will happen.";
    case "total_goals":
    case "handicap":
    case "halftime_total_goals":
    case "second_half_total_goals":
    case "corners":
    case "cards":
    case "total_points":
    case "team_points":
    case "first_half_points":
    case "total_touchdowns":
    case "total_field_goals":
      return market.line > 0 && market.line < 200 ? null : "Pick a real line.";
    case "correct_score":
    case "halftime_correct_score": {
      const ok = [market.homeGoals, market.awayGoals].every((g) => Number.isInteger(g) && g >= 0 && g <= 20);
      return ok ? null : "Pick a real scoreline.";
    }
    case "anytime_scorer": {
      const name = market.player.trim();
      return name.length >= 2 && name.length <= 60 ? null : "Pick a player.";
    }
    default:
      return null;
  }
}
