"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useCurrentUser } from "@/components/current-user-provider";
import { useOnlineRivals } from "@/lib/online-presence";
import { RivalCharacter } from "@/components/rival-character";
import { FollowButton } from "@/components/follow-button";

// Rivals, at the top of the Arena feed: who's in the app right now (green
// dot, one tap to challenge) and who to follow — picked from real
// connections, strongest first (suggested_rivals(): took you on, in your
// rooms, backing your matches, then top callers). One row, no grid: faces
// and a single action each. Engagement mechanisms #5 (named rivalry — a
// person, not a stat) and #9 (social proof from people like you).

interface Suggested {
  id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
  reason: string;
}

// An account that never set a name can carry its id as one — show the handle instead.
const UUIDISH = /^[0-9a-f]{8}-[0-9a-f]{4}-/i;
const displayOf = (name: string, username: string) => (!name || UUIDISH.test(name) ? username : name);

interface Person {
  id: string;
  username: string;
  name: string;
  avatar: string | null;
  online: boolean;
  reason: string;
}

export function ArenaRivals() {
  const me = useCurrentUser();
  const online = useOnlineRivals();
  const [suggested, setSuggested] = useState<Suggested[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    void createClient()
      .rpc("suggested_rivals", { p_limit: 12 })
      .then(({ data }) => {
        if (!cancelled) setSuggested((data as Suggested[] | null) ?? []);
      });
    return () => {
      cancelled = true;
    };
  }, [me?.id]);

  const people = useMemo<Person[]>(() => {
    const out: Person[] = [];
    const seen = new Set<string>();
    for (const o of online) {
      if (o.id === me?.id || seen.has(o.id)) continue;
      seen.add(o.id);
      out.push({ id: o.id, username: o.username, name: displayOf(o.name, o.username), avatar: o.avatar, online: true, reason: "Online now" });
    }
    const onlineIds = new Set(online.map((o) => o.id));
    for (const s of suggested ?? []) {
      if (seen.has(s.id)) continue;
      seen.add(s.id);
      out.push({ id: s.id, username: s.username, name: displayOf(s.display_name, s.username), avatar: s.avatar_url, online: onlineIds.has(s.id), reason: s.reason });
    }
    return out.slice(0, 16);
  }, [online, suggested, me?.id]);

  if (people.length === 0) return null;
  const onlineCount = people.filter((p) => p.online).length;

  return (
    <section className="mt-4" aria-label="Rivals">
      <div className="flex items-baseline justify-between">
        <h2 className="text-label font-semibold text-foreground">Rivals</h2>
        {onlineCount > 0 && (
          <span className="flex items-center gap-1.5 text-caption text-secondary">
            <span className="h-1.5 w-1.5 rounded-full bg-rival-green" aria-hidden />
            {onlineCount} online
          </span>
        )}
      </div>
      <div className="no-scrollbar -mx-4 mt-2 flex gap-3 overflow-x-auto px-4 pb-1 md:mx-0 md:px-0">
        {people.map((p) => (
          <div key={p.id} className="flex w-[132px] shrink-0 flex-col items-center gap-2 rounded-card border border-line bg-surface px-3 pb-3 pt-4 text-center">
            <Link href={`/profile/${p.username}`} className="flex w-full min-w-0 flex-col items-center gap-1.5">
              <span className="relative">
                <RivalCharacter name={p.username} imageUrl={p.avatar} size={44} />
                {p.online && (
                  <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-rival-green ring-2 ring-surface" aria-label="Online now" />
                )}
              </span>
              <span className="w-full truncate text-label font-semibold text-foreground">{p.name}</span>
              <span className="-mt-1 w-full truncate tabular-nums text-caption text-secondary">@{p.username}</span>
            </Link>
            <span className="w-full truncate text-caption text-secondary">{p.reason}</span>
            {p.online && me ? (
              <Link
                href={`/rooms/create?vs=${encodeURIComponent(p.username)}`}
                className="w-full rounded-control bg-yes py-1.5 text-caption font-semibold text-white transition-transform duration-150 ease-out active:scale-[0.97]"
              >
                Challenge
              </Link>
            ) : (
              <FollowButton profileId={p.id} variant="compact" />
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
