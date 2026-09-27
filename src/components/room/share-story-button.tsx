"use client";

import { withRef } from "@/lib/referral";
import { useState } from "react";

// Sends the match-story card (rooms/[roomId]/card) out: the phone's own share
// sheet with the image attached where it can, a download where it can't.
// The room link goes with it, so the card brings people back to argue
// (masterplan principle #10 — great products grow through people).

export function ShareStoryButton({ roomId }: { roomId: string }) {
  const [state, setState] = useState<"idle" | "busy" | "done">("idle");

  async function share() {
    if (state === "busy") return;
    setState("busy");
    try {
      const res = await fetch(`/rooms/${roomId}/card`);
      if (!res.ok) throw new Error(String(res.status));
      const blob = await res.blob();
      const file = new File([blob], "rivaly-match-story.png", { type: "image/png" });
      const url = withRef(`${window.location.origin}/rooms/${roomId}`);
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: "The match story", text: `How it really went — ${url}` });
      } else {
        const href = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = href;
        a.download = file.name;
        a.click();
        window.setTimeout(() => URL.revokeObjectURL(href), 1000);
      }
      setState("done");
      window.setTimeout(() => setState("idle"), 2200);
    } catch {
      // A cancelled share sheet lands here too — nothing to report.
      setState("idle");
    }
  }

  return (
    <button
      type="button"
      onClick={share}
      disabled={state === "busy"}
      className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-foreground text-sm font-bold text-background transition-[transform,opacity] duration-150 ease-out active:scale-[0.97] disabled:opacity-70"
    >
      {state === "busy" ? (
        <span className="h-4 w-4 animate-spin rounded-full border-2 border-background/30 border-t-background" aria-hidden />
      ) : state === "done" ? (
        <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden>
          <path d="M3 8.5l3 3 7-7" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      ) : (
        <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden>
          <path d="M8 10V2M4.5 5.5 8 2l3.5 3.5M3 9v4h10V9" stroke="currentColor" strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )}
      {state === "done" ? "Shared" : "Share the story"}
    </button>
  );
}
