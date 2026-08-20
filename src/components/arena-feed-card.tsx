"use client";

import { useState } from "react";
import Link from "next/link";
import {
  entries,
  roomById,
  matchById,
  profileById,
  postById,
  momentumCount,
  formatMoney,
  formatSignedMoney,
} from "@/lib/mock-data";
import { Avatar } from "./avatar";
import { LiveBadge } from "./live-badge";
import type { ArenaFeedItem } from "@/lib/types";

// The 6 card renderers for Arena's Feed, switched on ArenaFeedItem.kind.
// Every number on every card traces back to a real field passed in from
// mock-data.ts (participantCount, momentumCount, an actual Entry/Post) —
// see buildArenaFeed()'s comment for why that's a hard rule, not a style
// choice. No card here invents a count to make itself look more urgent.

function CardShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-3 rounded-lg border border-border bg-surface p-4">{children}</div>
  );
}

function ByLine({ profileId, verb }: { profileId: string; verb?: string }) {
  const profile = profileById(profileId);
  if (!profile) return null;
  return (
    <Link href={`/profile/${profile.username}`} className="hover-link flex items-center gap-2 transition-colors">
      <Avatar name={profile.displayName} size={22} />
      <p className="text-sm text-foreground">
        <span className="font-medium">{profile.displayName}</span>
        {verb && <span className="text-muted"> {verb}</span>}
      </p>
    </Link>
  );
}

function WinLossCard({ entryId }: { entryId: string }) {
  const entry = entries.find((e) => e.id === entryId);
  if (!entry) return null;
  const room = roomById(entry.roomId);
  if (!room) return null;
  const match = matchById(room.matchId);
  const won = entry.isWinner === true;
  const pnlCents = won ? (entry.payoutCents ?? 0) - entry.amountCents : -entry.amountCents;

  return (
    <CardShell>
      <ByLine profileId={entry.userId} verb={won ? "called it" : "took the L"} />
      <Link href={`/rooms/${room.id}`} className="hover-link text-base font-medium leading-snug text-foreground transition-colors">
        &ldquo;{room.prediction}&rdquo;
      </Link>
      {match && <p className="font-mono text-xs text-muted">{match.competition}</p>}
      <p
        className="font-mono text-2xl font-semibold"
        style={{ color: won ? "var(--rival-green)" : "var(--muted)" }}
      >
        {formatSignedMoney(pnlCents)}
      </p>
      <Link
        href="/rooms"
        className="hover-link self-start text-sm font-medium text-rival-blue transition-colors"
      >
        Find a similar room →
      </Link>
    </CardShell>
  );
}

function RivalActivityCard({ entryId }: { entryId: string }) {
  const entry = entries.find((e) => e.id === entryId);
  if (!entry) return null;
  const room = roomById(entry.roomId);
  if (!room) return null;
  const match = matchById(room.matchId);

  return (
    <CardShell>
      <ByLine profileId={entry.userId} verb={`just entered with ${formatMoney(entry.amountCents)}`} />
      <Link
        href={`/rooms/${room.id}`}
        className="hover-link text-base font-medium leading-snug text-foreground transition-colors"
      >
        &ldquo;{room.prediction}&rdquo;
      </Link>
      <div className="flex items-center justify-between font-mono text-xs text-muted">
        <span>{match?.competition}</span>
        {match?.status === "live" ? <LiveBadge /> : <span>{room.participantCount} rivals</span>}
      </div>
    </CardShell>
  );
}

function HotRoomCard({ roomId }: { roomId: string }) {
  const room = roomById(roomId);
  if (!room) return null;
  const match = matchById(room.matchId);
  const momentum = momentumCount(room);

  return (
    <Link href={`/rooms/${room.id}`} className="block">
      <CardShell>
        <div className="flex items-center justify-between">
          <span className="font-mono text-[11px] font-medium uppercase tracking-wider text-rival-blue">
            Hot room
          </span>
          {match?.status === "live" && <LiveBadge />}
        </div>
        <p className="text-base font-medium leading-snug text-foreground">&ldquo;{room.prediction}&rdquo;</p>
        <p className="text-sm text-muted">
          +{momentum} rivals this hour — {room.participantCount} inside now
        </p>
        <p className="font-mono text-xs text-muted">{formatMoney(room.poolTotalCents)} pool</p>
      </CardShell>
    </Link>
  );
}

function PostCard({ postId }: { postId: string }) {
  const post = postById(postId);
  const [showReplies, setShowReplies] = useState(false);
  if (!post) return null;
  const room = post.roomId ? roomById(post.roomId) : null;

  return (
    <CardShell>
      <ByLine profileId={post.authorId} />
      <p className="text-base leading-snug text-foreground">{post.body}</p>
      {room && (
        <Link
          href={`/rooms/${room.id}`}
          className="hover-border rounded-md border border-border bg-surface-elevated px-3 py-2 text-sm text-muted transition-colors"
        >
          On &ldquo;{room.prediction}&rdquo; — {room.participantCount} rivals in
        </Link>
      )}
      <div className="flex items-center gap-4 font-mono text-xs text-muted">
        <span>🔥 {post.roastCount}</span>
        {post.replies.length > 0 && (
          <button onClick={() => setShowReplies((v) => !v)} className="hover-link transition-colors">
            {post.replies.length} {post.replies.length === 1 ? "reply" : "replies"}
          </button>
        )}
      </div>
      {showReplies && (
        <div className="enter-row flex flex-col gap-2 border-t border-border pt-3">
          {post.replies.map((reply, i) => {
            const author = profileById(reply.authorId);
            if (!author) return null;
            return (
              <div key={i} className="flex items-start gap-2">
                <Avatar name={author.displayName} size={18} />
                <p className="text-sm text-muted">
                  <span className="font-medium text-foreground">{author.displayName}</span> {reply.body}
                </p>
              </div>
            );
          })}
        </div>
      )}
    </CardShell>
  );
}

export function ArenaFeedCard({ item }: { item: ArenaFeedItem }) {
  switch (item.kind) {
    case "win_loss":
      return <WinLossCard entryId={item.entryId} />;
    case "rival_activity":
      return <RivalActivityCard entryId={item.entryId} />;
    case "hot_room":
      return <HotRoomCard roomId={item.roomId} />;
    case "banter":
    case "thesis":
      return <PostCard postId={item.postId} />;
  }
}
