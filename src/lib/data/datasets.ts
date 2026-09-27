import type { SupabaseClient } from "@supabase/supabase-js";

// Rivaly Data — the datasets partners can buy, defined once and used by the
// admin preview, CSV export and the partner API alike. Every dataset is
// aggregated and anonymised in the database (data_* functions): no row ever
// represents fewer than platform_settings.data_min_group distinct people,
// and no dataset contains names, usernames, wallets or message text.

export interface Column {
  name: string;
  type: "text" | "int" | "money_cents" | "ratio" | "timestamp" | "date" | "uuid";
  description: string;
}

export interface DatasetParams {
  competition?: string | null;
  from?: string | null;
  to?: string | null;
  match_id?: string | null;
  limit?: number | null;
}

export interface Dataset {
  id: string;
  title: string;
  summary: string;
  /** Who typically buys it. */
  buyers: string;
  params: (keyof DatasetParams)[];
  columns: Column[];
  run: (db: SupabaseClient, p: DatasetParams) => Promise<Record<string, unknown>[]>;
}

const iso = (v: string | null | undefined, fallback: Date) => {
  const d = v ? new Date(v) : fallback;
  return Number.isNaN(+d) ? fallback.toISOString() : d.toISOString();
};
const days = (n: number) => new Date(Date.now() + n * 86_400_000);
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function call(db: SupabaseClient, fn: string, args: Record<string, unknown>) {
  const { data, error } = await db.rpc(fn, args);
  if (error) throw new Error(error.message);
  return (data ?? []) as Record<string, unknown>[];
}

export const DATASETS: Dataset[] = [
  {
    id: "match_sentiment",
    title: "Crowd sentiment by match",
    summary: "For each match and claim (e.g. “Over 2.5 goals”): how many people predicted, real money on each side, the crowd’s implied probability, and the result.",
    buyers: "Media, broadcasters, fantasy and odds-comparison products, clubs’ fan-insight teams",
    params: ["competition", "from", "to", "limit"],
    columns: [
      { name: "match_id", type: "uuid", description: "Rivaly match id" },
      { name: "competition", type: "text", description: "Competition" },
      { name: "home_team", type: "text", description: "Home team" },
      { name: "away_team", type: "text", description: "Away team" },
      { name: "kickoff_at", type: "timestamp", description: "Kickoff (UTC)" },
      { name: "match_status", type: "text", description: "scheduled / live / finished / postponed / cancelled" },
      { name: "final_score", type: "text", description: "Home-away, once known" },
      { name: "claim", type: "text", description: "The claim people predicted on" },
      { name: "market_type", type: "text", description: "winner, total_goals, both_score, correct_score, …" },
      { name: "rooms", type: "int", description: "Rooms on this claim" },
      { name: "predictors", type: "int", description: "Distinct people who staked" },
      { name: "yes_money_cents", type: "money_cents", description: "USD cents backing YES" },
      { name: "no_money_cents", type: "money_cents", description: "USD cents backing NO" },
      { name: "crowd_yes_probability", type: "ratio", description: "YES money ÷ all money (0–1)" },
      { name: "yes_share_of_people", type: "ratio", description: "Share of predictors on YES (0–1)" },
      { name: "outcome", type: "text", description: "yes / no once decided" },
    ],
    run: (db, p) => call(db, "data_match_sentiment", { p_competition: p.competition ?? null, p_from: iso(p.from, days(-30)), p_to: iso(p.to, days(30)), p_limit: Math.min(p.limit ?? 500, 5000) }),
  },
  {
    id: "sentiment_timeline",
    title: "Money flow before kickoff",
    summary: "Hour by hour for one match: cumulative money on YES and NO for each claim, and how many people had committed — how opinion moved as kickoff approached.",
    buyers: "Broadcasters (pre-match graphics), media, trading and analytics desks",
    params: ["match_id"],
    columns: [
      { name: "claim", type: "text", description: "The claim" },
      { name: "hour", type: "timestamp", description: "Hour (UTC)" },
      { name: "yes_money_cents", type: "money_cents", description: "Cumulative YES money by this hour" },
      { name: "no_money_cents", type: "money_cents", description: "Cumulative NO money by this hour" },
      { name: "predictors", type: "int", description: "Cumulative distinct people by this hour" },
    ],
    run: async (db, p) => (p.match_id && UUID.test(p.match_id) ? call(db, "data_sentiment_timeline", { p_match: p.match_id }) : []),
  },
  {
    id: "crowd_accuracy",
    title: "Is the crowd right?",
    summary: "By competition and market: how often the side with more money won, and how confident the winning side was — the wisdom (or not) of the football crowd.",
    buyers: "Media and data journalism, researchers, prediction and analytics products",
    params: ["from", "to"],
    columns: [
      { name: "competition", type: "text", description: "Competition" },
      { name: "market_type", type: "text", description: "Market" },
      { name: "decided_rooms", type: "int", description: "Two-sided rooms with a result" },
      { name: "predictors", type: "int", description: "Distinct people across those rooms" },
      { name: "crowd_right_pct", type: "ratio", description: "% where the money-majority side won" },
      { name: "avg_winning_side_money_share", type: "ratio", description: "Average share of money on the side that won (0–1)" },
    ],
    run: (db, p) => call(db, "data_crowd_accuracy", { p_from: iso(p.from, days(-365)), p_to: iso(p.to, new Date()) }),
  },
  {
    id: "fan_engagement",
    title: "Fan engagement by match",
    summary: "How hard fans engaged with each match: rooms, people, chat volume, reactions, Arena posts, goals, and the chat surge in the 10 minutes after each goal.",
    buyers: "Broadcasters, sponsors, clubs and leagues (fan engagement), sports marketing agencies",
    params: ["competition", "from", "to"],
    columns: [
      { name: "match_id", type: "uuid", description: "Rivaly match id" },
      { name: "competition", type: "text", description: "Competition" },
      { name: "home_team", type: "text", description: "Home team" },
      { name: "away_team", type: "text", description: "Away team" },
      { name: "kickoff_at", type: "timestamp", description: "Kickoff (UTC)" },
      { name: "rooms", type: "int", description: "Rooms on the match" },
      { name: "participants", type: "int", description: "Distinct people who staked" },
      { name: "chat_messages", type: "int", description: "Chat messages in its rooms" },
      { name: "reactions", type: "int", description: "Reactions (chat + Arena moments)" },
      { name: "arena_posts", type: "int", description: "Arena posts about the match" },
      { name: "goals", type: "int", description: "Goals recorded" },
      { name: "chat_in_10min_after_goals", type: "int", description: "Chat messages within 10 minutes after a goal" },
    ],
    run: (db, p) => call(db, "data_fan_engagement", { p_competition: p.competition ?? null, p_from: iso(p.from, days(-30)), p_to: iso(p.to, new Date()) }),
  },
  {
    id: "team_support",
    title: "Team support",
    summary: "For each team: how many people and how much money backed it to win, against it, and its backing share — a live read of fan confidence by club.",
    buyers: "Clubs, sponsors, kit and ticketing partners, sports media",
    params: ["competition", "from", "to"],
    columns: [
      { name: "team", type: "text", description: "Team" },
      { name: "competition", type: "text", description: "Competition" },
      { name: "matches", type: "int", description: "Matches with a ‘team to win’ room" },
      { name: "backers", type: "int", description: "Distinct people backing the team to win" },
      { name: "money_backing_cents", type: "money_cents", description: "Money on the team winning" },
      { name: "money_against_cents", type: "money_cents", description: "Money against the team winning" },
      { name: "backing_share", type: "ratio", description: "Backing money ÷ all money (0–1)" },
    ],
    run: (db, p) => call(db, "data_team_support", { p_competition: p.competition ?? null, p_from: iso(p.from, days(-90)), p_to: iso(p.to, days(30)) }),
  },
  {
    id: "market_trends",
    title: "Market trends",
    summary: "Day by day, per competition and market: rooms opened, people predicting and money staked — what football fans want to predict on.",
    buyers: "Product and trading teams, sportsbooks’ market research, media",
    params: ["from", "to"],
    columns: [
      { name: "day", type: "date", description: "Day (UTC)" },
      { name: "competition", type: "text", description: "Competition" },
      { name: "market_type", type: "text", description: "Market" },
      { name: "rooms", type: "int", description: "Rooms staked on that day" },
      { name: "predictors", type: "int", description: "Distinct people" },
      { name: "volume_cents", type: "money_cents", description: "Money staked" },
    ],
    run: (db, p) => call(db, "data_market_trends", { p_from: iso(p.from, days(-30)), p_to: iso(p.to, new Date()) }),
  },
];

export const datasetById = (id: string) => DATASETS.find((d) => d.id === id) ?? null;

export function paramsFrom(search: URLSearchParams): DatasetParams {
  const limit = Number(search.get("limit"));
  return {
    competition: search.get("competition")?.slice(0, 80) || null,
    from: search.get("from") || null,
    to: search.get("to") || null,
    match_id: search.get("match_id") || null,
    limit: Number.isFinite(limit) && limit > 0 ? Math.min(limit, 5000) : null,
  };
}
