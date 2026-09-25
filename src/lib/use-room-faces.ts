"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

// The faces in a room, for the little avatar stack on room cards — up to
// three, biggest stakes first. Every card on screen asks at once, so the
// asks are batched: one query for all of them (entries of public rooms are
// public-read), not one per card. Cached per room and refetched when its
// head-count changes.

export interface RoomFace {
  name: string;
  avatarUrl: string | null;
}

const MAX = 3;
const ID_LIKE = /^[0-9a-f]{8}-[0-9a-f]{4}-/i;
const cache = new Map<string, { count: number; faces: RoomFace[] }>();
const waiting = new Map<string, Set<(f: RoomFace[]) => void>>();
let timer: ReturnType<typeof setTimeout> | null = null;

async function flush() {
  timer = null;
  const ids = [...waiting.keys()];
  const listeners = new Map(waiting);
  waiting.clear();
  if (ids.length === 0) return;
  const { data } = await createClient()
    .from("entries")
    .select("room_id, amount_cents, profile:profiles(display_name, username, avatar_url)")
    .in("room_id", ids)
    .order("amount_cents", { ascending: false })
    .limit(ids.length * 30);
  const rows = (data ?? []) as unknown as {
    room_id: string;
    profile: { display_name: string | null; username: string | null; avatar_url: string | null } | null;
  }[];
  const byRoom = new Map<string, RoomFace[]>();
  for (const r of rows) {
    const list = byRoom.get(r.room_id) ?? [];
    if (list.length >= MAX) continue;
    const p = r.profile;
    const name = p?.display_name && !ID_LIKE.test(p.display_name) ? p.display_name : p?.username || "Rival";
    list.push({ name, avatarUrl: p?.avatar_url ?? null });
    byRoom.set(r.room_id, list);
  }
  for (const id of ids) listeners.get(id)?.forEach((l) => l(byRoom.get(id) ?? []));
}

function request(roomId: string, done: (f: RoomFace[]) => void) {
  const set = waiting.get(roomId) ?? new Set();
  set.add(done);
  waiting.set(roomId, set);
  timer ??= setTimeout(() => void flush(), 30);
}

export function useRoomFaces(roomId: string | undefined, participantCount: number): RoomFace[] {
  const cached = roomId ? cache.get(roomId) : undefined;
  const [faces, setFaces] = useState<RoomFace[]>(cached?.faces ?? []);

  useEffect(() => {
    if (!roomId || participantCount === 0) return;
    const hit = cache.get(roomId);
    if (hit && hit.count === participantCount) {
      const t = setTimeout(() => setFaces(hit.faces), 0);
      return () => clearTimeout(t);
    }
    let live = true;
    request(roomId, (f) => {
      cache.set(roomId, { count: participantCount, faces: f });
      if (live) setFaces(f);
    });
    return () => {
      live = false;
    };
  }, [roomId, participantCount]);

  return faces;
}
