"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Avatar } from "./avatar";

// A non-interactive teaser of a room's real chat on the Exploding card: the
// latest lines, cycling slowly enough to read. Only ever real messages (this
// room's own chat, read under the same rules as the room page); a room with
// no chat yet shows nothing rather than a placeholder. Engagement mechanism
// #4 (collective effervescence / social facilitation): the card's gap was
// never data, it was people — "someone is talking in here right now".

interface Line {
  id: string;
  name: string;
  avatar: string | null;
  body: string;
  side: "yes" | "no" | null;
}

const VISIBLE = 2;
const CYCLE_MS = 3200;

export function RoomChatPreview({ roomId }: { roomId: string }) {
  const [lines, setLines] = useState<Line[]>([]);
  const [offset, setOffset] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const supabase = createClient();
    void Promise.all([
      supabase
        .from("messages")
        .select("id, user_id, body, author:profiles!messages_user_id_fkey(display_name, avatar_url)")
        .eq("room_id", roomId)
        .neq("body", "")
        .order("created_at", { ascending: false })
        .limit(12),
      supabase.from("entries").select("user_id, side").eq("room_id", roomId),
    ]).then(([{ data: msgs }, { data: entries }]) => {
      if (cancelled) return;
      const sides = new Map((entries ?? []).map((e) => [e.user_id as string, e.side as "yes" | "no"]));
      type Row = { id: string; user_id: string; body: string; author: { display_name: string; avatar_url: string | null } | null };
      setLines(
        ((msgs ?? []) as unknown as Row[])
          .filter((m) => m.author && m.body.trim())
          .reverse()
          .map((m) => ({ id: m.id, name: m.author!.display_name, avatar: m.author!.avatar_url, body: m.body.trim(), side: sides.get(m.user_id) ?? null })),
      );
    });
    return () => {
      cancelled = true;
    };
  }, [roomId]);

  // Roll forward one line at a time once there's more than fits.
  useEffect(() => {
    if (lines.length <= VISIBLE) return;
    const id = window.setInterval(() => setOffset((o) => (o + 1) % lines.length), CYCLE_MS);
    return () => window.clearInterval(id);
  }, [lines.length]);

  if (lines.length === 0) return null;
  const shown = Array.from({ length: Math.min(VISIBLE, lines.length) }, (_, i) => lines[(offset + i) % lines.length]);

  return (
    <div className="flex flex-col gap-1.5" aria-label="Latest chat">
      {shown.map((l) => (
        <div key={`${l.id}-${offset}`} className="chat-preview-line flex min-w-0 items-center gap-2">
          <Avatar name={l.name} size={16} imageUrl={l.avatar} />
          <p className="min-w-0 flex-1 truncate text-xs text-muted">
            <span className="font-medium text-foreground">{l.name}</span> {l.body}
          </p>
          {l.side && (
            <span className="shrink-0 font-mono text-[10px] font-semibold uppercase tracking-wide" style={{ color: l.side === "yes" ? "var(--rival-blue)" : "var(--rival-red)" }}>
              {l.side}
            </span>
          )}
        </div>
      ))}
    </div>
  );
}
