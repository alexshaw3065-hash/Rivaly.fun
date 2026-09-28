"use client";

import { useState } from "react";
import type { Profile } from "@/lib/types";
import { BottomSheet } from "./bottom-sheet";

// The Rivaly card is one PNG from /profile/[username]/card — artwork,
// avatar, numbers and form arrive together (no text-then-image pop-in).
// Share sends that exact file.
export function RivalyScoreSheet({ open, onClose, profile }: { open: boolean; onClose: () => void; profile: Profile }) {
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [bust] = useState(() => Date.now());
  const src = `/profile/${encodeURIComponent(profile.username)}/card?v=${bust}`;

  async function share() {
    setBusy(true);
    try {
      const blob = await (await fetch(src)).blob();
      const file = new File([blob], `rivaly-${profile.username}.png`, { type: "image/png" });
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], text: `${profile.displayName} on Rivaly` });
      } else {
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = file.name;
        a.click();
        URL.revokeObjectURL(a.href);
      }
    } catch {
      // cancelled
    } finally {
      setBusy(false);
    }
  }

  return (
    <BottomSheet open={open} onClose={onClose} title="Rivaly card">
      <div className="flex flex-col gap-5">
        <div className="relative mx-auto w-full max-w-[300px]" style={{ aspectRatio: "630 / 891" }}>
          {!loaded && <div className="absolute inset-0 skeleton rounded-[28px] bg-foreground/10" />}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={src}
            alt={`${profile.displayName}'s Rivaly card`}
            onLoad={() => setLoaded(true)}
            className="absolute inset-0 h-full w-full object-contain transition-opacity duration-300"
            style={{ opacity: loaded ? 1 : 0 }}
          />
        </div>
        <p className="-mt-2 text-center text-caption text-secondary">From settled public rooms only. Rated after 3.</p>
        <button
          onClick={share}
          disabled={busy || !loaded}
          className="rounded-full bg-foreground px-4 py-3 text-body font-semibold text-background transition-transform duration-150 active:scale-[0.97] disabled:opacity-60"
        >
          {busy ? "Preparing…" : "Share card"}
        </button>
      </div>
    </BottomSheet>
  );
}
