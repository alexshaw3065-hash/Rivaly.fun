"use client";

import { useState } from "react";
import type { ChatMessage } from "@/lib/types";
import { useRetiringList } from "@/lib/use-retiring-list";
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
const MAX_VISIBLE = 8;
const ROW_HEIGHT = 38;
const EXIT_MS = 300;

export function ChatComposer({
  roomId,
  initialMessages,
  selfUserId,
}: {
  roomId: string;
  initialMessages: ChatMessage[];
  selfUserId: string;
}) {
  const { items, retiringId, push } = useRetiringList<ChatMessage>(
    MAX_VISIBLE,
    initialMessages.slice(-MAX_VISIBLE),
  );
  const [draft, setDraft] = useState("");

  function send() {
    const body = draft.trim();
    if (!body) return;
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
          disabled={!draft.trim()}
          className="shrink-0 rounded-md bg-foreground px-4 py-2.5 text-sm font-medium text-background transition-[transform,opacity] duration-150 ease-out active:scale-[0.97] disabled:opacity-40"
        >
          Send
        </button>
      </form>
    </div>
  );
}
