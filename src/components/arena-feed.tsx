"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useCurrentUser } from "./current-user-provider";
import { RivalCharacter } from "./rival-character";
import { TeamCrest } from "./team-crest";
import { openAuthModal } from "@/lib/auth-modal-store";
import { useRealMatches } from "@/lib/use-real-matches";
import { ARENA_POST_FAILED, ARENA_POSTED, openArenaComposer, setComposerContext, type FailedDetail, type PostedDetail } from "@/lib/arena/composer-store";
import { ArenaCard, type CardActions } from "./arena/arena-cards";
import { ArenaMatchRooms } from "./arena/arena-match-rooms";
import { deletePost, fetchFeed, fetchMatchRooms, fetchPlayerNames, setReaction, type FeedScope } from "@/lib/arena/data";
import {
  appendPage,
  cursorOf,
  newerThan,
  newItemsLabel,
  reactionTarget,
  toggleReaction,
  type ArenaEmoji,
  type ArenaItem,
  type MatchRoom,
  type MomentItem,
  type PostItem,
} from "@/lib/arena/model";

const PAGE = 20;
const HEAD_CHECK_MS = 45_000;
const PRESENCE_MIN = 3; // "N here now" only when it's a real crowd

interface Face {
  name: string;
  avatar: string | null;
}

// The Arena's feed: everything real, newest first — big match moments,
// takes, calls, receipts, rooms heating up. New things don't shove the
// list around; they wait behind a "3 new · 1 goal" pill. It ends ("caught
// up") rather than looping. See docs/plans/arena-redesign.md.
export function ArenaFeed() {
  const me = useCurrentUser();
  const viewerId = me?.id ?? null;
  const { matches } = useRealMatches();
  const [scope, setScope] = useState<FeedScope>("global");
  const [matchId, setMatchId] = useState<string | null>(null);
  const [items, setItems] = useState<ArenaItem[]>([]);
  const [fresh, setFresh] = useState<ArenaItem[]>([]);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [done, setDone] = useState(false);
  const [names, setNames] = useState<Record<string, Record<number, string>>>({});
  const [matchRooms, setMatchRooms] = useState<Record<string, MatchRoom[]>>({});
  const [roomsFor, setRoomsFor] = useState<MomentItem | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [now] = useState(() => Date.now());
  const [here, setHere] = useState<{ count: number; faces: Face[] }>({ count: 0, faces: [] });
  const itemsRef = useRef(items);
  const sentinel = useRef<HTMLDivElement>(null);
  const loadingMore = useRef(false);
  const request = useRef(0);

  useEffect(() => {
    itemsRef.current = items;
  }, [items]);

  // First page for this scope / match.
  useEffect(() => {
    const n = ++request.current;
    void fetchFeed({ scope, matchId, limit: PAGE })
      .then((page) => {
        if (n !== request.current) return;
        setItems(page);
        setFresh([]);
        setDone(page.length < PAGE);
        setState("ready");
      })
      .catch(() => n === request.current && setState("error"));
  }, [scope, matchId, viewerId]);

  // Scorer names for whatever moments are on screen.
  useEffect(() => {
    const ids = [...new Set(items.filter((i): i is MomentItem => i.kind === "moment").map((i) => i.match.id))].filter((id) => !(id in names));
    if (ids.length === 0) return;
    void fetchPlayerNames(ids).then((n) => setNames((prev) => ({ ...prev, ...n })));
  }, [items, names]);

  // Rooms on those matches, so a moment can say which rooms it just decided.
  useEffect(() => {
    const ids = [...new Set(items.filter((i): i is MomentItem => i.kind === "moment" && i.rooms > 0).map((i) => i.match.id))].filter((id) => !(id in matchRooms));
    if (ids.length === 0) return;
    void fetchMatchRooms(ids).then((r) => setMatchRooms((prev) => ({ ...prev, ...r })));
  }, [items, matchRooms]);

  // Anything new at the top? (Realtime nudges this; a slow timer backs it up
  // for things realtime can't see, like other people's stakes.)
  const checkHead = useCallback(async () => {
    try {
      const head = await fetchFeed({ scope, matchId, limit: PAGE });
      const news = newerThan(itemsRef.current, head).filter((i) => +new Date(i.at) >= +new Date(itemsRef.current[0]?.at ?? 0));
      if (news.length > 0) setFresh(news);
    } catch {}
  }, [scope, matchId]);

  useEffect(() => {
    const t = setInterval(() => document.visibilityState === "visible" && void checkHead(), HEAD_CHECK_MS);
    return () => clearInterval(t);
  }, [checkHead]);

  // One channel: real presence ("N here now") + a nudge when something lands.
  useEffect(() => {
    const supabase = createClient();
    const key = viewerId ?? `guest-${Math.random().toString(36).slice(2)}`;
    let nudge: ReturnType<typeof setTimeout> | null = null;
    const soon = () => {
      if (nudge) clearTimeout(nudge);
      nudge = setTimeout(() => void checkHead(), 1200);
    };
    const channel = supabase
      .channel("arena", { config: { private: true, presence: { key } } })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "posts" }, soon)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "match_events", filter: "action=in.(goal,game_finalised,touchdown,field_goal)" }, soon)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "rooms", filter: "status=eq.settled" }, soon)
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState<{ name?: string; avatar?: string | null }>();
        const faces: Face[] = [];
        for (const metas of Object.values(state)) {
          const m = metas[0];
          if (m?.name) faces.push({ name: m.name, avatar: m.avatar ?? null });
        }
        setHere({ count: Object.keys(state).length, faces });
      });
    channel.subscribe((status) => {
      if (status === "SUBSCRIBED") void channel.track(me ? { name: me.displayName, avatar: me.avatarUrl } : {});
    });
    return () => {
      if (nudge) clearTimeout(nudge);
      void supabase.removeChannel(channel);
    };
  }, [viewerId, me, checkHead]);

  // Infinite scroll, to a real end.
  useEffect(() => {
    const el = sentinel.current;
    if (!el || done || state !== "ready") return;
    const io = new IntersectionObserver(
      async ([e]) => {
        if (!e?.isIntersecting || loadingMore.current) return;
        const before = cursorOf(itemsRef.current);
        if (!before) return;
        loadingMore.current = true;
        const n = request.current;
        try {
          const page = await fetchFeed({ scope, matchId, before, limit: PAGE });
          if (n !== request.current) return;
          setItems((cur) => appendPage(cur, page));
          if (page.length < PAGE) setDone(true);
        } finally {
          loadingMore.current = false;
        }
      },
      { rootMargin: "600px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [done, state, scope, matchId, items.length]);

  // The composer is app-wide (arena-composer-host.tsx). From here it opens
  // already about the match you're filtered to, or the moment you tapped.
  const openComposer = useCallback(
    (moment: MomentItem | null = null) => {
      if (!me) {
        openAuthModal({ next: "/arena" });
        return;
      }
      openArenaComposer(moment ? { moment } : {});
    },
    [me],
  );
  useEffect(() => {
    setComposerContext({ matchId });
    return () => setComposerContext({ matchId: null });
  }, [matchId]);
  // What gets posted — from here or anywhere — shows at the top at once, and
  // comes off again if the save is refused (the host puts the text back).
  useEffect(() => {
    const posted = (e: Event) => {
      const item = (e as CustomEvent<PostedDetail>).detail.item;
      // A reply bumps its post's count; a post goes on top.
      if (item.parentId) setItems((cur) => cur.map((i) => ((i.kind === "post" || i.kind === "receipt") && i.id === item.parentId ? { ...i, replies: i.replies + 1 } : i)));
      else setItems((cur) => [item, ...cur]);
    };
    const failed = (e: Event) => {
      const id = (e as CustomEvent<FailedDetail>).detail.id;
      setItems((cur) => cur.filter((i) => !(i.kind === "post" && i.id === id)));
    };
    window.addEventListener(ARENA_POSTED, posted);
    window.addEventListener(ARENA_POST_FAILED, failed);
    return () => {
      window.removeEventListener(ARENA_POSTED, posted);
      window.removeEventListener(ARENA_POST_FAILED, failed);
    };
  }, []);

  function showFresh() {
    setItems((cur) => [...fresh, ...cur]);
    setFresh([]);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  const flash = (text: string) => {
    setNotice(text);
    setTimeout(() => setNotice(null), 4000);
  };

  const actions: CardActions = useMemo(
    () => ({
      viewerId,
      names,
      rooms: matchRooms,
      onRooms: (m) => setRoomsFor(m),
      onMatch: (id) => {
        setMatchId(id);
        window.scrollTo({ top: 0, behavior: "smooth" });
      },
      onTake: (m) => openComposer(m),
      onReply: (item) => {
        if (!me) {
          openAuthModal({ next: "/arena" });
          return;
        }
        openArenaComposer({ replyTo: { id: item.id, name: item.author.name, username: item.author.username, body: item.body } });
      },
      onReact: (item: ArenaItem, emoji: ArenaEmoji) => {
        if (!me) {
          openAuthModal({ next: "/arena" });
          return;
        }
        const target = reactionTarget(item);
        if (!target) return;
        const on = !item.mine.includes(emoji);
        const flip = (list: ArenaItem[]) => list.map((i) => (i.kind === item.kind && i.id === item.id ? toggleReaction(i, emoji) : i));
        setItems(flip);
        void setReaction(target, emoji, on).then((ok) => !ok && setItems(flip));
      },
      onDelete: async (item: PostItem) => {
        setItems((cur) => cur.filter((i) => !(i.kind === "post" && i.id === item.id)));
        if (!(await deletePost(item.id))) {
          setItems((cur) => [item, ...cur].sort((a, b) => +new Date(b.at) - +new Date(a.at)));
          flash("Couldn't delete — try again.");
        }
      },
    }),
    [viewerId, names, matchRooms, me, openComposer],
  );

  const live = matches.filter((m) => m.status === "live");
  const upcoming = matches.filter((m) => m.status === "scheduled" && +new Date(m.kickoffAt) - now < 12 * 3600_000).slice(0, 6);
  const chips = [...live, ...upcoming];
  const filtered = matchId ? matches.find((m) => m.id === matchId) : null;

  return (
    <div>
      <div className="flex items-center justify-between border-b border-border">
        <div className="flex gap-5">
          {(["global", "following"] as const).map((s) => (
            <button
              key={s}
              onClick={() => (s === "following" && !me ? openAuthModal({ next: "/arena" }) : setScope(s))}
              className="-mb-px border-b-2 pb-2.5 text-sm font-medium transition-colors duration-150"
              style={{ borderColor: scope === s ? "var(--foreground)" : "transparent", color: scope === s ? "var(--foreground)" : "var(--muted)" }}
            >
              {s === "global" ? "Global" : "Following"}
            </button>
          ))}
        </div>
        {here.count >= PRESENCE_MIN && (
          <div className="flex items-center gap-2 pb-2.5 text-[13px] text-muted" aria-live="polite">
            <span className="flex -space-x-1.5">
              {here.faces.slice(0, 3).map((f, i) => (
                <span key={i} className="rounded-full ring-2 ring-background">
                  <RivalCharacter name={f.name} imageUrl={f.avatar} size={20} />
                </span>
              ))}
            </span>
            <span>
              <span className="font-semibold text-foreground">{here.count}</span> here now
            </span>
          </div>
        )}
      </div>

      {chips.length > 0 && (
        <div className="no-scrollbar -mx-4 mt-3 flex gap-2 overflow-x-auto px-4 md:mx-0 md:px-0">
          <MatchChipButton active={!matchId} onClick={() => setMatchId(null)}>
            Everything
          </MatchChipButton>
          {chips.map((m) => (
            <MatchChipButton key={m.id} active={matchId === m.id} onClick={() => setMatchId(matchId === m.id ? null : m.id)}>
              <TeamCrest name={m.homeTeam} size={16} />
              <span className="max-w-[9rem] truncate">
                {m.homeTeam} v {m.awayTeam}
              </span>
              {m.status === "live" ? (
                <span className="font-mono text-[11px] font-bold tabular-nums text-rival-green">
                  {m.homeScore ?? 0}–{m.awayScore ?? 0}
                </span>
              ) : (
                <span className="font-mono text-[11px] text-muted">{new Date(m.kickoffAt).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}</span>
              )}
            </MatchChipButton>
          ))}
        </div>
      )}
      {filtered === undefined && matchId && (
        <button type="button" onClick={() => setMatchId(null)} className="mt-3 text-[13px] text-muted underline">
          Showing one match · show everything
        </button>
      )}

      <button
        type="button"
        onClick={() => openComposer(null)}
        className="mt-4 flex w-full items-center gap-3 rounded-2xl bg-surface px-4 py-3 text-left ring-1 ring-border transition-colors hover:ring-border-strong"
      >
        {me ? <RivalCharacter name={me.displayName} imageUrl={me.avatarUrl} size={32} /> : <span className="h-8 w-8 rounded-full bg-foreground/10" />}
        <span className="flex-1 text-[15px] text-muted">{me ? "What's your call?" : "Sign in to post your call"}</span>
        <span className="rounded-full px-3.5 py-1.5 text-[13px] font-bold text-white" style={{ background: "var(--rival-blue)" }}>
          Post
        </span>
      </button>

      {notice && <p className="mt-3 text-center text-[13px] font-semibold text-rival-red">{notice}</p>}

      {fresh.length > 0 && (
        <div className="sticky top-[72px] z-10 mt-3 flex justify-center md:top-[88px]">
          <button
            type="button"
            onClick={showFresh}
            className="rounded-full px-4 py-2 text-[13px] font-bold text-white shadow-[0_8px_20px_-8px_rgba(0,0,0,0.6)] [animation:fade-in-up_200ms_ease-out_both]"
            style={{ background: "var(--rival-blue)" }}
          >
            ↑ {newItemsLabel(fresh)}
          </button>
        </div>
      )}

      <div className="mt-4 overflow-hidden rounded-2xl bg-surface ring-1 ring-border">
        {state === "loading" && <Skeleton />}
        {state === "error" && <p className="px-4 py-14 text-center text-sm text-muted">Couldn&apos;t load the Arena. Pull to refresh or try again in a moment.</p>}
        {state === "ready" && items.length === 0 && (
          <div className="px-6 py-14 text-center">
            <p className="font-display text-lg font-bold text-foreground">{scope === "following" ? "Your circle is quiet" : "Quiet for now"}</p>
            <p className="mt-1 text-sm text-muted">
              {scope === "following"
                ? "Follow a few rivals and their calls, stakes and wins land here."
                : "When matches kick off, every goal lands here. Be the first to make a call."}
            </p>
          </div>
        )}
        <div className="divide-y divide-border">
          {items.map((item) => (
            <div key={`${item.kind}:${item.id}`} className="chat-row-enter">
              <ArenaCard item={item} actions={actions} />
            </div>
          ))}
        </div>
        {!done && state === "ready" && items.length > 0 && (
          <div ref={sentinel} className="flex justify-center py-6">
            <span className="h-5 w-5 animate-spin rounded-full border-2 border-t-transparent" style={{ borderColor: "var(--border-strong)", borderTopColor: "transparent" }} aria-label="Loading more" />
          </div>
        )}
      </div>

      {done && items.length > 0 && (
        <div className="flex flex-col items-center gap-3 py-12 text-center">
          <p className="text-sm text-muted">You&rsquo;re caught up.</p>
          <button onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })} className="rounded-full px-4 py-2 text-sm text-foreground ring-1 ring-border-strong">
            Back to top ↑
          </button>
        </div>
      )}

      <ArenaMatchRooms moment={roomsFor} rooms={roomsFor ? (matchRooms[roomsFor.match.id] ?? []) : []} onClose={() => setRoomsFor(null)} />
    </div>
  );
}

function MatchChipButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className="flex h-9 shrink-0 items-center gap-1.5 rounded-full px-3 text-[13px] transition-colors duration-150"
      style={{
        background: active ? "var(--foreground)" : "var(--surface)",
        color: active ? "var(--background)" : "var(--foreground)",
        boxShadow: active ? "none" : "inset 0 0 0 1px var(--border)",
      }}
    >
      {children}
    </button>
  );
}

function Skeleton() {
  return (
    <div className="divide-y divide-border">
      {[0, 1, 2].map((i) => (
        <div key={i} className="flex gap-3 px-4 py-4">
          <span className="h-10 w-10 shrink-0 animate-pulse rounded-full bg-foreground/5" />
          <div className="flex-1 space-y-2">
            <span className="block h-3 w-1/3 animate-pulse rounded bg-foreground/5" />
            <span className="block h-3 w-4/5 animate-pulse rounded bg-foreground/5" />
          </div>
        </div>
      ))}
    </div>
  );
}
