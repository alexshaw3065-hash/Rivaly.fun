"use client";

import { useEffect, useRef, useState } from "react";
import { useRetiringList } from "@/lib/use-retiring-list";
import { createClient } from "@/lib/supabase/client";
import {
  MESSAGE_UUID_RE,
  mapMessageRow,
  type DisplayChatMessage,
  type MessageRow,
} from "@/lib/supabase/message-mapper";
import { encodeMoment, matchMoment } from "@/lib/match-event-label";
import { openAuthModal } from "@/lib/auth-modal-store";
import type { EntrySide } from "@/lib/types";
import { useCurrentUser } from "./current-user-provider";
import { ChatFeedRows } from "./chat-feed-rows";
import { ChatMessageRow } from "./chat-message";
import { REACTION_EVENT } from "./room/room-stage";

// The crowd. A live Twitch-style feed — fast, low-permanence, reading as
// people here right now rather than an archive — with the match's own
// moments (kick-off, goals, cards, VAR, whistles) streaming in between the
// messages, names coloured by the side each person backed so rivals
// recognise each other, and one-tap reactions so a stranger can join in
// without composing anything.
//
// Engagement mechanism #4 (collective effervescence / social facilitation —
// .claude/skills/rivaly-engagement-psychology): the live "watching" count
// is real presence, the heat count is real messages, and reactions float
// over the stadium only when someone actually sends one. No simulated chatter.
const MAX_VISIBLE = 9;
const ROW_HEIGHT = 40;
const EXIT_MS = 300;
const HEAT_WINDOW_MS = 120_000;
const QUICK_COOLDOWN_MS = 1200;

/** One tap, no typing: the things people actually shout at a screen. */
const QUICK = ["🔥", "😂", "😤", "👀", "⚽ GOAL!", "Told you 😏", "🧢 Cap", "Robbed 😭"];

/** Wall-clock read for event handlers (kept out of render). */
const clock = () => Date.now();

const leadingEmoji = (body: string): string | null => body.trim().match(/^\p{Extended_Pictographic}/u)?.[0] ?? null;

function floatReaction(body: string) {
  // Only short bursts float — a long message with an emoji in it isn't a reaction.
  if (body.length > 14) return;
  const emoji = leadingEmoji(body) ?? body.trim().match(/\p{Extended_Pictographic}/u)?.[0];
  if (emoji) window.dispatchEvent(new CustomEvent(REACTION_EVENT, { detail: emoji }));
}

export function ChatComposer({
  roomId,
  matchId,
  initialMessages,
  sides = {},
}: {
  roomId: string;
  matchId?: string;
  /** Chat and match moments, oldest first. */
  initialMessages: DisplayChatMessage[];
  /** userId → the side they backed, for colouring names. */
  sides?: Record<string, EntrySide>;
}) {
  const currentUser = useCurrentUser();
  const isRealRoom = MESSAGE_UUID_RE.test(roomId);
  const { items, retiringId, push } = useRetiringList<DisplayChatMessage>(MAX_VISIBLE, initialMessages.slice(-MAX_VISIBLE));
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [watching, setWatching] = useState(0);
  const lastQuick = useRef(0);

  // Realtime rows carry no joined author: seeded from the server fetch and
  // extended on demand for a brand-new poster's first message.
  const authorCache = useRef<Map<string, { display_name: string; avatar_url: string | null }>>(
    new Map(
      initialMessages
        .filter((m): m is DisplayChatMessage & { userId: string; authorName: string } => Boolean(m.userId && m.authorName !== undefined))
        .map((m) => [m.userId, { display_name: m.authorName, avatar_url: m.authorAvatarUrl ?? null }]),
    ),
  );

  useEffect(() => {
    if (!isRealRoom) return;
    const supabase = createClient();
    const presenceKey = currentUser?.id ?? `guest-${Math.random().toString(36).slice(2)}`;

    const channel = supabase
      .channel(`room-messages-${roomId}`, { config: { presence: { key: presenceKey } } })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages", filter: `room_id=eq.${roomId}` }, async (payload) => {
        const row = payload.new as MessageRow;
        let author = authorCache.current.get(row.user_id);
        if (!author) {
          const { data } = await supabase.from("profiles").select("display_name, avatar_url").eq("id", row.user_id).maybeSingle();
          if (data) {
            author = data;
            authorCache.current.set(row.user_id, data);
          }
        }
        push(mapMessageRow(row, author), EXIT_MS);
        floatReaction(row.body);
      })
      .on("presence", { event: "sync" }, () => setWatching(Object.keys(channel.presenceState()).length));

    if (matchId) {
      channel.on("postgres_changes", { event: "INSERT", schema: "public", table: "match_events", filter: `match_id=eq.${matchId}` }, (payload) => {
        const e = payload.new as { id: string; action: string; minute: number | null; payload: Record<string, unknown> | null; occurred_at: string };
        const moment = matchMoment(e.action, e.minute, e.payload);
        if (!moment) return;
        push({ id: `event-${e.id}`, roomId, userId: null, kind: "system", body: encodeMoment(moment), createdAt: e.occurred_at }, EXIT_MS);
      });
    }

    channel.subscribe((status) => {
      if (status === "SUBSCRIBED") void channel.track({ at: Date.now() });
    });

    return () => {
      void supabase.removeChannel(channel);
    };
    // push/authorCache are stable; the subscription only depends on the room.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId, matchId, isRealRoom, currentUser?.id]);

  // Heat: real messages in the last two minutes, re-counted as time passes.
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = window.setInterval(() => setNow(Date.now()), 15_000);
    return () => window.clearInterval(t);
  }, []);
  const heat = items.filter((m) => m.kind === "message" && now - +new Date(m.createdAt) < HEAT_WINDOW_MS).length;

  function post(body: string, restoreDraft: boolean) {
    if (!currentUser) {
      openAuthModal({ next: `/rooms/${roomId}` });
      return;
    }
    setSending(true);
    // No optimistic push: the realtime subscription echoes this insert back to
    // every subscriber, the sender included — one code path for every message.
    createClient()
      .from("messages")
      .insert({ room_id: roomId, user_id: currentUser.id, body })
      .then(({ error }) => {
        setSending(false);
        if (error && restoreDraft) setDraft(body); // failed — put it back so nothing's lost
      });
  }

  function send() {
    const body = draft.trim();
    if (!body || !isRealRoom) return;
    if (currentUser) setDraft("");
    post(body, true);
  }

  function quick(body: string) {
    if (!isRealRoom) return;
    const t = clock();
    if (t - lastQuick.current < QUICK_COOLDOWN_MS) return;
    lastQuick.current = t;
    navigator.vibrate?.(8);
    post(body, false);
  }

  return (
    <section className="flex flex-col rounded-2xl border border-border bg-surface">
      <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
        <p className="font-display text-base font-bold text-foreground">The crowd</p>
        <div className="flex items-center gap-3 font-mono text-[11px] text-muted">
          {watching > 0 && (
            <span className="flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-rival-green" />
              {watching} watching
            </span>
          )}
          {heat > 0 && <span>🔥 {heat} in 2 min</span>}
        </div>
      </div>

      <div className="relative px-3 py-3">
        {items.length === 0 ? (
          <p className="py-10 text-center text-sm text-muted">Quiet so far. Say something — the room&rsquo;s listening.</p>
        ) : (
          <ChatFeedRows
            items={items}
            retiringId={retiringId}
            rowHeight={ROW_HEIGHT}
            renderRow={(m) => <ChatMessageRow message={m} side={m.userId ? sides[m.userId] : undefined} isSelf={m.userId === currentUser?.id} />}
          />
        )}
      </div>

      <div className="no-scrollbar flex gap-1.5 overflow-x-auto border-t border-border px-3 pt-3">
        {QUICK.map((q) => (
          <button
            key={q}
            type="button"
            onClick={() => quick(q)}
            className="h-9 shrink-0 rounded-full border border-border bg-background px-3 text-sm text-foreground transition-[transform,border-color] duration-150 ease-out hover:border-border-strong active:scale-90"
          >
            {q}
          </button>
        ))}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          send();
        }}
        className="flex items-center gap-2 p-3"
      >
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder={currentUser ? "Talk to the room…" : "Sign in to talk…"}
          onFocus={() => !currentUser && openAuthModal({ next: `/rooms/${roomId}` })}
          maxLength={280}
          enterKeyHint="send"
          className="h-11 min-w-0 flex-1 rounded-full border border-border bg-background px-4 text-base text-foreground placeholder:text-muted focus:border-rival-blue focus:outline-none"
          style={{ transition: "border-color 150ms ease" }}
        />
        <button
          type="submit"
          aria-label="Send"
          disabled={!draft.trim() || sending}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-rival-blue text-white transition-[transform,opacity] duration-150 ease-out active:scale-90 disabled:opacity-35"
        >
          <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden>
            <path d="M3 9h11M9.5 4.5 14 9l-4.5 4.5" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </form>
    </section>
  );
}
