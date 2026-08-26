"use client";

import { useEffect, useRef, useState } from "react";

// Keeps a capped, oldest-evicts-first list where eviction is animatable:
// pushing past `capacity` keeps the retiring (oldest) item in `items` for
// `retireMs` after eviction so ChatFeedRows can play its exit transition,
// then actually drops it. Shared by ChatComposer and RoomChatPreview so
// both "Twitch-style" chat surfaces evict identically.
export function useRetiringList<T extends { id: string }>(capacity: number, initial: T[]) {
  const [items, setItems] = useState<T[]>(initial);
  const [retiringId, setRetiringId] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  function push(item: T, retireMs: number) {
    setItems((prev) => {
      const updated = [...prev, item];
      if (updated.length > capacity) {
        const retiring = updated[0];
        setRetiringId(retiring.id);
        if (timer.current) clearTimeout(timer.current);
        timer.current = setTimeout(() => {
          setItems((cur) => cur.filter((m) => m.id !== retiring.id));
          setRetiringId(null);
          timer.current = null;
        }, retireMs);
      }
      return updated;
    });
  }

  return { items, retiringId, push };
}
