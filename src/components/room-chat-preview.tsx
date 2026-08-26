"use client";

import { useEffect, useMemo, useRef } from "react";
import type { ChatMessage } from "@/lib/types";
import { profileById, entrySideForUserInRoom } from "@/lib/mock-data";
import { useRetiringList } from "@/lib/use-retiring-list";
import { ChatFeedRows } from "./chat-feed-rows";
import { Avatar } from "./avatar";

const VISIBLE_COUNT = 1;
const CYCLE_MS = 1700;
const EXIT_MS = 300;
const ROW_HEIGHT = 26;

// A fast, non-interactive teaser of a room's real chat — 2 real messages
// scrolling and fading continuously (a real Twitch/YouTube-Live rhythm),
// so a room card reads as "packed" before anyone taps in (engagement-
// psychology mechanism #4, collective effervescence/social facilitation —
// see .claude/skills/rivaly-engagement-psychology). Meant to float as a
// small overlay (see ExplodingRoomCard's fixed-height anchor) rather than
// sit in the card's normal flow — the translucent panel lives in THIS
// component (not the parent) so a room with no messages renders nothing
// at all, not an empty floating bar. Reuses the same ChatFeedRows/
// useRetiringList the room page's live chat (ChatComposer) uses: these
// messages already happened, so there's nothing to poll for — this just
// replays a room's real history on a loop instead of dumping it all at
// once. Only ever plays back real seeded messages; nothing here is
// generated, and the YES/NO tag only shows when a real entry backs it.
export function RoomChatPreview({ roomId, messages }: { roomId: string; messages: ChatMessage[] }) {
  const pool = useMemo(
    () => messages.filter((m) => m.kind === "message" && m.userId),
    [messages],
  );
  const { items, retiringId, push } = useRetiringList<ChatMessage>(
    VISIBLE_COUNT,
    pool.slice(0, VISIBLE_COUNT),
  );
  const cursor = useRef(pool.length > 0 ? VISIBLE_COUNT % pool.length : 0);

  useEffect(() => {
    if (pool.length <= VISIBLE_COUNT) return;
    const interval = setInterval(() => {
      push(pool[cursor.current % pool.length], EXIT_MS);
      cursor.current += 1;
    }, CYCLE_MS);
    return () => clearInterval(interval);
    // Only the pool's length matters here — its identity is recreated
    // every render (messages comes in as a fresh array each time), but
    // restarting the interval on every parent re-render would visibly
    // stutter the cycling (e.g. while the carousel above is being dragged).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pool.length]);

  if (items.length === 0) return null;

  return (
    <div className="rounded-lg bg-background/75 px-2.5 py-1.5 backdrop-blur-sm">
      <ChatFeedRows
        items={items}
        retiringId={retiringId}
        rowHeight={ROW_HEIGHT}
        renderRow={(m) => {
          const author = profileById(m.userId!);
          if (!author) return null;
          const side = entrySideForUserInRoom(roomId, m.userId!);
          return (
            <div className="flex h-full items-center gap-1.5">
              <Avatar name={author.displayName} size={14} />
              <p className="min-w-0 flex-1 truncate text-[11px] leading-none text-muted">
                <span className="font-medium text-foreground">{author.displayName}</span>{" "}
                {m.body}
              </p>
              {side && (
                <span
                  className="shrink-0 font-mono text-[9px] font-semibold uppercase tracking-wide"
                  style={{ color: side === "yes" ? "var(--rival-blue)" : "var(--rival-green)" }}
                >
                  {side}
                </span>
              )}
            </div>
          );
        }}
      />
    </div>
  );
}
