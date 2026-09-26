"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useCurrentUser } from "@/components/current-user-provider";
import { RivalCharacter } from "@/components/rival-character";
import { FollowButton } from "@/components/follow-button";
import { BottomSheet } from "@/components/bottom-sheet";

type Tab = "followers" | "following";

interface Person {
  id: string;
  username: string;
  name: string;
  avatar: string | null;
}

const UUIDISH = /^[0-9a-f]{8}-[0-9a-f]{4}-/i;
const toPerson = (p: { id: string; username: string; display_name: string; avatar_url: string | null }): Person => ({
  id: p.id,
  username: p.username,
  name: UUIDISH.test(p.display_name) ? `@${p.username}` : p.display_name,
  avatar: p.avatar_url,
});

async function loadList(profileId: string, tab: Tab): Promise<Person[]> {
  const supabase = createClient();
  const { data } =
    tab === "followers"
      ? await supabase
          .from("follows")
          .select("created_at, person:profiles!follows_follower_id_fkey(id, username, display_name, avatar_url)")
          .eq("following_id", profileId)
          .order("created_at", { ascending: false })
          .limit(200)
      : await supabase
          .from("follows")
          .select("created_at, person:profiles!follows_following_id_fkey(id, username, display_name, avatar_url)")
          .eq("follower_id", profileId)
          .order("created_at", { ascending: false })
          .limit(200);
  type Row = { person: { id: string; username: string; display_name: string; avatar_url: string | null } | null };
  return ((data ?? []) as unknown as Row[]).filter((r) => r.person).map((r) => toPerson(r.person!));
}

/** Who follows this profile and who they follow — with a Follow button on each. */
export function FollowListSheet({
  profileId,
  name,
  tab: initialTab,
  counts,
  onClose,
}: {
  profileId: string;
  name: string;
  tab: Tab | null;
  counts: { followers: number; following: number };
  onClose: () => void;
}) {
  const me = useCurrentUser();
  const [tab, setTab] = useState<Tab>(initialTab ?? "followers");
  const [lists, setLists] = useState<Partial<Record<Tab, Person[]>>>({});
  const [mine, setMine] = useState<Set<string> | null>(null);
  const [shownFor, setShownFor] = useState(initialTab);

  // Opening on a different tab switches to it.
  if (initialTab !== shownFor) {
    setShownFor(initialTab);
    if (initialTab) setTab(initialTab);
  }

  useEffect(() => {
    if (!initialTab || lists[tab]) return;
    let live = true;
    void loadList(profileId, tab).then((l) => live && setLists((prev) => ({ ...prev, [tab]: l })));
    return () => {
      live = false;
    };
  }, [initialTab, tab, lists, profileId]);

  // Which of these you already follow, so each button starts right.
  useEffect(() => {
    if (!initialTab || !me || mine) return;
    let live = true;
    void createClient()
      .from("follows")
      .select("following_id")
      .eq("follower_id", me.id)
      .then(({ data }) => live && setMine(new Set((data ?? []).map((r) => r.following_id as string))));
    return () => {
      live = false;
    };
  }, [initialTab, me, mine]);

  const list = lists[tab];

  return (
    <BottomSheet open={initialTab !== null} onClose={onClose} title={name}>
      <div className="mt-2 flex border-b border-border">
        {(["followers", "following"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className="-mb-px flex-1 border-b-2 pb-2.5 text-sm font-medium transition-colors"
            style={{ borderColor: tab === t ? "var(--foreground)" : "transparent", color: tab === t ? "var(--foreground)" : "var(--muted)" }}
          >
            {t === "followers" ? `Followers · ${counts.followers}` : `Following · ${counts.following}`}
          </button>
        ))}
      </div>
      <div className="mt-2 max-h-[55vh] overflow-y-auto">
        {!list && <div className="h-24 animate-pulse rounded-xl bg-foreground/5" />}
        {list?.length === 0 && (
          <p className="py-10 text-center text-sm text-muted">{tab === "followers" ? "No followers yet." : "Not following anyone yet."}</p>
        )}
        {list?.map((p) => (
          <div key={p.id} className="flex items-center gap-3 py-2.5">
            <Link href={`/profile/${p.username}`} onClick={onClose} className="flex min-w-0 flex-1 items-center gap-3">
              <RivalCharacter name={p.name} imageUrl={p.avatar} size={40} />
              <span className="min-w-0">
                <span className="block truncate text-sm font-semibold text-foreground">{p.name}</span>
                <span className="block truncate text-xs text-muted">@{p.username}</span>
              </span>
            </Link>
            {me && me.id !== p.id && mine && <FollowButton key={`${p.id}:${mine.has(p.id)}`} profileId={p.id} initialFollowing={mine.has(p.id)} />}
          </div>
        ))}
      </div>
    </BottomSheet>
  );
}
