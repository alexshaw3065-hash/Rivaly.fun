"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useRetiringList } from "@/lib/use-retiring-list";
import { createClient } from "@/lib/supabase/client";
import {
  MESSAGE_UUID_RE,
  mapMessageRow,
  type DisplayChatMessage,
  type MessageRow,
} from "@/lib/supabase/message-mapper";
import { useCurrentUser } from "./current-user-provider";
import { ChatFeedRows } from "./chat-feed-rows";
import { ChatMessageRow } from "./chat-message";

// A real Twitch/YouTube-Live-style chat: fast and low-permanence, reading
// as a live crowd rather than an archive. The full message history isn't
// lost — useRetiringList just caps what's rendered at MAX_VISIBLE and lets
// ChatFeedRows animate the whole stack scrolling up (not popping) as new
// messages arrive, the same rhythm as a real chat scrolling past faster
// than anyone reads all of it.
//
// Engagement-psychology mechanism #4 (collective effervescence / social
// facilitation — see .claude/skills/rivaly-engagement-psychology): a chat
// that visibly churns reads as "people are here right now" far more than a
// static list. Only ever animates real messages — no simulated/auto-
// generated chatter, per the no-fabricated-activity rule that governs every
// build this session.
//
// Real (UUID) rooms run on Supabase Realtime (postgres_changes on the
// messages table — see the migration adding it to the supabase_realtime
// publication); mock rooms keep the exact original local-only echo
// unchanged, same real/mock branching used throughout the core slice.
const MAX_VISIBLE = 8;
const ROW_HEIGHT = 38;
const EXIT_MS = 300;

export function ChatComposer({
  roomId,
  initialMessages,
  selfUserId,
}: {
  roomId: string;
  initialMessages: DisplayChatMessage[];
  selfUserId: string;
}) {
  const router = useRouter();
  const currentUser = useCurrentUser();
  const isRealRoom = MESSAGE_UUID_RE.test(roomId);
  const { items, retiringId, push } = useRetiringList<DisplayChatMessage>(
    MAX_VISIBLE,
    initialMessages.slice(-MAX_VISIBLE),
  );
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);

  // Realtime's Postgres changefeed payload is raw columns only, no joined
  // author — seeded from initialMessages (already carries the embedded
  // join from the server fetch) so anyone who already posted resolves
  // instantly; extended on-demand for a brand-new poster's first message.
  const authorCache = useRef<Map<string, { display_name: string; avatar_url: string | null }>>(
    new Map(
      initialMessages
        .filter((m): m is DisplayChatMessage & { userId: string; authorName: string } =>
          Boolean(m.userId && m.authorName !== undefined),
        )
        .map((m) => [m.userId, { display_name: m.authorName, avatar_url: m.authorAvatarUrl ?? null }]),
    ),
  );

  useEffect(() => {
    if (!isRealRoom) return;
    const supabase = createClient();

    const channel = supabase
      .channel(`room-messages-${roomId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `room_id=eq.${roomId}` },
        async (payload) => {
          const row = payload.new as MessageRow;
          let author = authorCache.current.get(row.user_id);
          if (!author) {
            const { data } = await supabase
              .from("profiles")
              .select("display_name, avatar_url")
              .eq("id", row.user_id)
              .maybeSingle();
            if (data) {
              author = data;
              authorCache.current.set(row.user_id, data);
            }
          }
          push(mapMessageRow(row, author), EXIT_MS);
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
    // roomId/isRealRoom only — push/authorCache are stable across renders
    // (push from useRetiringList, authorCache a ref) and don't need to
    // retrigger the subscription.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId, isRealRoom]);

  function send() {
    const body = draft.trim();
    if (!body) return;

    if (!isRealRoom) {
      push(
        {
          id: `local-${Date.now()}`,
          roomId,
          userId: selfUserId,
          kind: "message",
          body,
          createdAt: new Date().toISOString(),
        },
        EXIT_MS,
      );
      setDraft("");
      return;
    }

    if (!currentUser) {
      router.push(`/login?next=${encodeURIComponent(`/rooms/${roomId}`)}`);
      return;
    }

    setDraft("");
    setSending(true);
    // No manual local push here — the realtime subscription above echoes
    // this same insert back (Postgres changefeeds broadcast to every
    // subscriber including the one who made the change), so there's one
    // code path for every message, yours or anyone else's, not a
    // separate optimistic-then-reconcile flow.
    const supabase = createClient();
    supabase
      .from("messages")
      .insert({ room_id: roomId, user_id: currentUser.id, body })
      .then(({ error }) => {
        setSending(false);
        if (error) setDraft(body); // failed — put it back so nothing's lost
      });
  }

  return (
    <div className="flex flex-col">
      <div className="px-2 py-3">
        <ChatFeedRows
          items={items}
          retiringId={retiringId}
          rowHeight={ROW_HEIGHT}
          renderRow={(m) => <ChatMessageRow message={m} />}
        />
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          send();
        }}
        className="mt-3 flex items-center gap-2 border-t border-border pt-3"
      >
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Say something…"
          className="flex-1 rounded-md border border-border bg-surface px-3.5 py-2.5 text-base text-foreground placeholder:text-muted focus:border-border-strong focus:outline-none"
          style={{ transition: "border-color 150ms ease" }}
        />
        <button
          type="submit"
          disabled={!draft.trim() || sending}
          className="shrink-0 rounded-md bg-foreground px-4 py-2.5 text-sm font-medium text-background transition-[transform,opacity] duration-150 ease-out active:scale-[0.97] disabled:opacity-40"
        >
          Send
        </button>
      </form>
    </div>
  );
}
