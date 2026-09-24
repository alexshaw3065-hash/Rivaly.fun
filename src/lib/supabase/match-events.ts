import { createClient } from "@/lib/supabase/server";
import { encodeMoment, matchMoment } from "@/lib/match-event-label";
import { collapseEvents } from "@/lib/match-feed";
import type { EventRow } from "@/lib/match-timeline";
import type { DisplayChatMessage } from "@/lib/supabase/message-mapper";

// A whole match from the historical log is ~170 records (each event arrives
// as a first report plus its confirmation), so this leaves plenty of room.
const LIMIT = 1500;

/**
 * A match's events, oldest first and one row per real event (see
 * collapseEvents) — the source for the room's match timeline, stats, line-ups
 * and the match moments in its feed. match_events is public-read, like the
 * matches themselves.
 */
export async function getMatchEventRows(matchId: string): Promise<EventRow[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("match_events")
    .select("id, action, minute, payload, occurred_at")
    .eq("match_id", matchId)
    .order("occurred_at", { ascending: true })
    .order("provider_seq", { ascending: true })
    .limit(LIMIT);
  return collapseEvents(
    (data ?? []).map((e) => ({
    id: e.id as string,
    action: e.action as string,
    minute: e.minute as number | null,
    payload: e.payload as Record<string, unknown> | null,
    occurredAt: e.occurred_at as string,
    })),
  );
}

/** The moments worth a line in the room's feed (kick-off, goals, cards, VAR, whistles). */
export function momentsFromRows(rows: EventRow[], roomId: string, names?: Record<number, string>): DisplayChatMessage[] {
  return rows.flatMap((e) => {
    const moment = matchMoment(e.action, e.minute, e.payload, names);
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
