"use client";

import { useSyncExternalStore } from "react";
import type { EntrySide } from "@/lib/types";

// Which side the room's stake sheet is open on (null = closed). The pool
// card's "Add to YES / NO" buttons open it; the sheet itself lives in
// room-take-side.tsx.
let side: EntrySide | null = null;
const listeners = new Set<() => void>();

export function openStakeSheet(next: EntrySide | null) {
  side = next;
  listeners.forEach((l) => l());
}

export function useStakeSheet(): EntrySide | null {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => side,
    () => null,
  );
}
