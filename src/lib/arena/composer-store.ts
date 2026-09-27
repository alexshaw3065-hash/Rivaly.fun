"use client";
import { track } from "@/lib/analytics/track";

import { useSyncExternalStore } from "react";
import type { ChatAttachment } from "@/lib/supabase/message-mapper";
import type { MomentItem, PostItem, Side } from "./model";

// One Arena composer for the whole app (the host lives in nav.tsx), so a take
// can be posted from the Arena, a room, or a room card — already filled in
// with what it's about. The Arena feed listens for what gets posted.

export interface ComposerRoom {
  id: string;
  prediction: string;
  /** The side you staked — a call. Null for a quote. */
  side: Side | null;
  matchId: string | null;
}

export interface ComposerReplyTo {
  id: string;
  name: string;
  username: string | null;
  body: string;
}

export interface ComposerPreset {
  /** Replying to a post (X-style): no room, match or moment of its own. */
  replyTo?: ComposerReplyTo | null;
  moment?: MomentItem | null;
  room?: ComposerRoom | null;
  matchId?: string | null;
  /** Text to start with (e.g. put back after the save was refused). */
  body?: string;
  attachment?: ChatAttachment | null;
  error?: string | null;
}

interface State {
  open: boolean;
  preset: ComposerPreset;
  key: number;
}

let state: State = { open: false, preset: {}, key: 0 };
// What the page you're on is about (the Arena's match filter) — used when the
// floating button opens the composer without saying.
let context: { matchId: string | null } = { matchId: null };
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

export function openArenaComposer(preset: ComposerPreset = {}) {
  const withContext = preset.replyTo || preset.moment || preset.room || preset.matchId !== undefined ? preset : { ...preset, matchId: context.matchId };
  state = { open: true, preset: withContext, key: state.key + 1 };
  track("arena_composer_opened", { reply: Boolean(preset.replyTo), moment: Boolean(preset.moment), room: Boolean(preset.room) });
  emit();
}

export function closeArenaComposer() {
  state = { ...state, open: false };
  emit();
}

export function setComposerContext(next: { matchId: string | null }) {
  context = next;
}

export function useArenaComposer(): State {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => state,
    () => state,
  );
}

export const ARENA_POSTED = "rivaly:arena-posted";
export const ARENA_POST_FAILED = "rivaly:arena-post-failed";
export type PostedDetail = { item: PostItem };
export type FailedDetail = { id: string };
