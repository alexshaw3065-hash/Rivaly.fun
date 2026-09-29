"use client";

import { useSyncExternalStore } from "react";

// True on wide desktop screens (Tailwind's xl, 1280px+), where some screens
// move a section into a right-hand column. False on the server and on first
// paint, so phones and laptops never flash the wide layout. Use only for what
// renders, where mounting both versions would fetch twice — plain layout
// belongs in xl: classes.
const QUERY = "(min-width: 1280px)";

function subscribe(cb: () => void) {
  const mq = window.matchMedia(QUERY);
  mq.addEventListener("change", cb);
  return () => mq.removeEventListener("change", cb);
}

export function useWideScreen(): boolean {
  return useSyncExternalStore(subscribe, () => window.matchMedia(QUERY).matches, () => false);
}
