"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { BottomSheet } from "./bottom-sheet";
import { KeyIcon } from "./icons";

// "Join private room" per the founder's direction — a one-off action (enter
// a code, land in a room), not a browsing surface, so it doesn't get a fifth
// peer tab. Bare icon, no pill/label/fill — it sits on the same line as the
// Discover/Live/Following/My Rooms tabs rather than owning its own row above
// them (a lone labeled button up there read as the first, most prominent
// thing on the page, for what's actually a rare action most visits never
// touch). aria-label + title carry the meaning instead of visible text.
// Rooms already carry an inviteCode + private visibility in the data model;
// this just surfaces it.
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

  const [looking, setLooking] = useState(false);

  // The code is the permission to see a private room — the lookup goes
  // through room_by_invite_code() (a definer function), and the code rides
  // along on the URL so the room page can open it for a non-member too.
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = code.trim().toUpperCase();
    if (!trimmed || looking) return;
    setLooking(true);
    const { data } = await createClient().rpc("room_by_invite_code", { p_code: trimmed });
    setLooking(false);
    const room = (data as { id: string }[] | null)?.[0];
    if (!room) {
      setError("No room found for that code — double-check and try again.");
      return;
    }
    close();
    router.push(`/rooms/${room.id}?code=${encodeURIComponent(trimmed)}`);
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        aria-label="Join private room"
        title="Join private room"
        className="shrink-0 p-1 transition-opacity duration-150 hover:opacity-80 active:scale-[0.9]"
        style={{ color: "var(--yes)" }}
      >
        <KeyIcon />
      </button>

      <BottomSheet open={open} onClose={close} title="Join private room">
        <p className="text-center text-body text-secondary">
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
            className="w-full rounded-control border border-line bg-surface-elevated px-4 py-3 text-center tabular-nums text-body-lg uppercase text-foreground placeholder:text-secondary placeholder:normal-case focus:border-line-strong focus:outline-none"
            style={{ transition: "border-color 150ms ease" }}
          />
          {error && <p className="text-center text-body text-no-ink">{error}</p>}
          <button
            type="submit"
            disabled={!code.trim() || looking}
            className="w-full rounded-control bg-foreground py-3 text-body font-medium text-background transition-transform duration-150 ease-out active:scale-[0.97] disabled:opacity-40"
          >
            {looking ? "Finding room…" : "Join room"}
          </button>
        </form>
      </BottomSheet>
    </>
  );
}
