import type { SupabaseClient } from "@supabase/supabase-js";

// The competitions we actually get live scores for — the only ones a room can
// be made on, because a room settles from the score feed. Driven by
// tracked_competitions (enabled + scores_available), so pausing a
// competition that turns out to have no coverage (MLS and Friendlies,
// 2026-09-25) is a data change, not a deploy. Works with either the browser
// or the server client: the table is public-read.

export async function scoredCompetitionIds(client: SupabaseClient): Promise<number[]> {
  const { data } = await client.from("tracked_competitions").select("competition_id").eq("enabled", true).eq("scores_available", true);
  return (data ?? []).map((r) => Number(r.competition_id));
}

/** Whether a match's competition is one we get scores for. */
export async function matchIsScored(client: SupabaseClient, matchId: string): Promise<boolean> {
  const [{ data: m }, ids] = await Promise.all([client.from("matches").select("competition_id").eq("id", matchId).maybeSingle(), scoredCompetitionIds(client)]);
  return !!m && ids.includes(Number(m.competition_id));
}
