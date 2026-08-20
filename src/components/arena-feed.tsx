"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { buildArenaFeed, arenaItemSubjectId, followedProfileIds } from "@/lib/mock-data";
import { ArenaFeedCard } from "./arena-feed-card";
import { OnlineRivalsBadge } from "./online-rivals-badge";

type FeedScope = "global" | "following";
const PAGE_SIZE = 6;

// Same infinite-scroll shape as room-feed.tsx (IntersectionObserver +
// PAGE_SIZE + a real closing moment) — deliberately reused rather than
// reinvented, since that pattern already gets the ethical stopping-point
// behavior right: the feed ends, it doesn't loop forever pretending there's
// always more. "You're caught up" is a softer landing than RoomFeed's "go
// start one" — Arena's job here is to bring people back tomorrow, not to
// pressure an action right now.
export function ArenaFeed() {
  const [scope, setScope] = useState<FeedScope>("global");
  const [prevScope, setPrevScope] = useState(scope);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const loadingRef = useRef(false);
  const sentinelRef = useRef<HTMLDivElement>(null);

  if (scope !== prevScope) {
    setPrevScope(scope);
    setVisibleCount(PAGE_SIZE);
  }

  const allItems = useMemo(() => buildArenaFeed(), []);
  const filtered = useMemo(() => {
    if (scope === "global") return allItems;
    const followed = followedProfileIds();
    return allItems.filter((item) => {
      const subjectId = arenaItemSubjectId(item);
      return subjectId !== null && followed.includes(subjectId);
    });
  }, [allItems, scope]);

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
            <ArenaFeedCard item={item} />
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
