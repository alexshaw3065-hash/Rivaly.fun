"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { EntrySide } from "@/lib/types";
import { formatMoney } from "@/lib/mock-data";
import { useCurrentUser } from "./current-user-provider";
import { joinRoom } from "@/app/rooms/actions";
import { ROOM_UUID_RE } from "@/lib/supabase/room-mapper";

export function JoinPanel({
  roomId,
  entryAmountCents,
  initialEntry = null,
}: {
  roomId: string;
  entryAmountCents: number;
  initialEntry?: EntrySide | null;
}) {
  const router = useRouter();
  const currentUser = useCurrentUser();
  const isRealRoom = ROOM_UUID_RE.test(roomId);
  const [side, setSide] = useState<EntrySide | null>(null);
  const [entered, setEntered] = useState<EntrySide | null>(initialEntry);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (entered) {
    return (
      <div className="enter-pop rounded-lg border border-border-strong bg-surface p-4">
        <p className="text-sm font-medium text-foreground">
          You&rsquo;re in — backing{" "}
          <span className={entered === "yes" ? "text-rival-blue" : "text-rival-red"}>
            {entered === "yes" ? "Yes" : "No"}
          </span>
        </p>
        <p className="mt-1 text-xs text-muted">{formatMoney(entryAmountCents)} entered escrow.</p>
      </div>
    );
  }

  function pick(pickedSide: EntrySide) {
    // Mock rooms (r1..r35, not backed by a real rooms row) keep the
    // original local-only behavior — there's nothing real to join. Real
    // (UUID) rooms go through the actual insert below.
    if (!isRealRoom) {
      setSide(pickedSide);
      return;
    }
    if (!currentUser) {
      router.push(`/login?next=${encodeURIComponent(`/rooms/${roomId}`)}`);
      return;
    }
    setSide(pickedSide);
  }

  function submit() {
    if (!side) return;
    if (!isRealRoom) {
      setEntered(side);
      return;
    }
    setError(null);
    startTransition(async () => {
      const res = await joinRoom(roomId, side);
      if (res.ok) {
        setEntered(side);
      } else {
        setError(res.error);
      }
    });
  }

  return (
    <div className="rounded-lg border border-border bg-surface p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-muted">Take a side</p>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <button
          onClick={() => pick("yes")}
          className="rounded-md border py-3 text-sm font-medium active:scale-[0.97]"
          style={{
            borderColor: side === "yes" ? "var(--rival-blue)" : "var(--border)",
            color: side === "yes" ? "var(--rival-blue)" : "var(--foreground)",
            background: side === "yes" ? "var(--rival-blue-dim)" : "transparent",
            transition:
              "transform 150ms ease-out, background-color 150ms ease, border-color 150ms ease, color 150ms ease",
          }}
        >
          Yes
        </button>
        <button
          onClick={() => pick("no")}
          className="rounded-md border py-3 text-sm font-medium active:scale-[0.97]"
          style={{
            borderColor: side === "no" ? "var(--rival-red)" : "var(--border)",
            color: side === "no" ? "var(--rival-red)" : "var(--foreground)",
            background: side === "no" ? "var(--rival-red-dim)" : "transparent",
            transition:
              "transform 150ms ease-out, background-color 150ms ease, border-color 150ms ease, color 150ms ease",
          }}
        >
          No
        </button>
      </div>
      {error && <p className="mt-2 text-xs text-danger-red">{error}</p>}
      <button
        onClick={submit}
        disabled={!side || pending}
        className="mt-3 w-full rounded-md bg-foreground py-3 text-sm font-medium text-background transition-[transform,opacity] duration-150 ease-out active:scale-[0.97] disabled:opacity-40"
      >
        {pending ? "Joining…" : `Join for ${formatMoney(entryAmountCents)}`}
      </button>
    </div>
  );
}
