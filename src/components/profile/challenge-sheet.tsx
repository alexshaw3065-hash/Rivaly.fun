"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useCurrentUser } from "@/components/current-user-provider";
import { TeamCrest } from "@/components/team-crest";
import { BottomSheet } from "@/components/bottom-sheet";
import { openAuthModal } from "@/lib/auth-modal-store";
import { useRealMatches } from "@/lib/use-real-matches";

/**
 * Challenge a specific person: pick a match, then Create Room opens on it
 * already naming them — and the finished room's share message is addressed
 * to them. (No DMs yet, so "sending" it means your share sheet.)
 */
export function ChallengeSheet({ open, onClose, username, name }: { open: boolean; onClose: () => void; username: string; name: string }) {
  const router = useRouter();
  const me = useCurrentUser();
  const { matches, isLoading } = useRealMatches();
  const [now] = useState(() => Date.now());
  const upcoming = matches.filter((m) => m.status === "scheduled" && +new Date(m.kickoffAt) > now).slice(0, 20);

  function go(matchId?: string) {
    const url = `/rooms/create?${matchId ? `matchId=${matchId}&` : ""}vs=${encodeURIComponent(username)}`;
    onClose();
    if (!me) openAuthModal({ next: url });
    else router.push(url);
  }

  return (
    <BottomSheet open={open} onClose={onClose} title={`Challenge ${name}`}>
      <p className="-mt-1 text-center text-body text-secondary">Pick a match. Make your call. Send it to them.</p>
      <div className="mt-4 flex max-h-[50vh] flex-col overflow-y-auto rounded-card edge">
        {isLoading && <div className="h-24 skeleton" />}
        {!isLoading && upcoming.length === 0 && <p className="p-5 text-center text-body text-secondary">No upcoming matches right now.</p>}
        {upcoming.map((m) => (
          <button key={m.id} type="button" onClick={() => go(m.id)} className="flex items-center gap-3 border-b border-line px-4 py-3 text-left last:border-0 hover:bg-foreground/[0.03]">
            <span className="flex -space-x-1.5">
              <TeamCrest name={m.homeTeam} size={24} />
              <TeamCrest name={m.awayTeam} size={24} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-body font-semibold text-foreground">
                {m.homeTeam} v {m.awayTeam}
              </span>
              <span className="block truncate text-caption text-secondary">{m.competition}</span>
            </span>
            <span className="shrink-0 tabular-nums text-caption text-secondary">
              {new Date(m.kickoffAt).toLocaleString("en-GB", { weekday: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
            </span>
          </button>
        ))}
      </div>
    </BottomSheet>
  );
}
