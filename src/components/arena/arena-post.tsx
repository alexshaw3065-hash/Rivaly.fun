"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useCurrentUser } from "@/components/current-user-provider";
import { openAuthModal } from "@/lib/auth-modal-store";
import { fetchPost, setReaction } from "@/lib/arena/data";
import { toggleReaction, type ArenaEmoji, type PostItem } from "@/lib/arena/model";
import { ArenaCard, type CardActions } from "./arena-cards";
import { ArenaReplies } from "./arena-replies";

export function ArenaPost({ postId }: { postId: string }) {
  const me = useCurrentUser();
  const [post, setPost] = useState<PostItem | null | undefined>(undefined);

  useEffect(() => {
    let live = true;
    const ok = /^[0-9a-f-]{36}$/i.test(postId);
    void (ok ? fetchPost(postId, me?.id ?? null) : Promise.resolve(null)).then((p) => live && setPost(p));
    return () => {
      live = false;
    };
  }, [postId, me?.id]);

  const actions: CardActions = useMemo(
    () => ({
      viewerId: me?.id ?? null,
      inlineThread: false,
      names: {},
      onMatch: () => {},
      onTake: () => {},
      onReact: (_item, emoji: ArenaEmoji) => {
        if (!me) return openAuthModal({ next: `/arena/p/${postId}` });
        setPost((p) => {
          if (!p) return p;
          const on = !p.mine.includes(emoji);
          void setReaction({ kind: "post", id: p.id }, emoji, on).then((done) => !done && setPost((q) => (q ? toggleReaction(q, emoji) : q)));
          return toggleReaction(p, emoji);
        });
      },
    }),
    [me, postId],
  );

  return (
    <div>
      <Link href="/arena" className="text-sm text-muted hover:text-foreground">
        ← Arena
      </Link>
      <div className="mt-4 overflow-hidden rounded-2xl bg-surface ring-1 ring-border">
        {post === undefined && <div className="h-40 animate-pulse" />}
        {post === null && <p className="px-4 py-14 text-center text-sm text-muted">This post isn&apos;t here any more.</p>}
        {post && (
          <>
            <ArenaCard item={{ ...post, replies: 0 }} actions={actions} />
            <div className="px-4 pb-4">
              <ArenaReplies postId={post.id} />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
