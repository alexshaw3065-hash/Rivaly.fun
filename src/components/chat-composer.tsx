"use client";

import { useEffect, useRef, useState } from "react";
import type { ChatMessage } from "@/lib/types";
import { ChatMessageRow } from "./chat-message";

// Optimistic-only for now — appends locally, doesn't persist. Swap for a
// Supabase Realtime channel insert once a project is linked; the append
// shape (ChatMessage) is already what the real insert will look like.
export function ChatComposer({
  roomId,
  initialMessages,
  selfUserId,
}: {
  roomId: string;
  initialMessages: ChatMessage[];
  selfUserId: string;
}) {
  const [messages, setMessages] = useState(initialMessages);
  const [draft, setDraft] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "end" });
  }, [messages.length]);

  function send() {
    const body = draft.trim();
    if (!body) return;
    setMessages((prev) => [
      ...prev,
      {
        id: `local-${Date.now()}`,
        roomId,
        userId: selfUserId,
        kind: "message",
        body,
        createdAt: new Date().toISOString(),
      },
    ]);
    setDraft("");
  }

  return (
    <div className="flex flex-col">
      <div className="flex max-h-[420px] flex-col gap-0.5 overflow-y-auto px-1 py-2">
        {messages.map((m) => (
          <ChatMessageRow key={m.id} message={m} />
        ))}
        <div ref={bottomRef} />
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
          className="flex-1 rounded-md border border-border bg-surface px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted focus:border-border-strong focus:outline-none"
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
