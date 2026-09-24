import { createClient } from "@/lib/supabase/server";
import { encodeMoment, matchMoment } from "@/lib/match-event-label";
import type { DisplayChatMessage } from "@/lib/supabase/message-mapper";

const LIMIT = 40;

/**
 * A match's recent moments (kick-off, goals, cards, VAR, whistles) as system
 * rows for a room's feed, oldest first — merged with chat by time on the
 * page. match_events is public-read, like the matches themselves.
 */
export async function getMatchMoments(matchId: string, roomId: string): Promise<DisplayChatMessage[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("match_events")
    .select("id, action, minute, payload, occurred_at")
    .eq("match_id", matchId)
    .order("occurred_at", { ascending: false })
    .limit(LIMIT);
  return (data ?? [])
    .flatMap((e) => {
      const moment = matchMoment(e.action as string, e.minute as number | null, e.payload as Record<string, unknown> | null);
      if (!moment) return [];
      return [
        {
          id: `event-${e.id}`,
          roomId,
          userId: null,
          kind: "system" as const,
          body: encodeMoment(moment),
          createdAt: e.occurred_at as string,
        },
      ];
    })
    .reverse();
}
