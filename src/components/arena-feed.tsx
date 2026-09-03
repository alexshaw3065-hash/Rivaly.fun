"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { buildArenaFeed, arenaItemSubjectId, followedProfileIds } from "@/lib/mock-data";
import {
  getRealPosts,
  getRealRivalActivity,
  getRealHotRooms,
  getFollowedUserIds,
  type DisplayRivalActivity,
  type DisplayHotRoom,
} from "@/lib/supabase/arena";
import type { DisplayPost } from "@/lib/supabase/post-mapper";
import { createPost } from "@/app/arena/actions";
import { useCurrentUser } from "./current-user-provider";
import { ArenaFeedCard } from "./arena-feed-card";
import { OnlineRivalsBadge } from "./online-rivals-badge";
import type { ArenaFeedItem } from "@/lib/types";

type FeedScope = "global" | "following";
const PAGE_SIZE = 6;

// Same [4,5,6,7]-cycling hot-room interleave as buildArenaFeed() in
// mock-data.ts — duplicated in miniature here rather than shared, since
// mock's version is intentionally self-contained (no Supabase awareness)
// and this one only ever runs over the small real-items list before it
// gets prepended to mock's already-fully-built feed. See the merge
// comment below for why prepending (not re-interleaving everything
// together) is the right shape here.
function interleaveHot(organic: ArenaFeedItem[], hot: ArenaFeedItem[]): ArenaFeedItem[] {
  const cadence = [4, 5, 6, 7];
  const feed: ArenaFeedItem[] = [];
  let hotIndex = 0;
  let sinceLastHot = 0;
  let cadenceIndex = 0;
  for (const item of organic) {
    feed.push(item);
    sinceLastHot++;
    if (sinceLastHot >= cadence[cadenceIndex % cadence.length] && hotIndex < hot.length) {
      feed.push(hot[hotIndex]);
      hotIndex++;
      cadenceIndex++;
      sinceLastHot = 0;
    }
  }
  feed.push(...hot.slice(hotIndex));
  return feed;
}

// Same infinite-scroll shape as room-feed.tsx (IntersectionObserver +
// PAGE_SIZE + a real closing moment) — deliberately reused rather than
// reinvented, since that pattern already gets the ethical stopping-point
// behavior right: the feed ends, it doesn't loop forever pretending there's
// always more. "You're caught up" is a softer landing than RoomFeed's "go
// start one" — Arena's job here is to bring people back tomorrow, not to
// pressure an action right now.
export function ArenaFeed() {
  const router = useRouter();
  const currentUser = useCurrentUser();
  const [scope, setScope] = useState<FeedScope>("global");
  const [prevScope, setPrevScope] = useState(scope);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const loadingRef = useRef(false);
  const sentinelRef = useRef<HTMLDivElement>(null);

  const [draft, setDraft] = useState("");
  const [posting, setPosting] = useState(false);
  const [postError, setPostError] = useState<string | null>(null);

  const [realPosts, setRealPosts] = useState<DisplayPost[]>([]);
  const [realActivity, setRealActivity] = useState<DisplayRivalActivity[]>([]);
  const [realHotRooms, setRealHotRooms] = useState<DisplayHotRoom[]>([]);
  const [realFollowedIds, setRealFollowedIds] = useState<Set<string>>(new Set());

  if (scope !== prevScope) {
    setPrevScope(scope);
    setVisibleCount(PAGE_SIZE);
  }

  const viewerId = currentUser?.id ?? null;

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const [posts, activity, hotRooms, followed] = await Promise.all([
        getRealPosts(viewerId),
        getRealRivalActivity(viewerId),
        getRealHotRooms(),
        viewerId ? getFollowedUserIds(viewerId) : Promise.resolve([]),
      ]);
      if (cancelled) return;
      setRealPosts(posts);
      setRealActivity(activity);
      setRealHotRooms(hotRooms);
      setRealFollowedIds(new Set(followed));
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [viewerId]);

  const mockFeed = useMemo(() => buildArenaFeed(), []);
  const realPostsById = useMemo(() => new Map(realPosts.map((p) => [p.id, p])), [realPosts]);
  const realActivityById = useMemo(() => new Map(realActivity.map((a) => [a.id, a])), [realActivity]);
  const realHotRoomsById = useMemo(() => new Map(realHotRooms.map((r) => [r.id, r])), [realHotRooms]);

  // Real content merges in as new items on top of mock's, not a
  // mock/real fallback per id like every other migrated surface — Feed
  // isn't keyed by one id, it's a timeline. Mock's feed stays exactly
  // what buildArenaFeed() already produces (own hot-room cadence
  // untouched); real items get the same cadence treatment among
  // themselves, then sit in front — real timestamps are always newer
  // than mock's seeded mid-August dates, so "freshest first" falls out
  // naturally rather than needing an explicit rule.
  const { allItems, subjectByItemId, realItemIds } = useMemo(() => {
    const subjectByItemId = new Map<string, string | null>();
    const realItemIds = new Set<string>();

    const realPostItems: ArenaFeedItem[] = realPosts.map((p) => {
      const id = `rpost-${p.id}`;
      subjectByItemId.set(id, p.authorId);
      realItemIds.add(id);
      return { id, kind: p.roomId ? "thesis" : "banter", postId: p.id, createdAt: p.createdAt };
    });
    const realActivityItems: ArenaFeedItem[] = realActivity.map((a) => {
      const id = `rra-${a.id}`;
      subjectByItemId.set(id, a.userId);
      realItemIds.add(id);
      return { id, kind: "rival_activity", entryId: a.id, createdAt: a.createdAt };
    });
    const realHotItems: ArenaFeedItem[] = realHotRooms.map((r) => {
      const id = `rhr-${r.id}`;
      subjectByItemId.set(id, r.creatorId);
      realItemIds.add(id);
      return { id, kind: "hot_room", roomId: r.id, createdAt: r.createdAt };
    });

    const realOrganic = [...realPostItems, ...realActivityItems].sort(
      (a, b) => +new Date(b.createdAt) - +new Date(a.createdAt),
    );
    const realFeed = interleaveHot(realOrganic, realHotItems);

    for (const item of mockFeed) subjectByItemId.set(item.id, arenaItemSubjectId(item));

    return { allItems: [...realFeed, ...mockFeed], subjectByItemId, realItemIds };
  }, [mockFeed, realPosts, realActivity, realHotRooms]);

  const filtered = useMemo(() => {
    if (scope === "global") return allItems;
    const mockFollowed = followedProfileIds();
    return allItems.filter((item) => {
      const subjectId = subjectByItemId.get(item.id);
      if (!subjectId) return false;
      return realItemIds.has(item.id) ? realFollowedIds.has(subjectId) : mockFollowed.includes(subjectId);
    });
  }, [allItems, scope, subjectByItemId, realItemIds, realFollowedIds]);

  const visible = filtered.slice(0, visibleCount);
  const done = visibleCount >= filtered.length;

  useEffect(() => {
    if (done) return;
    const el = sentinelRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (obs) => {
        if (obs[0].isIntersecting && !loadingRef.current) {
          loadingRef.current = true;
          window.setTimeout(() => {
            setVisibleCount((c) => Math.min(c + PAGE_SIZE, filtered.length));
            loadingRef.current = false;
          }, 450);
        }
      },
      { rootMargin: "200px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [done, filtered.length]);

  async function submitPost() {
    const body = draft.trim();
    if (!body) return;
    if (!currentUser) {
      router.push(`/login?next=${encodeURIComponent("/arena")}`);
      return;
    }

    setPosting(true);
    setPostError(null);
    const res = await createPost(body);
    setPosting(false);

    if (!res.ok) {
      setPostError(res.error);
      return;
    }

    setDraft("");
    setRealPosts((prev) => [
      {
        id: res.postId,
        authorId: currentUser.id,
        authorName: currentUser.displayName,
        authorUsername: currentUser.username,
        body,
        roomId: null,
        createdAt: new Date().toISOString(),
        roastCount: 0,
        roastedByViewer: false,
      },
      ...prev,
    ]);
  }

  return (
    <div>
      <div className="flex items-center justify-between border-b border-border">
        <div className="flex gap-5">
          {(["global", "following"] as const).map((s) => (
            <button
              key={s}
              onClick={() => setScope(s)}
              className="-mb-px border-b-2 pb-2.5 text-sm font-medium capitalize transition-colors duration-150"
              style={{
                borderColor: scope === s ? "var(--foreground)" : "transparent",
                color: scope === s ? "var(--foreground)" : "var(--muted)",
              }}
            >
              {s === "global" ? "Global" : "Following"}
            </button>
          ))}
        </div>
        <div className="pb-2.5">
          <OnlineRivalsBadge />
        </div>
      </div>

      <div className="mt-4 flex flex-col gap-2 rounded-lg border border-border bg-surface p-3">
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="What do you think will happen?"
          rows={2}
          maxLength={280}
          className="w-full resize-none rounded-md border border-transparent bg-transparent text-sm text-foreground placeholder:text-muted focus:outline-none"
        />
        <div className="flex items-center justify-between">
          {postError ? (
            <p className="text-xs text-danger-red">{postError}</p>
          ) : (
            <span className="font-mono text-xs text-muted">{draft.length}/280</span>
          )}
          <button
            onClick={submitPost}
            disabled={!draft.trim() || posting}
            className="shrink-0 rounded-md bg-foreground px-4 py-2 text-sm font-medium text-background transition-[transform,opacity] duration-150 ease-out active:scale-[0.97] disabled:opacity-40"
          >
            {posting ? "Posting…" : "Post"}
          </button>
        </div>
      </div>

      <div className="mt-6 flex flex-col gap-4">
        {visible.map((item, i) => (
          <div
            key={item.id}
            className={i >= visibleCount - PAGE_SIZE ? "stagger-in" : undefined}
            style={
              i >= visibleCount - PAGE_SIZE
                ? { animationDelay: `${(i - (visibleCount - PAGE_SIZE)) * 40}ms` }
                : undefined
            }
          >
            <ArenaFeedCard
              item={item}
              realPosts={realPostsById}
              realActivity={realActivityById}
              realHotRooms={realHotRoomsById}
            />
          </div>
        ))}
      </div>

      {!done && (
        <div ref={sentinelRef} className="flex justify-center py-8">
          <span
            className="h-5 w-5 animate-spin rounded-full border-2 border-t-transparent"
            style={{ borderColor: "var(--border-strong)", borderTopColor: "transparent" }}
            aria-label="Loading more"
          />
        </div>
      )}

      {done && filtered.length > 0 && (
        <div className="flex flex-col items-center gap-3 py-14 text-center">
          <p className="font-display text-lg font-bold text-foreground">Rivaly</p>
          <p className="text-sm text-muted">You&rsquo;re caught up. Check back later.</p>
          <button
            onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
            className="mt-1 rounded-full border border-border-strong px-4 py-2 text-sm text-foreground transition-transform duration-150 ease-out active:scale-[0.97]"
          >
            Back to top ↑
          </button>
        </div>
      )}

      {filtered.length === 0 && (
        <p className="py-14 text-center text-sm text-muted">
          {scope === "following"
            ? "Follow a few rivals to see their activity here."
            : "Nothing here yet."}
        </p>
      )}
    </div>
  );
}
