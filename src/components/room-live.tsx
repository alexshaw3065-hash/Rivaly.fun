"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

// Keeps an unfinished room live over Supabase Realtime — no polling. The
// page re-renders from the server only when Postgres says something actually
// changed: the room row (pool, split, stakes locked, result claimed, paid
// out), a new entry (a rival joined), or the match (score, status). Bursts
// (a goal + its stat updates) collapse into one re-render. One timer covers
// kickoff itself, since "stakes locked" happens at a time, not on a write.
export function RoomLive({ roomId, matchId, kickoffAt }: { roomId: string; matchId: string; kickoffAt: string }) {
  const router = useRouter();
  const pending = useRef<number | undefined>(undefined);

  useEffect(() => {
    const refresh = () => {
      window.clearTimeout(pending.current);
      pending.current = window.setTimeout(() => router.refresh(), 250);
    };
    const supabase = createClient();
    const channel = supabase
      .channel(`room-live-${roomId}`)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "rooms", filter: `id=eq.${roomId}` }, refresh)
      .on("postgres_changes", { event: "*", schema: "public", table: "entries", filter: `room_id=eq.${roomId}` }, refresh)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "matches", filter: `id=eq.${matchId}` }, refresh)
      .subscribe();

    const untilKickoff = +new Date(kickoffAt) - Date.now();
    const kickoffTimer = untilKickoff > 0 && untilKickoff < 2 ** 31 - 1 ? window.setTimeout(refresh, untilKickoff + 1000) : undefined;

    return () => {
      window.clearTimeout(pending.current);
      window.clearTimeout(kickoffTimer);
      supabase.removeChannel(channel);
    };
  }, [roomId, matchId, kickoffAt, router]);

  return null;
}
