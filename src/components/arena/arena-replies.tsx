"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { RivalCharacter } from "@/components/rival-character";
import { useCurrentUser } from "@/components/current-user-provider";
import { openAuthModal } from "@/lib/auth-modal-store";
import { fetchReplies, savePost, type Reply } from "@/lib/arena/data";
import { ago } from "@/lib/arena/model";

const MAX = 500;

/** One level of replies under a post, with a reply box. Yours shows at once. */
export function ArenaReplies({ postId, onCount }: { postId: string; onCount?: (n: number) => void }) {
  const me = useCurrentUser();
  const [replies, setReplies] = useState<Reply[] | null>(null);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    void fetchReplies(postId).then((r) => live && setReplies(r));
    return () => {
      live = false;
    };
  }, [postId]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    const body = draft.replace(/\n{3,}/g, "\n\n").trim();
    if (!body) return;
    if (!me) {
      openAuthModal({ next: "/arena" });
      return;
    }
    const reply: Reply = {
      id: crypto.randomUUID(),
      body,
      attachment: null,
      at: new Date().toISOString(),
      author: { id: me.id, username: me.username, name: me.displayName, avatar: me.avatarUrl },
    };
    setDraft("");
    setError(null);
    const next = [...(replies ?? []), reply];
    setReplies(next);
    onCount?.(next.length);
    const refused = await savePost(me.id, { id: reply.id, body, attachment: null, matchId: null, roomId: null, side: null, momentId: null, parentId: postId });
    if (refused) {
      setReplies((list) => (list ?? []).filter((r) => r.id !== reply.id));
      onCount?.(next.length - 1);
      setDraft(body);
      setError(refused);
    }
  }

  return (
    <div className="mt-3 border-t border-border pt-3 [animation:fade-in-up_180ms_ease-out_both]">
      {replies === null ? (
        <p className="py-2 text-[13px] text-muted">Loading replies…</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {replies.map((r) => (
            <li key={r.id} className="flex gap-2.5">
              <RivalCharacter name={r.author.name} imageUrl={r.author.avatar} size={26} />
              <div className="min-w-0 flex-1">
                <p className="text-[13px]">
                  {r.author.username ? (
                    <Link href={`/profile/${r.author.username}`} className="font-semibold text-foreground hover:underline">
                      {r.author.name}
                    </Link>
                  ) : (
                    <span className="font-semibold text-foreground">{r.author.name}</span>
                  )}
                  <span className="text-muted"> · {ago(r.at)}</span>
                </p>
                <p className="whitespace-pre-wrap break-words text-[14px] leading-snug text-foreground/90">{r.body}</p>
              </div>
            </li>
          ))}
        </ul>
      )}
      <form onSubmit={send} className="mt-3 flex items-end gap-2">
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey && !window.matchMedia("(pointer: coarse)").matches) {
              e.preventDefault();
              void send(e);
            }
          }}
          onFocus={() => !me && openAuthModal({ next: "/arena" })}
          rows={1}
          maxLength={MAX}
          placeholder={me ? "Reply…" : "Sign in to reply"}
          className="max-h-28 min-h-9 flex-1 resize-none rounded-2xl bg-background px-3.5 py-2 text-[14px] text-foreground ring-1 ring-border placeholder:text-muted focus:outline-none focus:ring-rival-blue"
        />
        {draft.trim() && (
          <button type="submit" className="h-9 shrink-0 rounded-full px-4 text-[13px] font-bold text-white" style={{ background: "var(--rival-blue)" }}>
            Reply
          </button>
        )}
      </form>
      {error && <p className="mt-1.5 text-[12px] font-semibold text-rival-red">{error}</p>}
    </div>
  );
}
