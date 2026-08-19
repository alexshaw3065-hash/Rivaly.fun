"use client";

import { useState } from "react";
import Link from "next/link";
import { rooms, roomsJoinedBy, followedProfileIds, profileById, matchById } from "@/lib/mock-data";
import { RoomCard } from "./room-card";
import { Avatar } from "./avatar";
import { InfoIcon } from "./icons";
import type { Room } from "@/lib/types";

type SubTab = "created" | "joined";

// The social heart of the Rooms tab — not just "here are some rooms," but
// "here's what people you actually follow are doing right now." Each card
// carries a small by-line (avatar + name) rather than being grouped under
// one generic header, since the point is *who*, not just *what*.
function RoomWithByline({ room, byId }: { room: Room; byId: string }) {
  const profile = profileById(byId);
  if (!profile) return null;
  return (
    <div className="flex flex-col gap-2">
      <Link
        href={`/profile/${profile.username}`}
        className="hover-link flex items-center gap-2 text-muted transition-colors"
      >
        <Avatar name={profile.displayName} size={20} />
        <span className="text-xs font-medium">{profile.displayName}</span>
      </Link>
      <RoomCard room={room} match={matchById(room.matchId)!} />
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

export function RoomsFollowingFeed() {
  const [sub, setSub] = useState<SubTab>("created");
  const followed = followedProfileIds();

  const created = rooms.filter((r) => r.status !== "settled" && followed.includes(r.creatorId));

  const joined = followed
    .flatMap((id) => roomsJoinedBy(id).map((room) => ({ room, byId: id })))
    .filter(({ room, byId }) => room.status !== "settled" && room.creatorId !== byId);

  const hasAnything = created.length > 0 || joined.length > 0;

  if (!hasAnything) {
    return (
      <div className="rounded-lg border border-border bg-surface p-8 text-center">
        <p className="text-sm text-muted">
          Nobody you follow has an active room right now. Follow a few more rivals to fill this up.
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
            {created.map((room) => (
              <RoomWithByline key={room.id} room={room} byId={room.creatorId} />
            ))}
          </div>
        ) : (
          <p className="mt-6 text-sm text-muted">Nobody you follow has created a room right now.</p>
        )
      ) : joined.length > 0 ? (
        <div className="mt-5 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {joined.map(({ room, byId }) => (
            <RoomWithByline key={`${room.id}-${byId}`} room={room} byId={byId} />
          ))}
        </div>
      ) : (
        <p className="mt-6 text-sm text-muted">Nobody you follow has joined a room right now.</p>
      )}
    </div>
  );
}
