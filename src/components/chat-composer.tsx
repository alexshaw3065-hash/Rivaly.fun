"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  MESSAGE_UUID_RE,
  mapMessageRow,
  REACTION_EMOJI,
  type DisplayChatMessage,
  type MessageReaction,
  type MessageRow,
} from "@/lib/supabase/message-mapper";
import { encodeMoment, matchMoment, takeoverMoment } from "@/lib/match-event-label";
import { openAuthModal } from "@/lib/auth-modal-store";
import { addRaceMessage, initRace, useRoomRace } from "@/lib/room-energy";
import type { RaceState } from "@/lib/room-race";
import type { EntrySide } from "@/lib/types";
import { useCurrentUser } from "./current-user-provider";
import { ChatThread, type ReactionMap } from "./chat-thread";
import { REACTION_EVENT } from "./room/room-stage";
import { PressureTicker } from "./room/pressure-ticker";
import { announceChatActivity } from "./room/room-tabs-event";

// The crowd. A full chat thread (Discord-style, see chat-thread.tsx) with
// the match's own moments (kick-off, goals, cards, VAR, whistles) landing
// between the messages, every person wearing the side they backed and their
// stake, and one-tap reactions so a stranger can join in without composing
// anything. It fills the screen under the room's floating bar (room-tabs).
//
// Engagement mechanism #4 (collective effervescence / social facilitation —
// .claude/skills/rivaly-engagement-psychology): the live "watching" count
// is real presence, the heat count is real messages, and reactions float
// over the stadium only when someone actually sends one. No simulated chatter.
const HISTORY_PAGE = 50;
const KEEP = 500;
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
  initialReactions = [],
  sides = {},
  stakes = {},
  initialRace,
  players,
  teams,
  matchTeams,
}: {
  roomId: string;
  matchId?: string;
  /** Chat and match moments, oldest first. */
  initialMessages: DisplayChatMessage[];
  /** Every reaction already in the room. */
  initialReactions?: MessageReaction[];
  /** userId → the side they backed, for colouring names. */
  sides?: Record<string, EntrySide>;
  /** userId → how much they staked, shown under their face. */
  stakes?: Record<string, number>;
  /** The stadium race folded from the room's whole log on the server. */
  initialRace?: RaceState;
  /** Player id → name from the line-ups, so a goal line can say who scored. */
  players?: Record<number, string>;
  /** Team codes, so "Big chance · FUL" can say whose. */
  teams?: { home: string; away: string };
  /** The two teams' names, for the live pressure ticker over the header. */
  matchTeams?: { home: string; away: string };
}) {
  const currentUser = useCurrentUser();
  const isRealRoom = MESSAGE_UUID_RE.test(roomId);
  const [items, setItems] = useState<DisplayChatMessage[]>(initialMessages);
  // The server sends the latest page; there may be more before it.
  const [hasEarlier, setHasEarlier] = useState(initialMessages.filter((m) => m.kind === "message").length >= HISTORY_PAGE);
  const push = useCallback((m: DisplayChatMessage) => {
    setItems((list) => (list.some((x) => x.id === m.id) ? list : [...list, m].slice(-KEEP)));
  }, []);
  const [draft, setDraft] = useState("");
  const [replyTo, setReplyTo] = useState<DisplayChatMessage | null>(null);
  const [tray, setTray] = useState<"quick" | "emoji" | null>("quick");
  const inputRef = useRef<HTMLInputElement>(null);
  // messageId → emoji → the people who reacted with it.
  const [reactions, setReactions] = useState<ReactionMap>(() => {
    const map: ReactionMap = {};
    for (const r of initialReactions) ((map[r.messageId] ??= {})[r.emoji] ??= []).push(r.userId);
    return map;
  });
  const applyReaction = useCallback((r: MessageReaction, on: boolean) => {
    setReactions((prev) => {
      const users = prev[r.messageId]?.[r.emoji] ?? [];
      if (on === users.includes(r.userId)) return prev;
      const next = on ? [...users, r.userId] : users.filter((u) => u !== r.userId);
      return { ...prev, [r.messageId]: { ...prev[r.messageId], [r.emoji]: next } };
    });
  }, []);
  const [sending, setSending] = useState(false);
  const [watching, setWatching] = useState(0);
  const lastQuick = useRef(0);
  // Latest sides map for the realtime handler (entries arrive while we listen).
  const sidesRef = useRef(sides);
  useEffect(() => {
    sidesRef.current = sides;
  }, [sides]);
  const momentCtx = useRef({ names: players, teams });
  useEffect(() => {
    momentCtx.current = { names: players, teams };
  }, [players, teams]);
  // The feed sends each event more than once (first report, confirmation,
  // the scorer's name) under one event id; the room hears it once — the
  // first, fastest report.
  const seenEvents = useRef(new Set<string>());

  // The stadium race: start from the server's fold of the whole room, then
  // every new backer message is folded in at its server time (below).
  useEffect(() => {
    if (initialRace) initRace(initialRace);
    // Per room: the server's fold is the starting point, once.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId]);

  // A takeover that happens while you're here gets its line in the feed.
  const { takeovers } = useRoomRace();
  const seenTakeovers = useRef(initialRace?.takeovers.length ?? 0);
  useEffect(() => {
    if (takeovers.length <= seenTakeovers.current) return;
    const fresh = takeovers.slice(seenTakeovers.current);
    seenTakeovers.current = takeovers.length;
    for (const t of fresh) {
      push({ id: `takeover-${t.at}`, roomId, userId: null, kind: "system", body: encodeMoment(takeoverMoment(t.side)), createdAt: new Date(t.at).toISOString() });
      announceChatActivity({ kind: "moment", text: takeoverMoment(t.side).label });
    }
  }, [takeovers, push, roomId]);

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
        push(mapMessageRow(row, author));
        announceChatActivity({ kind: "message" });
        floatReaction(row.body);
        const side = sidesRef.current[row.user_id];
        if (side) addRaceMessage(row.user_id, side, +new Date(row.created_at));
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "message_reactions", filter: `room_id=eq.${roomId}` }, (payload) => {
        const row = (payload.eventType === "DELETE" ? payload.old : payload.new) as { message_id?: string; user_id?: string; emoji?: string };
        if (!row.message_id || !row.user_id || !row.emoji) return;
        applyReaction({ messageId: row.message_id, userId: row.user_id, emoji: row.emoji }, payload.eventType !== "DELETE");
      })
      .on("presence", { event: "sync" }, () => setWatching(Object.keys(channel.presenceState()).length));

    if (matchId) {
      channel.on("postgres_changes", { event: "INSERT", schema: "public", table: "match_events", filter: `match_id=eq.${matchId}` }, (payload) => {
        const e = payload.new as { id: string; action: string; minute: number | null; payload: Record<string, unknown> | null; occurred_at: string };
        const eid = e.payload?._eid;
        if (typeof eid === "number") {
          const key = `${e.action}:${eid}`;
          if (seenEvents.current.has(key)) return;
          seenEvents.current.add(key);
        }
        const moment = matchMoment(e.action, e.minute, e.payload, momentCtx.current);
        if (!moment) return;
        push({ id: `event-${e.id}`, roomId, userId: null, kind: "system", body: encodeMoment(moment), createdAt: e.occurred_at });
        announceChatActivity({ kind: "moment", text: moment.label });
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

  const loadEarlier = useCallback(async () => {
    const oldest = items.find((m) => m.kind === "message");
    if (!oldest) {
      setHasEarlier(false);
      return;
    }
    const { data } = await createClient()
      .from("messages")
      .select("id, room_id, user_id, body, created_at, reply_to, author:profiles(display_name, avatar_url)")
      .eq("room_id", roomId)
      .lt("created_at", oldest.createdAt)
      .order("created_at", { ascending: false })
      .limit(HISTORY_PAGE);
    const rows = (data ?? []) as unknown as (MessageRow & { author: { display_name: string; avatar_url: string | null } | null })[];
    const older = rows.map((r) => mapMessageRow(r, r.author ?? undefined)).reverse();
    if (older.length < HISTORY_PAGE) setHasEarlier(false);
    setItems((list) => {
      const known = new Set(list.map((m) => m.id));
      return [...older.filter((m) => !known.has(m.id)), ...list].sort((a, b) => +new Date(a.createdAt) - +new Date(b.createdAt));
    });
  }, [items, roomId]);

  // Heat: real messages in the last two minutes, re-counted as time passes.
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = window.setInterval(() => setNow(Date.now()), 15_000);
    return () => window.clearInterval(t);
  }, []);
  const heat = items.filter((m) => m.kind === "message" && now - +new Date(m.createdAt) < HEAT_WINDOW_MS).length;

  function post(body: string, restoreDraft: boolean, reply: DisplayChatMessage | null = null) {
    if (!currentUser) {
      openAuthModal({ next: `/rooms/${roomId}` });
      return;
    }
    setSending(true);
    // No optimistic push: the realtime subscription echoes this insert back to
    // every subscriber, the sender included — one code path for every message.
    createClient()
      .from("messages")
      .insert({ room_id: roomId, user_id: currentUser.id, body, reply_to: reply?.id ?? null })
      .then(({ error }) => {
        setSending(false);
        if (error && restoreDraft) {
          setDraft(body); // failed — put it back so nothing's lost
          setReplyTo(reply);
        }
      });
  }

  function send() {
    const body = draft.trim();
    if (!body || !isRealRoom) return;
    const reply = replyTo;
    if (currentUser) {
      setDraft("");
      setReplyTo(null);
    }
    post(body, true, reply);
  }

  // Reactions: toggle yours, shown at once, confirmed by the database (and
  // rolled back if it refuses).
  function react(messageId: string, emoji: string) {
    if (!currentUser) {
      openAuthModal({ next: `/rooms/${roomId}` });
      return;
    }
    if (!isRealRoom) return;
    const r = { messageId, userId: currentUser.id, emoji };
    const on = !(reactions[messageId]?.[emoji] ?? []).includes(currentUser.id);
    applyReaction(r, on);
    navigator.vibrate?.(6);
    const table = createClient().from("message_reactions");
    const done = on
      ? table.insert({ message_id: messageId, room_id: roomId, user_id: currentUser.id, emoji })
      : table.delete().eq("message_id", messageId).eq("user_id", currentUser.id).eq("emoji", emoji);
    void done.then(({ error }) => {
      if (error) applyReaction(r, !on);
    });
  }

  function reply(message: DisplayChatMessage) {
    if (!currentUser) {
      openAuthModal({ next: `/rooms/${roomId}` });
      return;
    }
    setReplyTo(message);
    inputRef.current?.focus();
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
    <section className="flex h-full min-h-0 flex-col overflow-hidden rounded-2xl border border-border bg-surface">
      <div className="relative flex shrink-0 items-center justify-between gap-3 border-b border-border px-4 py-3">
        {matchId && matchTeams && <PressureTicker matchId={matchId} homeTeam={matchTeams.home} awayTeam={matchTeams.away} />}
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

      <ChatThread
        items={items}
        sides={sides}
        stakes={stakes}
        selfId={currentUser?.id}
        hasEarlier={hasEarlier && isRealRoom}
        onLoadEarlier={loadEarlier}
        reactions={reactions}
        onReact={react}
        onReply={reply}
        empty={<p className="px-6 text-center text-sm text-muted">Quiet so far. Say something — the room&rsquo;s listening.</p>}
      />

      <div className="shrink-0 border-t border-border px-3 pb-3 pt-2">
        {/* Trays: one-tap shouts (open by default — joining in shouldn't need
            typing), or emoji for your message. */}
        {tray === "quick" && (
          <div className="no-scrollbar -mx-3 mb-2 flex gap-1.5 overflow-x-auto px-3">
            {QUICK.map((q) => (
              <button
                key={q}
                type="button"
                onClick={() => quick(q)}
                className="h-8 shrink-0 rounded-full bg-background px-3 text-[13px] text-foreground ring-1 ring-border transition-[transform,box-shadow] duration-150 ease-out hover:ring-border-strong active:scale-90"
              >
                {q}
              </button>
            ))}
          </div>
        )}
        {tray === "emoji" && (
          <div className="mb-2 grid grid-cols-10 gap-1">
            {REACTION_EMOJI.map((e) => (
              <button
                key={e}
                type="button"
                onClick={() => {
                  setDraft((d) => (d + e).slice(0, 280));
                  inputRef.current?.focus();
                }}
                className="flex h-9 items-center justify-center rounded-lg text-xl transition-transform duration-150 hover:bg-foreground/5 active:scale-90"
              >
                {e}
              </button>
            ))}
          </div>
        )}

        <div className="overflow-hidden rounded-xl bg-background ring-1 ring-border transition-shadow duration-150 focus-within:ring-rival-blue">
          {replyTo && (
            <div className="flex items-center gap-2 border-b border-border px-3 py-1.5 text-[13px] [animation:fade-in-up_200ms_ease-out_both]">
              <span className="text-muted">Replying to</span>
              <span className="min-w-0 truncate font-semibold" style={{ color: replyTo.userId && sides[replyTo.userId] ? (sides[replyTo.userId] === "yes" ? "var(--rival-blue)" : "var(--rival-red)") : "var(--foreground)" }}>
                @{replyTo.authorName ?? "Rival"}
              </span>
              <button type="button" onClick={() => setReplyTo(null)} aria-label="Cancel reply" className="ml-auto flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-muted hover:text-foreground">
                <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden>
                  <path d="M2 2l6 6M8 2 2 8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                </svg>
              </button>
            </div>
          )}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              send();
            }}
            className="flex items-center gap-1 px-1.5"
          >
            <button
              type="button"
              onClick={() => setTray((t) => (t === "quick" ? null : "quick"))}
              aria-label="Quick shouts"
              aria-pressed={tray === "quick"}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-[transform,color,background-color] duration-150 active:scale-90"
              style={{ color: tray === "quick" ? "var(--background)" : "var(--muted)", background: tray === "quick" ? "var(--foreground)" : "color-mix(in srgb, var(--foreground) 8%, transparent)" }}
            >
              <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden className="transition-transform duration-200" style={{ transform: tray === "quick" ? "rotate(45deg)" : undefined }}>
                <path d="M7 2v10M2 7h10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </button>
            <input
              ref={inputRef}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder={currentUser ? (replyTo ? `Reply to @${replyTo.authorName ?? "Rival"}` : "Message the room") : "Sign in to talk…"}
              onFocus={() => !currentUser && openAuthModal({ next: `/rooms/${roomId}` })}
              maxLength={280}
              enterKeyHint="send"
              className="h-11 min-w-0 flex-1 bg-transparent px-1.5 text-base text-foreground placeholder:text-muted focus:outline-none"
            />
            <button
              type="button"
              onClick={() => setTray((t) => (t === "emoji" ? null : "emoji"))}
              aria-label="Emoji"
              aria-pressed={tray === "emoji"}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-colors duration-150"
              style={{ color: tray === "emoji" ? "#f5c542" : "var(--muted)" }}
            >
              <svg width="20" height="20" viewBox="0 0 20 20" aria-hidden>
                <circle cx="10" cy="10" r="7.5" stroke="currentColor" strokeWidth="1.6" fill="none" />
                <circle cx="7.4" cy="8.4" r="1.05" fill="currentColor" />
                <circle cx="12.6" cy="8.4" r="1.05" fill="currentColor" />
                <path d="M6.8 12c.8 1.2 1.9 1.8 3.2 1.8s2.4-.6 3.2-1.8" stroke="currentColor" strokeWidth="1.6" fill="none" strokeLinecap="round" />
              </svg>
            </button>
            {draft.trim().length > 0 && (
              <button
                type="submit"
                aria-label="Send"
                disabled={sending}
                className="enter-pop flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-rival-blue text-white transition-[transform,opacity] duration-150 ease-out active:scale-90 disabled:opacity-50"
              >
                <svg width="16" height="16" viewBox="0 0 18 18" aria-hidden>
                  <path d="M3 9h11M9.5 4.5 14 9l-4.5 4.5" stroke="currentColor" strokeWidth="2.2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            )}
          </form>
        </div>
      </div>
    </section>
  );
}
