"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { reportContent } from "@/lib/report";
import { GifPicker } from "@/components/gif-picker";
import { klipyCustomerId, klipyShared, type KlipyGif } from "@/lib/klipy";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import {
  MESSAGE_UUID_RE,
  mapMessageRow,
  REACTION_EMOJI,
  type ChatAttachment,
  type DisplayChatMessage,
  type MessageReaction,
  type MessageRow,
} from "@/lib/supabase/message-mapper";
import { encodeMoment, matchMoment, takeoverMoment, type MomentContext } from "@/lib/match-event-label";
import type { NflClock } from "@/lib/nfl-clock";
import { openAuthModal } from "@/lib/auth-modal-store";
import { addRaceMessage, initRace, useRoomRace } from "@/lib/room-energy";
import type { RaceState } from "@/lib/room-race";
import type { EntrySide } from "@/lib/types";
import { useCurrentUser } from "./current-user-provider";
import { ChatThread, type ReactionMap } from "./chat-thread";
import { RivalCharacter } from "./rival-character";
import { prepareChatPhoto, uploadChatPhoto } from "@/lib/cloudinary";
import { REACTION_EVENT } from "./room/room-stage";
import { PressureTicker } from "./room/pressure-ticker";
import { announceChatActivity } from "./room/room-tabs-event";
import { haptic } from "@/lib/haptics";
import { openStakeSheet } from "@/lib/stake-sheet-store";
import { SidePill } from "./ui/controls";

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
// Room for a proper rant, short of a wall that buries the live chat. Matches the database check.
const MAX_MESSAGE = 1000;
// The box grows with the text up to about five lines, then scrolls inside.
const BOX_MAX_PX = 144;
const tidy = (text: string) => text.replace(/\n{3,}/g, "\n\n").trim();
const KEEP = 500;
// A live broadcast is the fast lane; the saved row is the record. One whose
// row never shows up (a failed save, or a spoof) is dropped after this long.
const CONFIRM_MS = 15_000;
// A photo still uploading gets longer before it must be saved.
const PHOTO_CONFIRM_MS = 90_000;
const TYPING_SEND_MS = 2_500;
const TYPING_SHOW_MS = 4_000;
const SELECT_MESSAGE = "id, room_id, user_id, body, created_at, reply_to, attachment, author:profiles!messages_user_id_fkey(display_name, avatar_url)";
type LiveReaction = MessageReaction & { on: boolean };
type Typing = { userId: string; name: string; avatarUrl: string | null };

/** A dropped connection, as opposed to the database saying no. */
const isNetworkError = (e: { code?: string; message?: string }) => !e.code || /fetch|network|timeout/i.test(e.message ?? "");

/** Saves a row, retrying quietly (three tries over ~6 s) if the connection drops. */
async function saveWithRetry(insert: () => PromiseLike<{ error: { code?: string; message?: string } | null }>): Promise<{ code?: string; message?: string } | null> {
  for (let attempt = 0; ; attempt++) {
    const { error } = await insert();
    if (!error || !isNetworkError(error) || attempt >= 2) return error;
    await new Promise((r) => setTimeout(r, 1000 * (attempt + 1) * 1.5));
  }
}

/** The stored part of an attachment (no local preview or progress). */
const storedAttachment = (a: ChatAttachment): ChatAttachment => ({ type: a.type, ref: a.ref, w: a.w, h: a.h, ...(a.lqip ? { lqip: a.lqip } : {}) });
const HEAT_WINDOW_MS = 120_000;
const QUICK_COOLDOWN_MS = 1200;

/** One tap, no typing: the things people actually shout at a screen. */
// One-tap shouts, in the sport's own language.
const QUICK = { soccer: ["🔥", "😂", "😤", "👀", "⚽ GOAL!", "Told you 😏", "🧢 Cap", "Robbed 😭"], nfl: ["🔥", "😂", "😤", "👀", "🏈 TOUCHDOWN!", "Told you 😏", "🧢 Cap", "Robbed 😭"] };

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
  sport = "soccer",
  nflClock,
  position,
  readOnly,
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
  /** Labels match moments in the sport's own language. */
  sport?: "soccer" | "nfl";
  /** NFL: the quarter state where the server's initial feed left off, carried on by live events. */
  nflClock?: NflClock;
  /** Your stake and what it'd win, docked above the input (room/your-position.tsx). */
  position?: React.ReactNode;
  /** Spectators read along but can't post or react; `joinable` while sides are still open. */
  readOnly?: { joinable: boolean };
}) {
  const currentUser = useCurrentUser();
  const isRealRoom = MESSAGE_UUID_RE.test(roomId);
  const [items, setItems] = useState<DisplayChatMessage[]>(initialMessages);
  // The server sends the latest page; there may be more before it.
  const [hasEarlier, setHasEarlier] = useState(initialMessages.filter((m) => m.kind === "message").length >= HISTORY_PAGE);
  const push = useCallback((m: DisplayChatMessage) => {
    setItems((list) => (list.some((x) => x.id === m.id) ? list : [...list, m].slice(-KEEP)));
  }, []);
  const itemsRef = useRef(items);
  useEffect(() => {
    itemsRef.current = items;
  }, [items]);
  const [draft, setDraft] = useState("");
  const [replyTo, setReplyTo] = useState<DisplayChatMessage | null>(null);
  // "auto": the shouts row is open on phones and folded on desktop, where the
  // keyboard is right there and the thread needs the height. Pure CSS, so the
  // server render matches; the first tap turns it into a real choice.
  const [tray, setTray] = useState<"auto" | "quick" | "emoji" | "gif" | null>("auto");
  const quickOpen = tray === "quick" || tray === "auto";
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Grow the box to fit what's typed (and shrink back after sending).
  useLayoutEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, BOX_MAX_PX)}px`;
  }, [draft]);
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
  const [watching, setWatching] = useState(0);
  // The room's live channel (for sending), what arrived live but isn't saved
  // yet, and who's typing.
  const channelRef = useRef<RealtimeChannel | null>(null);
  const liveIds = useRef(new Set<string>());
  // id → deadline by which its saved row must have arrived.
  const unconfirmed = useRef(new Map<string, number>());
  const [typers, setTypers] = useState<Record<string, { name: string; avatarUrl: string | null; until: number }>>({});
  const [notice, setNotice] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const lastTypingSent = useRef(0);
  const lastQuick = useRef(0);
  // Latest sides map for the realtime handler (entries arrive while we listen).
  const sidesRef = useRef(sides);
  useEffect(() => {
    sidesRef.current = sides;
  }, [sides]);
  // The NFL clock is one running state for the life of the room page: seeded
  // from where the server's feed left off, advanced by each live event.
  // (One object for the page's life, mutated in place by matchMoment — never re-set.)
  const [nflState] = useState<NflClock | undefined>(() => (nflClock ? { ...nflClock } : undefined));
  const momentCtx = useRef<MomentContext>({ names: players, teams, sport, nfl: nflState });
  useEffect(() => {
    momentCtx.current = { names: players, teams, sport, nfl: nflState };
  }, [players, teams, sport, nflState]);
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

  // Anything that arrived live: shown at once. Its saved row confirms it later.
  const receiveLive = useCallback(
    (m: DisplayChatMessage) => {
      if (liveIds.current.has(m.id)) return;
      liveIds.current.add(m.id);
      unconfirmed.current.set(m.id, Date.now() + (m.attachment && !m.attachment.ref ? PHOTO_CONFIRM_MS : CONFIRM_MS));
      if (m.userId && m.authorName) authorCache.current.set(m.userId, { display_name: m.authorName, avatar_url: m.authorAvatarUrl ?? null });
      push(m);
      announceChatActivity({ kind: "message" });
      floatReaction(m.body);
      // Their message landed: they're no longer "typing".
      const uid = m.userId;
      if (uid)
        setTypers((prev) => {
          if (!(uid in prev)) return prev;
          const next = { ...prev };
          delete next[uid];
          return next;
        });
    },
    [push],
  );

  // After a dropped connection (or coming back to the tab), fetch whatever
  // was said meanwhile, and the reactions as they stand.
  const catchUp = useCallback(async () => {
    const supabase = createClient();
    const latest = [...itemsRef.current].reverse().find((m) => m.kind === "message");
    let q = supabase.from("messages").select(SELECT_MESSAGE).eq("room_id", roomId).order("created_at", { ascending: true }).limit(100);
    if (latest) q = q.gt("created_at", latest.createdAt);
    const [{ data: msgs }, { data: reacts }] = await Promise.all([q, supabase.from("message_reactions").select("message_id, user_id, emoji").eq("room_id", roomId).limit(5000)]);
    for (const r of (msgs ?? []) as unknown as (MessageRow & { author: { display_name: string; avatar_url: string | null } | null })[]) {
      liveIds.current.add(r.id);
      unconfirmed.current.delete(r.id);
      push(mapMessageRow(r, r.author ?? undefined));
    }
    if (reacts) {
      const map: ReactionMap = {};
      for (const r of reacts) ((map[r.message_id as string] ??= {})[r.emoji as string] ??= []).push(r.user_id as string);
      setReactions(map);
    }
  }, [push, roomId]);

  useEffect(() => {
    if (!isRealRoom) return;
    const supabase = createClient();
    const presenceKey = currentUser?.id ?? `guest-${Math.random().toString(36).slice(2)}`;

    // The room's private live channel (policies: 20260925170000_room_realtime_
    // channels.sql). Messages, reactions and typing go phone → Supabase →
    // every phone in the room, ~50–150 ms; the database save runs behind.
    const channel = supabase
      .channel(`room:${roomId}`, { config: { private: true, broadcast: { self: false }, presence: { key: presenceKey } } })
      .on("broadcast", { event: "msg" }, ({ payload }) => receiveLive(payload as DisplayChatMessage))
      .on("broadcast", { event: "react" }, ({ payload }) => {
        const r = payload as LiveReaction;
        applyReaction(r, r.on);
      })
      .on("broadcast", { event: "typing" }, ({ payload }) => {
        const t = payload as Typing;
        if (t.userId === currentUser?.id) return;
        setTypers((prev) => ({ ...prev, [t.userId]: { name: t.name, avatarUrl: t.avatarUrl ?? null, until: Date.now() + TYPING_SHOW_MS } }));
      })
      // A photo finished uploading: swap the blurred preview for the real one.
      .on("broadcast", { event: "msg-update" }, ({ payload }) => {
        const u = payload as { id: string; attachment: ChatAttachment };
        setItems((list) => list.map((m) => (m.id === u.id ? { ...m, attachment: u.attachment } : m)));
        if (unconfirmed.current.has(u.id)) unconfirmed.current.set(u.id, Date.now() + CONFIRM_MS);
      })
      // The saved record. Confirms what came live; delivers anything the live
      // lane missed; and feeds the stadium race at the server's own time.
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages", filter: `room_id=eq.${roomId}` }, async (payload) => {
        const row = payload.new as MessageRow;
        unconfirmed.current.delete(row.id);
        const side = sidesRef.current[row.user_id];
        if (side) addRaceMessage(row.user_id, side, +new Date(row.created_at));
        if (liveIds.current.has(row.id)) {
          // Already showing from the live lane — make sure it has the final photo.
          if (row.attachment) setItems((list) => list.map((m) => (m.id === row.id && !m.attachment?.local ? { ...m, attachment: row.attachment } : m)));
          return;
        }
        liveIds.current.add(row.id);
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

    let joinedOnce = false;
    channel.subscribe((status) => {
      if (status !== "SUBSCRIBED") return;
      void channel.track({ at: Date.now() });
      // A re-join means we were away: catch up on what was said.
      if (joinedOnce) void catchUp();
      joinedOnce = true;
    });
    channelRef.current = channel;

    const onVisible = () => {
      if (document.visibilityState === "visible") void catchUp();
    };
    document.addEventListener("visibilitychange", onVisible);

    // Drop live messages whose saved row never arrived.
    const sweep = window.setInterval(() => {
      const t = Date.now();
      const stale = [...unconfirmed.current].filter(([, deadline]) => deadline < t).map(([id]) => id);
      if (stale.length === 0) return;
      for (const id of stale) unconfirmed.current.delete(id);
      setItems((list) => list.filter((m) => !stale.includes(m.id)));
    }, 4_000);

    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      window.clearInterval(sweep);
      channelRef.current = null;
      void supabase.removeChannel(channel);
    };
    // push/authorCache are stable; the subscription only depends on the room.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId, matchId, isRealRoom, currentUser?.id]);

  // Typing indicators fade on their own.
  useEffect(() => {
    if (Object.keys(typers).length === 0) return;
    const t = window.setInterval(() => {
      const now = Date.now();
      setTypers((prev) => {
        const next = Object.fromEntries(Object.entries(prev).filter(([, v]) => v.until > now));
        return Object.keys(next).length === Object.keys(prev).length ? prev : next;
      });
    }, 1_000);
    return () => window.clearInterval(t);
  }, [typers]);

  const loadEarlier = useCallback(async () => {
    const oldest = items.find((m) => m.kind === "message");
    if (!oldest) {
      setHasEarlier(false);
      return;
    }
    const { data } = await createClient()
      .from("messages")
      .select(SELECT_MESSAGE)
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

  // Instant send, the way WhatsApp and Discord do it: the message gets its id
  // here, appears for you at once, goes live to the room over the channel,
  // and is saved behind. If the save is refused it quietly leaves the chat
  // (and the text goes back in the box) — for you, and for everyone after
  // the confirm window.
  function post(body: string, restoreDraft: boolean, reply: DisplayChatMessage | null = null, attachment: ChatAttachment | null = null) {
    if (!currentUser) {
      openAuthModal({ next: `/rooms/${roomId}` });
      return;
    }
    const message: DisplayChatMessage = {
      id: crypto.randomUUID(),
      roomId,
      userId: currentUser.id,
      kind: "message",
      body,
      createdAt: new Date().toISOString(),
      authorName: currentUser.displayName,
      authorAvatarUrl: currentUser.avatarUrl ?? null,
      replyTo: reply?.id ?? null,
      attachment,
    };
    liveIds.current.add(message.id);
    push(message);
    floatReaction(body);
    void channelRef.current?.send({ type: "broadcast", event: "msg", payload: message });
    lastTypingSent.current = 0;
    const uid = currentUser.id;
    void saveWithRetry(() => createClient().from("messages").insert({ id: message.id, room_id: roomId, user_id: uid, body, reply_to: reply?.id ?? null, attachment })).then((error) => {
      if (!error) return;
      setItems((list) => list.filter((m) => m.id !== message.id));
      if (restoreDraft) {
        setDraft(body); // refused — put it back so nothing's lost
        setReplyTo(reply);
      }
    });
  }

  // GIFs: nothing to upload (Klipy hosts them), so they go exactly like text.
  function sendGif(gif: KlipyGif, q: string) {
    if (!isRealRoom) return;
    const reply = replyTo;
    if (currentUser) {
      setReplyTo(null);
      setTray(null);
      void klipyCustomerId(currentUser.id).then((id) => klipyShared(gif.slug, id, q));
    }
    post("", false, reply, { type: "gif", ref: gif.slug, url: gif.video.url, w: gif.video.w, h: gif.video.h, lqip: gif.lqip });
  }

  // Photos: shrunk on the phone, shown to you at once (sharp, with an upload
  // ring) and to the room as a blurred preview the same instant; the real
  // image swaps in for everyone when the upload lands, then it's saved.
  async function sendPhoto(file: File) {
    if (!currentUser) {
      openAuthModal({ next: `/rooms/${roomId}` });
      return;
    }
    if (!isRealRoom) return;
    let photo;
    try {
      photo = await prepareChatPhoto(file);
    } catch (e) {
      flash(e instanceof Error ? e.message : "Couldn't read that image.");
      return;
    }
    const caption = tidy(draft).slice(0, MAX_MESSAGE);
    const reply = replyTo;
    setDraft("");
    setReplyTo(null);
    const id = crypto.randomUUID();
    const base: ChatAttachment = { type: "image", ref: "", w: photo.w, h: photo.h, lqip: photo.lqip };
    const message: DisplayChatMessage = {
      id,
      roomId,
      userId: currentUser.id,
      kind: "message",
      body: caption,
      createdAt: new Date().toISOString(),
      authorName: currentUser.displayName,
      authorAvatarUrl: currentUser.avatarUrl ?? null,
      replyTo: reply?.id ?? null,
      attachment: { ...base, local: photo.previewUrl, progress: 0 },
    };
    liveIds.current.add(id);
    push(message);
    void channelRef.current?.send({ type: "broadcast", event: "msg", payload: { ...message, attachment: base } });
    const setAttachment = (a: ChatAttachment) => setItems((list) => list.map((m) => (m.id === id ? { ...m, attachment: a } : m)));
    const fail = (why: string) => {
      setItems((list) => list.filter((m) => m.id !== id));
      if (caption) setDraft(caption);
      setReplyTo(reply);
      flash(why);
      URL.revokeObjectURL(photo.previewUrl);
    };
    let ref: string;
    try {
      ref = await uploadChatPhoto(photo.blob, `chat/${roomId}/${id}`, (progress) => setAttachment({ ...base, local: photo.previewUrl, progress }));
    } catch (e) {
      fail(e instanceof Error ? e.message : "Upload failed — try again.");
      return;
    }
    const done: ChatAttachment = { ...base, ref };
    setAttachment({ ...done, local: photo.previewUrl, progress: 1 });
    void channelRef.current?.send({ type: "broadcast", event: "msg-update", payload: { id, attachment: done } });
    const uid = currentUser.id;
    const error = await saveWithRetry(() =>
      createClient().from("messages").insert({ id, room_id: roomId, user_id: uid, body: caption, reply_to: reply?.id ?? null, attachment: storedAttachment(done) }),
    );
    if (error) fail(error.message?.includes("photo_rate_limit") ? "Easy — that's 5 photos in a minute. Try again shortly." : "Couldn't send that photo.");
  }

  function flash(text: string) {
    setNotice(text);
    window.setTimeout(() => setNotice((n) => (n === text ? null : n)), 3500);
  }

  // "Tunde is typing…" — at most one ping every couple of seconds.
  function typing() {
    if (readOnly) return;
    if (!currentUser || !isRealRoom) return;
    const t = clock();
    if (t - lastTypingSent.current < TYPING_SEND_MS) return;
    lastTypingSent.current = t;
    void channelRef.current?.send({
      type: "broadcast",
      event: "typing",
      payload: { userId: currentUser.id, name: currentUser.displayName, avatarUrl: currentUser.avatarUrl ?? null } satisfies Typing,
    });
  }

  function send() {
    const body = tidy(draft);
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
    haptic("tick");
    void channelRef.current?.send({ type: "broadcast", event: "react", payload: { ...r, on } satisfies LiveReaction });
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
    haptic("tick");
    post(body, false);
  }

  return (
    <section
      className="flex h-full min-h-0 flex-col overflow-hidden rounded-card bg-surface edge"
      onDragOver={(e) => {
        if ([...e.dataTransfer.items].some((i) => i.type.startsWith("image/"))) e.preventDefault();
      }}
      onDrop={(e) => {
        const file = [...e.dataTransfer.files].find((f) => f.type.startsWith("image/"));
        if (!file) return;
        e.preventDefault();
        void sendPhoto(file);
      }}
    >
      <div className="relative flex shrink-0 items-center justify-between gap-3 border-b border-line px-4 py-3">
        {matchId && matchTeams && <PressureTicker matchId={matchId} homeTeam={matchTeams.home} awayTeam={matchTeams.away} />}
        <p className="text-body-lg font-display font-bold text-foreground">The crowd</p>
        <div className="flex items-center gap-3 text-caption tabular-nums text-secondary">
          {watching > 0 && (
            <span className="flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-money" />
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
        onReact={readOnly ? undefined : react}
        onReply={readOnly ? undefined : reply}
        onReport={(m, reason) => {
          setItems((cur) => cur.filter((x) => x.id !== m.id));
          void reportContent("message", m.id, reason);
        }}
        empty={
          <p className="px-6 text-center text-body text-secondary">
            {readOnly ? "Quiet so far." : <>Quiet so far. Say something — the room&rsquo;s listening.</>}
          </p>
        }
      />

      {readOnly ? (
        // Spectators watch the room talk; taking a side is what gets you a voice.
        <div className="flex shrink-0 items-center gap-3 border-t border-line px-4 py-3">
          <p className="min-w-0 flex-1 text-label text-secondary">
            <span className="font-semibold text-foreground">You&rsquo;re watching.</span>{" "}
            {readOnly.joinable ? "Take a side to join the chat." : "Only rivals in this room can chat."}
          </p>
          {/* Phones open the stake sheet; on desktop the stake panel is already beside the chat. */}
          {readOnly.joinable && (
            <div className="flex shrink-0 gap-2 md:hidden">
              <SidePill side="yes" size="sm" role="button" aria-checked={undefined} onClick={() => openStakeSheet("yes")} />
              <SidePill side="no" size="sm" role="button" aria-checked={undefined} onClick={() => openStakeSheet("no")} />
            </div>
          )}
        </div>
      ) : (

      <div className="shrink-0 border-t border-line px-3 pb-3 pt-2">
        {position}
        {/* Trays: one-tap shouts (open by default on phones — joining in
            shouldn't need typing), or emoji for your message. */}
        {quickOpen && (
          <div className={`no-scrollbar -mx-3 mb-2 flex gap-1.5 overflow-x-auto px-3 ${tray === "auto" ? "lg:hidden" : ""}`}>
            {QUICK[sport].map((q) => (
              <button
                key={q}
                type="button"
                onClick={() => quick(q)}
                className="h-8 shrink-0 rounded-full bg-background px-3 text-label text-foreground edge-strong transition-transform duration-100 ease-out active:scale-90"
              >
                {q}
              </button>
            ))}
          </div>
        )}
        {(tray === "emoji" || tray === "gif") && (
          <div className="mb-2 flex gap-1" role="tablist">
            {(["emoji", "gif"] as const).map((t) => (
              <button
                key={t}
                type="button"
                role="tab"
                aria-selected={tray === t}
                onClick={() => setTray(t)}
                className={`h-7 rounded-full px-3 text-caption font-bold transition-colors duration-100 ${tray === t ? "bg-overlay-3 text-foreground" : "text-secondary"}`}
              >
                {t === "emoji" ? "Emoji" : "GIFs"}
              </button>
            ))}
          </div>
        )}
        {tray === "gif" && (
          <div className="mb-2">
            <GifPicker userId={currentUser?.id} onPick={sendGif} />
          </div>
        )}
        {tray === "emoji" && (
          <div className="mb-2 grid grid-cols-10 gap-1">
            {REACTION_EMOJI.map((e) => (
              <button
                key={e}
                type="button"
                onClick={() => {
                  setDraft((d) => (d + e).slice(0, MAX_MESSAGE));
                  inputRef.current?.focus();
                }}
                className="flex h-9 items-center justify-center rounded-control text-xl transition-transform duration-100 hover:bg-overlay-1 active:scale-90"
              >
                {e}
              </button>
            ))}
          </div>
        )}

        {notice && <p className="mb-1.5 px-1 text-caption font-semibold text-no-ink [animation:fade-in-up_180ms_ease-out_both]">{notice}</p>}
        {Object.keys(typers).length > 0 && (
          <p className="mb-1.5 flex items-center gap-2 px-1 text-caption text-secondary [animation:fade-in-up_180ms_ease-out_both]" aria-live="polite">
            <span className="flex -space-x-1.5" aria-hidden>
              {Object.values(typers)
                .slice(0, 3)
                .map((t, i) => (
                  <span key={i} className="rounded-full ring-2 ring-surface">
                    <RivalCharacter name={t.name} imageUrl={t.avatarUrl} size={16} />
                  </span>
                ))}
            </span>
            <span className="min-w-0 truncate font-semibold text-foreground/80">{typingLabel(Object.values(typers).map((t) => t.name))}</span>
            <span className="flex shrink-0 gap-0.5" aria-hidden>
              {[0, 1, 2].map((i) => (
                <span key={i} className="typing-dot h-1 w-1 rounded-full bg-secondary" style={{ animationDelay: `${i * 150}ms` }} />
              ))}
            </span>
          </p>
        )}
        <div className="overflow-hidden rounded-control border border-line-strong bg-background transition-colors duration-150 focus-within:border-yes">
          {replyTo && (
            <div className="flex items-center gap-2 border-b border-line px-3 py-1.5 text-label [animation:fade-in-up_200ms_ease-out_both]">
              <span className="text-secondary">Replying to</span>
              <span className="min-w-0 truncate font-semibold" style={{ color: replyTo.userId && sides[replyTo.userId] ? (sides[replyTo.userId] === "yes" ? "var(--yes-ink)" : "var(--no-ink)") : "var(--foreground)" }}>
                @{replyTo.authorName ?? "Rival"}
              </span>
              <button type="button" onClick={() => setReplyTo(null)} aria-label="Cancel reply" className="relative ml-auto flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-secondary before:absolute before:-inset-2 hover:text-foreground">
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
            className="flex items-end gap-1 px-1.5 [&>button]:mb-1"
          >
            <button
              type="button"
              onClick={() =>
                setTray((t) => {
                  const open = t === "quick" || (t === "auto" && !window.matchMedia("(min-width: 1024px)").matches);
                  return open ? null : "quick";
                })
              }
              aria-label="Quick shouts"
              aria-pressed={quickOpen}
              className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-[transform,color,background-color] duration-100 active:scale-90 ${
                tray === "quick" ? "bg-foreground text-background" : tray === "auto" ? "bg-foreground text-background lg:bg-overlay-2 lg:text-secondary" : "bg-overlay-2 text-secondary"
              }`}
            >
              <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden className={`transition-transform duration-200 ${tray === "quick" ? "rotate-45" : tray === "auto" ? "rotate-45 lg:rotate-0" : ""}`}>
                <path d="M7 2v10M2 7h10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </button>
            <button
              type="button"
              onClick={() => (currentUser ? fileRef.current?.click() : openAuthModal({ next: `/rooms/${roomId}` }))}
              aria-label="Send a photo"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-secondary transition-colors duration-100 hover:text-foreground active:scale-90"
            >
              <svg width="20" height="20" viewBox="0 0 20 20" aria-hidden>
                <rect x="2.5" y="4" width="15" height="12" rx="2.5" stroke="currentColor" strokeWidth="1.6" fill="none" />
                <circle cx="7.3" cy="8.3" r="1.4" fill="currentColor" />
                <path d="m3.5 14.5 4-4 3 3 2.2-2.2 3.8 3.7" stroke="currentColor" strokeWidth="1.6" fill="none" strokeLinejoin="round" strokeLinecap="round" />
              </svg>
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                e.target.value = "";
                if (file) void sendPhoto(file);
              }}
            />
            <textarea
              rows={1}
              onKeyDown={(e) => {
                // Desktop: Enter sends, Shift+Enter is a new line. Phones: Enter is a
                // new line and the send button sends (as in WhatsApp).
                if (e.key !== "Enter" || e.shiftKey || e.nativeEvent.isComposing) return;
                if (window.matchMedia("(pointer: coarse)").matches) return;
                e.preventDefault();
                send();
              }}
              onPaste={(e) => {
                const file = [...e.clipboardData.files].find((f) => f.type.startsWith("image/"));
                if (!file) return;
                e.preventDefault();
                void sendPhoto(file);
              }}
              ref={inputRef}
              value={draft}
              onChange={(e) => {
                setDraft(e.target.value);
                if (e.target.value.trim()) typing();
              }}
              placeholder={currentUser ? (replyTo ? `Reply to @${replyTo.authorName ?? "Rival"}` : "Message the room") : "Sign in to talk…"}
              onFocus={() => !currentUser && openAuthModal({ next: `/rooms/${roomId}` })}
              maxLength={MAX_MESSAGE}
              className="block min-h-11 min-w-0 flex-1 resize-none overflow-y-auto bg-transparent px-1.5 py-2.5 text-body-lg leading-6 text-foreground placeholder:text-tertiary focus:outline-none"
            />
            <button
              type="button"
              onClick={() => setTray((t) => (t === "emoji" || t === "gif" ? null : "emoji"))}
              aria-label="Emoji and GIFs"
              aria-pressed={tray === "emoji" || tray === "gif"}
              className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-colors duration-100 ${tray === "emoji" || tray === "gif" ? "text-card-yellow" : "text-secondary"}`}
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
                className="enter-pop flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-yes text-white transition-[transform,opacity] duration-100 ease-out active:scale-90 disabled:opacity-50"
              >
                <svg width="16" height="16" viewBox="0 0 18 18" aria-hidden>
                  <path d="M3 9h11M9.5 4.5 14 9l-4.5 4.5" stroke="currentColor" strokeWidth="2.2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            )}
          </form>
          {draft.length > MAX_MESSAGE - 100 && (
            <p className={`px-4 pb-1 text-right text-caption font-semibold tabular-nums ${draft.length >= MAX_MESSAGE ? "text-no-ink" : "text-secondary"}`}>
              {MAX_MESSAGE - draft.length} left
            </p>
          )}
        </div>
      </div>
      )}
    </section>
  );
}

function typingLabel(names: string[]): string {
  if (names.length === 1) return `${names[0]} is typing`;
  if (names.length === 2) return `${names[0]} and ${names[1]} are typing`;
  const others = names.length - 2;
  return `${names[0]}, ${names[1]} and ${others} ${others === 1 ? "other" : "others"} are typing`;
}
