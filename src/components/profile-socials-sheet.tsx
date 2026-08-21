"use client";

import { useState } from "react";
import type { SocialLink, SocialPlatform } from "@/lib/types";
import { socialPlatforms } from "@/lib/social-platforms";
import { BottomSheet } from "./bottom-sheet";

// Two-step picker: choose a platform, then enter a handle. No OAuth/
// verification backend exists, so this just records what you typed —
// see profile-view.tsx's icon row for how it's displayed (a real link,
// or a copy-chip for Discord, never a "verified" claim).
export function ProfileSocialsSheet({
  open,
  onClose,
  links,
  onSave,
}: {
  open: boolean;
  onClose: () => void;
  links: SocialLink[];
  onSave: (links: SocialLink[]) => void;
}) {
  const [picked, setPicked] = useState<SocialPlatform | null>(null);
  const [handle, setHandle] = useState("");

  function close() {
    setPicked(null);
    setHandle("");
    onClose();
  }

  function save() {
    if (!picked || !handle.trim()) return;
    const next = links.filter((l) => l.platform !== picked);
    next.push({ platform: picked, handle: handle.trim() });
    onSave(next);
    close();
  }

  const available = socialPlatforms.filter((p) => !links.some((l) => l.platform === p.platform));

  return (
    <BottomSheet open={open} onClose={close} title={picked ? "Add handle" : "Add social link"}>
      {picked ? (
        <div className="flex flex-col gap-3">
          <input
            autoFocus
            value={handle}
            onChange={(e) => setHandle(e.target.value)}
            placeholder="@handle"
            className="w-full rounded-md border border-border bg-surface px-3.5 py-2.5 text-sm text-foreground outline-none focus:border-border-strong"
          />
          <div className="flex gap-2">
            <button
              onClick={() => setPicked(null)}
              className="flex-1 rounded-md border border-border-strong px-4 py-2.5 text-sm font-medium text-foreground active:scale-[0.97]"
              style={{ transition: "transform 150ms ease-out" }}
            >
              Back
            </button>
            <button
              onClick={save}
              className="flex-1 rounded-md bg-foreground px-4 py-2.5 text-sm font-medium text-background active:scale-[0.97]"
              style={{ transition: "transform 150ms ease-out" }}
            >
              Save
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-2.5">
          {available.map(({ platform, label, Icon }) => (
            <button
              key={platform}
              onClick={() => setPicked(platform)}
              className="flex flex-col items-center gap-2 rounded-lg border border-border bg-surface p-3 active:scale-[0.97]"
              style={{ transition: "transform 150ms ease-out" }}
            >
              <Icon />
              <span className="text-xs text-foreground">{label}</span>
            </button>
          ))}
          {available.length === 0 && (
            <p className="col-span-3 py-6 text-center text-sm text-muted">All platforms connected.</p>
          )}
        </div>
      )}
    </BottomSheet>
  );
}
