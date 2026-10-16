"use client";

import { useState } from "react";
import { Button, Segmented, Sheet } from "@/components/ui";
import { withRef } from "@/lib/referral";
import { siteUrl } from "@/lib/site";

// "Share my position": your stake in a room as a card (rooms/[roomId]/position),
// shareable any time — before kick-off, live, or after the result — the way
// trading apps let you share a position. A preview, a choice between showing
// dollar amounts or only the return (% only), then the phone's own share sheet
// with the image attached, or a download where that isn't available.
// Public rooms only (the card route refuses private ones).
//
// Engagement mechanisms: #5 social identity (my call, out loud) and #10
// growth through people — the card carries a QR to the room with your referral.

export function SharePositionButton({ roomId, username, variant = "button" }: { roomId: string; username: string; variant?: "button" | "link" }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      {variant === "link" ? (
        <button type="button" onClick={() => setOpen(true)} className="font-semibold text-yes-ink hover:underline">
          Share
        </button>
      ) : (
        <Button variant="secondary" size="md" full onClick={() => setOpen(true)} leading={<ShareGlyph />}>
          Share my position
        </Button>
      )}
      <SharePositionSheet open={open} onOpenChange={setOpen} roomId={roomId} username={username} />
    </>
  );
}

function SharePositionSheet({ open, onOpenChange, roomId, username }: { open: boolean; onOpenChange: (o: boolean) => void; roomId: string; username: string }) {
  const [amounts, setAmounts] = useState<"show" | "hide">("show");
  const [state, setState] = useState<"idle" | "busy" | "done">("idle");
  // New numbers each time the sheet opens (the pool moves while a room is open).
  const [bust, setBust] = useState(0);
  const src = `/rooms/${roomId}/position?u=${encodeURIComponent(username)}${amounts === "hide" ? "&amounts=0" : ""}&v=${bust}`;

  async function share() {
    if (state === "busy") return;
    setState("busy");
    try {
      const res = await fetch(src);
      if (!res.ok) throw new Error(String(res.status));
      const blob = await res.blob();
      const file = new File([blob], "rivaly-position.png", { type: "image/png" });
      const url = withRef(siteUrl(`/rooms/${roomId}`));
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], text: `My call on Rivaly. Think I'm wrong? ${url}` });
      } else {
        const href = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = href;
        a.download = file.name;
        a.click();
        window.setTimeout(() => URL.revokeObjectURL(href), 1000);
      }
      setState("done");
      window.setTimeout(() => setState("idle"), 2000);
    } catch {
      // A cancelled share sheet lands here too.
      setState("idle");
    }
  }

  return (
    <Sheet
      open={open}
      onOpenChange={(o) => {
        if (o) setBust(Date.now());
        onOpenChange(o);
      }}
      title="Share your position"
      footer={
        <Button variant="primary" size="cta" pending={state === "busy"} onClick={share} leading={state === "done" ? <CheckGlyph /> : <ShareGlyph />}>
          {state === "done" ? "Shared" : "Share"}
        </Button>
      }
    >
      <div className="flex flex-col items-center gap-4">
        <Segmented
          options={[
            { id: "show", label: "$ amounts" },
            { id: "hide", label: "% only" },
          ]}
          value={amounts}
          onChange={setAmounts}
        />
        {/* 4:5, the card's own shape; the skeleton sits behind it while it renders. */}
        <div className="relative aspect-[4/5] w-full max-w-xs overflow-hidden rounded-card bg-surface-elevated edge">
          <div className="skeleton absolute inset-0" aria-hidden />
          {open && (
            // eslint-disable-next-line @next/next/no-img-element
            <img key={src} src={src} alt="Your position card" className="relative h-full w-full object-cover" />
          )}
        </div>
      </div>
    </Sheet>
  );
}

function ShareGlyph() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden>
      <path d="M8 10V2M4.5 5.5 8 2l3.5 3.5M3 9v4h10V9" stroke="currentColor" strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function CheckGlyph() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden>
      <path d="M3 8.5l3 3 7-7" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
