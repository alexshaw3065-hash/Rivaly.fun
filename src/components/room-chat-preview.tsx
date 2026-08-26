"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { ChatMessage } from "@/lib/types";
import { profileById, entrySideForUserInRoom } from "@/lib/mock-data";
import { Avatar } from "./avatar";

const VISIBLE_COUNT = 3;
const CYCLE_MS = 1700;
const EXIT_MS = 220;

// A fast, non-interactive teaser of a room's real chat — 2-4 real messages
// cycling continuously, so a room card reads as "packed" before anyone
// taps in (engagement-psychology mechanism #4, collective effervescence/
// social facilitation — see .claude/skills/rivaly-engagement-psychology).
// Reuses the exact enter/exit mechanic the room page's live chat
// (ChatComposer) already uses: these messages already happened, so
// there's nothing to poll for — this just replays a room's real history
// on a loop at a readable pace instead of dumping it all at once. Only
// ever plays back real seeded messages; nothing here is generated, and
// the YES/NO tag only shows when a real entry backs it.
export function RoomChatPreview({ roomId, messages }: { roomId: string; messages: ChatMessage[] }) {
  const pool = useMemo(
    () => messages.filter((m) => m.kind === "message" && m.userId),
    [messages],
  );
  const [displayed, setDisplayed] = useState<ChatMessage[]>(() => pool.slice(0, VISIBLE_COUNT));
  const [exitingIds, setExitingIds] = useState<Set<string>>(new Set());
  const cursor = useRef(pool.length > 0 ? VISIBLE_COUNT % pool.length : 0);
  const timers = useRef(new Map<string, ReturnType<typeof setTimeout>>());

  useEffect(() => {
    const active = timers.current;
    return () => active.forEach((t) => clearTimeout(t));
  }, []);

  useEffect(() => {
    if (pool.length <= VISIBLE_COUNT) return;
    const interval = setInterval(() => {
      const incoming = pool[cursor.current % pool.length];
      cursor.current += 1;
      setDisplayed((prev) => {
        const retiring = prev[0];
        const updated = [...prev, incoming];
        if (retiring) {
          setExitingIds((s) => new Set(s).add(retiring.id));
          const t = setTimeout(() => {
            setDisplayed((cur) => cur.filter((m) => m.id !== retiring.id));
            setExitingIds((s) => {
              const next = new Set(s);
              next.delete(retiring.id);
              return next;
            });
            timers.current.delete(retiring.id);
          }, EXIT_MS);
          timers.current.set(retiring.id, t);
        }
        return updated;
      });
    }, CYCLE_MS);
    return () => clearInterval(interval);
    // Only the pool's length matters here — its identity is recreated
    // every render (messages comes in as a fresh array each time), but
    // restarting the interval on every parent re-render would visibly
    // stutter the cycling (e.g. while the carousel above is being dragged).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pool.length]);

  if (displayed.length === 0) return null;

  return (
    <div className="flex flex-col gap-1.5">
      {displayed.map((m) => {
        const author = profileById(m.userId!);
        if (!author) return null;
        const side = entrySideForUserInRoom(roomId, m.userId!);
        return (
          <div
            key={m.id}
            className={`flex items-center gap-2 rounded-lg bg-surface px-3 py-2 ${
              exitingIds.has(m.id) ? "chat-row-exit" : "enter-row"
            }`}
          >
            <Avatar name={author.displayName} size={18} />
            <p className="min-w-0 flex-1 truncate text-xs text-muted">
              <span className="font-medium text-foreground">{author.displayName}</span>{" "}
              {m.body}
            </p>
            {side && (
              <span
                className="shrink-0 font-mono text-[10px] font-semibold uppercase tracking-wide"
                style={{ color: side === "yes" ? "var(--rival-blue)" : "var(--rival-green)" }}
              >
                {side}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}
