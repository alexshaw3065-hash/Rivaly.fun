"use client";

import { useCallback, useRef } from "react";
import { recordViews } from "./data";

// A post counts as viewed once it's been at least half on screen for a
// second — seen, not scrolled past. Batched (one call every ~1.5s), and each
// post only once per visit; the database then counts each person once.
const DWELL_MS = 1000;
const counted = new Set<string>();
const queue: string[] = [];
let timer: ReturnType<typeof setTimeout> | null = null;

function flush() {
  timer = null;
  const ids = queue.splice(0, 50);
  recordViews(ids);
  if (queue.length > 0) timer = setTimeout(flush, 1500);
}

function enqueue(id: string) {
  if (counted.has(id)) return;
  counted.add(id);
  queue.push(id);
  timer ??= setTimeout(flush, 1500);
}

/** Ref for a post's element; records the view when it's really been seen. */
export function useViewOnScreen(postId: string | null) {
  const cleanup = useRef<(() => void) | null>(null);
  return useCallback(
    (el: HTMLElement | null) => {
      cleanup.current?.();
      cleanup.current = null;
      if (!el || !postId || counted.has(postId)) return;
      let dwell: ReturnType<typeof setTimeout> | null = null;
      const io = new IntersectionObserver(
        ([e]) => {
          if (e?.isIntersecting) dwell ??= setTimeout(() => enqueue(postId), DWELL_MS);
          else if (dwell) {
            clearTimeout(dwell);
            dwell = null;
          }
        },
        { threshold: 0.5 },
      );
      io.observe(el);
      cleanup.current = () => {
        io.disconnect();
        if (dwell) clearTimeout(dwell);
      };
    },
    [postId],
  );
}
