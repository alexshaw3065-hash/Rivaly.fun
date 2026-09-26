"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useCurrentUser } from "@/components/current-user-provider";
import { RivalCharacter } from "@/components/rival-character";
import { openAuthModal } from "@/lib/auth-modal-store";
import { deletePost, fetchPost, fetchThread, setReaction } from "@/lib/arena/data";
import { ARENA_POST_FAILED, ARENA_POSTED, openArenaComposer, type FailedDetail, type PostedDetail } from "@/lib/arena/composer-store";
import { toggleReaction, type ArenaEmoji, type ArenaItem, type PostItem, type ReceiptItem } from "@/lib/arena/model";
import { PostCard, type CardActions } from "./arena-cards";
import { reportContent, type ReportReason } from "@/lib/report";

const handle = (p: PostItem) => (p.author.username ? `@${p.author.username}` : p.author.name);

// A post's own page, X-style: the post big at the top with its time and
// views, a "Post your reply" bar, then every reply as a full post.
export function ArenaPost({ postId, preload }: { postId: string; /** Skip the fetch (tests). */ preload?: { post: PostItem; replies: PostItem[] } }) {
  const me = useCurrentUser();
  const router = useRouter();
  const [post, setPost] = useState<PostItem | null | undefined>(preload?.post);
  const [replies, setReplies] = useState<PostItem[] | null>(preload?.replies ?? null);

  useEffect(() => {
    if (preload) return;
    let live = true;
    const ok = /^[0-9a-f-]{36}$/i.test(postId);
    void (ok ? fetchPost(postId, me?.id ?? null) : Promise.resolve(null)).then((p) => live && setPost(p));
    void (ok ? fetchThread(postId, me?.id ?? null) : Promise.resolve([])).then((r) => live && setReplies(r));
    return () => {
      live = false;
    };
  }, [postId, me?.id, preload]);

  // Replies you post show at once (and come off again if refused).
  useEffect(() => {
    const posted = (e: Event) => {
      const item = (e as CustomEvent<PostedDetail>).detail.item;
      if (item.parentId !== postId) return;
      setReplies((list) => [...(list ?? []), item]);
      setPost((p) => (p ? { ...p, replies: p.replies + 1 } : p));
    };
    const failed = (e: Event) => {
      const id = (e as CustomEvent<FailedDetail>).detail.id;
      setReplies((list) => {
        if (!list?.some((r) => r.id === id)) return list;
        setPost((p) => (p ? { ...p, replies: Math.max(0, p.replies - 1) } : p));
        return list.filter((r) => r.id !== id);
      });
    };
    window.addEventListener(ARENA_POSTED, posted);
    window.addEventListener(ARENA_POST_FAILED, failed);
    return () => {
      window.removeEventListener(ARENA_POSTED, posted);
      window.removeEventListener(ARENA_POST_FAILED, failed);
    };
  }, [postId]);

  const actions: CardActions = useMemo(() => {
    const reply = (mention?: string) => {
      if (!me) return openAuthModal({ next: `/arena/p/${postId}` });
      if (!post) return;
      openArenaComposer({ replyTo: { id: post.id, name: post.author.name, username: post.author.username, body: post.body }, body: mention ? `${mention} ` : undefined });
    };
    return {
      viewerId: me?.id ?? null,
      names: {},
      onMatch: () => router.push("/arena"),
      onTake: () => {},
      onReply: (item: PostItem | ReceiptItem) => reply(item.id !== post?.id && item.kind === "post" ? handle(item) : undefined),
      onReact: (item: ArenaItem, emoji: ArenaEmoji) => {
        if (!me) return openAuthModal({ next: `/arena/p/${postId}` });
        const on = !item.mine.includes(emoji);
        const flipPost = (p: PostItem | null | undefined) => (p && p.id === item.id ? toggleReaction(p, emoji) : p);
        const flipReplies = (list: PostItem[] | null) => list?.map((r) => (r.id === item.id ? toggleReaction(r, emoji) : r)) ?? null;
        setPost(flipPost);
        setReplies(flipReplies);
        void setReaction({ kind: "post", id: item.id }, emoji, on).then((ok) => {
          if (ok) return;
          setPost(flipPost);
          setReplies(flipReplies);
        });
      },
      onSignIn: () => openAuthModal({ next: `/arena/p/${postId}` }),
      onReport: (item: PostItem, reason: ReportReason) => {
        void reportContent("post", item.id, reason);
        if (item.id === post?.id) {
          router.push("/arena");
          return;
        }
        setReplies((list) => list?.filter((r) => r.id !== item.id) ?? null);
      },
      onDelete: async (item: PostItem) => {
        if (item.id === post?.id) {
          if (await deletePost(item.id)) router.push("/arena");
          return;
        }
        setReplies((list) => list?.filter((r) => r.id !== item.id) ?? null);
        setPost((p) => (p ? { ...p, replies: Math.max(0, p.replies - 1) } : p));
        await deletePost(item.id);
      },
    };
  }, [me, post, postId, router]);

  return (
    <div>
      <div className="flex items-center gap-4">
        <button type="button" onClick={() => (window.history.length > 1 ? router.back() : router.push("/arena"))} aria-label="Back" className="flex h-9 w-9 items-center justify-center rounded-full text-foreground hover:bg-foreground/10">
          <svg width="18" height="18" viewBox="0 0 20 20" aria-hidden>
            <path d="M12.5 4 6.5 10l6 6" stroke="currentColor" strokeWidth="1.9" fill="none" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <h1 className="font-display text-lg font-bold text-foreground">Post</h1>
      </div>

      <div className="mt-3 overflow-hidden rounded-2xl bg-surface ring-1 ring-border">
        {post === undefined && <div className="h-40 animate-pulse" />}
        {post === null && <p className="px-4 py-14 text-center text-sm text-muted">This post isn&apos;t here any more.</p>}
        {post && (
          <>
            {post.parentId && (
              <Link href={`/arena/p/${post.parentId}`} className="block border-b border-border px-4 py-2.5 text-[13px] text-muted hover:text-foreground">
                ↑ See the post this replies to
              </Link>
            )}
            <PostCard item={post} actions={actions} variant="detail" />
            <button
              type="button"
              onClick={() => actions.onReply?.(post)}
              className="flex w-full items-center gap-3 border-t border-border px-4 py-3 text-left transition-colors hover:bg-foreground/[0.02]"
            >
              {me ? <RivalCharacter name={me.displayName} imageUrl={me.avatarUrl} size={32} /> : <span className="h-8 w-8 rounded-full bg-foreground/10" />}
              <span className="flex-1 text-[15px] text-muted">{me ? "Post your reply" : "Sign in to reply"}</span>
              <span className="rounded-full px-4 py-1.5 text-[13px] font-bold text-white" style={{ background: "var(--rival-blue)" }}>
                Reply
              </span>
            </button>
            <div className="divide-y divide-border border-t border-border">
              {replies === null && <div className="h-20 animate-pulse" />}
              {replies?.map((r) => (
                <div key={r.id} className="chat-row-enter">
                  <PostCard item={r} actions={actions} variant="reply" replyingTo={handle(post)} />
                </div>
              ))}
              {replies?.length === 0 && <p className="px-4 py-8 text-center text-sm text-muted">No replies yet. Start it.</p>}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
