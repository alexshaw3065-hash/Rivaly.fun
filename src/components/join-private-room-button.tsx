"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { rooms } from "@/lib/mock-data";
import { BottomSheet } from "./bottom-sheet";
import { KeyIcon } from "./icons";

// "Join private room" per the founder's direction — placed distinctly from
// the Discover/Live/Following/My Rooms sub-tabs rather than as a fifth
// peer tab, since it's a one-off action (enter a code, land in a room),
// not a browsing surface. Rooms already carry an inviteCode + private
// visibility in the data model; this just surfaces it.
export function JoinPrivateRoomButton() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);

  function close() {
    setOpen(false);
    setCode("");
    setError(null);
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = code.trim().toUpperCase();
    if (!trimmed) return;
    const room = rooms.find((r) => r.inviteCode.toUpperCase() === trimmed);
    if (!room) {
      setError("No room found for that code — double-check and try again.");
      return;
    }
    close();
    router.push(`/rooms/${room.id}`);
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex shrink-0 items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-transform duration-150 ease-out active:scale-[0.97]"
        style={{ background: "var(--rival-blue-dim)", color: "var(--rival-blue)" }}
      >
        <KeyIcon />
        Join private room
      </button>

      <BottomSheet open={open} onClose={close} title="Join private room">
        <p className="text-center text-sm text-muted">
          Enter the invite code a rival shared with you.
        </p>
        <form onSubmit={submit} className="mt-5 flex flex-col gap-3">
          <input
            value={code}
            onChange={(e) => {
              setCode(e.target.value);
              setError(null);
            }}
            placeholder="RIVAL-XXXX"
            autoCapitalize="characters"
            className="w-full rounded-md border border-border bg-surface-elevated px-4 py-3 text-center font-mono text-base uppercase tracking-wider text-foreground placeholder:text-muted placeholder:normal-case focus:border-border-strong focus:outline-none"
            style={{ transition: "border-color 150ms ease" }}
          />
          {error && <p className="text-center text-sm text-danger-red">{error}</p>}
          <button
            type="submit"
            disabled={!code.trim()}
            className="w-full rounded-md bg-foreground py-3 text-sm font-medium text-background transition-transform duration-150 ease-out active:scale-[0.97] disabled:opacity-40"
          >
            Join room
          </button>
        </form>
      </BottomSheet>
    </>
  );
}
