import Link from "next/link";
import type { Match } from "@/lib/types";
import { MatchBanner } from "./create-room/match-hero";
import { buttonClasses } from "./ui/button";

// A carousel slide for a big upcoming match that has no room yet — the same
// banner as a room card, but the call to action is to open the first room.
// A room without opponents isn't a room: surfacing the fixture is the invite.
export function StartRoomSlide({ match }: { match: Match }) {
  return (
    <Link
      href={`/rooms/create?matchId=${encodeURIComponent(match.id)}`}
      className="flex h-full flex-col overflow-hidden rounded-card bg-surface edge transition-transform duration-100 ease-out active:scale-[0.98]"
    >
      <MatchBanner match={match} size="sm" />
      <div className="flex flex-1 flex-col gap-2 p-4">
        <p className="text-caption text-secondary">No room yet</p>
        <p className="text-title-2 font-display text-foreground">Make the first call.</p>
        <span className={buttonClasses({ variant: "primary", size: "lg", className: "mt-auto self-start" })}>Start the first room</span>
      </div>
    </Link>
  );
}
