"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { getFollowedUserIds } from "@/lib/arena/data";
import { fetchPublicRooms, fetchRoomsForProfile, type RoomWithMatch } from "@/lib/use-real-rooms";
import { useCurrentUser } from "./current-user-provider";
import { RoomCard } from "./room-card";
import { Avatar } from "./avatar";
import { InfoIcon } from "./icons";

type SubTab = "created" | "joined";

// The social heart of the Rooms tab — not just "here are some rooms," but
// "here's what people you actually follow are doing right now." Each card
// carries a small by-line (avatar + name) rather than being grouped under
// one generic header, since the point is *who*, not just *what*.
interface Byline {
  username: string;
  displayName: string;
  avatarUrl: string | null;
}

function RoomWithByline({ item, profile }: { item: RoomWithMatch; profile: Byline | undefined }) {
  if (!profile) return null;
  return (
    <div className="flex flex-col gap-2">
      <Link
        href={`/profile/${profile.username}`}
        className="hover-link flex items-center gap-2 text-muted transition-colors"
      >
        <Avatar name={profile.displayName} size={20} imageUrl={profile.avatarUrl} />
        <span className="text-xs font-medium">{profile.displayName}</span>
      </Link>
      <RoomCard room={item.room} match={item.match} />
    </div>
  );
}

// title gives desktop a native hover tooltip for free; the click-toggled
// panel is what actually works on touch (and doubles as the desktop
// fallback for anyone who clicks instead of hovering). Only ever rendered
// while this tab is active, so leaving Following removes it too.
function SubTabInfo() {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label="What do Created and Joined mean?"
        title="Created: rooms started by people you follow. Joined: rooms they've entered."
        className="text-muted transition-colors hover:text-foreground"
      >
        <InfoIcon />
      </button>
      {open && (
        <div className="enter-pop absolute right-0 top-full z-10 mt-2 w-64 rounded-lg border border-border bg-surface-elevated p-3 shadow-lg">
          <p className="text-xs text-muted">
            <span className="font-medium text-foreground">Created</span> — rooms started by people you
            follow.
          </p>
          <p className="mt-1.5 text-xs text-muted">
            <span className="font-medium text-foreground">Joined</span> — rooms they&rsquo;ve entered.
          </p>
        </div>
      )}
    </div>
  );
}

interface FollowingData {
  created: { item: RoomWithMatch; byId: string }[];
  joined: { item: RoomWithMatch; byId: string }[];
  profiles: Map<string, Byline>;
}

// Real follows, real rooms: what the people you follow have started, and
// what they've entered, while it's still open.
async function loadFollowing(viewerId: string): Promise<FollowingData> {
  const followed = await getFollowedUserIds(viewerId);
  if (followed.length === 0) return { created: [], joined: [], profiles: new Map() };
  const [publicRooms, perPerson, { data: profileRows }] = await Promise.all([
    fetchPublicRooms(),
    Promise.all(followed.map(async (id) => ({ id, rooms: await fetchRoomsForProfile(id) }))),
    createClient().from("profiles").select("id, username, display_name, avatar_url").in("id", followed),
  ]);
  const open = (i: RoomWithMatch) => i.room.status === "open" || i.room.status === "live";
  return {
    created: publicRooms.filter((i) => followed.includes(i.room.creatorId)).map((item) => ({ item, byId: item.room.creatorId })),
    joined: perPerson.flatMap(({ id, rooms }) => rooms.joined.filter(open).map((item) => ({ item, byId: id }))),
    profiles: new Map(
      (profileRows ?? []).map((p) => [p.id as string, { username: p.username, displayName: p.display_name, avatarUrl: p.avatar_url }]),
    ),
  };
}

export function RoomsFollowingFeed() {
  const [sub, setSub] = useState<SubTab>("created");
  const viewer = useCurrentUser();
  const [data, setData] = useState<{ viewerId: string; value: FollowingData } | null>(null);

  useEffect(() => {
    if (!viewer) return;
    let cancelled = false;
    loadFollowing(viewer.id)
      .catch((): FollowingData => ({ created: [], joined: [], profiles: new Map() }))
      .then((value) => {
        if (!cancelled) setData({ viewerId: viewer.id, value });
      });
    return () => {
      cancelled = true;
    };
  }, [viewer]);

  const current = viewer && data?.viewerId === viewer.id ? data.value : null;
  const created = current?.created ?? [];
  const joined = current?.joined ?? [];
  const hasAnything = created.length > 0 || joined.length > 0;

  if (viewer && !current) return <p className="text-sm text-muted">Loading…</p>;

  if (!hasAnything) {
    return (
      <div className="rounded-lg border border-border bg-surface p-8 text-center">
        <p className="text-sm text-muted">
          {viewer
            ? "Nobody you follow has an active room right now. Follow a few more rivals to fill this up."
            : "Sign in and follow a few rivals to see their rooms here."}
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <div className="flex gap-5">
          {(["created", "joined"] as const).map((s) => (
            <button
              key={s}
              onClick={() => setSub(s)}
              className="-mb-px border-b-2 pb-2 text-sm font-medium capitalize transition-colors duration-150"
              style={{
                borderColor: sub === s ? "var(--foreground)" : "transparent",
                color: sub === s ? "var(--foreground)" : "var(--muted)",
              }}
            >
              {s}
            </button>
          ))}
        </div>
        <SubTabInfo />
      </div>

      {sub === "created" ? (
        created.length > 0 ? (
          <div className="mt-5 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {created.map(({ item, byId }) => (
              <RoomWithByline key={item.room.id} item={item} profile={current?.profiles.get(byId)} />
            ))}
          </div>
        ) : (
          <p className="mt-6 text-sm text-muted">Nobody you follow has created a room right now.</p>
        )
      ) : joined.length > 0 ? (
        <div className="mt-5 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {joined.map(({ item, byId }) => (
            <RoomWithByline key={`${item.room.id}-${byId}`} item={item} profile={current?.profiles.get(byId)} />
          ))}
        </div>
      ) : (
        <p className="mt-6 text-sm text-muted">Nobody you follow has joined a room right now.</p>
      )}
    </div>
  );
}
