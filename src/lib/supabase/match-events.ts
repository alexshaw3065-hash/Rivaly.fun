import { createClient } from "@/lib/supabase/server";
import { encodeMoment, matchMoment, type MomentContext } from "@/lib/match-event-label";
import { newNflClock } from "@/lib/nfl-clock";
import { collapseEvents } from "@/lib/match-feed";
import type { EventRow } from "@/lib/match-timeline";
import type { DisplayChatMessage } from "@/lib/supabase/message-mapper";

// Supabase caps one request at 1000 rows, and a match is ~1000 records now
// that possession states are kept — so read it in pages. The ceiling keeps a
// runaway fixture from turning one page view into dozens of requests.
const PAGE = 1000;
const MAX_ROWS = 4000;

/**
 * A match's events, oldest first and one row per real event (see
 * collapseEvents) — the source for the room's match timeline, stats, line-ups
 * and the match moments in its feed. match_events is public-read, like the
 * matches themselves.
 */
export async function getMatchEventRows(matchId: string): Promise<EventRow[]> {
  const supabase = await createClient();
  const raw: EventRow[] = [];
  for (let from = 0; from < MAX_ROWS; from += PAGE) {
    const { data } = await supabase
      .from("match_events")
      .select("id, action, minute, payload, occurred_at")
      .eq("match_id", matchId)
      .order("occurred_at", { ascending: true })
      .order("provider_seq", { ascending: true })
      .range(from, from + PAGE - 1);
    for (const e of data ?? [])
      raw.push({
        id: e.id as string,
        action: e.action as string,
        minute: e.minute as number | null,
        payload: e.payload as Record<string, unknown> | null,
        occurredAt: e.occurred_at as string,
      });
    if (!data || data.length < PAGE) break;
  }
  return collapseEvents(raw);
}

/** The moments worth a line in the room's feed (kick-off, goals, cards, VAR, whistles). */
export function momentsFromRows(rows: EventRow[], roomId: string, ctx: MomentContext = {}): DisplayChatMessage[] {
  // Every row advances the NFL clock (even the ones that get no line), in order.
  const run: MomentContext = ctx.sport === "nfl" ? { ...ctx, nfl: ctx.nfl ?? newNflClock() } : ctx;
  return rows.flatMap((e) => {
    const moment = matchMoment(e.action, e.minute, e.payload, run);
    if (!moment) return [];
    return [
      {
        id: `event-${e.id}`,
        roomId,
        userId: null,
        kind: "system" as const,
        body: encodeMoment(moment),
        createdAt: e.occurredAt,
      },
    ];
  });
}
