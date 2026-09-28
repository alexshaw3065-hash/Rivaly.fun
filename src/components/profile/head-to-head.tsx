"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { fetchHeadToHead, type HeadToHead as H2H } from "@/lib/player-card-client";
import { useCurrentUser } from "@/components/current-user-provider";
import { RivalCharacter } from "@/components/rival-character";

const ago = (iso: string | null) => {
  if (!iso) return "";
  const d = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 86_400_000));
  return d === 0 ? "today" : d === 1 ? "yesterday" : `${d} days ago`;
};

// You vs them: every settled room you were both in on opposite sides, who
// won each, the last meeting, and a rematch. Only on someone else's profile,
// signed in.
export function HeadToHead({ other, initial }: { other: { id: string; name: string; username: string; avatarUrl: string | null }; /** Skip the fetch (tests). */ initial?: H2H }) {
  const me = useCurrentUser();
  const [h, setH] = useState<H2H | null>(initial ?? null);

  useEffect(() => {
    if (initial || !me || me.id === other.id) return;
    let live = true;
    void fetchHeadToHead(other.id).then((r) => live && setH(r));
    return () => {
      live = false;
    };
  }, [me, other.id, initial]);

  if (!me || me.id === other.id || !h) return null;
  const first = other.name.split(" ")[0];
  const played = h.mine + h.theirs;
  const leading = h.mine > h.theirs ? "you" : h.theirs > h.mine ? "them" : "level";

  return (
    <section className="mt-6 rounded-card bg-surface p-4 edge">
      <p className="text-label font-semibold text-secondary">You vs {first}</p>
      <div className="mt-3 flex items-center justify-between gap-3">
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <RivalCharacter name={me.displayName} imageUrl={me.avatarUrl} size={36} />
          <span className="truncate text-body font-semibold text-foreground">You</span>
        </div>
        <div className="flex items-baseline gap-2 font-display text-4xl font-black tabular-nums">
          <span className={leading === "you" ? "text-yes-ink" : "text-foreground"}>{h.mine}</span>
          <span className="text-2xl text-secondary">–</span>
          <span className={leading === "them" ? "text-no-ink" : "text-foreground"}>{h.theirs}</span>
        </div>
        <div className="flex min-w-0 flex-1 items-center justify-end gap-2">
          <span className="truncate text-body font-semibold text-foreground">{first}</span>
          <RivalCharacter name={other.name} imageUrl={other.avatarUrl} size={36} />
        </div>
      </div>

      {h.last ? (
        <Link href={`/rooms/${h.last.roomId}`} className="mt-3 block rounded-card px-3 py-3 text-label edge transition-colors hover:bg-foreground/[0.03]">
          <span className="text-secondary">Last meeting · {ago(h.last.at)}</span>
          <span className="mt-0.5 block truncate font-semibold text-foreground">{h.last.prediction}</span>
          <span className={`font-bold ${h.last.iWon ? "text-money-ink" : "text-no-ink"}`}>
            {h.last.iWon ? "You won" : `${first} won`}
          </span>
          <span className="text-secondary"> · you were on {h.last.mySide.toUpperCase()}</span>
        </Link>
      ) : (
        <p className="mt-3 text-label text-secondary">
          {played === 0 && h.live === 0 ? `You haven't faced ${first} yet. Take the other side of one of their rooms — or start one.` : ""}
        </p>
      )}

      <div className="mt-3 flex items-center gap-3">
        {h.live > 0 && (
          <span className="text-label font-semibold text-yes-ink">
            {h.live} {h.live === 1 ? "room" : "rooms"} live between you
          </span>
        )}
        <Link
          href={`/rooms/create?${h.rematchMatchId ? `matchId=${h.rematchMatchId}&` : ""}vs=${encodeURIComponent(other.username)}`}
          className="ml-auto flex h-10 items-center rounded-full bg-yes px-4 text-label font-bold text-white transition-transform duration-100 active:scale-[0.97]"
        >
          {played > 0 ? "Rematch" : "Challenge"}
        </Link>
      </div>
    </section>
  );
}
