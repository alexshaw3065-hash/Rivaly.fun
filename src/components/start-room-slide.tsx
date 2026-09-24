import Link from "next/link";
import type { Match } from "@/lib/types";
import { MatchBanner } from "./create-room/match-hero";

// A carousel slide for a big upcoming match that has no room yet — the same
// banner as a room card, but the call to action is to open the first room.
// A room without opponents isn't a room: surfacing the fixture is the invite.
export function StartRoomSlide({ match }: { match: Match }) {
  return (
    <Link
      href={`/rooms/create?matchId=${encodeURIComponent(match.id)}`}
      className="flex h-full flex-col overflow-hidden rounded-xl border border-dashed border-border-strong bg-surface transition-transform duration-150 ease-out active:scale-[0.98]"
    >
      <MatchBanner match={match} size="sm" />
      <div className="flex flex-1 flex-col gap-3 border-t border-border p-5">
        <p className="text-xs font-semibold uppercase tracking-[0.08em] text-muted">No room yet</p>
        <p className="font-display text-xl font-semibold leading-snug text-foreground">Make the first call.</p>
        <span className="mt-auto inline-flex min-h-11 items-center justify-center self-start rounded-md bg-rival-blue px-5 text-sm font-semibold text-white">
          Start the first room
        </span>
      </div>
    </Link>
  );
}
