"use client";

import { useEffect, useRef, useState } from "react";
import type { ChatMessage } from "@/lib/types";
import { ChatMessageRow } from "./chat-message";

// Twitch-style live chat — fast and low-permanence, reading as a live crowd
// rather than an archive. `messages` still holds every real message (nothing
// is silently lost), but only the newest MAX_VISIBLE render; once that cap
// is crossed, the oldest visible row animates out to make room for the new
// one, the same rhythm as a real chat scrolling past faster than anyone
// reads all of it.
//
// Engagement-psychology mechanism #4 (collective effervescence / social
// facilitation — see .claude/skills/rivaly-engagement-psychology): a chat
// that visibly churns reads as "people are here right now" far more than a
// static list. Only ever animates real messages — no simulated/auto-
// generated chatter, per the no-fabricated-activity rule that governs every
// build this session.
const MAX_VISIBLE = 8;
const EXIT_MS = 220;

export function ChatComposer({
  roomId,
  initialMessages,
  selfUserId,
}: {
  roomId: string;
  initialMessages: ChatMessage[];
  selfUserId: string;
}) {
  const [messages, setMessages] = useState(() => initialMessages.slice(-MAX_VISIBLE));
  const [exitingIds, setExitingIds] = useState<Set<string>>(new Set());
  const [draft, setDraft] = useState("");
  const timers = useRef(new Map<string, ReturnType<typeof setTimeout>>());

  useEffect(() => {
    const activeTimers = timers.current;
    return () => {
      activeTimers.forEach((t) => clearTimeout(t));
    };
  }, []);

  function retire(id: string) {
    setExitingIds((prev) => new Set(prev).add(id));
    const timer = setTimeout(() => {
      setMessages((prev) => prev.filter((m) => m.id !== id));
      setExitingIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
      timers.current.delete(id);
    }, EXIT_MS);
    timers.current.set(id, timer);
  }

  function send() {
    const body = draft.trim();
    if (!body) return;
    const message: ChatMessage = {
      id: `local-${Date.now()}`,
      roomId,
      userId: selfUserId,
      kind: "message",
      body,
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => {
      const updated = [...prev, message];
      if (updated.length > MAX_VISIBLE) retire(updated[0].id);
      return updated;
    });
    setDraft("");
  }

  return (
    <div className="flex flex-col">
      <div className="flex flex-col gap-0.5 px-1 py-2">
        {messages.map((m) => (
          <div key={m.id} className={exitingIds.has(m.id) ? "chat-row-exit" : undefined}>
            <ChatMessageRow message={m} />
          </div>
        ))}
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          send();
        }}
        className="mt-2 flex items-center gap-2 border-t border-border pt-3"
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
          disabled={!draft.trim()}
          className="shrink-0 rounded-md bg-foreground px-4 py-2.5 text-sm font-medium text-background transition-[transform,opacity] duration-150 ease-out active:scale-[0.97] disabled:opacity-40"
        >
          Send
        </button>
      </form>
    </div>
  );
}
