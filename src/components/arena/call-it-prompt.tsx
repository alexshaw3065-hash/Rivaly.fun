"use client";

import Link from "next/link";
import { useState } from "react";
import { useCurrentUser } from "@/components/current-user-provider";
import { savePost } from "@/lib/arena/data";
import type { Side } from "@/lib/arena/model";

const COLOR: Record<Side, string> = { yes: "var(--yes-ink)", no: "var(--no-ink)" };
const MAX = 500;

// Right after a stake goes through — the moment you're most sure of it —
// one line turns it into a call in the Arena, which comes back as a receipt
// when the room settles. Always offered, always skippable; the stake shows
// in the Arena either way. Public rooms only (calls can't point at private ones).
export function CallItPrompt({ roomId, side, save = savePost }: { roomId: string; side: Side; save?: typeof savePost }) {
  const me = useCurrentUser();
  const [text, setText] = useState("");
  const [phase, setPhase] = useState<"ask" | "posting" | "done" | "skipped">("ask");
  const [postId, setPostId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!me || phase === "skipped") return null;

  if (phase === "done" && postId) {
    return (
      <div className="mt-3 flex items-center justify-between gap-3 border-t border-line pt-3 [animation:fade-in-up_200ms_ease-out_both]">
        <p className="text-body text-foreground">
          Called it in the Arena. <span className="text-secondary">It comes back as a receipt.</span>
        </p>
        <Link href={`/arena/p/${postId}`} className="shrink-0 text-label font-semibold" style={{ color: COLOR[side] }}>
          See it
        </Link>
      </div>
    );
  }

  async function post() {
    const body = text.replace(/\n{3,}/g, "\n\n").trim();
    if (!me || !body || phase === "posting") return;
    setPhase("posting");
    setError(null);
    const id = crypto.randomUUID();
    const refused = await save(me.id, { id, body: body.slice(0, MAX), attachment: null, matchId: null, roomId, side, momentId: null, parentId: null });
    if (refused) {
      setError(refused);
      setPhase("ask");
      return;
    }
    setPostId(id);
    setPhase("done");
  }

  return (
    <div className="mt-3 border-t border-line pt-3">
      <p className="text-body font-semibold text-foreground">Tell them why?</p>
      <p className="mt-1 text-caption text-secondary">Post it to the Arena as your call — it comes back as a receipt when the room settles.</p>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        maxLength={MAX}
        rows={2}
        placeholder={`Why ${side.toUpperCase()}? Say it now.`}
        className="mt-2 w-full resize-none rounded-control border border-line-strong bg-background px-3 py-2 text-body-lg text-foreground transition-colors duration-150 placeholder:text-tertiary focus:border-yes focus:outline-none"
      />
      {error && <p className="mt-1 text-caption font-semibold text-no-ink">{error}</p>}
      <div className="mt-2 flex items-center gap-2">
        <button
          type="button"
          onClick={() => void post()}
          disabled={!text.trim() || phase === "posting"}
          className={`h-10 flex-1 rounded-full text-label font-bold text-white transition-[transform,opacity] duration-100 active:scale-[0.97] disabled:opacity-40 ${side === "yes" ? "bg-yes" : "bg-no"}`}
        >
          {phase === "posting" ? "Posting…" : "Post call"}
        </button>
        <button type="button" onClick={() => setPhase("skipped")} className="h-10 rounded-full px-4 text-label text-secondary hover:text-foreground">
          Skip
        </button>
      </div>
    </div>
  );
}
