"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { profileById, postById, formatMoney } from "@/lib/mock-data";
import type { DisplayPost } from "@/lib/supabase/post-mapper";
import type { DisplayRivalActivity, DisplayHotRoom } from "@/lib/supabase/arena";
import { toggleRoast } from "@/app/arena/actions";
import { useCurrentUser } from "./current-user-provider";
import { Avatar } from "./avatar";
import type { ArenaFeedItem } from "@/lib/types";

// The 6 card renderers for Arena's Feed, switched on ArenaFeedItem.kind.
// Every number on every card traces back to a real field — for mock items,
// mock-data.ts; for real items, a pre-fetched entry in the maps passed
// down from arena-feed.tsx (see its own merge comment for why the real
// fetch happens once there rather than per-card). rival_activity and
// hot_room items are only ever real when their id shows up in the
// corresponding map — mock ids never collide with a real UUID.

function CardShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-3 rounded-lg border border-border bg-surface p-4">{children}</div>
  );
}

function ByLine({
  name,
  username,
  verb,
}: {
  name: string;
  username: string | null;
  verb?: string;
}) {
  const inner = (
    <>
      <Avatar name={name} size={22} />
      <p className="text-sm text-foreground">
        <span className="font-medium">{name}</span>
        {verb && <span className="text-muted"> {verb}</span>}
      </p>
    </>
  );
  if (!username) {
    return <div className="flex items-center gap-2">{inner}</div>;
  }
  return (
    <Link href={`/profile/${username}`} className="hover-link flex items-center gap-2 transition-colors">
      {inner}
    </Link>
  );
}

function RivalActivityCard({
  entryId,
  real,
}: {
  entryId: string;
  real?: DisplayRivalActivity;
}) {
  if (real) {
    return (
      <CardShell>
        <ByLine name={real.userName} username={real.userUsername} verb={`just entered with ${formatMoney(real.amountCents)}`} />
        <Link
          href={`/rooms/${real.roomId}`}
          className="hover-link text-base font-medium leading-snug text-foreground transition-colors"
        >
          &ldquo;{real.roomPrediction}&rdquo;
        </Link>
        <span className="font-mono text-xs text-muted">{real.participantCount} rivals</span>
      </CardShell>
    );
  }

  // Mock entries (and their rooms) were removed — only real activity renders.
  void entryId;
  return null;
}

function HotRoomCard({ roomId, real }: { roomId: string; real?: DisplayHotRoom }) {
  if (real) {
    return (
      <Link href={`/rooms/${real.id}`} className="block">
        <CardShell>
          <span className="font-mono text-[11px] font-medium uppercase tracking-wider text-rival-blue">
            Hot room
          </span>
          <p className="text-base font-medium leading-snug text-foreground">&ldquo;{real.prediction}&rdquo;</p>
          <p className="text-sm text-muted">{real.participantCount} rivals inside now</p>
          <p className="font-mono text-xs text-muted">{formatMoney(real.poolTotalCents)} pool</p>
        </CardShell>
      </Link>
    );
  }

  // Mock hot rooms were removed — only real ones render.
  void roomId;
  return null;
}

// Roast button: real posts get a real toggle (mirrors FollowButton's own
// local-state-plus-revert-on-failure shape); mock posts keep the original
// static 🔥 count, since there's nothing behind it to persist to.
function RoastButton({ post }: { post: DisplayPost }) {
  const router = useRouter();
  const currentUser = useCurrentUser();
  const [roasted, setRoasted] = useState(post.roastedByViewer);
  const [count, setCount] = useState(post.roastCount);
  const [pending, setPending] = useState(false);

  async function handleClick() {
    if (!currentUser) {
      router.push(`/login?next=${encodeURIComponent("/arena")}`);
      return;
    }
    const next = !roasted;
    setRoasted(next);
    setCount((c) => (next ? c + 1 : Math.max(c - 1, 0)));
    setPending(true);
    const res = await toggleRoast(post.id, roasted);
    setPending(false);
    if (!res.ok) {
      setRoasted(!next);
      setCount((c) => (next ? Math.max(c - 1, 0) : c + 1));
    }
  }

  return (
    <button
      onClick={handleClick}
      disabled={pending}
      className="transition-opacity"
      style={{ opacity: roasted ? 1 : 0.7 }}
    >
      🔥 {count}
    </button>
  );
}

function PostCard({ postId, real }: { postId: string; real?: DisplayPost }) {
  const [showReplies, setShowReplies] = useState(false);

  if (real) {
    return (
      <CardShell>
        <ByLine name={real.authorName} username={real.authorUsername} />
        <p className="text-base leading-snug text-foreground">{real.body}</p>
        <div className="flex items-center gap-4 font-mono text-xs text-muted">
          <RoastButton post={real} />
        </div>
      </CardShell>
    );
  }

  const post = postById(postId);
  if (!post) return null;
  const author = profileById(post.authorId);
  if (!author) return null;

  return (
    <CardShell>
      <ByLine name={author.displayName} username={author.username} />
      <p className="text-base leading-snug text-foreground">{post.body}</p>
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
            const replyAuthor = profileById(reply.authorId);
            if (!replyAuthor) return null;
            return (
              <div key={i} className="flex items-start gap-2">
                <Avatar name={replyAuthor.displayName} size={18} />
                <p className="text-sm text-muted">
                  <span className="font-medium text-foreground">{replyAuthor.displayName}</span> {reply.body}
                </p>
              </div>
            );
          })}
        </div>
      )}
    </CardShell>
  );
}

const EMPTY_POSTS = new Map<string, DisplayPost>();
const EMPTY_ACTIVITY = new Map<string, DisplayRivalActivity>();
const EMPTY_HOT_ROOMS = new Map<string, DisplayHotRoom>();

// realPosts/realActivity/realHotRooms are optional — profile-activity.tsx
// reuses this component for a profile's (currently mock-only) history log
// and has no real data to pass, so every real item is simply absent there.
export function ArenaFeedCard({
  item,
  realPosts = EMPTY_POSTS,
  realActivity = EMPTY_ACTIVITY,
  realHotRooms = EMPTY_HOT_ROOMS,
}: {
  item: ArenaFeedItem;
  realPosts?: Map<string, DisplayPost>;
  realActivity?: Map<string, DisplayRivalActivity>;
  realHotRooms?: Map<string, DisplayHotRoom>;
}) {
  switch (item.kind) {
    case "win_loss":
      // Only mock entries ever produced these; real settled results will
      // get their own card when rooms settle for real.
      return null;
    case "rival_activity":
      return <RivalActivityCard entryId={item.entryId} real={realActivity.get(item.entryId)} />;
    case "hot_room":
      return <HotRoomCard roomId={item.roomId} real={realHotRooms.get(item.roomId)} />;
    case "banter":
    case "thesis":
      return <PostCard postId={item.postId} real={realPosts.get(item.postId)} />;
  }
}
