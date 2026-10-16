"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { fetchHeadToHead, type HeadToHead as H2H } from "@/lib/player-card-client";
import { useCurrentUser } from "@/components/current-user-provider";
import { RivalCharacter } from "@/components/rival-character";

const ago = (iso: string | null) => {
  if (!iso) return "";
  const d = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 86_400_000));
  return d === 0 ? "today" : d === 1 ? "yesterday" : `${d}d ago`;
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
  return <HeadToHeadView me={me} other={other} h={h} />;
}

type Person = { name: string; username: string; avatarUrl: string | null };

/**
 * The card itself, data in hand (also previewed on /kit). Two lines, like a
 * fixture row: faces, "You vs Name", the score and Rematch; then one quiet
 * line with the last meeting (or the nudge, if you've never met).
 */
export function HeadToHeadView({ me, other, h }: { me: { displayName: string; avatarUrl: string | null }; other: Person; h: H2H }) {
  const first = other.name.split(" ")[0];
  const played = h.mine + h.theirs;
  const leading = h.mine > h.theirs ? "you" : h.theirs > h.mine ? "them" : "level";
  const href = `/rooms/create?${h.rematchMatchId ? `matchId=${h.rematchMatchId}&` : ""}vs=${encodeURIComponent(other.username)}`;

  return (
    <section className="rounded-card bg-surface px-4 py-3 edge" aria-label={`You vs ${first}`}>
      <div className="flex items-center gap-3">
        <span className="flex shrink-0 -space-x-2">
          <span className="rounded-full ring-2 ring-surface">
            <RivalCharacter name={me.displayName} imageUrl={me.avatarUrl} size={28} />
          </span>
          <span className="rounded-full ring-2 ring-surface">
            <RivalCharacter name={other.name} imageUrl={other.avatarUrl} size={28} />
          </span>
        </span>
        <p className="min-w-0 flex-1 truncate text-body font-semibold text-foreground">You vs {first}</p>
        {played > 0 && (
          <p className="shrink-0 font-display text-title-3 tabular-nums" aria-label={`${h.mine} to ${h.theirs}`}>
            <span className={leading === "you" ? "text-money-ink" : "text-foreground"}>{h.mine}</span>
            <span className="text-tertiary">–</span>
            <span className={leading === "them" ? "text-no-ink" : "text-foreground"}>{h.theirs}</span>
          </p>
        )}
        <Link href={href} className="shrink-0 rounded-full bg-yes px-4 py-1.5 text-label font-semibold text-white transition-transform duration-100 active:scale-[0.97]">
          {played > 0 ? "Rematch" : "Challenge"}
        </Link>
      </div>
      <p className="mt-2 truncate text-label text-secondary">
        {h.last ? (
          <Link href={`/rooms/${h.last.roomId}`} className="hover:text-foreground">
            <span className={`font-semibold ${h.last.iWon ? "text-money-ink" : "text-no-ink"}`}>{h.last.iWon ? "You won" : `${first} won`}</span> · {h.last.prediction} · {ago(h.last.at)}
          </Link>
        ) : (
          <>Never met. Take the other side of one of their rooms.</>
        )}
        {h.live > 0 && (
          <span className="text-yes-ink">
            {" · "}
            {h.live} live
          </span>
        )}
      </p>
    </section>
  );
}
